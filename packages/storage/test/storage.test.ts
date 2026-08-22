import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService } from '../src';
import initSqlJs from 'sql.js';

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function storage(): Promise<StorageService> {
  const directory = await mkdtemp(join(tmpdir(), 'forge-storage-'));
  temporaryDirectories.push(directory);
  const service = new StorageService();
  await service.init(directory);
  return service;
}

describe('workspace-owned conversation storage', () => {
  it('supports multiple threads and clears only active conversation messages', async () => {
    const service = await storage();
    const first = await service.conversationState();
    await service.appendConversation(first.activeConversationId, 'user', 'Architecture decisions');
    await service.createMemory('decision', 'Knowledge graph', 'Workspace artifacts form connected context.');
    await service.saveWorkspaceLayout({ explorerWidth: 333, intelligenceWidth: 444, bottomHeight: 222, contextHeight: 280 });

    const second = await service.createConversation('Release planning');
    await service.appendConversation(second.activeConversationId, 'user', 'Prepare release');
    expect((await service.listConversationThreads()).length).toBe(2);
    expect((await service.conversationState(second.activeConversationId)).messages).toHaveLength(1);

    const cleared = await service.clearConversation(second.activeConversationId);
    expect(cleared.messages).toHaveLength(0);
    expect((await service.conversationState(first.activeConversationId)).messages).toHaveLength(1);
    expect(await service.listMemories()).toHaveLength(1);
    expect(await service.getWorkspaceLayout()).toMatchObject({ explorerWidth: 333, intelligenceWidth: 444 });
    await service.close();
  });

  it('deletes selected or all conversation threads while retaining workspace-owned tasks and memory', async () => {
    const service = await storage();
    const first = await service.conversationState();
    await service.appendConversation(first.activeConversationId, 'user', 'Keep this only until deletion.');
    const second = await service.createConversation('Temporary thread');
    await service.appendConversation(second.activeConversationId, 'assistant', 'Temporary response.');
    await service.createMemory('note', 'Durable', 'This is independent from conversation history.');
    await service.createTask('Retained task');
    const afterDelete = await service.deleteConversation(second.activeConversationId);
    expect(afterDelete.threads).toHaveLength(1);
    expect(afterDelete.activeConversationId).toBe(first.activeConversationId);
    const afterClear = await service.clearAllConversations();
    expect(afterClear.threads).toHaveLength(1);
    expect(afterClear.messages).toHaveLength(0);
    expect(await service.listMemories()).toHaveLength(1);
    expect(await service.listPersistentTasks()).toHaveLength(1);
    await service.close();
  });

  it('projects bounded memory previews and supports explicit task and memory removal', async () => {
    const service = await storage();
    const oversizedLegacyMemory = 'x'.repeat(266_567);
    (service as any).ready().run('INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-memory', await service.workspaceId(), 'configuration', 'package-lock.json', oversizedLegacyMemory, '{"origin":"workspace-index"}', 1, 1]);
    const preview = await service.listMemories(10, 1_200);
    expect(preview[0]).toMatchObject({ id: 'legacy-memory', contentLength: 266_567 });
    expect(preview[0]?.content).toHaveLength(1_200);
    expect(await service.memoryStats()).toMatchObject({ recordCount: 1, indexedCount: 1, largestContentChars: 266_567 });
    await expect(service.createMemory('note', 'Too large', 'x'.repeat(200_001))).rejects.toThrow(/safety limit/);
    const task = await service.createTask('Delete me');
    await service.deletePersistentTask(task.id);
    expect(await service.listPersistentTasks()).toHaveLength(0);
    expect(await service.clearMemories()).toEqual({ deleted: 1 });
    await service.close();
  });

  it('never resolves a conversation from another workspace', async () => {
    const first = await storage();
    const second = await storage();
    const foreign = await first.conversationState();
    await expect(second.conversationState(foreign.activeConversationId)).rejects.toThrow('does not belong to the active workspace');
    await expect(second.selectConversation(foreign.activeConversationId)).rejects.toThrow('does not belong to the active workspace');
    await expect(second.appendConversation(foreign.activeConversationId, 'user', 'leak attempt')).rejects.toThrow('does not belong to the active workspace');
    await expect(second.clearConversation(foreign.activeConversationId)).rejects.toThrow('does not belong to the active workspace');
    await first.close(); await second.close();
  });

  it('persists the active conversation and layout inside its workspace database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-persisted-workspace-'));
    temporaryDirectories.push(directory);
    const firstRun = new StorageService();
    await firstRun.init(directory);
    const original = await firstRun.conversationState();
    await firstRun.createConversation('Secondary');
    await firstRun.selectConversation(original.activeConversationId);
    await firstRun.saveWorkspaceLayout({ explorerWidth: 318, intelligenceWidth: 477, bottomHeight: 211, contextHeight: 266 });
    await firstRun.close();

    const secondRun = new StorageService();
    await secondRun.init(directory);
    expect((await secondRun.conversationState()).activeConversationId).toBe(original.activeConversationId);
    expect(await secondRun.getWorkspaceLayout()).toEqual({ explorerWidth: 318, intelligenceWidth: 477, bottomHeight: 211, contextHeight: 266 });
    await secondRun.close();
    expect((await readdir(join(directory, '.forge'))).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('migrates legacy unthreaded messages without deleting history', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-legacy-'));
    temporaryDirectories.push(directory);
    await mkdir(join(directory, '.forge'));
    const SQL = await initSqlJs();
    const legacy = new SQL.Database();
    const now = Date.now();
    legacy.run('CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    legacy.run('CREATE TABLE conversations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL)');
    legacy.run('INSERT INTO projects VALUES (?, ?, ?, ?, ?)', ['legacy-project', 'legacy', directory, now, now]);
    legacy.run('INSERT INTO conversations VALUES (?, ?, ?, ?, ?)', ['legacy-message', 'legacy-project', 'user', 'Preserve this history', now]);
    await writeFile(join(directory, '.forge', 'metadata.sqlite'), legacy.export());
    legacy.close();

    const service = new StorageService();
    await service.init(directory);
    const state = await service.conversationState();
    expect(state.threads[0]?.title).toBe('Imported conversation');
    expect(state.messages[0]?.content).toBe('Preserve this history');
    await service.close();
  });

  it('persists action logs per workspace and filters without exposing other workspaces', async () => {
    const first = await storage(); const second = await storage(); const firstId = await first.workspaceId(); const secondId = await second.workspaceId();
    await first.appendAction({ id: 'action-1', timestamp: 10, workspaceId: firstId, conversationId: 'conversation-a', modelId: 'model', toolName: 'file.read', taskId: 'task-a', stepId: 'inspect', sanitizedInputs: { path: 'README.md' }, approvalDecision: 'automatic', executionDurationMs: 2, success: true, result: { success: true }, resultSummary: 'ok', affectedPaths: [] });
    await second.appendAction({ id: 'action-2', timestamp: 20, workspaceId: secondId, conversationId: 'conversation-b', modelId: 'model', toolName: 'shell.run', sanitizedInputs: { command: 'pwd' }, approvalDecision: 'automatic', executionDurationMs: 3, success: false, result: { success: false }, resultSummary: 'failed', affectedPaths: [] });
    expect((await first.listActions()).map((entry) => entry.id)).toEqual(['action-1']);
    expect(await first.listActions()).toMatchObject([{ taskId: 'task-a', stepId: 'inspect' }]);
    expect(await first.listActions({ toolName: 'shell.run' })).toEqual([]);
    await expect(first.appendAction({ id: 'wrong', timestamp: 30, workspaceId: secondId, conversationId: 'x', modelId: 'm', toolName: 'file.read', sanitizedInputs: {}, approvalDecision: 'automatic', executionDurationMs: 0, success: true, result: { success: true }, resultSummary: 'x', affectedPaths: [] })).rejects.toThrow(/another workspace/);
    await first.close(); await second.close();
  });

  it('migrates an alpha.3 schema-v3 task without losing the legacy row', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-v3-task-')); temporaryDirectories.push(directory); await mkdir(join(directory, '.forge'));
    const SQL = await initSqlJs(); const legacy = new SQL.Database(); const now = Date.now();
    legacy.run('CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    legacy.run('CREATE TABLE tasks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, priority TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    legacy.run('INSERT INTO projects VALUES (?, ?, ?, ?, ?)', ['v3-project', 'forge-v3', directory, now, now]); legacy.run('INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-task', 'v3-project', 'Legacy task', null, 'in-progress', 'high', now, now]); legacy.run('PRAGMA user_version = 3');
    await writeFile(join(directory, '.forge', 'metadata.sqlite'), legacy.export()); legacy.close();
    const service = new StorageService(); await service.init(directory); const migrated = await service.getPersistentTask('legacy-task'); expect(migrated.status).toBe('running'); expect(migrated.taskType).toBe('general'); expect(migrated.events).toEqual([]); await service.close();
    const bytes = await (await import('node:fs/promises')).readFile(join(directory, '.forge', 'metadata.sqlite')); const verify = new SQL.Database(bytes); expect(verify.exec('PRAGMA user_version')[0].values[0][0]).toBe(8); expect(verify.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='task_events'")[0].values).toHaveLength(1); expect(verify.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='browser_history'")[0].values).toHaveLength(1); verify.close();
  });

  it('persists scoped project observations used to invalidate cached context', async () => {
    const service = await storage();
    const observation = await service.recordProjectObservation('file.changed', { paths: ['src/app.ts'], authorization: 'never-store' });
    expect(observation.payload).toEqual({ paths: ['src/app.ts'], authorization: '[REDACTED]' });
    expect((await service.listProjectObservations())[0]).toMatchObject({ id: observation.id, kind: 'file.changed' });
    await service.close();
  });

  it('isolates tasks by workspace and redacts secret-like structured fields', async () => {
    const first = await storage(); const second = await storage(); const task = await first.createPersistentTask({ title: 'Secret-safe task', taskType: 'test', resumeInstructions: 'Inspect before resuming.', assignedProvider: 'provider-a', assignedModel: 'model-a', steps: [{ id: 'one', name: 'One', purpose: 'Inspect.', riskTier: 0, requiredTool: 'file.read', expectedInput: { apiKey: 'must-not-store', note: 'sk-abcdefghijklmnopqrstuvwxyz' }, verificationCriteria: ['Observed'] }] });
    await expect(second.getPersistentTask(task.id)).rejects.toThrow(/active workspace/); const loaded = await first.getPersistentTask(task.id); expect(loaded.steps[0].expectedInput).toEqual({ apiKey: '[REDACTED]', note: '[REDACTED]' }); expect(loaded.assignedModel).toBe('model-a'); await first.close(); await second.close();
  });

  it('rejects cyclic step dependencies and projects expired approvals without authorizing work', async () => {
    const service = await storage();
    await expect(service.createPersistentTask({ title: 'Cycle', taskType: 'test', resumeInstructions: 'Do not run.', steps: [{ id: 'a', name: 'A', purpose: 'A', riskTier: 0, verificationCriteria: ['A'], dependencies: ['b'] }, { id: 'b', name: 'B', purpose: 'B', riskTier: 0, verificationCriteria: ['B'], dependencies: ['a'] }] })).rejects.toThrow(/cycle/);
    const task = await service.createPersistentTask({ title: 'Approval', taskType: 'test', resumeInstructions: 'Request a fresh approval.', steps: [{ id: 'execute', name: 'Execute', purpose: 'Run.', riskTier: 2, requiredTool: 'shell.run', verificationCriteria: ['Exit zero'] }] });
    await service.recordTaskApproval(task.id, 'execute', { decision: 'session', scope: `${task.id}:execute:shell.run`, expiresAt: 1 }); const expired = await service.getPersistentTask(task.id); expect(expired.approvals[0].decision).toBe('expired'); expect(expired.steps[0].approvalState).toBe('expired');
    await expect(service.appendTaskCheckpoint(task.id, { stepId: 'execute', name: 'Invalid evidence', summary: 'No active-workspace audit exists.', verified: true, auditReferences: ['missing-audit'] })).rejects.toThrow(/audit reference does not exist/); await service.close();
  });
});
