import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { boundedToolEvidence, ToolRouter, createToolRegistry, parseStructuredToolFallback, resolveContainedPath, unifiedDiff, type AuditRecord } from '../src';

const fakeGit = { status: async () => ({ branch: 'main', ahead: 0, behind: 0, files: [], head: null }), branches: async () => [], log: async () => [], diff: async () => ({ files: [] }), stage: async () => undefined, unstage: async () => undefined, commit: async () => ({ hash: '1' }), pull: async () => undefined, push: async () => undefined } as any;
const fakeShell = { run: async () => ({ stdout: '', stderr: '', exitCode: 0, signal: null, timedOut: false, cancelled: false, truncated: false }), cancel: () => true } as any;
const fakeWeb = { search: async () => ({ query: '', results: [] }), fetch: async () => ({}) } as any;

describe('agent tool runtime', () => {
  it('defines every tool with schemas, risk, timeout, audit, cancellation, and boundary metadata', () => {
    const registry = createToolRegistry(); const definitions = registry.list();
    expect(definitions.map((entry) => entry.name)).toContain('shell.run');
    expect(definitions.map((entry) => entry.name)).toContain('web.search');
    expect(definitions.find((entry) => entry.name === 'task.inspect')?.riskTier).toBe(0);
    expect(definitions.find((entry) => entry.name === 'task.create')?.riskTier).toBe(1);
    expect(definitions.find((entry) => entry.name === 'task.process.start')?.riskTier).toBe(2);
    expect(definitions.find((entry) => entry.name === 'task.process.start')?.approval).toBe('always');
    expect(definitions.every((entry) => entry.inputSchema && entry.outputSchema && entry.timeoutMs > 0 && entry.audit && typeof entry.cancellable === 'boolean')).toBe(true);
    expect(registry.parse({ id: 'linked-write', name: 'file.create', provider: 'test', arguments: { path: 'note.md', content: '', reason: 'Create task output.', taskContext: { taskId: '00000000-0000-4000-8000-000000000000', stepId: 'write' } } }).input.taskContext).toEqual({ taskId: '00000000-0000-4000-8000-000000000000', stepId: 'write' });
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

  it('creates visible diffs and applies approved atomic patches with rollback backups', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-tools-')); await writeFile(path.join(root, 'note.txt'), 'before\n');
    const records: AuditRecord[] = []; const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async (record) => { records.push(record); }, listActions: async () => records }, dirtyPaths: () => new Set() });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    const pending = await router.request({ id: 'patch-1', name: 'file.patch', provider: 'test', arguments: { path: 'note.txt', expected: 'before', replacement: 'after', reason: 'Update the fixture.' } }, context);
    expect(pending.result).toBeUndefined(); expect(pending.request.diff).toContain('-before'); expect(pending.request.state).toBe('pending');
    const result = await router.approve('patch-1', context, 'run-once');
    expect(result.success).toBe(true); expect(result.rollback?.backupPath).toContain('.forge/backups/');
    expect(await readFile(path.join(root, 'note.txt'), 'utf8')).toBe('after\n'); expect(records.at(-1)?.approvalDecision).toBe('run-once');
    expect(records.at(-1)?.id).toBe('patch-1');
  });

  it('blocks writes to unsaved editor paths and redacts secrets in validation audit records', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-dirty-')); await writeFile(path.join(root, 'note.txt'), 'before');
    const records: AuditRecord[] = []; const router = new ToolRouter({ git: fakeGit, shell: fakeShell, web: fakeWeb, audit: { appendAction: async (record) => { records.push(record); }, listActions: async () => records }, dirtyPaths: () => new Set(['note.txt']) });
    const context = { workspaceId: 'workspace-1', workspaceRoot: root, conversationId: 'conversation-1', modelId: 'test-model' };
    await router.request({ id: 'write-1', name: 'file.write', provider: 'test', arguments: { path: 'note.txt', content: 'after', reason: 'test dirty protection' } }, context);
    expect((await router.approve('write-1', context, 'run-once')).error?.message).toContain('unsaved');
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
