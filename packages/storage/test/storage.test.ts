import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

  it('never resolves a conversation from another workspace', async () => {
    const first = await storage();
    const second = await storage();
    const foreign = await first.conversationState();
    await expect(second.conversationState(foreign.activeConversationId)).rejects.toThrow('does not belong to the active workspace');
    await first.close(); await second.close();
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
});
