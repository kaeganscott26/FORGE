===================

Now the storage package with SQLite, plus the stub packages for AI, search, memory, and plugin SDK: 

===================


/**
 * @forge/storage — SQLite metadata storage service
 *
 * Manages project metadata, goals, tasks, and future indexing data
 * in a per-workspace SQLite database. The database lives at
 * `<workspace>/.forge/metadata.db` and is created automatically.
 *
 * In Phase 2+, this also stores embedding metadata and search indexes.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProjectMetadata, Goal, Task } from '@forge/ipc';

// We use better-sqlite3 for synchronous, fast access from the main process
// The import is dynamic so the package is optional at scaffold time
let Database: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Database = require('better-sqlite3');
} catch {
  // better-sqlite3 not installed yet — will be added as dependency
}

export class StorageService {
  private db: any = null;
  private dbPath: string | null = null;

  /** Initialize storage for a workspace */
  async init(rootPath: string): Promise<void> {
    const forgeDir = path.join(rootPath, '.forge');
    await fs.mkdir(forgeDir, { recursive: true });
    this.dbPath = path.join(forgeDir, 'metadata.db');

    if (!Database) {
      throw new Error(
        'better-sqlite3 is not installed. Run npm install in the workspace root.',
      );
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  isReady(): boolean {
    return this.db !== null;
  }

  /** Run database migrations */
  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        tags TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        assignee TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        linked_files TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        model TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_embeddings_path ON embeddings(file_path);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(project_id);

      -- Phase 2: Search index
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL UNIQUE,
        file_type TEXT,
        title TEXT,
        tags TEXT DEFAULT '[]',
        headings TEXT DEFAULT '[]',
        content TEXT NOT NULL,
        indexed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        model TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
        content,
        document_id UNINDEXED,
        file_path UNINDEXED
      );

      CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);
      CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);

      -- Phase 3: Knowledge graph
      CREATE TABLE IF NOT EXISTS graph_nodes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        file_path TEXT,
        tags TEXT DEFAULT '[]',
        size INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS graph_edges (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
        target TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        UNIQUE(source, target, type)
      );

      CREATE INDEX IF NOT EXISTS idx_edges_source ON graph_edges(source);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON graph_edges(target);

      -- Phase 4: AI operations log
      CREATE TABLE IF NOT EXISTS operation_log (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        prompt TEXT,
        tool_name TEXT,
        input TEXT,
        output TEXT,
        side_effects TEXT,
        approved INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      -- Phase 4: Plugin state
      CREATE TABLE IF NOT EXISTS plugin_state (
        id TEXT PRIMARY KEY,
        plugin_id TEXT NOT NULL UNIQUE,
        enabled INTEGER DEFAULT 0,
        config TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Phase 2: Provider settings (no API keys stored here — use safeStorage)
      CREATE TABLE IF NOT EXISTS provider_settings (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        base_url TEXT,
        is_configured INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  // ─── Project ─────────────────────────────────────────────────────────────

  getProject(rootPath: string): ProjectMetadata | null {
    const row = this.db.prepare(
      'SELECT * FROM projects WHERE root_path = ?',
    ).get(rootPath);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      rootPath: row.root_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      goals: this.getGoals(row.id),
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  createProject(rootPath: string, name: string): ProjectMetadata {
    const now = Date.now();
    const id = this.generateId();
    this.db.prepare(
      `INSERT INTO projects (id, name, root_path, created_at, updated_at, tags)
       VALUES (?, ?, ?, ?, ?, '[]')`,
    ).run(id, name, rootPath, now, now);

    return {
      id,
      name,
      rootPath,
      createdAt: now,
      updatedAt: now,
      goals: [],
      tags: [],
    };
  }

  updateProject(id: string, updates: Partial<ProjectMetadata>): ProjectMetadata | null {
    const now = Date.now();
    const current = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!current) return null;

    const merged = {
      name: updates.name ?? current.name,
      updated_at: now,
      tags: JSON.stringify(updates.tags ?? JSON.parse(current.tags || '[]')),
    };

    this.db.prepare(
      'UPDATE projects SET name = ?, updated_at = ?, tags = ? WHERE id = ?',
    ).run(merged.name, merged.updated_at, merged.tags, id);

    return this.getProject(current.root_path);
  }

  // ─── Goals ───────────────────────────────────────────────────────────────

  getGoals(projectId: string): Goal[] {
    const rows = this.db.prepare(
      'SELECT * FROM goals WHERE project_id = ? ORDER BY created_at DESC',
    ).all(projectId);

    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  createGoal(projectId: string, title: string, description?: string): Goal {
    const now = Date.now();
    const id = this.generateId();
    this.db.prepare(
      `INSERT INTO goals (id, project_id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    ).run(id, projectId, title, description ?? null, now, now);

    return { id, title, description, status: 'active', createdAt: now, updatedAt: now };
  }

  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const now = Date.now();
    const current = this.db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    if (!current) return null;

    this.db.prepare(
      `UPDATE goals SET
        title = ?,
        description = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      updates.title ?? current.title,
      updates.description ?? current.description,
      updates.status ?? current.status,
      now,
      id,
    );

    return this.getGoalById(id);
  }

  private getGoalById(id: string): Goal | null {
    const r = this.db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id, title: r.title, description: r.description,
      status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────

  getTasks(projectId: string): Task[] {
    const rows = this.db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
    ).all(projectId);

    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      assignee: r.assignee,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      linkedFiles: JSON.parse(r.linked_files || '[]'),
    }));
  }

  createTask(
    projectId: string,
    title: string,
    description?: string,
    priority: Task['priority'] = 'medium',
  ): Task {
    const now = Date.now();
    const id = this.generateId();
    this.db.prepare(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, created_at, updated_at, linked_files)
       VALUES (?, ?, ?, ?, 'to