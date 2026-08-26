import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
  it('creates autonomous-execution storage without new approval tables or columns', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-autonomous-schema-')); temporaryDirectories.push(directory);
    const service = new StorageService(); await service.init(directory); await service.close();
    const SQL = await initSqlJs(); const database = new SQL.Database(await (await import('node:fs/promises')).readFile(join(directory, '.forge', 'metadata.sqlite')));
    const taskStepColumns = database.exec('PRAGMA table_info(task_steps)')[0].values.map((row) => row[1]);
    const actionColumns = database.exec('PRAGMA table_info(action_log)')[0].values.map((row) => row[1]);
    expect(taskStepColumns).not.toContain('approval_state');
    expect(actionColumns).toContain('execution_state'); expect(actionColumns).not.toContain('approval_decision');
    expect(database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='task_approvals'")).toEqual([]);
    database.close();
  });

  it('migrates a 2.3.x approval-era action log without losing history or requiring approval values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-legacy-action-log-')); temporaryDirectories.push(directory); await mkdir(join(directory, '.forge'));
    const SQL = await initSqlJs(); const legacy = new SQL.Database(); const now = Date.now();
    legacy.run('CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    legacy.run('CREATE TABLE tasks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, priority TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    legacy.run("CREATE TABLE task_steps (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, risk_tier INTEGER NOT NULL, required_tool TEXT, expected_input TEXT, expected_output TEXT, started_at INTEGER, completed_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, retry_policy TEXT NOT NULL DEFAULT '{}', timeout_ms INTEGER NOT NULL, approval_state TEXT NOT NULL, external_process_id INTEGER, output_path TEXT, artifact_paths TEXT NOT NULL DEFAULT '[]', verification_criteria TEXT NOT NULL DEFAULT '[]', rollback_instructions TEXT, audit_references TEXT NOT NULL DEFAULT '[]', UNIQUE(task_id, position))");
    legacy.run('CREATE TABLE task_approvals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT NOT NULL, tool_request_id TEXT, decision TEXT NOT NULL, scope TEXT NOT NULL, requested_at INTEGER NOT NULL, decided_at INTEGER, expires_at INTEGER, audit_reference TEXT)');
    legacy.run("CREATE TABLE action_log (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, timestamp INTEGER NOT NULL, conversation_id TEXT NOT NULL, model_id TEXT NOT NULL, tool_name TEXT NOT NULL, sanitized_inputs TEXT NOT NULL, approval_decision TEXT NOT NULL, execution_duration_ms INTEGER NOT NULL, success INTEGER NOT NULL, result_json TEXT NOT NULL DEFAULT '{}', result_summary TEXT NOT NULL, affected_paths TEXT NOT NULL, exit_code INTEGER, rollback TEXT, task_id TEXT, step_id TEXT)");
    legacy.run('INSERT INTO projects VALUES (?, ?, ?, ?, ?)', ['legacy-project', 'legacy', directory, now, now]);
    legacy.run('INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-task', 'legacy-project', 'Legacy task', null, 'running', 'medium', now, now]);
    legacy.run("INSERT INTO task_steps (id, task_id, position, name, purpose, status, risk_tier, attempts, retry_policy, timeout_ms, approval_state, artifact_paths, verification_criteria, audit_references) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['legacy-step', 'legacy-task', 0, 'Inspect', 'Inspect the workspace.', 'running', 0, 1, '{}', 120000, 'approved', '[]', '["Workspace inspected"]', '[]']);
    legacy.run('INSERT INTO action_log VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-action', 'legacy-project', now, 'legacy-conversation', 'legacy-model', 'file.list', '{"path":"."}', 'rejected', 12, 1, '{"success":true}', 'Listed workspace files.', '["README.md"]', null, null, 'legacy-task', 'legacy-step']);
    legacy.run('PRAGMA user_version = 8'); await writeFile(join(directory, '.forge', 'metadata.sqlite'), legacy.export()); legacy.close();

    const service = new StorageService(); await service.init(directory);
    expect(await service.listActions()).toMatchObject([{ id: 'legacy-action', toolName: 'file.list', taskId: 'legacy-task', stepId: 'legacy-step', executionState: 'succeeded', affectedPaths: ['README.md'] }]);
    expect((await service.getPersistentTask('legacy-task')).steps).toMatchObject([{ id: 'legacy-step', name: 'Inspect', status: 'running' }]);
    const workspaceId = await service.workspaceId();
    await service.appendAction({ id: 'autonomous-action', timestamp: now + 1, workspaceId, conversationId: 'next-conversation', modelId: 'next-model', toolName: 'file.read', sanitizedInputs: { path: 'README.md' }, executionState: 'succeeded', executionDurationMs: 3, success: true, result: { success: true }, resultSummary: 'Read README.', affectedPaths: ['README.md'] });
    await service.close();

    const migrated = new SQL.Database(await (await import('node:fs/promises')).readFile(join(directory, '.forge', 'metadata.sqlite')));
    const actionColumns = migrated.exec('PRAGMA table_info(action_log)')[0].values.map((row) => row[1]);
    const taskStepColumns = migrated.exec('PRAGMA table_info(task_steps)')[0].values.map((row) => row[1]);
    expect(actionColumns).not.toContain('approval_decision'); expect(taskStepColumns).not.toContain('approval_state'); expect(migrated.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='task_approvals'")).toEqual([]); expect(migrated.exec('SELECT id FROM action_log ORDER BY timestamp')[0].values).toEqual([['legacy-action'], ['autonomous-action']]);
    migrated.close();
    const reopened = new StorageService(); await reopened.init(directory); expect((await reopened.listActions()).map((action) => action.id)).toEqual(['autonomous-action', 'legacy-action']); await reopened.close();
  });

  it('updates a draft task definition and replaces its editable steps in SQLite', async () => {
    const service = await storage();
    const task = await service.createPersistentTask({ title: 'Draft', taskType: 'custom', resumeInstructions: 'Reconcile before continuing.', steps: [{ id: 'inspect', name: 'Inspect', purpose: 'Inspect inputs.', riskTier: 0, verificationCriteria: ['Inputs identified'] }] });
    const updated = await service.updatePersistentTask(task.id, { title: 'Updated', description: 'Objective', taskType: 'debugging', priority: 'high', resumeInstructions: 'Resume from the first unverified step.', steps: [{ id: 'fix', name: 'Fix', purpose: 'Apply the fix.', riskTier: 1, requiredTool: 'file.write', verificationCriteria: ['Tests pass'], retryPolicy: { maxAttempts: 2 }, artifactPaths: ['result.txt'] }] });
    expect(updated).toMatchObject({ title: 'Updated', taskType: 'debugging', priority: 'high', description: 'Objective' });
    expect(updated.steps).toHaveLength(1); expect(updated.steps[0]).toMatchObject({ id: 'fix', name: 'Fix', riskTier: 1, artifactPaths: ['result.txt'] });
    await service.close();
  });
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
    await first.appendAction({ id: 'action-1', timestamp: 10, workspaceId: firstId, conversationId: 'conversation-a', modelId: 'model', toolName: 'file.read', taskId: 'task-a', stepId: 'inspect', sanitizedInputs: { path: 'README.md' }, executionState: 'succeeded', executionDurationMs: 2, success: true, result: { success: true }, resultSummary: 'ok', affectedPaths: [] });
    await second.appendAction({ id: 'action-2', timestamp: 20, workspaceId: secondId, conversationId: 'conversation-b', modelId: 'model', toolName: 'shell.run', sanitizedInputs: { command: 'pwd' }, executionState: 'succeeded', executionDurationMs: 3, success: false, result: { success: false }, resultSummary: 'failed', affectedPaths: [] });
    expect((await first.listActions()).map((entry) => entry.id)).toEqual(['action-1']);
    expect(await first.listActions()).toMatchObject([{ taskId: 'task-a', stepId: 'inspect' }]);
    expect(await first.listActions({ toolName: 'shell.run' })).toEqual([]);
    await expect(first.appendAction({ id: 'wrong', timestamp: 30, workspaceId: secondId, conversationId: 'x', modelId: 'm', toolName: 'file.read', sanitizedInputs: {}, executionState: 'succeeded', executionDurationMs: 0, success: true, result: { success: true }, resultSummary: 'x', affectedPaths: [] })).rejects.toThrow(/another workspace/);
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
    const bytes = await (await import('node:fs/promises')).readFile(join(directory, '.forge', 'metadata.sqlite')); const verify = new SQL.Database(bytes); expect(verify.exec('PRAGMA user_version')[0].values[0][0]).toBe(11); expect(verify.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='task_events'")[0].values).toHaveLength(1); expect(verify.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='browser_history'")[0].values).toHaveLength(1); expect(verify.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='semantic_records'")[0].values).toHaveLength(1); verify.close();
  });

  it('persists scoped project observations used to invalidate cached context', async () => {
    const service = await storage();
    const observation = await service.recordProjectObservation('file.changed', { paths: ['src/app.ts'], authorization: 'never-store' });
    expect(observation.payload).toEqual({ paths: ['src/app.ts'], authorization: '[REDACTED]' });
    expect((await service.listProjectObservations())[0]).toMatchObject({ id: observation.id, kind: 'file.changed' });
    await service.close();
  });

  it('bounds durable project observations to prevent unbounded database rewrites', async () => {
    const service = await storage(); const workspaceId = await service.workspaceId(); const database = (service as any).ready();
    database.run('BEGIN');
    for (let index = 0; index < 2_100; index += 1) database.run('INSERT INTO project_observations VALUES (?, ?, ?, ?, ?)', [`observation-${index}`, workspaceId, 'terminal.input', index, '{}']);
    database.run('COMMIT');
    const latest = await service.recordProjectObservation('file.changed', { path: 'src/app.ts' });
    expect(database.exec('SELECT COUNT(*) FROM project_observations')[0].values[0][0]).toBe(2_000);
    expect(database.exec('SELECT COUNT(*) FROM project_observations WHERE id = ?', [latest.id])[0].values[0][0]).toBe(1);
    await service.close();
  });

  it('restores a malformed primary database from its verified last-known-good backup', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-storage-recovery-')); temporaryDirectories.push(directory);
    const first = new StorageService(); await first.init(directory); await first.createMemory('note', 'Retained', 'Recovered content'); await first.close();
    const databasePath = join(directory, '.forge', 'metadata.sqlite');
    expect((await readFile(`${databasePath}.backup`)).byteLength).toBeGreaterThan(0);
    await writeFile(databasePath, 'not a sqlite database');
    const recovered = new StorageService(); await recovered.init(directory);
    expect(await recovered.listMemories()).toMatchObject([{ title: 'Retained', content: 'Recovered content' }]);
    expect((await readdir(join(directory, '.forge'))).some((name) => name.startsWith('metadata.sqlite.corrupt-'))).toBe(true);
    await recovered.close();
  });

  it('migrates, deduplicates, supersedes, and reopens semantic records without mixing dimensions', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-semantic-reopen-')); temporaryDirectories.push(directory);
    const first = new StorageService(); await first.init(directory);
    const input = { id: 'semantic-one', sourceType: 'source', sourceId: 'src/app.ts', sourceUri: 'src/app.ts', sourceRevision: 'r1', chunkIndex: 0, lineStart: 1, lineEnd: 2, contentHash: 'hash-one', text: 'semantic context', embedding: [1, 0], embeddingModel: 'embed-a', embeddingDimensions: 2, authorityScore: 0.94, lifecycle: 'active' as const, metadata: { path: 'src/app.ts' } };
    expect((await first.upsertSemanticRecord(input)).embedded).toBe(true);
    expect((await first.upsertSemanticRecord(input)).embedded).toBe(false);
    await first.setSemanticIndexState({ state: 'ready', embeddingModel: 'embed-a', embeddingDimensions: 2, lastIndexedAt: 100 });
    await first.close();

    const reopened = new StorageService(); await reopened.init(directory);
    expect(await reopened.semanticIndexStatus()).toMatchObject({ schemaVersion: 11, state: 'ready', embeddingModel: 'embed-a', embeddingDimensions: 2, indexedRecords: 1 });
    expect(await reopened.semanticRecords({ embeddingModel: 'embed-a' })).toMatchObject([{ id: 'semantic-one', embedding: [1, 0], sourceRevision: 'r1' }]);
    await reopened.upsertSemanticRecord({ ...input, id: 'semantic-two', sourceRevision: 'r2', contentHash: 'hash-two', text: 'new semantic context', embedding: [0, 1] });
    expect(await reopened.supersedeSemanticSource('source', 'src/app.ts', 'r2', ['semantic-two'])).toBe(1);
    expect((await reopened.semanticRecords({ includeSuperseded: true })).find((entry) => entry.id === 'semantic-one')).toMatchObject({ lifecycle: 'superseded', supersededBy: 'semantic-two' });
    await reopened.close();
  });

  it('isolates tasks by workspace and redacts secret-like structured fields', async () => {
    const first = await storage(); const second = await storage(); const task = await first.createPersistentTask({ title: 'Secret-safe task', taskType: 'test', resumeInstructions: 'Inspect before resuming.', assignedProvider: 'provider-a', assignedModel: 'model-a', steps: [{ id: 'one', name: 'One', purpose: 'Inspect.', riskTier: 0, requiredTool: 'file.read', expectedInput: { apiKey: 'must-not-store', note: 'sk-abcdefghijklmnopqrstuvwxyz' }, verificationCriteria: ['Observed'] }] });
    await expect(second.getPersistentTask(task.id)).rejects.toThrow(/active workspace/); const loaded = await first.getPersistentTask(task.id); expect(loaded.steps[0].expectedInput).toEqual({ apiKey: '[REDACTED]', note: '[REDACTED]' }); expect(loaded.assignedModel).toBe('model-a'); await first.close(); await second.close();
  });

  it('rejects cyclic step dependencies and preserves audit-backed checkpoints', async () => {
    const service = await storage();
    await expect(service.createPersistentTask({ title: 'Cycle', taskType: 'test', resumeInstructions: 'Do not run.', steps: [{ id: 'a', name: 'A', purpose: 'A', riskTier: 0, verificationCriteria: ['A'], dependencies: ['b'] }, { id: 'b', name: 'B', purpose: 'B', riskTier: 0, verificationCriteria: ['B'], dependencies: ['a'] }] })).rejects.toThrow(/cycle/);
    const task = await service.createPersistentTask({ title: 'Execution', taskType: 'test', resumeInstructions: 'Run the first ready step.', steps: [{ id: 'execute', name: 'Execute', purpose: 'Run.', riskTier: 2, requiredTool: 'shell.run', verificationCriteria: ['Exit zero'] }] });
    await expect(service.appendTaskCheckpoint(task.id, { stepId: 'execute', name: 'Invalid evidence', summary: 'No active-workspace audit exists.', verified: true, auditReferences: ['missing-audit'] })).rejects.toThrow(/audit reference does not exist/); await service.close();
  });
});
