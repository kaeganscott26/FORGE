import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  type BrowserBookmark,
  type BrowserHistoryEntry,
  type ConversationEntry,
  type ConversationState,
  type ConversationThread,
  type Goal,
  type ProjectMetadata,
  type Task,
  type TaskArtifact,
  type TaskCheckpoint,
  type TaskDraft,
  type TaskEvent,
  type TaskEventType,
  type TaskExternalReference,
  type TaskStatus,
  type TaskStep,
  type TaskStepStatus,
  type WorkspaceLayout
} from '@forge/ipc';

type Row = Record<string, unknown>;
const id = (): string => randomUUID();
const CURRENT_SCHEMA_VERSION = 8;
const MAX_MEMORY_CONTENT_CHARS = 200_000;
const MAX_MEMORY_METADATA_CHARS = 100_000;
const TASK_STATUSES = new Set<TaskStatus>(['draft', 'ready', 'running', 'waiting', 'blocked', 'paused', 'failed', 'cancelled', 'completed']);
const STEP_STATUSES = new Set<TaskStepStatus>(['pending', 'running', 'waiting', 'blocked', 'failed', 'skipped', 'completed']);

export interface StoredActionRecord {
  id: string; timestamp: number; workspaceId: string; conversationId: string; modelId: string; toolName: string;
  taskId?: string; stepId?: string;
  sanitizedInputs: unknown; executionDurationMs: number;
  approvalDecision: 'automatic' | 'run-once' | 'session' | 'rejected' | 'cancelled' | 'validation-failed'; success: boolean; result: unknown; resultSummary: string; affectedPaths: string[]; exitCode?: number | null;
  rollback?: { available: boolean; instructions?: string; backupPath?: string };
}

export interface ProjectObservation {
  id: string;
  workspaceId: string;
  kind: string;
  timestamp: number;
  payload: unknown;
}

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

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function sanitizeTaskData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeTaskData);
  if (!value || typeof value !== 'object') return typeof value === 'string' && /(?:sk-|github_pat_|gh[oprsu]_)[A-Za-z0-9_-]{10,}/.test(value) ? '[REDACTED]' : value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, /token|secret|password|authorization|credential|api.?key/i.test(key) ? '[REDACTED]' : sanitizeTaskData(entry)]));
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
  private persistQueue: Promise<void> = Promise.resolve();

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
    return this.createPersistentTask({ title, description, taskType: 'general', priority, progressSummary: 'Draft task created from workspace metadata.', resumeInstructions: 'Inspect the workspace and define verified steps before starting.', steps: [] });
  }

  async createPersistentTask(draft: TaskDraft): Promise<Task> {
    if (!draft.title.trim()) throw new Error('Task title is required.');
    if (draft.title.length > 240) throw new Error('Task title is too long.');
    if (!draft.taskType.trim()) throw new Error('Task type is required.');
    if (draft.taskType.length > 100 || (draft.description?.length ?? 0) > 20_000) throw new Error('Task type or description is too long.');
    if (!draft.resumeInstructions.trim()) throw new Error('Safe resume instructions are required.');
    if (draft.resumeInstructions.length > 20_000 || draft.steps.length > 200 || (draft.taskDependencies?.length ?? 0) > 100) throw new Error('Task resume instructions, steps, or dependencies exceed the storage limit.');
    if (JSON.stringify(sanitizeTaskData(draft)).length > 1_000_000) throw new Error('Task definition exceeds the one-megabyte storage limit.');
    const projectId = await this.projectId();
    if (draft.originatingConversationId) await this.assertConversation(draft.originatingConversationId);
    for (const dependency of draft.taskDependencies ?? []) await this.assertTask(dependency);
    const taskId = id(); const now = Date.now(); const stepIds = draft.steps.map((step) => step.id ?? id());
    if (new Set(stepIds).size !== stepIds.length) throw new Error('Task step IDs must be unique.');
    const stepIdSet = new Set(stepIds);
    for (let index = 0; index < draft.steps.length; index += 1) {
      const step = draft.steps[index];
      if (!step.name.trim() || step.name.length > 240 || !step.purpose.trim() || step.purpose.length > 10_000) throw new Error('Task step name or purpose is invalid.');
      if (![0, 1, 2].includes(step.riskTier) || (step.requiredTool?.length ?? 0) > 200) throw new Error('Task step risk tier or required tool is invalid.');
      if (!Array.isArray(step.verificationCriteria) || step.verificationCriteria.length > 100 || step.verificationCriteria.some((criterion) => !criterion.trim() || criterion.length > 2_000)) throw new Error('Task step verification criteria are invalid.');
      for (const dependency of draft.steps[index].dependencies ?? []) if (!stepIdSet.has(dependency) || dependency === stepIds[index]) throw new Error('Task step dependency is invalid.');
    }
    this.assertAcyclicSteps(stepIds, draft.steps.map((step) => step.dependencies ?? []));
    this.ready().run(`INSERT INTO tasks (id, project_id, title, description, status, priority, created_at, updated_at, task_type, originating_conversation_id, last_active_conversation_id, assigned_provider, assigned_model, progress_summary, resumability_state, resume_instructions, associated_branch, associated_commit_sha, associated_pull_request, associated_release_tag, associated_workflow_run, process_ids, external_resource_ids)
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resumable', ?, ?, ?, ?, ?, ?, '[]', '[]')`, [taskId, projectId, draft.title.trim(), draft.description ?? null, draft.priority ?? 'medium', now, now, draft.taskType.trim(), draft.originatingConversationId ?? null, draft.originatingConversationId ?? null, draft.assignedProvider ?? null, draft.assignedModel ?? null, draft.progressSummary ?? 'Draft task created.', draft.resumeInstructions.trim(), draft.associatedBranch ?? null, draft.associatedCommitSha ?? null, draft.associatedPullRequest ?? null, draft.associatedReleaseTag ?? null, draft.associatedWorkflowRun ?? null]);
    for (const dependency of draft.taskDependencies ?? []) this.ready().run('INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)', [taskId, dependency]);
    for (let index = 0; index < draft.steps.length; index += 1) {
      const step = draft.steps[index]; const stepId = stepIds[index];
      const retryPolicy = { maxAttempts: Math.max(1, step.retryPolicy?.maxAttempts ?? 1), backoffMs: Math.max(0, step.retryPolicy?.backoffMs ?? 0), retryableErrorCodes: step.retryPolicy?.retryableErrorCodes ?? [] };
      this.ready().run(`INSERT INTO task_steps (id, task_id, position, name, purpose, status, risk_tier, required_tool, expected_input, expected_output, attempts, retry_policy, timeout_ms, approval_state, artifact_paths, verification_criteria, rollback_instructions, audit_references)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, '[]')`, [stepId, taskId, index, step.name.trim(), step.purpose.trim(), step.riskTier, step.requiredTool ?? null, JSON.stringify(sanitizeTaskData(step.expectedInput ?? null)), JSON.stringify(sanitizeTaskData(step.expectedOutput ?? null)), JSON.stringify(retryPolicy), Math.max(100, step.timeoutMs ?? 120_000), step.riskTier === 0 ? 'not-required' : 'required', JSON.stringify(step.artifactPaths ?? []), JSON.stringify(step.verificationCriteria), step.rollbackInstructions ?? null]);
      for (const dependency of step.dependencies ?? []) this.ready().run('INSERT INTO task_step_dependencies (task_id, step_id, depends_on_step_id) VALUES (?, ?, ?)', [taskId, stepId, dependency]);
    }
    this.appendTaskEventRow(taskId, undefined, 'task.created', 'Workspace-owned task created in draft state.', { taskType: draft.taskType });
    await this.persist();
    return this.getPersistentTask(taskId);
  }

  async listPersistentTasks(limit = 100): Promise<Task[]> {
    const projectId = await this.projectId();
    return this.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT ?', [projectId, Math.min(Math.max(limit, 1), 500)]).map((row) => this.taskFromRow(row));
  }

  async getPersistentTask(taskId: string): Promise<Task> {
    const row = await this.assertTask(taskId);
    return this.taskFromRow(row);
  }

  async setPersistentTaskState(taskId: string, status: TaskStatus, options: { summary: string; eventType: TaskEventType; interruptionReason?: string; currentStepId?: string | null; lastActiveConversationId?: string; resumabilityState?: Task['resumabilityState']; details?: unknown; auditReference?: string } ): Promise<Task> {
    if (!TASK_STATUSES.has(status)) throw new Error('Task status is invalid.');
    const row = await this.assertTask(taskId); const now = Date.now();
    if (options.lastActiveConversationId) await this.assertConversation(options.lastActiveConversationId);
    const startedAt = status === 'running' && row.started_at === null ? now : row.started_at;
    const completedAt = status === 'completed' ? now : null;
    this.ready().run(`UPDATE tasks SET status = ?, current_step_id = ?, updated_at = ?, started_at = ?, completed_at = ?, last_active_conversation_id = COALESCE(?, last_active_conversation_id), progress_summary = ?, interruption_reason = ?, resumability_state = COALESCE(?, resumability_state) WHERE id = ? AND project_id = ?`, [status, options.currentStepId === undefined ? row.current_step_id as SqlValue : options.currentStepId, now, startedAt as SqlValue, completedAt, options.lastActiveConversationId ?? null, options.summary, options.interruptionReason ?? null, options.resumabilityState ?? null, taskId, await this.projectId()]);
    this.appendTaskEventRow(taskId, options.currentStepId ?? undefined, options.eventType, options.summary, options.details, options.auditReference);
    await this.persist(); return this.getPersistentTask(taskId);
  }

  async setTaskStepState(taskId: string, stepId: string, status: TaskStepStatus, options: { summary: string; error?: TaskStep['lastError']; externalProcessId?: number | null; outputPath?: string | null; approvalState?: TaskStep['approvalState']; auditReference?: string; incrementAttempts?: boolean; eventType?: TaskEventType }): Promise<Task> {
    if (!STEP_STATUSES.has(status)) throw new Error('Task step status is invalid.');
    const row = await this.assertTaskStep(taskId, stepId); const now = Date.now();
    const startedAt = status === 'pending' ? null : now; const completedAt = ['completed', 'skipped'].includes(status) ? now : null;
    const externalProcessId = options.externalProcessId === undefined ? row.external_process_id as SqlValue : options.externalProcessId;
    const outputPath = options.outputPath === undefined ? row.output_path as SqlValue : options.outputPath;
    this.ready().run(`UPDATE task_steps SET status = ?, started_at = COALESCE(started_at, ?), completed_at = ?, attempts = attempts + ?, last_error = ?, external_process_id = ?, output_path = ?, approval_state = COALESCE(?, approval_state) WHERE id = ? AND task_id = ?`, [status, startedAt, completedAt, options.incrementAttempts ? 1 : 0, options.error ? JSON.stringify(sanitizeTaskData(options.error)) : null, externalProcessId, outputPath, options.approvalState ?? null, stepId, taskId]);
    this.ready().run('UPDATE tasks SET current_step_id = ?, updated_at = ?, progress_summary = ? WHERE id = ?', [stepId, now, options.summary, taskId]);
    const eventType = options.eventType ?? (status === 'completed' ? 'step.completed' : status === 'failed' ? 'step.failed' : status === 'waiting' ? 'step.waiting' : status === 'running' ? 'step.started' : 'state.reconciled');
    this.appendTaskEventRow(taskId, stepId, eventType, options.summary, options.error, options.auditReference);
    await this.persist(); return this.getPersistentTask(taskId);
  }

  async appendTaskCheckpoint(taskId: string, checkpoint: { stepId?: string; name: string; summary: string; verified: boolean; evidence?: unknown; auditReferences?: string[] }): Promise<TaskCheckpoint> {
    await this.assertTask(taskId); if (checkpoint.stepId) await this.assertTaskStep(taskId, checkpoint.stepId);
    const projectId = await this.projectId();
    for (const reference of checkpoint.auditReferences ?? []) if (!this.one('SELECT id FROM action_log WHERE id = ? AND project_id = ?', [reference, projectId])) throw new Error('Task checkpoint audit reference does not exist in the active workspace.');
    const value: TaskCheckpoint = { id: id(), taskId, stepId: checkpoint.stepId, name: checkpoint.name, summary: checkpoint.summary, verified: checkpoint.verified, evidence: sanitizeTaskData(checkpoint.evidence ?? null), auditReferences: checkpoint.auditReferences ?? [], createdAt: Date.now() };
    this.ready().run('INSERT INTO task_checkpoints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [value.id, projectId, taskId, value.stepId ?? null, value.name, value.summary, value.verified ? 1 : 0, JSON.stringify(value.evidence), JSON.stringify(value.auditReferences), value.createdAt]);
    await this.persist(); return value;
  }

  async recordTaskApproval(taskId: string, stepId: string, approval: { toolRequestId?: string; decision: Task['approvals'][number]['decision']; scope: string; decidedAt?: number; expiresAt?: number; auditReference?: string }): Promise<Task['approvals'][number]> {
    await this.assertTaskStep(taskId, stepId); const projectId = await this.projectId(); const now = Date.now();
    const value: Task['approvals'][number] = { id: id(), taskId, stepId, toolRequestId: approval.toolRequestId, decision: approval.decision, scope: approval.scope, requestedAt: now, decidedAt: approval.decidedAt, expiresAt: approval.expiresAt, auditReference: approval.auditReference };
    this.ready().run('INSERT INTO task_approvals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [value.id, projectId, taskId, stepId, value.toolRequestId ?? null, value.decision, value.scope, value.requestedAt, value.decidedAt ?? null, value.expiresAt ?? null, value.auditReference ?? null]);
    const approvalState: TaskStep['approvalState'] = approval.decision === 'run-once' || approval.decision === 'session' ? 'approved' : approval.decision;
    this.ready().run('UPDATE task_steps SET approval_state = ? WHERE id = ? AND task_id = ?', [approvalState, stepId, taskId]);
    await this.persist(); return value;
  }

  async appendTaskEvent(taskId: string, event: { stepId?: string; type: TaskEventType; summary: string; details?: unknown; auditReference?: string }): Promise<TaskEvent> {
    await this.assertTask(taskId); if (event.stepId) await this.assertTaskStep(taskId, event.stepId);
    const eventId = id(); const createdAt = Date.now(); const projectId = await this.projectId();
    this.ready().run('INSERT INTO task_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [eventId, projectId, taskId, event.stepId ?? null, event.type, event.summary, event.details === undefined ? null : JSON.stringify(sanitizeTaskData(event.details)), event.auditReference ?? null, createdAt]);
    await this.persist(); return { id: eventId, taskId, stepId: event.stepId, type: event.type, summary: event.summary, details: sanitizeTaskData(event.details), auditReference: event.auditReference, createdAt };
  }

  async updateTaskReality(taskId: string, reality: { associatedBranch?: string; associatedCommitSha?: string; processIds?: number[]; externalResourceIds?: string[] }): Promise<void> {
    await this.assertTask(taskId); const projectId = await this.projectId();
    this.ready().run(`UPDATE tasks SET associated_branch = COALESCE(?, associated_branch), associated_commit_sha = COALESCE(?, associated_commit_sha), process_ids = COALESCE(?, process_ids), external_resource_ids = COALESCE(?, external_resource_ids), updated_at = ? WHERE id = ? AND project_id = ?`, [reality.associatedBranch ?? null, reality.associatedCommitSha ?? null, reality.processIds ? JSON.stringify(reality.processIds) : null, reality.externalResourceIds ? JSON.stringify(reality.externalResourceIds) : null, Date.now(), taskId, projectId]);
    await this.persist();
  }

  async linkTaskStepAudit(taskId: string, stepId: string, auditReference: string): Promise<void> {
    const row = await this.assertTaskStep(taskId, stepId); const projectId = await this.projectId();
    if (!this.one('SELECT id FROM action_log WHERE id = ? AND project_id = ?', [auditReference, projectId])) throw new Error('Task step audit reference does not exist in the active workspace.');
    const references = parseJson<string[]>(row.audit_references, []);
    if (!references.includes(auditReference)) references.push(auditReference);
    this.ready().run('UPDATE task_steps SET audit_references = ? WHERE id = ? AND task_id = ?', [JSON.stringify(references), stepId, taskId]);
    await this.persist();
  }

  async appendTaskArtifact(taskId: string, artifact: Omit<TaskArtifact, 'id' | 'taskId' | 'createdAt'>): Promise<TaskArtifact> {
    await this.assertTask(taskId); if (artifact.stepId) await this.assertTaskStep(taskId, artifact.stepId);
    const value: TaskArtifact = { ...artifact, id: id(), taskId, metadata: sanitizeTaskData(artifact.metadata), createdAt: Date.now() };
    this.ready().run('INSERT INTO task_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [value.id, await this.projectId(), taskId, value.stepId ?? null, value.kind, value.path ?? null, value.uri ?? null, value.sha256 ?? null, value.size ?? null, value.verifiedAt ?? null, value.metadata === undefined ? null : JSON.stringify(value.metadata), value.createdAt]);
    await this.persist(); return value;
  }

  async upsertTaskExternalReference(taskId: string, reference: Omit<TaskExternalReference, 'id' | 'taskId' | 'createdAt' | 'updatedAt'>): Promise<TaskExternalReference> {
    await this.assertTask(taskId); if (reference.stepId) await this.assertTaskStep(taskId, reference.stepId);
    const projectId = await this.projectId(); const existing = this.one('SELECT id, created_at FROM task_external_references WHERE task_id = ? AND type = ? AND external_id = ?', [taskId, reference.type, reference.externalId]); const now = Date.now();
    const value: TaskExternalReference = { ...reference, id: existing ? String(existing.id) : id(), taskId, metadata: sanitizeTaskData(reference.metadata), createdAt: existing ? Number(existing.created_at) : now, updatedAt: now };
    this.ready().run(`INSERT INTO task_external_references (id, project_id, task_id, step_id, type, provider, external_id, url, state, metadata, verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id, type, external_id) DO UPDATE SET step_id = excluded.step_id, provider = excluded.provider, url = excluded.url, state = excluded.state, metadata = excluded.metadata, verified_at = excluded.verified_at, updated_at = excluded.updated_at`, [value.id, projectId, taskId, value.stepId ?? null, value.type, value.provider ?? null, value.externalId, value.url ?? null, value.state ?? null, value.metadata === undefined ? null : JSON.stringify(value.metadata), value.verifiedAt ?? null, value.createdAt, value.updatedAt]);
    await this.persist(); return value;
  }

  async deleteConversation(conversationId: string): Promise<ConversationState> {
    const validId = await this.assertConversation(conversationId); const projectId = await this.projectId();
    this.ready().run('DELETE FROM conversations WHERE thread_id = ? AND project_id = ?', [validId, projectId]);
    this.ready().run('DELETE FROM conversation_threads WHERE id = ? AND project_id = ?', [validId, projectId]);
    this.ready().run('UPDATE workspace_state SET active_conversation_id = NULL, updated_at = ? WHERE project_id = ? AND active_conversation_id = ?', [Date.now(), projectId, validId]);
    await this.persist();
    return this.conversationState();
  }

  async clearAllConversations(): Promise<ConversationState> {
    const projectId = await this.projectId();
    this.ready().run('DELETE FROM conversations WHERE project_id = ?', [projectId]);
    this.ready().run('DELETE FROM conversation_threads WHERE project_id = ?', [projectId]);
    this.ready().run('UPDATE workspace_state SET active_conversation_id = NULL, updated_at = ? WHERE project_id = ?', [Date.now(), projectId]);
    await this.persist();
    return this.conversationState();
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
    if (content.length > MAX_MEMORY_CONTENT_CHARS) throw new Error(`Memory content exceeds the ${MAX_MEMORY_CONTENT_CHARS.toLocaleString()} character safety limit.`);
    const serializedMetadata = metadata === undefined ? null : JSON.stringify(metadata);
    if ((serializedMetadata?.length ?? 0) > MAX_MEMORY_METADATA_CHARS) throw new Error('Memory metadata exceeds the storage safety limit.');
    const projectId = await this.projectId();
    const now = Date.now();
    const memoryId = id();
    this.ready().run('INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [memoryId, projectId, type, title ?? null, content, serializedMetadata, now, now]);
    await this.persist();
    return { id: memoryId, type, title, content, metadata, createdAt: now, updatedAt: now };
  }

  async listMemories(limit = 100, contentLimit = 12_000): Promise<Array<{ id: string; type: string; title?: string | null; content: string; contentLength: number; metadata?: unknown; createdAt: number; updatedAt: number }>> {
    const projectId = await this.projectId();
    const boundedLimit = Math.max(0, Math.min(24_000, Math.floor(contentLimit)));
    return this.all('SELECT id, type, title, substr(content, 1, ?) AS content, length(content) AS content_length, metadata, created_at, updated_at FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [boundedLimit, projectId, Math.max(1, Math.min(2_000, Math.floor(limit)))]).map((row) => ({
      id: String(row.id),
      type: String(row.type),
      title: row.title ? String(row.title) : null,
      content: String(row.content),
      contentLength: Number(row.content_length),
      metadata: parseJson(row.metadata, undefined),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  async memoryStats(): Promise<{ recordCount: number; indexedCount: number; durableCount: number; totalContentChars: number; largestContentChars: number }> {
    const projectId = await this.projectId();
    const records = this.all('SELECT metadata, length(content) AS content_length FROM memories WHERE project_id = ?', [projectId]);
    const indexedCount = records.filter((record) => (parseJson<Record<string, unknown> | undefined>(record.metadata, undefined)?.origin === 'workspace-index')).length;
    const lengths = records.map((record) => Number(record.content_length) || 0);
    return { recordCount: records.length, indexedCount, durableCount: records.length - indexedCount, totalContentChars: lengths.reduce((sum, length) => sum + length, 0), largestContentChars: Math.max(0, ...lengths) };
  }

  async updateMemory(memoryId: string, fields: { type?: string; title?: string | null; content?: string; metadata?: unknown }): Promise<void> {
    const projectId = await this.projectId();
    const set: string[] = [];
    const params: SqlValue[] = [];
    if (fields.type !== undefined) { set.push('type = ?'); params.push(fields.type); }
    if (fields.title !== undefined) { set.push('title = ?'); params.push(fields.title); }
    if (fields.content !== undefined) {
      if (fields.content.length > MAX_MEMORY_CONTENT_CHARS) throw new Error(`Memory content exceeds the ${MAX_MEMORY_CONTENT_CHARS.toLocaleString()} character safety limit.`);
      set.push('content = ?'); params.push(fields.content);
    }
    if (fields.metadata !== undefined) {
      const serializedMetadata = fields.metadata ? JSON.stringify(fields.metadata) : null;
      if ((serializedMetadata?.length ?? 0) > MAX_MEMORY_METADATA_CHARS) throw new Error('Memory metadata exceeds the storage safety limit.');
      set.push('metadata = ?'); params.push(serializedMetadata);
    }
    if (!set.length) return;
    params.push(Date.now(), memoryId, projectId);
    this.ready().run(`UPDATE memories SET ${set.join(', ')}, updated_at = ? WHERE id = ? AND project_id = ?`, params);
    await this.persist();
  }

  async deleteMemory(memoryId: string): Promise<void> {
    this.ready().run('DELETE FROM memories WHERE id = ? AND project_id = ?', [memoryId, await this.projectId()]);
    await this.persist();
  }

  async clearMemories(): Promise<{ deleted: number }> {
    const projectId = await this.projectId();
    const deleted = Number(this.one('SELECT COUNT(*) AS count FROM memories WHERE project_id = ?', [projectId])?.count ?? 0);
    this.ready().run('DELETE FROM memories WHERE project_id = ?', [projectId]);
    await this.persist();
    return { deleted };
  }

  async deletePersistentTask(taskId: string): Promise<void> {
    await this.assertTask(taskId);
    const projectId = await this.projectId();
    this.ready().run('DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_task_id = ?', [taskId, taskId]);
    this.ready().run('DELETE FROM tasks WHERE id = ? AND project_id = ?', [taskId, projectId]);
    await this.persist();
  }

  async listBrowserBookmarks(limit = 80): Promise<BrowserBookmark[]> {
    const projectId = await this.projectId();
    return this.all('SELECT id, url, title, created_at FROM browser_bookmarks WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [projectId, Math.max(1, Math.min(200, limit))]).map((row) => ({ id: String(row.id), url: String(row.url), title: String(row.title), createdAt: Number(row.created_at) }));
  }

  async addBrowserBookmark(url: string, title: string): Promise<void> {
    const projectId = await this.projectId(); const now = Date.now();
    this.ready().run(`INSERT INTO browser_bookmarks (id, project_id, url, title, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, url) DO UPDATE SET title = excluded.title, created_at = excluded.created_at`, [id(), projectId, url, title.slice(0, 500) || url, now]);
    await this.persist();
  }

  async deleteBrowserBookmark(bookmarkId: string): Promise<void> {
    this.ready().run('DELETE FROM browser_bookmarks WHERE id = ? AND project_id = ?', [bookmarkId, await this.projectId()]);
    await this.persist();
  }

  async listBrowserHistory(limit = 120): Promise<BrowserHistoryEntry[]> {
    const projectId = await this.projectId();
    return this.all('SELECT id, url, title, visited_at, visit_count FROM browser_history WHERE project_id = ? ORDER BY visited_at DESC LIMIT ?', [projectId, Math.max(1, Math.min(300, limit))]).map((row) => ({ id: String(row.id), url: String(row.url), title: String(row.title), visitedAt: Number(row.visited_at), visitCount: Number(row.visit_count) }));
  }

  async recordBrowserVisit(url: string, title: string): Promise<void> {
    const projectId = await this.projectId(); const now = Date.now();
    this.ready().run(`INSERT INTO browser_history (id, project_id, url, title, visited_at, visit_count) VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(project_id, url) DO UPDATE SET title = excluded.title, visited_at = excluded.visited_at, visit_count = browser_history.visit_count + 1`, [id(), projectId, url, title.slice(0, 500) || url, now]);
    await this.persist();
  }

  async workspaceId(): Promise<string> { return this.projectId(); }

  /** Durable, bounded project observations used to invalidate stale context. */
  async recordProjectObservation(kind: string, payload: unknown): Promise<ProjectObservation> {
    if (!/^[a-z]+(?:[.-][a-z]+)+$/.test(kind)) throw new Error('Project observation kind is invalid.');
    const workspaceId = await this.projectId(); const timestamp = Date.now();
    const observation: ProjectObservation = { id: id(), workspaceId, kind, timestamp, payload: sanitizeTaskData(payload) };
    this.ready().run('BEGIN');
    try {
      this.ready().run('INSERT INTO project_observations (id, project_id, kind, timestamp, payload) VALUES (?, ?, ?, ?, ?)', [observation.id, workspaceId, kind, timestamp, JSON.stringify(observation.payload)]);
      this.ready().run(`INSERT INTO project_context_state (project_id, invalidated_at, invalidation_reasons, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET invalidated_at = excluded.invalidated_at, invalidation_reasons = excluded.invalidation_reasons, updated_at = excluded.updated_at`, [workspaceId, timestamp, JSON.stringify([kind]), timestamp]);
      this.ready().run('UPDATE projects SET updated_at = ? WHERE id = ?', [timestamp, workspaceId]);
      this.ready().run('COMMIT');
    } catch (error) { this.ready().run('ROLLBACK'); throw error; }
    await this.persist();
    return observation;
  }

  async listProjectObservations(limit = 40): Promise<ProjectObservation[]> {
    const workspaceId = await this.projectId();
    return this.all('SELECT * FROM project_observations WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?', [workspaceId, Math.min(Math.max(limit, 1), 200)]).map((row) => ({ id: String(row.id), workspaceId: String(row.project_id), kind: String(row.kind), timestamp: Number(row.timestamp), payload: parseJson(row.payload, null) }));
  }

  async appendAction(record: StoredActionRecord): Promise<void> {
    const projectId = await this.projectId();
    if (record.workspaceId !== projectId) throw new Error('Audit record belongs to another workspace.');
    this.ready().run(`INSERT INTO action_log (id, project_id, timestamp, conversation_id, model_id, tool_name, task_id, step_id, sanitized_inputs, approval_decision, execution_duration_ms, success, result_json, result_summary, affected_paths, exit_code, rollback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.id, projectId, record.timestamp, record.conversationId, record.modelId, record.toolName, record.taskId ?? null, record.stepId ?? null, JSON.stringify(record.sanitizedInputs ?? null), record.approvalDecision, record.executionDurationMs, record.success ? 1 : 0, JSON.stringify(record.result ?? null), record.resultSummary, JSON.stringify(record.affectedPaths), record.exitCode ?? null, record.rollback ? JSON.stringify(record.rollback) : null]);
    await this.persist();
  }

  async listActions(filters: { conversationId?: string; toolName?: string; success?: boolean; from?: number; to?: number } = {}): Promise<StoredActionRecord[]> {
    const clauses = ['project_id = ?']; const params: SqlValue[] = [await this.projectId()];
    if (filters.conversationId) { clauses.push('conversation_id = ?'); params.push(filters.conversationId); }
    if (filters.toolName) { clauses.push('tool_name = ?'); params.push(filters.toolName); }
    if (filters.success !== undefined) { clauses.push('success = ?'); params.push(filters.success ? 1 : 0); }
    if (filters.from !== undefined) { clauses.push('timestamp >= ?'); params.push(filters.from); }
    if (filters.to !== undefined) { clauses.push('timestamp <= ?'); params.push(filters.to); }
    params.push(500);
    return this.all(`SELECT * FROM action_log WHERE ${clauses.join(' AND ')} ORDER BY timestamp DESC LIMIT ?`, params).map((row) => ({
      id: String(row.id), timestamp: Number(row.timestamp), workspaceId: String(row.project_id), conversationId: String(row.conversation_id), modelId: String(row.model_id), toolName: String(row.tool_name), taskId: row.task_id ? String(row.task_id) : undefined, stepId: row.step_id ? String(row.step_id) : undefined,
      sanitizedInputs: row.sanitized_inputs ? JSON.parse(String(row.sanitized_inputs)) : null, approvalDecision: String(row.approval_decision) as StoredActionRecord['approvalDecision'], executionDurationMs: Number(row.execution_duration_ms),
      success: Boolean(row.success), result: row.result_json ? JSON.parse(String(row.result_json)) : { success: Boolean(row.success) }, resultSummary: String(row.result_summary), affectedPaths: row.affected_paths ? JSON.parse(String(row.affected_paths)) as string[] : [], exitCode: row.exit_code === null ? null : Number(row.exit_code), rollback: row.rollback ? JSON.parse(String(row.rollback)) : undefined
    }));
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
      CREATE TABLE IF NOT EXISTS project_observations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, timestamp INTEGER NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS project_context_state (project_id TEXT PRIMARY KEY, invalidated_at INTEGER, invalidation_reasons TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS action_log (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, timestamp INTEGER NOT NULL, conversation_id TEXT NOT NULL, model_id TEXT NOT NULL, tool_name TEXT NOT NULL, task_id TEXT, step_id TEXT, sanitized_inputs TEXT NOT NULL, approval_decision TEXT NOT NULL, execution_duration_ms INTEGER NOT NULL, success INTEGER NOT NULL, result_json TEXT NOT NULL DEFAULT '{}', result_summary TEXT NOT NULL, affected_paths TEXT NOT NULL, exit_code INTEGER, rollback TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS browser_bookmarks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(project_id, url), FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS browser_history (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, visited_at INTEGER NOT NULL, visit_count INTEGER NOT NULL DEFAULT 1, UNIQUE(project_id, url), FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
    `);
    const columns = this.all('PRAGMA table_info(conversations)').map((row) => String(row.name));
    if (!columns.includes('thread_id')) this.ready().run('ALTER TABLE conversations ADD COLUMN thread_id TEXT');
    const actionColumns = this.all('PRAGMA table_info(action_log)').map((row) => String(row.name));
    if (actionColumns.includes('risk_tier')) this.ready().run(`
      DROP INDEX IF EXISTS idx_action_log_project_timestamp;
      DROP INDEX IF EXISTS idx_action_log_conversation;
      ALTER TABLE action_log RENAME TO action_log_legacy;
      CREATE TABLE action_log (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, timestamp INTEGER NOT NULL, conversation_id TEXT NOT NULL, model_id TEXT NOT NULL, tool_name TEXT NOT NULL, sanitized_inputs TEXT NOT NULL, approval_decision TEXT NOT NULL, execution_duration_ms INTEGER NOT NULL, success INTEGER NOT NULL, result_json TEXT NOT NULL DEFAULT '{}', result_summary TEXT NOT NULL, affected_paths TEXT NOT NULL, exit_code INTEGER, rollback TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));
      INSERT INTO action_log (id, project_id, timestamp, conversation_id, model_id, tool_name, sanitized_inputs, approval_decision, execution_duration_ms, success, result_json, result_summary, affected_paths, exit_code, rollback)
        SELECT id, project_id, timestamp, conversation_id, model_id, tool_name, sanitized_inputs, approval_decision, execution_duration_ms, success, COALESCE(result_json, '{}'), result_summary, affected_paths, exit_code, rollback FROM action_log_legacy;
      DROP TABLE action_log_legacy;
    `);
    if (!actionColumns.includes('result_json')) this.ready().run("ALTER TABLE action_log ADD COLUMN result_json TEXT NOT NULL DEFAULT '{}'");
    const currentActionColumns = new Set(this.all('PRAGMA table_info(action_log)').map((row) => String(row.name)));
    if (!currentActionColumns.has('task_id')) this.ready().run('ALTER TABLE action_log ADD COLUMN task_id TEXT');
    if (!currentActionColumns.has('step_id')) this.ready().run('ALTER TABLE action_log ADD COLUMN step_id TEXT');
    const taskColumns = new Set(this.all('PRAGMA table_info(tasks)').map((row) => String(row.name)));
    const addTaskColumn = (name: string, definition: string): void => { if (!taskColumns.has(name)) this.ready().run(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`); };
    addTaskColumn('task_type', "TEXT NOT NULL DEFAULT 'general'");
    addTaskColumn('current_step_id', 'TEXT');
    addTaskColumn('started_at', 'INTEGER');
    addTaskColumn('completed_at', 'INTEGER');
    addTaskColumn('originating_conversation_id', 'TEXT');
    addTaskColumn('last_active_conversation_id', 'TEXT');
    addTaskColumn('assigned_provider', 'TEXT');
    addTaskColumn('assigned_model', 'TEXT');
    addTaskColumn('progress_summary', "TEXT NOT NULL DEFAULT 'Legacy workspace task imported.'");
    addTaskColumn('retry_metadata', 'TEXT');
    addTaskColumn('interruption_reason', 'TEXT');
    addTaskColumn('resumability_state', "TEXT NOT NULL DEFAULT 'resumable'");
    addTaskColumn('resume_instructions', "TEXT NOT NULL DEFAULT 'Inspect current workspace state before continuing.'");
    addTaskColumn('associated_branch', 'TEXT');
    addTaskColumn('associated_commit_sha', 'TEXT');
    addTaskColumn('associated_pull_request', 'TEXT');
    addTaskColumn('associated_release_tag', 'TEXT');
    addTaskColumn('associated_workflow_run', 'TEXT');
    addTaskColumn('process_ids', "TEXT NOT NULL DEFAULT '[]'");
    addTaskColumn('external_resource_ids', "TEXT NOT NULL DEFAULT '[]'");
    this.ready().run(`
      CREATE TABLE IF NOT EXISTS task_dependencies (task_id TEXT NOT NULL, depends_on_task_id TEXT NOT NULL, PRIMARY KEY(task_id, depends_on_task_id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(depends_on_task_id) REFERENCES tasks(id));
      CREATE TABLE IF NOT EXISTS task_steps (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, risk_tier INTEGER NOT NULL, required_tool TEXT, expected_input TEXT, expected_output TEXT, started_at INTEGER, completed_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, retry_policy TEXT NOT NULL DEFAULT '{}', timeout_ms INTEGER NOT NULL, approval_state TEXT NOT NULL, external_process_id INTEGER, output_path TEXT, artifact_paths TEXT NOT NULL DEFAULT '[]', verification_criteria TEXT NOT NULL DEFAULT '[]', rollback_instructions TEXT, audit_references TEXT NOT NULL DEFAULT '[]', UNIQUE(task_id, position), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS task_step_dependencies (task_id TEXT NOT NULL, step_id TEXT NOT NULL, depends_on_step_id TEXT NOT NULL, PRIMARY KEY(task_id, step_id, depends_on_step_id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE CASCADE, FOREIGN KEY(depends_on_step_id) REFERENCES task_steps(id));
      CREATE TABLE IF NOT EXISTS task_checkpoints (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, name TEXT NOT NULL, summary TEXT NOT NULL, verified INTEGER NOT NULL, evidence TEXT NOT NULL, audit_references TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_artifacts (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, kind TEXT NOT NULL, path TEXT, uri TEXT, sha256 TEXT, size INTEGER, verified_at INTEGER, metadata TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_external_references (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, provider TEXT, external_id TEXT NOT NULL, url TEXT, state TEXT, metadata TEXT, verified_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(task_id, type, external_id), FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_approvals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT NOT NULL, tool_request_id TEXT, decision TEXT NOT NULL, scope TEXT NOT NULL, requested_at INTEGER NOT NULL, decided_at INTEGER, expires_at INTEGER, audit_reference TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS task_events (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, summary TEXT NOT NULL, details TEXT, audit_reference TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
    `);
    this.ready().run("UPDATE tasks SET status = CASE status WHEN 'todo' THEN 'draft' WHEN 'in-progress' THEN 'running' WHEN 'done' THEN 'completed' ELSE status END");
    this.ready().run("UPDATE tasks SET completed_at = COALESCE(completed_at, updated_at), resumability_state = 'complete' WHERE status = 'completed'");
    this.ready().run(`
      CREATE INDEX IF NOT EXISTS idx_conversations_thread_created ON conversations(thread_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_conversation_threads_project_updated ON conversation_threads(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_action_log_project_timestamp ON action_log(project_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_project_observations_project_timestamp ON project_observations(project_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_action_log_conversation ON action_log(project_id, conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_updated ON tasks(project_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_steps_task_position ON task_steps(task_id, position);
      CREATE INDEX IF NOT EXISTS idx_task_checkpoints_task_created ON task_checkpoints(task_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_external_project_type ON task_external_references(project_id, type, external_id);
      CREATE INDEX IF NOT EXISTS idx_task_approvals_step ON task_approvals(task_id, step_id, requested_at DESC);
      CREATE INDEX IF NOT EXISTS idx_browser_bookmarks_project_created ON browser_bookmarks(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_browser_history_project_visited ON browser_history(project_id, visited_at DESC);
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

  private async assertTask(taskId: string): Promise<Row> {
    if (!taskId?.trim()) throw new Error('Task id is required.');
    const row = this.one('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [taskId, await this.projectId()]);
    if (!row) throw new Error('The task does not belong to the active workspace.');
    return row;
  }

  private async assertTaskStep(taskId: string, stepId: string): Promise<Row> {
    await this.assertTask(taskId);
    const row = this.one('SELECT * FROM task_steps WHERE id = ? AND task_id = ?', [stepId, taskId]);
    if (!row) throw new Error('The task step does not belong to the task.');
    return row;
  }

  private assertAcyclicSteps(stepIds: string[], dependencies: string[][]): void {
    const graph = new Map(stepIds.map((stepId, index) => [stepId, dependencies[index]])); const visiting = new Set<string>(); const visited = new Set<string>();
    const visit = (stepId: string): void => { if (visiting.has(stepId)) throw new Error('Task step dependencies contain a cycle.'); if (visited.has(stepId)) return; visiting.add(stepId); for (const dependency of graph.get(stepId) ?? []) visit(dependency); visiting.delete(stepId); visited.add(stepId); };
    for (const stepId of stepIds) visit(stepId);
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
    return this.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map((row) => this.taskFromRow(row));
  }

  private taskFromRow(row: Row): Task {
    const taskId = String(row.id); const projectId = String(row.project_id);
    const dependencies = this.all('SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ? ORDER BY depends_on_task_id', [taskId]).map((entry) => String(entry.depends_on_task_id));
    const stepDependencies = this.all('SELECT step_id, depends_on_step_id FROM task_step_dependencies WHERE task_id = ?', [taskId]);
    const steps: TaskStep[] = this.all('SELECT * FROM task_steps WHERE task_id = ? ORDER BY position', [taskId]).map((step) => ({
      id: String(step.id), taskId, position: Number(step.position), name: String(step.name), purpose: String(step.purpose), status: String(step.status) as TaskStepStatus,
      riskTier: Number(step.risk_tier) as 0 | 1 | 2, requiredTool: step.required_tool ? String(step.required_tool) : undefined,
      expectedInput: parseJson(step.expected_input, undefined), expectedOutput: parseJson(step.expected_output, undefined),
      startedAt: step.started_at === null ? undefined : Number(step.started_at), completedAt: step.completed_at === null ? undefined : Number(step.completed_at), attempts: Number(step.attempts),
      lastError: parseJson(step.last_error, undefined), retryPolicy: parseJson(step.retry_policy, { maxAttempts: 1, backoffMs: 0, retryableErrorCodes: [] }), timeoutMs: Number(step.timeout_ms),
      approvalState: String(step.approval_state) as TaskStep['approvalState'], externalProcessId: step.external_process_id === null ? undefined : Number(step.external_process_id), outputPath: step.output_path ? String(step.output_path) : undefined,
      artifactPaths: parseJson(step.artifact_paths, []), verificationCriteria: parseJson(step.verification_criteria, []), rollbackInstructions: step.rollback_instructions ? String(step.rollback_instructions) : undefined,
      auditReferences: parseJson(step.audit_references, []), dependencies: stepDependencies.filter((dependency) => String(dependency.step_id) === String(step.id)).map((dependency) => String(dependency.depends_on_step_id))
    }));
    const checkpoints: TaskCheckpoint[] = this.all('SELECT * FROM task_checkpoints WHERE task_id = ? ORDER BY created_at', [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : undefined, name: String(entry.name), summary: String(entry.summary), verified: Boolean(entry.verified), evidence: parseJson(entry.evidence, null), auditReferences: parseJson(entry.audit_references, []), createdAt: Number(entry.created_at) }));
    const artifacts: TaskArtifact[] = this.all('SELECT * FROM task_artifacts WHERE task_id = ? ORDER BY created_at', [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : undefined, kind: String(entry.kind), path: entry.path ? String(entry.path) : undefined, uri: entry.uri ? String(entry.uri) : undefined, sha256: entry.sha256 ? String(entry.sha256) : undefined, size: entry.size === null ? undefined : Number(entry.size), verifiedAt: entry.verified_at === null ? undefined : Number(entry.verified_at), metadata: parseJson(entry.metadata, undefined), createdAt: Number(entry.created_at) }));
    const externalReferences: TaskExternalReference[] = this.all('SELECT * FROM task_external_references WHERE task_id = ? ORDER BY created_at', [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : undefined, type: String(entry.type) as TaskExternalReference['type'], provider: entry.provider ? String(entry.provider) : undefined, externalId: String(entry.external_id), url: entry.url ? String(entry.url) : undefined, state: entry.state ? String(entry.state) : undefined, metadata: parseJson(entry.metadata, undefined), verifiedAt: entry.verified_at === null ? undefined : Number(entry.verified_at), createdAt: Number(entry.created_at), updatedAt: Number(entry.updated_at) }));
    const approvals: Task['approvals'] = this.all('SELECT * FROM task_approvals WHERE task_id = ? ORDER BY requested_at', [taskId]).map((entry) => { const expiresAt = entry.expires_at === null ? undefined : Number(entry.expires_at); const storedDecision = String(entry.decision) as Task['approvals'][number]['decision']; const decision = expiresAt !== undefined && expiresAt <= Date.now() && !['consumed', 'rejected'].includes(storedDecision) ? 'expired' : storedDecision; return { id: String(entry.id), taskId, stepId: String(entry.step_id), toolRequestId: entry.tool_request_id ? String(entry.tool_request_id) : undefined, decision, scope: String(entry.scope), requestedAt: Number(entry.requested_at), decidedAt: entry.decided_at === null ? undefined : Number(entry.decided_at), expiresAt, auditReference: entry.audit_reference ? String(entry.audit_reference) : undefined }; });
    for (const step of steps) {
      const latest = approvals.filter((approval) => approval.stepId === step.id).at(-1);
      if (!latest) continue;
      step.approvalState = latest.decision === 'run-once' || latest.decision === 'session' ? 'approved' : latest.decision;
    }
    const events: TaskEvent[] = this.all('SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at', [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : undefined, type: String(entry.type) as TaskEventType, summary: String(entry.summary), details: parseJson(entry.details, undefined), auditReference: entry.audit_reference ? String(entry.audit_reference) : undefined, createdAt: Number(entry.created_at) }));
    return {
      id: taskId, workspaceId: projectId, title: String(row.title), description: row.description ? String(row.description) : undefined, taskType: String(row.task_type ?? 'general'), status: String(row.status) as TaskStatus, priority: String(row.priority) as Task['priority'],
      currentStepId: row.current_step_id ? String(row.current_step_id) : undefined, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), startedAt: row.started_at === null ? undefined : Number(row.started_at), completedAt: row.completed_at === null ? undefined : Number(row.completed_at),
      originatingConversationId: row.originating_conversation_id ? String(row.originating_conversation_id) : undefined, lastActiveConversationId: row.last_active_conversation_id ? String(row.last_active_conversation_id) : undefined,
      assignedProvider: row.assigned_provider ? String(row.assigned_provider) : undefined, assignedModel: row.assigned_model ? String(row.assigned_model) : undefined, progressSummary: String(row.progress_summary ?? ''), retryMetadata: parseJson(row.retry_metadata, undefined),
      interruptionReason: row.interruption_reason ? String(row.interruption_reason) : undefined, resumabilityState: String(row.resumability_state ?? 'resumable') as Task['resumabilityState'], resumeInstructions: String(row.resume_instructions ?? ''),
      associatedBranch: row.associated_branch ? String(row.associated_branch) : undefined, associatedCommitSha: row.associated_commit_sha ? String(row.associated_commit_sha) : undefined, associatedPullRequest: row.associated_pull_request ? String(row.associated_pull_request) : undefined,
      associatedReleaseTag: row.associated_release_tag ? String(row.associated_release_tag) : undefined, associatedWorkflowRun: row.associated_workflow_run ? String(row.associated_workflow_run) : undefined,
      processIds: parseJson(row.process_ids, []), externalResourceIds: parseJson(row.external_resource_ids, []), steps, taskDependencies: dependencies, checkpoints, artifacts, externalReferences, approvals, events
    };
  }

  private appendTaskEventRow(taskId: string, stepId: string | undefined, type: TaskEventType, summary: string, details?: unknown, auditReference?: string): void {
    const task = this.one('SELECT project_id FROM tasks WHERE id = ?', [taskId]); if (!task) throw new Error('Unknown task.');
    this.ready().run('INSERT INTO task_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id(), String(task.project_id), taskId, stepId ?? null, type, summary, details === undefined ? null : JSON.stringify(sanitizeTaskData(details)), auditReference ?? null, Date.now()]);
  }

  private all(sql: string, params: SqlValue[] = []): Row[] {
    const result = this.ready().exec(sql, params);
    if (!result[0]) return [];
    return result[0].values.map((values) => Object.fromEntries(result[0].columns.map((column, index) => [column, values[index]])));
  }

  private one(sql: string, params: SqlValue[] = []): Row | undefined { return this.all(sql, params)[0]; }
  private ready(): Database { if (!this.db) throw new Error('Storage is not initialized.'); return this.db; }
  private async persist(): Promise<void> {
    if (!this.db || !this.filePath) return;
    const destination = this.filePath; const bytes = this.db.export(); const temporary = `${destination}.${id()}.tmp`;
    const operation = this.persistQueue.then(async () => {
      try { await fs.writeFile(temporary, bytes, { flag: 'wx' }); await fs.rename(temporary, destination); }
      catch (error) { await fs.rm(temporary, { force: true }).catch(() => undefined); throw error; }
    });
    this.persistQueue = operation.catch(() => undefined);
    await operation;
  }
}
