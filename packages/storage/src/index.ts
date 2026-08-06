import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  type ConversationEntry,
  type ConversationState,
  type ConversationThread,
  type Goal,
  type ProjectMetadata,
  type Task,
  type WorkspaceLayout
} from '@forge/ipc';

type Row = Record<string, unknown>;
const id = (): string => randomUUID();
const CURRENT_SCHEMA_VERSION = 2;

function normalizeTitle(value?: string): string {
  const title = value?.trim() || 'New conversation';
  return title.slice(0, 120);
}

function titleFromPrompt(prompt: string): string {
  const singleLine = prompt.replace(/\s+/g, ' ').trim();
  return singleLine.length > 52 ? `${singleLine.slice(0, 49)}…` : singleLine || 'New conversation';
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.round(value))) : fallback;
}

export function normalizeWorkspaceLayout(value?: Partial<WorkspaceLayout> | null): WorkspaceLayout {
  return {
    explorerWidth: clamp(value?.explorerWidth, 180, 520, DEFAULT_WORKSPACE_LAYOUT.explorerWidth),
    intelligenceWidth: clamp(value?.intelligenceWidth, 300, 720, DEFAULT_WORKSPACE_LAYOUT.intelligenceWidth),
    bottomHeight: clamp(value?.bottomHeight, 150, 520, DEFAULT_WORKSPACE_LAYOUT.bottomHeight),
    contextHeight: clamp(value?.contextHeight, 160, 650, DEFAULT_WORKSPACE_LAYOUT.contextHeight)
  };
}

export class StorageService {
  private db: Database | null = null;
  private filePath: string | null = null;
  private rootPath: string | null = null;

  async init(rootPath: string): Promise<void> {
    const directory = path.join(rootPath, '.forge');
    await fs.mkdir(directory, { recursive: true });
    this.filePath = path.join(directory, 'metadata.sqlite');
    this.rootPath = rootPath;
    const SQL = await initSqlJs();
    const bytes = await fs.readFile(this.filePath).catch(() => null);
    this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    this.db.run('PRAGMA foreign_keys = ON');
    this.createSchema();
    await this.ensureProject();
    await this.migrateLegacyConversations();
    this.db.run(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    await this.persist();
  }

  async close(): Promise<void> {
    await this.persist();
    this.db?.close();
    this.db = null;
    this.filePath = null;
    this.rootPath = null;
  }

  async dashboard(): Promise<ProjectMetadata | null> {
    const project = this.one('SELECT * FROM projects WHERE root_path = ?', [this.rootPath]);
    if (!project) return null;
    return {
      id: String(project.id),
      name: String(project.name),
      rootPath: String(project.root_path),
      createdAt: Number(project.created_at),
      updatedAt: Number(project.updated_at),
      goals: this.goals(String(project.id)),
      tasks: this.tasks(String(project.id))
    };
  }

  async createGoal(title: string, description?: string): Promise<Goal> {
    if (!title.trim()) throw new Error('Goal title is required.');
    const projectId = await this.projectId();
    const now = Date.now();
    const goal: Goal = { id: id(), title: title.trim(), description, status: 'active', createdAt: now, updatedAt: now };
    this.ready().run('INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?)', [goal.id, projectId, goal.title, description ?? null, goal.status, now, now]);
    await this.persist();
    return goal;
  }

  async createTask(title: string, description?: string, priority: Task['priority'] = 'medium'): Promise<Task> {
    if (!title.trim()) throw new Error('Task title is required.');
    const projectId = await this.projectId();
    const now = Date.now();
    const task: Task = { id: id(), title: title.trim(), description, status: 'todo', priority, createdAt: now, updatedAt: now };
    this.ready().run('INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [task.id, projectId, task.title, description ?? null, task.status, priority, now, now]);
    await this.persist();
    return task;
  }

  async conversationState(conversationId?: string): Promise<ConversationState> {
    const activeConversationId = conversationId
      ? await this.assertConversation(conversationId)
      : await this.ensureActiveConversation();
    return {
      activeConversationId,
      threads: await this.listConversationThreads(),
      messages: await this.listConversationMessages(activeConversationId)
    };
  }

  async createConversation(title?: string): Promise<ConversationState> {
    const projectId = await this.projectId();
    const conversationId = id();
    const now = Date.now();
    this.ready().run('INSERT INTO conversation_threads VALUES (?, ?, ?, ?, ?)', [conversationId, projectId, normalizeTitle(title), now, now]);
    this.setWorkspaceState(projectId, conversationId);
    await this.persist();
    return this.conversationState(conversationId);
  }

  async selectConversation(conversationId: string): Promise<ConversationState> {
    const validId = await this.assertConversation(conversationId);
    this.setWorkspaceState(await this.projectId(), validId);
    await this.persist();
    return this.conversationState(validId);
  }

  async renameConversation(conversationId: string, title: string): Promise<ConversationState> {
    const validId = await this.assertConversation(conversationId);
    const normalized = normalizeTitle(title);
    if (normalized === 'New conversation' && !title.trim()) throw new Error('Conversation title is required.');
    this.ready().run('UPDATE conversation_threads SET title = ?, updated_at = ? WHERE id = ?', [normalized, Date.now(), validId]);
    await this.persist();
    return this.conversationState(validId);
  }

  async clearConversation(conversationId: string): Promise<ConversationState> {
    const validId = await this.assertConversation(conversationId);
    this.ready().run('DELETE FROM conversations WHERE thread_id = ?', [validId]);
    this.ready().run('UPDATE conversation_threads SET updated_at = ? WHERE id = ?', [Date.now(), validId]);
    await this.persist();
    return this.conversationState(validId);
  }

  async appendConversation(conversationId: string, role: ConversationEntry['role'], content: string): Promise<ConversationEntry> {
    const validId = await this.assertConversation(conversationId);
    if (role !== 'user' && role !== 'assistant') throw new Error('Conversation role is invalid.');
    if (!content.trim()) throw new Error('Conversation content is required.');
    const projectId = await this.projectId();
    const now = Date.now();
    const entry: ConversationEntry = { id: id(), conversationId: validId, role, content, createdAt: now };
    this.ready().run('INSERT INTO conversations (id, project_id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', [entry.id, projectId, validId, role, content, now]);
    const thread = this.one('SELECT title FROM conversation_threads WHERE id = ?', [validId]);
    const messageCount = Number(this.one('SELECT COUNT(*) AS count FROM conversations WHERE thread_id = ?', [validId])?.count ?? 0);
    const nextTitle = role === 'user' && messageCount === 1 && String(thread?.title ?? '') === 'New conversation' ? titleFromPrompt(content) : String(thread?.title ?? 'New conversation');
    this.ready().run('UPDATE conversation_threads SET title = ?, updated_at = ? WHERE id = ?', [nextTitle, now, validId]);
    await this.persist();
    return entry;
  }

  async listConversationMessages(conversationId: string, limit = 200): Promise<ConversationEntry[]> {
    const validId = await this.assertConversation(conversationId);
    return this.all(`SELECT id, thread_id, role, content, created_at FROM (
      SELECT id, thread_id, role, content, created_at FROM conversations
      WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
    ) ORDER BY created_at ASC, id ASC`, [validId, limit]).map((row) => ({
      id: String(row.id),
      conversationId: String(row.thread_id),
      role: String(row.role) as ConversationEntry['role'],
      content: String(row.content),
      createdAt: Number(row.created_at)
    }));
  }

  async listConversationThreads(): Promise<ConversationThread[]> {
    const projectId = await this.projectId();
    return this.all(`SELECT t.id, t.title, t.created_at, t.updated_at, COUNT(m.id) AS message_count
      FROM conversation_threads t LEFT JOIN conversations m ON m.thread_id = t.id
      WHERE t.project_id = ? GROUP BY t.id ORDER BY t.updated_at DESC, t.created_at DESC`, [projectId]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      messageCount: Number(row.message_count)
    }));
  }

  async getWorkspaceLayout(): Promise<WorkspaceLayout> {
    const projectId = await this.projectId();
    const raw = this.one('SELECT layout_json FROM workspace_state WHERE project_id = ?', [projectId])?.layout_json;
    if (!raw) return { ...DEFAULT_WORKSPACE_LAYOUT };
    try { return normalizeWorkspaceLayout(JSON.parse(String(raw)) as Partial<WorkspaceLayout>); }
    catch { return { ...DEFAULT_WORKSPACE_LAYOUT }; }
  }

  async saveWorkspaceLayout(layout: WorkspaceLayout): Promise<WorkspaceLayout> {
    const projectId = await this.projectId();
    const normalized = normalizeWorkspaceLayout(layout);
    this.ready().run(`INSERT INTO workspace_state (project_id, active_conversation_id, layout_json, updated_at)
      VALUES (?, NULL, ?, ?) ON CONFLICT(project_id) DO UPDATE SET layout_json = excluded.layout_json, updated_at = excluded.updated_at`,
    [projectId, JSON.stringify(normalized), Date.now()]);
    await this.persist();
    return normalized;
  }

  async createMemory(type: string, title: string | null, content: string, metadata?: unknown): Promise<{ id: string; type: string; title?: string | null; content: string; metadata?: unknown; createdAt: number; updatedAt: number }> {
    const projectId = await this.projectId();
    const now = Date.now();
    const memoryId = id();
    this.ready().run('INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [memoryId, projectId, type, title ?? null, content, metadata ? JSON.stringify(metadata) : null, now, now]);
    await this.persist();
    return { id: memoryId, type, title, content, metadata, createdAt: now, updatedAt: now };
  }

  async listMemories(limit = 100): Promise<Array<{ id: string; type: string; title?: string | null; content: string; metadata?: unknown; createdAt: number; updatedAt: number }>> {
    const projectId = await this.projectId();
    return this.all('SELECT id, type, title, content, metadata, created_at, updated_at FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [projectId, limit]).map((row) => ({
      id: String(row.id),
      type: String(row.type),
      title: row.title ? String(row.title) : null,
      content: String(row.content),
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  async updateMemory(memoryId: string, fields: { title?: string | null; content?: string; metadata?: unknown }): Promise<void> {
    const projectId = await this.projectId();
    const set: string[] = [];
    const params: SqlValue[] = [];
    if (fields.title !== undefined) { set.push('title = ?'); params.push(fields.title); }
    if (fields.content !== undefined) { set.push('content = ?'); params.push(fields.content); }
    if (fields.metadata !== undefined) { set.push('metadata = ?'); params.push(fields.metadata ? JSON.stringify(fields.metadata) : null); }
    if (!set.length) return;
    params.push(Date.now(), memoryId, projectId);
    this.ready().run(`UPDATE memories SET ${set.join(', ')}, updated_at = ? WHERE id = ? AND project_id = ?`, params);
    await this.persist();
  }

  async deleteMemory(memoryId: string): Promise<void> {
    this.ready().run('DELETE FROM memories WHERE id = ? AND project_id = ?', [memoryId, await this.projectId()]);
    await this.persist();
  }

  private createSchema(): void {
    this.ready().run(`
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, priority TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS conversation_threads (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, thread_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT, content TEXT NOT NULL, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS workspace_state (project_id TEXT PRIMARY KEY, active_conversation_id TEXT, layout_json TEXT, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
    `);
    const columns = this.all('PRAGMA table_info(conversations)').map((row) => String(row.name));
    if (!columns.includes('thread_id')) this.ready().run('ALTER TABLE conversations ADD COLUMN thread_id TEXT');
    this.ready().run(`
      CREATE INDEX IF NOT EXISTS idx_conversations_thread_created ON conversations(thread_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_conversation_threads_project_updated ON conversation_threads(project_id, updated_at);
    `);
  }

  private async ensureProject(): Promise<void> {
    if (!this.rootPath) throw new Error('Storage is not initialized.');
    if (this.one('SELECT id FROM projects WHERE root_path = ?', [this.rootPath])) return;
    const now = Date.now();
    this.ready().run('INSERT INTO projects VALUES (?, ?, ?, ?, ?)', [id(), path.basename(this.rootPath), this.rootPath, now, now]);
  }

  private async migrateLegacyConversations(): Promise<void> {
    const projectId = await this.projectId();
    const legacy = this.one('SELECT COUNT(*) AS count, MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM conversations WHERE project_id = ? AND thread_id IS NULL', [projectId]);
    if (Number(legacy?.count ?? 0) === 0) return;
    const conversationId = id();
    const createdAt = Number(legacy?.first_at ?? Date.now());
    const updatedAt = Number(legacy?.last_at ?? createdAt);
    this.ready().run('INSERT INTO conversation_threads VALUES (?, ?, ?, ?, ?)', [conversationId, projectId, 'Imported conversation', createdAt, updatedAt]);
    this.ready().run('UPDATE conversations SET thread_id = ? WHERE project_id = ? AND thread_id IS NULL', [conversationId, projectId]);
    this.setWorkspaceState(projectId, conversationId);
  }

  private async ensureActiveConversation(): Promise<string> {
    const projectId = await this.projectId();
    const active = this.one(`SELECT s.active_conversation_id AS id FROM workspace_state s
      JOIN conversation_threads t ON t.id = s.active_conversation_id
      WHERE s.project_id = ? AND t.project_id = ?`, [projectId, projectId]);
    if (active?.id) return String(active.id);
    const latest = this.one('SELECT id FROM conversation_threads WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1', [projectId]);
    if (latest?.id) {
      const conversationId = String(latest.id);
      this.setWorkspaceState(projectId, conversationId);
      await this.persist();
      return conversationId;
    }
    const state = await this.createConversation();
    return state.activeConversationId;
  }

  private setWorkspaceState(projectId: string, conversationId: string): void {
    this.ready().run(`INSERT INTO workspace_state (project_id, active_conversation_id, layout_json, updated_at)
      VALUES (?, ?, NULL, ?) ON CONFLICT(project_id) DO UPDATE SET active_conversation_id = excluded.active_conversation_id, updated_at = excluded.updated_at`,
    [projectId, conversationId, Date.now()]);
  }

  private async assertConversation(conversationId: string): Promise<string> {
    if (!conversationId?.trim()) throw new Error('Conversation id is required.');
    const projectId = await this.projectId();
    if (!this.one('SELECT id FROM conversation_threads WHERE id = ? AND project_id = ?', [conversationId, projectId])) {
      throw new Error('The conversation does not belong to the active workspace.');
    }
    return conversationId;
  }

  private async projectId(): Promise<string> {
    const project = await this.dashboard();
    if (!project) throw new Error('No project metadata exists.');
    return project.id;
  }

  private goals(projectId: string): Goal[] {
    return this.all('SELECT * FROM goals WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map((row) => ({
      id: String(row.id), title: String(row.title), description: row.description ? String(row.description) : undefined,
      status: String(row.status) as Goal['status'], createdAt: Number(row.created_at), updatedAt: Number(row.updated_at)
    }));
  }

  private tasks(projectId: string): Task[] {
    return this.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map((row) => ({
      id: String(row.id), title: String(row.title), description: row.description ? String(row.description) : undefined,
      status: String(row.status) as Task['status'], priority: String(row.priority) as Task['priority'], createdAt: Number(row.created_at), updatedAt: Number(row.updated_at)
    }));
  }

  private all(sql: string, params: SqlValue[] = []): Row[] {
    const result = this.ready().exec(sql, params);
    if (!result[0]) return [];
    return result[0].values.map((values) => Object.fromEntries(result[0].columns.map((column, index) => [column, values[index]])));
  }

  private one(sql: string, params: SqlValue[] = []): Row | undefined { return this.all(sql, params)[0]; }
  private ready(): Database { if (!this.db) throw new Error('Storage is not initialized.'); return this.db; }
  private async persist(): Promise<void> { if (this.db && this.filePath) await fs.writeFile(this.filePath, this.db.export()); }
}
