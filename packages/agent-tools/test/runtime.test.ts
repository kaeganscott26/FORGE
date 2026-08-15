import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { boundedToolEvidence, ToolRouter, createToolRegistry, parseStructuredToolFallback, resolveContainedPath, unifiedDiff, type AuditRecord } from '../src';

const fakeGit = { status: async () => ({ branch: 'main', ahead: 0, behind: 0, files: [], head: null }), branches: async () => [], log: async () => [], diff: async () => ({ files: [] }), stage: async () => undefined, unstage: async () => undefined, commit: async () => ({ hash: '1' }), pull: async () => undefined, push: async () => undefined } as any;
const fakeShell = { run: async () => ({ stdout: '', stderr: '', exitCode: 0, signal: null, timedOut: false, cancelled: false, truncated: false }), cancel: () => true } as any;
const fakeWeb = { search: async () => ({ query: '', results: [] }), fetch: async () => ({}) } as any;
const fakeBrowser = { enabled: () => true, open: async (url: string) => ({ url, title: 'Example', canGoBack: false, canGoForward: false }), read: async () => ({ url: 'https://example.com/', title: 'Example Domain', text: 'Example Domain This domain is for use in illustrative examples in documents.', truncated: false }) };

describe('agent tool runtime', () => {
  it('defines every tool with schemas, timeout, audit, cancellation, and boundary metadata', () => {
    const registry = createToolRegistry(); const definitions = registry.list();
    expect(definitions.map((entry) => entry.name)).toContain('shell.run');
    expect(definitions.map((entry) => entry.name)).toContain('web.search');
    expect(definitions.map((entry) => entry.name)).toEqual(expect.arrayContaining(['browser.open', 'browser.read', 'browser.find', 'browser.savecontext']));
    expect(definitions.every((entry) => entry.inputSchema && entry.outputSchema && entry.timeoutMs > 0 && entry.audit && typeof entry.cancellable === 'boolean')).toBe(true);
    expect(registry.parse({ id: 'linked-write', name: 'file.create', provider: 'test', arguments: { path: 'note.md', content: '', reason: 'Create task output.', taskContext: { taskId: '00000000-0000-4000-8000-000000000000', stepId: 'write' } } }).input.taskContext).toEqual({ taskId: '00000000-0000-4000-8000-000000000000', stepId: 'write' });
  });

  it('requires approval before exposing browser text to the model and saves approved page context durably', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-browser-tools-'));
    const saved: Array<{ type: string; title?: string | null; content: string; metadata?: unknown }> = [];
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, browser: fakeBrowser, memories: { create: async (entry) => { saved.push(entry); return { id: 'memory-1', createdAt: 1, updatedAt: 1 }; } }, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const read = await router.request({ id: 'browser-read', name: 'browser.read', provider: 'test', arguments: { reason: 'Summarize the page.' } }, context);
    expect(read.request.state).toBe('pending');
    const readResult = await router.approve(read.request.id, context, 'run-once');
    expect(readResult.output).toMatchObject({ url: 'https://example.com/', text: expect.stringContaining('Example Domain') });
    const find = await router.request({ id: 'browser-find', name: 'browser.find', provider: 'test', arguments: { query: 'illustrative', reason: 'Find the relevant statement.' } }, context);
    const findResult = await router.approve(find.request.id, context, 'run-once');
    expect(findResult.output).toMatchObject({ matches: [{ excerpt: expect.stringContaining('illustrative') }] });
    const save = await router.request({ id: 'browser-save', name: 'browser.savecontext', provider: 'test', arguments: { title: 'Example reference', content: 'The page is a reserved example domain.', reason: 'Save this reference.' } }, context);
    expect(save.request.state).toBe('pending');
    expect((await router.approve(save.request.id, context, 'run-once')).rollback?.available).toBe(true);
    expect(saved).toEqual([expect.objectContaining({ type: 'document', title: 'Example reference', metadata: expect.objectContaining({ url: 'https://example.com/' }) })]);
  });

  it('blocks traversal and symlink workspace escapes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-containment-')); const outside = await mkdtemp(path.join(os.tmpdir(), 'forge-outside-'));
    await mkdir(path.join(root, 'inside')); await symlink(outside, path.join(root, 'escape'));
    await expect(resolveContainedPath(root, '../outside', true)).rejects.toThrow(/relative|traverse/);
    await expect(resolveContainedPath(root, 'escape')).rejects.toThrow(/Symlink/);
  });

  it('returns structured recovery metadata for missing filesystem paths', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-missing-')); const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const listResult = await router.request({ id: 'list-1', name: 'file.list', provider: 'test', arguments: { path: 'missing/dir', recursive: false } }, context);
    expect(listResult.result?.success).toBe(true);
    expect(listResult.result?.output).toMatchObject({ success: true, missing: true, requestedPath: 'missing/dir', recovery: { action: 'restart-at-workspace-root', path: '.' } });
    const readResult = await router.request({ id: 'read-1', name: 'file.read', provider: 'test', arguments: { path: 'missing.txt' } }, context);
    expect(readResult.result?.success).toBe(true);
    expect(readResult.result?.output).toMatchObject({ success: true, missing: true, requestedPath: 'missing.txt' });
    const searchResult = await router.request({ id: 'search-1', name: 'file.search', provider: 'test', arguments: { path: 'missing/search', query: 'needle' } }, context);
    expect(searchResult.result?.success).toBe(true);
    expect(searchResult.result?.output).toMatchObject({ success: true, missing: true, requestedPath: 'missing/search', matches: [] });
  });

  it('returns a continuation offset instead of abandoning a truncated search', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-search-page-')); await writeFile(path.join(root, 'matches.txt'), 'needle one\nneedle two\nneedle three\n');
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const first = await router.request({ id: 'search-page-1', name: 'file.search', provider: 'test', arguments: { query: 'needle', maxResults: 2 } }, context);
    expect(first.result?.output).toMatchObject({ truncated: true, continuation: { offset: 2 } });
    const second = await router.request({ id: 'search-page-2', name: 'file.search', provider: 'test', arguments: { query: 'needle', maxResults: 2, offset: 2 } }, context);
    expect(second.result?.output).toMatchObject({ truncated: false, matches: [{ line: 3, text: 'needle three' }] });
  });

  it('paginates file listings and reads bounded file ranges with continuations', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-read-range-'));
    await writeFile(path.join(root, 'alpha.txt'), 'one\ntwo\nthree\nfour\n'); await writeFile(path.join(root, 'beta.txt'), 'other');
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const listing = await router.request({ id: 'list-page', name: 'file.list', provider: 'test', arguments: { maxEntries: 1 } }, context);
    expect(listing.result?.output).toMatchObject({ entries: [{ path: 'alpha.txt' }], truncated: true, continuation: { offset: 1 } });
    const read = await router.request({ id: 'read-range', name: 'file.read', provider: 'test', arguments: { path: 'alpha.txt', startLine: 2, endLine: 3, maxCharacters: 100 } }, context);
    expect(read.result?.output).toMatchObject({ content: 'two\nthree\n', totalLines: 5, returnedRange: { startLine: 2, endLine: 3 } });
    const first = await router.request({ id: 'read-page', name: 'file.read', provider: 'test', arguments: { path: 'alpha.txt', maxCharacters: 5 } }, context);
    expect(first.result?.output).toMatchObject({ content: 'one\nt', truncated: true, continuation: { offset: 5 } });
  });

  it('keeps file.read recoverable for directories and bounded reads above the legacy 2 MB limit', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-read-resilience-'));
    await mkdir(path.join(root, 'folder'));
    await writeFile(path.join(root, 'large.txt'), 'x'.repeat(2_100_000));
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const directory = await router.request({ id: 'read-directory', name: 'file.read', provider: 'test', arguments: { path: 'folder' } }, context);
    expect(directory.result?.success).toBe(true);
    expect(directory.result?.output).toMatchObject({ success: true, unreadable: true, reason: 'not-a-file', recovery: { action: 'list-path', path: 'folder' } });
    const large = await router.request({ id: 'read-large', name: 'file.read', provider: 'test', arguments: { path: 'large.txt', maxCharacters: 64 } }, context);
    expect(large.result?.success).toBe(true);
    expect(large.result?.output).toMatchObject({ content: 'x'.repeat(64), truncated: true, continuation: { offset: 64 } });
  });

  it('advertises only tools available to the current FORGE configuration', () => {
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: { ...fakeWeb, isEnabled: () => false }, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const names = router.providerDefinitions().map((definition) => definition.name);
    expect(names).toContain('file.read'); expect(names).not.toContain('terminal.read'); expect(names).not.toContain('github.read'); expect(names).not.toContain('web.search'); expect(names).not.toContain('browser.open');
  });

  it('creates visible diffs and applies approved atomic patches with rollback backups', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-tools-')); await writeFile(path.join(root, 'note.txt'), 'before\n');
    const records: AuditRecord[] = []; const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async (record) => { records.push(record); }, listActions: async () => records }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const pending = await router.request({ id: 'patch-1', name: 'file.patch', provider: 'test', arguments: { path: 'note.txt', expected: 'before', replacement: 'after', reason: 'Update the fixture.' } }, context);
    expect(pending.result).toBeUndefined(); expect(pending.request.state).toBe('pending'); expect(pending.request.diff).toContain('-before');
    const result = await router.approve(pending.request.id, context, 'run-once');
    expect(result.success).toBe(true); expect(result.rollback?.backupPath).toContain(path.join('.forge', 'backups'));
    expect(await readFile(path.join(root, 'note.txt'), 'utf8')).toBe('after\n'); expect(records.at(-1)?.approvalDecision).toBe('run-once');
    expect(records.at(-1)?.id).toBe('patch-1');
  });

  it('reuses only an exact session-scoped reversible approval', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-session-scope-')); await writeFile(path.join(root, 'one.txt'), 'one'); await writeFile(path.join(root, 'two.txt'), 'two');
    const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async () => undefined, listActions: async () => [] }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const first = await router.request({ id: 'session-1', name: 'file.write', provider: 'test', arguments: { path: 'one.txt', content: 'updated', reason: 'Update one.' } }, context);
    await router.approve(first.request.id, context, 'session');
    const sameScope = await router.request({ id: 'session-2', name: 'file.write', provider: 'test', arguments: { path: 'one.txt', content: 'updated again', reason: 'Update one again.' } }, context);
    const differentScope = await router.request({ id: 'session-3', name: 'file.write', provider: 'test', arguments: { path: 'two.txt', content: 'blocked', reason: 'Update two.' } }, context);
    expect(sameScope.result?.success).toBe(true);
    expect(differentScope.request.state).toBe('pending');
  });

  it('blocks writes to unsaved editor paths and redacts secrets in validation audit records', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-dirty-')); await writeFile(path.join(root, 'note.txt'), 'before');
    const records: AuditRecord[] = []; const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async (record) => { records.push(record); }, listActions: async () => records }, dirtyPaths: () => new Set(['note.txt']) });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const write = await router.request({ id: 'write-1', name: 'file.write', provider: 'test', arguments: { path: 'note.txt', content: 'after', reason: 'test dirty protection' } }, context);
    const writeResult = await router.approve(write.request.id, context, 'run-once');
    expect(writeResult.error?.message).toContain('unsaved');
    await expect(router.request({ id: 'bad', name: 'unknown.tool', provider: 'test', arguments: { authorization: 'Bearer secret', note: 'sk-abcdefghijklmnopqrstuvwxyz' } }, context)).rejects.toThrow(/Unknown tool/);
    expect(records.at(-1)?.sanitizedInputs).toEqual({ authorization: '[REDACTED]', note: '[REDACTED]' });
  });

  it('accepts only strict provider-neutral fallback envelopes', () => {
    expect(parseStructuredToolFallback('test', '{"type":"forge_tool_request","tool":"git.status","arguments":{}}')?.name).toBe('git.status');
    expect(parseStructuredToolFallback('test', '```json\n{"tool":"git.status"}\n```')).toBeNull();
    expect(unifiedDiff('x.txt', 'a', 'b')).toContain('+++ b/x.txt');
    const bounded = boundedToolEvidence({ requestId: 'x', toolName: 'shell.run', success: true, output: { stdout: 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz', stderr: 'x'.repeat(1_000) }, affectedPaths: [], warnings: [], durationMs: 1 }, 120);
    expect(bounded.length).toBeLessThan(200); expect(bounded).toContain('[REDACTED]'); expect(bounded).toContain('bounded');
  });
});