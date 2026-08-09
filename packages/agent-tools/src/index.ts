import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GitHubService, GitService } from '@forge/git';
import type { ShellService, ShellRunInput } from '@forge/shell';
import type { WebService } from '@forge/web';
import { PolicyEngine, SessionPermissionStore, ToolRegistry, ToolValidationError, z, type ProviderToolCall, type ToolDefinition, type ToolRequest, type ToolResult } from '@forge/tool-policy';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type { ProviderToolCall, ToolRequest, ToolResult } from '@forge/tool-policy';

const MAX_TEXT_BYTES = 2_000_000;
const MAX_SEARCH_RESULTS = 200;
const textOutput = z.object({ success: z.boolean() }).passthrough();
const relativePath = z.string().min(1).max(4_096).refine((value) => !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..'), 'Path must be workspace-relative and may not traverse upward.');
const reason = z.string().min(3).max(2_000);

export interface AuditRecord {
  id: string;
  timestamp: number;
  workspaceId: string;
  conversationId: string;
  modelId: string;
  toolName: string;
  sanitizedInputs: unknown;
  approvalDecision: 'automatic' | 'run-once' | 'session' | 'rejected' | 'cancelled' | 'validation-failed';
  executionDurationMs: number;
  success: boolean;
  result: unknown;
  resultSummary: string;
  affectedPaths: string[];
  exitCode?: number | null;
  rollback?: ToolResult['rollback'];
}

export interface AuditStore {
  appendAction(record: AuditRecord): Promise<void>;
  listActions(filters?: { conversationId?: string; toolName?: string; success?: boolean; from?: number; to?: number }): Promise<AuditRecord[]>;
}

export interface ToolRouterContext {
  workspaceId: string;
  conversationId: string;
  modelId: string;
  workspaceRoot: string;
}

export interface ToolRequestOutcome { request: ToolRequest; result?: ToolResult; }
type ToolExecutor = (input: any, request: ToolRequest, signal: AbortSignal) => Promise<Omit<ToolResult, 'requestId' | 'toolName' | 'durationMs'>>;

const inside = (root: string, candidate: string): boolean => candidate === root || candidate.startsWith(`${root}${path.sep}`);

export async function resolveContainedPath(rootValue: string, relative: string, allowMissing = false): Promise<string> {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Path must be workspace-relative and may not traverse upward.');
  const root = await fs.realpath(rootValue);
  const candidate = path.resolve(root, relative);
  if (!inside(root, candidate)) throw new Error('Path escapes the active workspace.');
  let inspected = candidate;
  if (allowMissing) {
    while (inspected !== root) {
      try { await fs.lstat(inspected); break; } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        inspected = path.dirname(inspected);
      }
    }
  }
  const resolved = await fs.realpath(inspected);
  if (!inside(root, resolved)) throw new Error('Symlink resolves outside the active workspace.');
  if (!allowMissing && !inside(root, await fs.realpath(candidate))) throw new Error('Symlink resolves outside the active workspace.');
  return candidate;
}

export function unifiedDiff(filePath: string, before: string, after: string): string {
  if (before === after) return '';
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  const lines = [`--- a/${filePath}`, `+++ b/${filePath}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`];
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) { lines.push(` ${oldLines[prefix]}`); prefix += 1; }
  for (let index = prefix; index < oldLines.length; index += 1) lines.push(`-${oldLines[index]}`);
  for (let index = prefix; index < newLines.length; index += 1) lines.push(`+${newLines[index]}`);
  return lines.join('\n').slice(0, 250_000);
}

async function readText(absolute: string): Promise<{ content: string; encoding: 'utf8' | 'utf8-bom'; mode: number }> {
  const [buffer, stat] = await Promise.all([fs.readFile(absolute), fs.stat(absolute)]);
  if (buffer.byteLength > MAX_TEXT_BYTES) throw new Error('File exceeds the supported text size limit.');
  if (buffer.includes(0)) throw new Error('Binary files are not supported by this tool.');
  const bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  return { content: buffer.subarray(bom ? 3 : 0).toString('utf8'), encoding: bom ? 'utf8-bom' : 'utf8', mode: stat.mode };
}

async function atomicWrite(absolute: string, content: string, encoding: 'utf8' | 'utf8-bom' = 'utf8', mode?: number): Promise<void> {
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = path.join(path.dirname(absolute), `.${path.basename(absolute)}.${randomUUID()}.tmp`);
  const data = Buffer.from(`${encoding === 'utf8-bom' ? '\ufeff' : ''}${content}`, 'utf8');
  try { await fs.writeFile(temporary, data, { flag: 'wx', mode }); await fs.rename(temporary, absolute); }
  catch (error) { await fs.rm(temporary, { force: true }).catch(() => undefined); throw error; }
}

async function backupPath(root: string, relative: string): Promise<string> {
  const hash = createHash('sha256').update(`${Date.now()}\0${relative}`).digest('hex').slice(0, 12);
  const destination = path.join(root, '.forge', 'backups', `${Date.now()}-${hash}`, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  return destination;
}

const definition = <I, O>(value: Omit<ToolDefinition<I, O>, 'sideEffect' | 'approval'> & Partial<Pick<ToolDefinition<I, O>, 'sideEffect' | 'approval' | 'sessionScope'>>): ToolDefinition<I, O> => {
  const sideEffect = value.sideEffect ?? inferSideEffect(value.name, value.networkAccess, value.audit.recordsAffectedPaths);
  const approval = value.approval ?? (sideEffect === 'read' ? 'automatic' : sideEffect === 'workspace-write' ? 'session' : 'explicit');
  const sessionScope = value.sessionScope ?? (approval === 'session' ? (input: any) => JSON.stringify({ paths: input.files ?? [input.path ?? input.from ?? input.to].filter(Boolean), workingDirectory: input.workingDirectory ?? '.', tool: value.name }) : undefined);
  return { ...value, sideEffect, approval, sessionScope } as ToolDefinition<I, O>;
};

function inferSideEffect(name: string, networkAccess: boolean, recordsAffectedPaths: boolean): ToolDefinition['sideEffect'] {
  if (networkAccess) return 'remote';
  if (name === 'file.delete') return 'destructive';
  if (name === 'shell.run' || name === 'task.process.start') return 'process';
  if (recordsAffectedPaths || ['git.stage', 'git.unstage', 'git.commit', 'task.create', 'task.resume', 'task.pause', 'task.cancel', 'task.checkpoint'].includes(name)) return 'workspace-write';
  return 'read';
}

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const base = { outputSchema: textOutput, cancellable: true };
  const taskContext = { taskContext: z.object({ taskId: z.string().uuid(), stepId: z.string().min(1).max(200) }).optional() };
  registry.register(definition({ ...base, name: 'file.list', purpose: 'Discover workspace files from the root first; use a nested path only after it has been observed.', inputSchema: z.object({ path: z.string().max(4_096).default('.'), recursive: z.boolean().default(false), maxDepth: z.number().int().min(0).max(20).default(2), ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? '.', describeEffect: () => 'Read a bounded workspace directory listing, beginning at the workspace root by default.' }));
  registry.register(definition({ ...base, name: 'file.read', purpose: 'Read a supported workspace text file.', inputSchema: z.object({ path: relativePath, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Read text without changing the workspace.' }));
  registry.register(definition({ ...base, name: 'file.search', purpose: 'Search supported workspace text files. When truncated, continue using the returned offset.', inputSchema: z.object({ query: z.string().min(1).max(500), path: z.string().max(4_096).default('.'), caseSensitive: z.boolean().default(false), maxResults: z.number().int().min(1).max(MAX_SEARCH_RESULTS).default(50), offset: z.number().int().min(0).max(100_000).default(0), ...taskContext }), workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? '.', describeEffect: (input) => `Search workspace text for ${JSON.stringify(input.query)}.` }));
  registry.register(definition({ ...base, name: 'file.create', purpose: 'Create a workspace file.', inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Create a new file atomically.' }));
  registry.register(definition({ ...base, name: 'file.write', purpose: 'Replace a workspace text file after showing a diff.', inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Atomically write the approved diff with a rollback backup.' }));
  registry.register(definition({ ...base, name: 'file.patch', purpose: 'Apply a targeted workspace text replacement.', inputSchema: z.object({ path: relativePath, expected: z.string().min(1).max(MAX_TEXT_BYTES), replacement: z.string().max(MAX_TEXT_BYTES), replaceAll: z.boolean().default(false), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Apply the displayed targeted patch atomically.' }));
  for (const name of ['file.rename', 'file.move'] as const) registry.register(definition({ ...base, name, purpose: 'Move a workspace path without overwriting.', inputSchema: z.object({ from: relativePath, to: relativePath, reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `${input.from} → ${input.to}`, describeEffect: () => 'Move the path without overwriting the destination.' }));
  registry.register(definition({ ...base, name: 'directory.create', purpose: 'Create a workspace directory.', inputSchema: z.object({ path: relativePath, reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Create a directory inside the workspace.' }));
  registry.register(definition({ ...base, name: 'file.delete', purpose: 'Delete a workspace path after creating a rollback backup.', inputSchema: z.object({ path: relativePath, reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Back up then delete the selected source path.' }));
  registry.register(definition({ ...base, name: 'terminal.read', purpose: 'Read bounded recent output from an existing user terminal session.', inputSchema: z.object({ sessionId: z.string().uuid().optional(), maxCharacters: z.number().int().min(100).max(20_000).default(4_000), ...taskContext }), workspaceBoundary: 'required', timeoutMs: 5_000, audit: { category: 'shell', recordsAffectedPaths: false, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.sessionId ?? 'all terminal sessions', describeEffect: () => 'Read bounded, redacted recent terminal evidence without changing the session.' }));

  const gitRead = (name: 'git.status' | 'git.diff' | 'git.log' | 'git.branches', schema: any, effect: string): void => registry.register(definition({ ...base, name, purpose: effect, inputSchema: schema, workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'git', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => 'active Git workspace', describeEffect: () => effect }));
  gitRead('git.status', z.object({ ...taskContext }), 'Inspect current branch and working tree status.'); gitRead('git.diff', z.object({ staged: z.boolean().default(false), ...taskContext }), 'Inspect the Git diff.'); gitRead('git.log', z.object({ limit: z.number().int().min(1).max(100).default(30), ...taskContext }), 'Inspect recent Git history.'); gitRead('git.branches', z.object({ ...taskContext }), 'Inspect Git branches.');
  for (const name of ['git.stage', 'git.unstage'] as const) registry.register(definition({ ...base, name, purpose: `${name === 'git.stage' ? 'Stage' : 'Unstage'} selected Git paths.`, inputSchema: z.object({ files: z.array(relativePath).min(1).max(200), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.files.join(', '), describeEffect: () => `${name === 'git.stage' ? 'Stage' : 'Unstage'} only the listed paths.` }));
  registry.register(definition({ ...base, name: 'git.commit', purpose: 'Commit the exact staged Git paths.', inputSchema: z.object({ message: z.string().min(1).max(5_000), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 60_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => 'current branch and staged files', describeEffect: (input) => `Create a commit with message ${JSON.stringify(input.message)}.` }));
  for (const name of ['git.pull', 'git.push'] as const) registry.register(definition({ ...base, name, purpose: `${name === 'git.pull' ? 'Pull from' : 'Push to'} the configured remote.`, inputSchema: z.object({ reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 120_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: () => 'origin and current branch', describeEffect: () => `${name === 'git.pull' ? 'Receive remote changes' : 'Send local commits'} using protected Git credentials.` }));
  registry.register(definition({ ...base, name: 'shell.run', purpose: 'Run an approved executable with an argument array.', inputSchema: z.object({ command: z.string().min(1).max(4_096), args: z.array(z.string().max(32_000)).max(500).default([]), workingDirectory: z.string().max(4_096).default('.'), timeoutMs: z.number().int().min(100).max(600_000).default(120_000), environment: z.record(z.string()).optional(), environmentAllowlist: z.array(z.string()).max(100).default([]), reason, expectedOutcome: z.string().min(1).max(2_000), ...taskContext }), workspaceBoundary: 'required', timeoutMs: 600_000, audit: { category: 'shell', recordsAffectedPaths: true, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => [input.command, ...(input.args ?? [])].map(quoteArgument).join(' '), describeEffect: (input) => input.expectedOutcome }));
  registry.register(definition({ ...base, name: 'web.search', purpose: 'Search the public web as explicitly approved external research.', inputSchema: z.object({ query: z.string().min(1).max(1_000), reason, projectDataSent: z.string().max(2_000).default('None'), ...taskContext }), workspaceBoundary: 'not-applicable', timeoutMs: 30_000, audit: { category: 'web', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.query, describeEffect: () => 'Send the exact query to an external search service and return cited results.' }));
  for (const name of ['web.fetch', 'web.open'] as const) registry.register(definition({ ...base, name, purpose: 'Retrieve an approved public HTTP(S) resource.', inputSchema: z.object({ url: z.string().url().max(8_000), reason, projectDataSent: z.string().max(2_000).default('None'), ...taskContext }), workspaceBoundary: 'not-applicable', timeoutMs: 30_000, audit: { category: 'web', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.url, describeEffect: () => 'Retrieve bounded external web evidence without browser automation.' }));
  registry.register(definition({ ...base, name: 'github.read', purpose: 'Inspect metadata, branches, commits, issues, pull requests, comments, workflow state, releases, or assets for the active GitHub repository.', inputSchema: z.object({ resource: z.enum(['metadata', 'branches', 'commits', 'issues', 'pulls', 'issue-comments', 'pull-comments', 'workflow-runs', 'workflow-jobs', 'releases', 'release-assets']), number: z.number().int().positive().optional(), runId: z.number().int().positive().optional(), releaseId: z.number().int().positive().optional(), page: z.number().int().min(1).max(100).default(1), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 30_000, audit: { category: 'git', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, sideEffect: 'read', approval: 'automatic', describeTarget: (input) => `GitHub ${input.resource}`, describeEffect: () => 'Read bounded GitHub repository evidence using the active origin.' }));
  registry.register(definition({ ...base, name: 'github.mutate', purpose: 'Perform one explicitly approved GitHub repository mutation through the official REST API.', inputSchema: z.object({ action: z.enum(['create-issue', 'update-issue', 'comment-issue', 'create-branch', 'create-file', 'create-pull-request', 'comment-pull-request', 'retry-workflow', 'create-release', 'update-release']), input: z.record(z.unknown()), reason, ...taskContext }), workspaceBoundary: 'required', timeoutMs: 60_000, audit: { category: 'git', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, sideEffect: 'remote', approval: 'explicit', describeTarget: (input) => `GitHub ${input.action}`, describeEffect: () => 'Send one authenticated, audited GitHub API mutation for the active repository.' }));
  const taskStepDraft = z.object({ id: z.string().min(1).max(200).optional(), name: z.string().min(1).max(300), purpose: z.string().min(1).max(2_000), riskTier: z.union([z.literal(0), z.literal(1), z.literal(2)]), requiredTool: z.string().max(200).optional(), expectedInput: z.unknown().optional(), expectedOutput: z.unknown().optional(), retryPolicy: z.object({ maxAttempts: z.number().int().min(1).max(20).optional(), backoffMs: z.number().int().min(0).max(86_400_000).optional(), retryableErrorCodes: z.array(z.string().max(100)).max(50).optional() }).optional(), timeoutMs: z.number().int().min(100).max(86_400_000).optional(), artifactPaths: z.array(relativePath).max(200).optional(), verificationCriteria: z.array(z.string().min(1).max(1_000)).min(1).max(100), rollbackInstructions: z.string().max(4_000).optional(), dependencies: z.array(z.string().min(1).max(200)).max(100).optional() });
  const taskDraft = z.object({ title: z.string().min(1).max(300), description: z.string().max(10_000).optional(), taskType: z.string().min(1).max(100), priority: z.enum(['low', 'medium', 'high']).optional(), originatingConversationId: z.string().uuid().optional(), assignedProvider: z.string().max(200).optional(), assignedModel: z.string().max(200).optional(), progressSummary: z.string().max(4_000).optional(), resumeInstructions: z.string().min(1).max(10_000), associatedBranch: z.string().max(500).optional(), associatedCommitSha: z.string().max(100).optional(), associatedPullRequest: z.string().max(2_000).optional(), associatedReleaseTag: z.string().max(500).optional(), associatedWorkflowRun: z.string().max(500).optional(), taskDependencies: z.array(z.string().uuid()).max(100).optional(), steps: z.array(taskStepDraft).max(500) });
  registry.register(definition({ ...base, name: 'task.inspect', purpose: 'Inspect one workspace-owned persistent task and its verified checkpoints.', inputSchema: z.object({ taskId: z.string().uuid() }), workspaceBoundary: 'required', timeoutMs: 5_000, audit: { category: 'memory', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => 'Read persistent task state without changing it.' }));
  registry.register(definition({ ...base, name: 'task.create', purpose: 'Create a draft workspace-owned task without executing any step.', inputSchema: taskDraft.extend({ reason }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'memory', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.title, describeEffect: () => 'Persist a draft task and its structured steps; no executable work will start.' }));
  for (const name of ['task.resume', 'task.pause', 'task.cancel'] as const) registry.register(definition({ ...base, name, purpose: `${name.slice(5)} a workspace-owned task after explicit approval.`, inputSchema: z.object({ taskId: z.string().uuid(), reason, trackingOnly: z.boolean().default(true) }), workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'memory', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => `${name.slice(5)} task tracking without granting execution approval.` }));
  registry.register(definition({ ...base, name: 'task.checkpoint', purpose: 'Record a task checkpoint; verified checkpoints require an audit reference.', inputSchema: z.object({ taskId: z.string().uuid(), stepId: z.string().max(200).optional(), name: z.string().min(1).max(300), summary: z.string().min(1).max(4_000), verified: z.boolean().default(false), evidence: z.unknown().optional(), auditReference: z.string().max(200).optional(), reason }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'memory', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => 'Persist a structured checkpoint without executing another tool.' }));
  registry.register(definition({ ...base, name: 'task.handoff', purpose: 'Generate a Markdown projection of authoritative SQLite task state.', inputSchema: z.object({ taskId: z.string().uuid(), reason }), workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'memory', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `.forge/handoffs for ${input.taskId}`, describeEffect: () => 'Atomically write or update a human-readable task handoff.' }));
  registry.register(definition({ ...base, name: 'task.process.start', purpose: 'Start one approved task step as a detached workspace-owned process with file-backed output.', inputSchema: z.object({ taskId: z.string().uuid(), stepId: z.string().min(1).max(200), command: z.string().min(1).max(4_096), args: z.array(z.string().max(32_000)).max(500).default([]), workingDirectory: z.string().max(4_096).default('.'), timeoutMs: z.number().int().min(100).max(86_400_000).default(600_000), environment: z.record(z.string()).optional(), environmentAllowlist: z.array(z.string()).max(100).default([]), reason, expectedOutcome: z.string().min(1).max(2_000) }), workspaceBoundary: 'required', timeoutMs: 30_000, audit: { category: 'shell', recordsAffectedPaths: true, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `${input.taskId}/${input.stepId}: ${[input.command, ...(input.args ?? [])].map(quoteArgument).join(' ')}`, describeEffect: (input) => `${input.expectedOutcome} Output will be stored under .forge/task-output and execution may outlive the current conversation.` }));
  return registry;
}

export function quoteArgument(value: string): string { return /^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`; }

export function sanitizeToolData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeToolData);
  if (!value || typeof value !== 'object') return typeof value === 'string' && /(?:sk-|github_pat_|gh[oprsu]_)[A-Za-z0-9_-]{10,}/.test(value) ? '[REDACTED]' : value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, /token|secret|password|authorization|credential|api.?key/i.test(key) ? '[REDACTED]' : sanitizeToolData(entry)]));
}

export function boundedToolEvidence(result: ToolResult, limit = 12_000): string {
  const text = JSON.stringify(sanitizeToolData({ toolName: result.toolName, success: result.success, output: result.output, error: result.error, affectedPaths: result.affectedPaths, exitCode: result.exitCode, warnings: result.warnings, truncated: result.truncated }), null, 2);
  return text.length > limit ? `${text.slice(0, limit)}\n[FORGE bounded the remaining tool output]` : text;
}

export class ToolRouter {
  readonly registry: ToolRegistry;
  private readonly requests = new Map<string, ToolRequest>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly executors = new Map<string, ToolExecutor>();
  private readonly workspaceRoots = new Map<string, string>();
  private readonly sessions = new SessionPermissionStore();
  private readonly policy = new PolicyEngine(this.sessions);

  constructor(private readonly dependencies: { git: GitService; github?: GitHubService; shell: ShellService; terminal?: { list(): Array<{ id: string; cwd: string; state: string; exitCode: number | null; recentOutput: string }> }; tasks?: { get(taskId: string): Promise<unknown>; create(draft: any): Promise<unknown>; resume(taskId: string): Promise<unknown>; pause(taskId: string, reason: string): Promise<unknown>; cancel(taskId: string, reason: string, trackingOnly: boolean): Promise<unknown>; checkpoint(taskId: string, input: any): Promise<unknown>; generateHandoff(taskId: string): Promise<unknown>; startBackground(taskId: string, stepId: string, input: ShellRunInput, toolRequestId: string): Promise<unknown> }; web: WebService; audit: AuditStore; dirtyPaths: () => ReadonlySet<string> }) {
    this.registry = createToolRegistry(); this.installExecutors();
  }

  definitions(): ToolDefinition<any, any>[] { return this.registry.list(); }
  providerDefinitions(): Array<{ name: string; description: string; parameters: Record<string, unknown>; sideEffects: string; approval: string; networkAccess: boolean; cancellation: boolean; resultSemantics: string }> { return this.registry.list().map((entry) => ({ name: entry.name, description: entry.purpose, parameters: zodToJsonSchema(entry.inputSchema, { target: 'openApi3' }) as Record<string, unknown>, sideEffects: entry.sideEffect, approval: entry.approval, networkAccess: entry.networkAccess, cancellation: entry.cancellable, resultSemantics: 'Returns a structured, bounded result with success, affected paths, warnings, and recovery metadata when applicable.' })); }
  listRequests(workspaceId?: string): ToolRequest[] { return [...this.requests.values()].filter((request) => !workspaceId || request.workspaceId === workspaceId).sort((a, b) => b.requestedAt - a.requestedAt).map((request) => ({ ...request, input: sanitizeToolData(request.input) })); }
  requestById(id: string): ToolRequest | undefined { const request = this.requests.get(id); return request ? { ...request } : undefined; }

  async request(call: ProviderToolCall, context: ToolRouterContext): Promise<ToolRequestOutcome> {
    let parsed: ReturnType<ToolRegistry['parse']>;
    try { parsed = this.registry.parse(call); }
    catch (error) {
      await this.auditValidationFailure(call, context, error);
      throw error;
    }
    const { definition, input } = parsed;
    this.workspaceRoots.set(context.workspaceId, context.workspaceRoot);
    const now = Date.now();
    const prediction = await this.predict(definition.name, input, context.workspaceRoot);
    const request: ToolRequest = {
      id: call.id || randomUUID(), workspaceId: context.workspaceId, conversationId: context.conversationId, modelId: context.modelId,
      toolName: definition.name, input, reason: typeof input.reason === 'string' ? input.reason : definition.purpose,
      target: prediction.target ?? definition.describeTarget(input), workingDirectory: typeof input.workingDirectory === 'string' ? input.workingDirectory : undefined,
      expectedEffect: definition.describeEffect(input), predictedAffectedPaths: prediction.paths, networkAccess: definition.networkAccess,
      externalDataDescription: typeof input.projectDataSent === 'string' ? input.projectDataSent : undefined, diff: prediction.diff,
      approvalRequired: this.policy.requiresApproval(context.workspaceId, definition, input), sessionApprovalAvailable: definition.approval === 'session',
      state: 'pending', requestedAt: now, updatedAt: now
    };
    this.requests.set(request.id, request);
    if (request.approvalRequired) return { request: { ...request } };
    const result = await this.execute(request.id, context, definition.approval === 'session' ? 'session' : 'automatic');
    return { request: { ...request }, result };
  }

  async approve(requestId: string, context: ToolRouterContext, choice: 'run-once' | 'session'): Promise<ToolResult> {
    const request = this.required(requestId);
    if (request.workspaceId !== context.workspaceId) throw new Error('Tool request belongs to another workspace.');
    if (request.state !== 'pending') throw new Error('Tool request is no longer pending.');
    const definition = this.registry.get(request.toolName)!;
    if (choice === 'session') this.sessions.grant(context.workspaceId, definition, request.input);
    request.state = 'approved'; request.updatedAt = Date.now();
    return this.execute(requestId, context, choice);
  }

  async reject(requestId: string, context: ToolRouterContext): Promise<void> {
    const request = this.required(requestId); if (request.workspaceId !== context.workspaceId || request.state !== 'pending') throw new Error('Tool request cannot be rejected.');
    request.state = 'rejected'; request.updatedAt = Date.now();
    await this.dependencies.audit.appendAction(this.record(request, 'rejected', false, 0, 'User rejected the tool request.', []));
  }

  async cancel(requestId: string, context: ToolRouterContext): Promise<boolean> {
    const request = this.required(requestId); if (request.workspaceId !== context.workspaceId) throw new Error('Tool request belongs to another workspace.');
    if (request.state === 'pending') { request.state = 'cancelled'; request.updatedAt = Date.now(); await this.dependencies.audit.appendAction(this.record(request, 'cancelled', false, 0, 'Pending tool request cancelled.', [])); return true; }
    if (request.state !== 'running') return false;
    this.controllers.get(requestId)?.abort();
    if (request.toolName === 'shell.run') this.dependencies.shell.cancel(requestId);
    return true;
  }

  private async execute(requestId: string, context: ToolRouterContext, decision: AuditRecord['approvalDecision']): Promise<ToolResult> {
    const request = this.required(requestId); const definition = this.registry.get(request.toolName)!; const executor = this.executors.get(request.toolName);
    if (!executor) throw new Error(`No executor is registered for ${request.toolName}.`);
    request.state = 'running'; request.updatedAt = Date.now(); const started = Date.now(); const controller = new AbortController(); this.controllers.set(request.id, controller);
    try {
      const partial = await executor(request.input, request, controller.signal);
      const output = partial.output === undefined ? undefined : definition.outputSchema.parse(partial.output);
      const result: ToolResult = { ...partial, output, requestId: request.id, toolName: request.toolName, durationMs: Date.now() - started };
      request.state = result.success ? 'succeeded' : result.cancelled ? 'cancelled' : 'failed'; request.updatedAt = Date.now();
      await this.dependencies.audit.appendAction(this.record(request, decision, result.success, result.durationMs, result.success ? 'Tool completed successfully.' : result.error?.message ?? 'Tool failed.', result.affectedPaths, result.exitCode, result.rollback));
      return result;
    } catch (error) {
      const durationMs = Date.now() - started; const cancelled = controller.signal.aborted;
      const result: ToolResult = { requestId: request.id, toolName: request.toolName, success: false, affectedPaths: [], warnings: [], error: { code: cancelled ? 'CANCELLED' : 'EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error) }, durationMs, cancelled };
      request.state = cancelled ? 'cancelled' : 'failed'; request.updatedAt = Date.now();
      await this.dependencies.audit.appendAction(this.record(request, cancelled ? 'cancelled' : decision, false, durationMs, result.error!.message, []));
      return result;
    } finally { this.controllers.delete(request.id); }
  }

  private record(request: ToolRequest, approvalDecision: AuditRecord['approvalDecision'], success: boolean, executionDurationMs: number, resultSummary: string, affectedPaths: string[], exitCode?: number | null, rollback?: ToolResult['rollback']): AuditRecord {
    return { id: request.id, timestamp: Date.now(), workspaceId: request.workspaceId, conversationId: request.conversationId, modelId: request.modelId, toolName: request.toolName, sanitizedInputs: sanitizeToolData(request.input), approvalDecision, executionDurationMs, success, result: { success, summary: resultSummary, exitCode: exitCode ?? null, affectedPathCount: affectedPaths.length, rollbackAvailable: rollback?.available ?? false }, resultSummary, affectedPaths, exitCode, rollback };
  }

  private async auditValidationFailure(call: ProviderToolCall, context: ToolRouterContext, error: unknown): Promise<void> {
    const summary = error instanceof Error ? error.message : String(error);
    await this.dependencies.audit.appendAction({ id: randomUUID(), timestamp: Date.now(), workspaceId: context.workspaceId, conversationId: context.conversationId, modelId: context.modelId, toolName: call.name, sanitizedInputs: sanitizeToolData(call.arguments), approvalDecision: 'validation-failed', executionDurationMs: 0, success: false, result: { success: false, summary }, resultSummary: summary, affectedPaths: [] });
  }

  private required(id: string): ToolRequest { const request = this.requests.get(id); if (!request) throw new Error('Unknown tool request.'); return request; }

  private async predict(name: string, input: any, root: string): Promise<{ paths: string[]; diff?: string; target?: string }> {
    if (name === 'file.create') return { paths: [input.path], diff: unifiedDiff(input.path, '', input.content) };
    if (name === 'file.write') { const absolute = await resolveContainedPath(root, input.path); const existing = await readText(absolute); return { paths: [input.path], diff: unifiedDiff(input.path, existing.content, input.content) }; }
    if (name === 'file.patch') { const absolute = await resolveContainedPath(root, input.path); const existing = await readText(absolute); const after = applyReplacement(existing.content, input.expected, input.replacement, input.replaceAll); return { paths: [input.path], diff: unifiedDiff(input.path, existing.content, after) }; }
    if (['file.rename', 'file.move'].includes(name)) return { paths: [input.from, input.to] };
    if (name === 'directory.create' || name === 'file.delete') return { paths: [input.path] };
    if (name === 'git.stage' || name === 'git.unstage') { const status = await this.dependencies.git.status(); return { paths: input.files, target: `branch ${status.branch}: ${input.files.join(', ')}` }; }
    if (name === 'git.commit') { const status = await this.dependencies.git.status(); const paths = status.files.filter((file) => file.indexStatus !== ' ' && file.indexStatus !== '?').map((file) => file.path); return { paths, target: `branch ${status.branch}: ${paths.join(', ') || 'no staged files'}` }; }
    if (name === 'git.pull' || name === 'git.push') { const status = await this.dependencies.git.status(); return { paths: status.files.map((file) => file.path), target: `origin / branch ${status.branch}` }; }
    return { paths: [] };
  }

  private installExecutors(): void {
    const ok = (output: unknown, affectedPaths: string[] = [], extra: Partial<ToolResult> = {}): any => ({ success: true, output: { success: true, ...output as object }, affectedPaths, warnings: [], ...extra });
    const missing = (requestedPath: string): Record<string, unknown> => ({ missing: true, requestedPath, recovery: { action: 'restart-at-workspace-root', path: '.', nearestRequestedParent: path.dirname(requestedPath) || '.', instruction: 'List the workspace root, discover the real layout, and retry only with an observed path.' } });
    this.executors.set('file.list', async (input, request) => { const requestedPath = input.path === '.' ? '.' : input.path; const absolute = await resolveContainedPath(this.root(request), requestedPath, true); if (!await pathExists(absolute)) return ok({ ...missing(requestedPath), entries: [], truncated: false }); const entries: Array<{ path: string; type: string; size: number }> = []; const visit = async (current: string, depth: number): Promise<void> => { for (const entry of await fs.readdir(current, { withFileTypes: true })) { if (['.git', '.forge', 'node_modules', 'dist_electron', 'out'].includes(entry.name)) continue; const child = path.join(current, entry.name); const stat = await fs.lstat(child); entries.push({ path: path.relative(this.root(request), child), type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file', size: stat.size }); if (input.recursive && entry.isDirectory() && depth < input.maxDepth) await visit(child, depth + 1); } }; await visit(absolute, 0); return ok({ entries: entries.slice(0, 5_000), truncated: entries.length > 5_000 }); });
    this.executors.set('file.read', async (input, request) => { const absolute = await resolveContainedPath(this.root(request), input.path, true); if (!await pathExists(absolute)) return ok(missing(input.path)); const data = await readText(absolute); return ok({ path: input.path, content: data.content, encoding: data.encoding }); });
    this.executors.set('file.search', async (input, request, signal) => { const requestedPath = input.path === '.' ? '.' : input.path; const absolute = await resolveContainedPath(this.root(request), requestedPath, true); if (!await pathExists(absolute)) return ok({ ...missing(requestedPath), matches: [], truncated: false }); const matches: Array<{ path: string; line: number; text: string }> = []; let matchOffset = 0; const query = input.caseSensitive ? input.query : input.query.toLowerCase(); const visit = async (current: string): Promise<void> => { if (signal.aborted || matches.length >= input.maxResults) return; for (const entry of await fs.readdir(current, { withFileTypes: true })) { if (signal.aborted || matches.length >= input.maxResults) return; if (['.git', '.forge', '.obsidian', 'node_modules', 'dist_electron', 'out'].includes(entry.name)) continue; const child = path.join(current, entry.name); if (entry.isDirectory()) await visit(child); else if (entry.isFile()) { try { const data = await readText(child); for (const [index, line] of data.content.split(/\r?\n/).entries()) { const haystack = input.caseSensitive ? line : line.toLowerCase(); if (haystack.includes(query)) { if (matchOffset >= input.offset) matches.push({ path: path.relative(this.root(request), child), line: index + 1, text: line.slice(0, 2_000) }); matchOffset += 1; } if (matches.length >= input.maxResults) break; } } catch { /* skip unsupported files */ } } } }; await visit(absolute); const truncated = matches.length >= input.maxResults; return ok({ matches, truncated, totalOrMore: input.offset + matches.length + (truncated ? 1 : 0), continuation: truncated ? { offset: input.offset + matches.length, instruction: 'Call file.search again with the same query/path and this offset.' } : undefined }); });
    this.executors.set('file.create', async (input, request) => { this.assertNotDirty(input.path); const absolute = await resolveContainedPath(this.root(request), input.path, true); await fs.mkdir(path.dirname(absolute), { recursive: true }); await fs.writeFile(absolute, input.content, { flag: 'wx' }); return ok({ path: input.path }, [input.path], { diff: request.diff, rollback: { available: true, instructions: `Delete ${input.path} to undo this creation.` } }); });
    for (const name of ['file.write', 'file.patch']) this.executors.set(name, async (input, request) => { this.assertNotDirty(input.path); const absolute = await resolveContainedPath(this.root(request), input.path); const original = await readText(absolute); const after = name === 'file.write' ? input.content : applyReplacement(original.content, input.expected, input.replacement, input.replaceAll); const backup = await backupPath(this.root(request), input.path); await fs.copyFile(absolute, backup); await atomicWrite(absolute, after, original.encoding, original.mode); return ok({ path: input.path }, [input.path], { diff: unifiedDiff(input.path, original.content, after), rollback: { available: true, backupPath: path.relative(this.root(request), backup), instructions: `Restore the backup over ${input.path}.` } }); });
    for (const name of ['file.rename', 'file.move']) this.executors.set(name, async (input, request) => { this.assertNotDirty(input.from); this.assertNotDirty(input.to); const source = await resolveContainedPath(this.root(request), input.from); const destination = await resolveContainedPath(this.root(request), input.to, true); await fs.access(destination).then(() => { throw new Error('Destination already exists.'); }).catch((error) => { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return; throw error; }); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.rename(source, destination); return ok({}, [input.from, input.to], { rollback: { available: true, instructions: `Move ${input.to} back to ${input.from}.` } }); });
    this.executors.set('directory.create', async (input, request) => { const absolute = await resolveContainedPath(this.root(request), input.path, true); await fs.mkdir(absolute, { recursive: false }); return ok({}, [input.path], { rollback: { available: true, instructions: `Remove the empty directory ${input.path}.` } }); });
    this.executors.set('file.delete', async (input, request) => { this.assertNotDirty(input.path); const absolute = await resolveContainedPath(this.root(request), input.path); const backup = await backupPath(this.root(request), input.path); await fs.cp(absolute, backup, { recursive: true, errorOnExist: true }); await fs.rm(absolute, { recursive: true, force: false }); return ok({}, [input.path], { rollback: { available: true, backupPath: path.relative(this.root(request), backup), instructions: `Restore the backup to ${input.path}.` } }); });
    this.executors.set('terminal.read', async (input) => { if (!this.dependencies.terminal) throw new Error('Terminal evidence is unavailable.'); const sessions = this.dependencies.terminal.list().filter((session) => !input.sessionId || session.id === input.sessionId).map((session) => ({ id: session.id, cwd: session.cwd, state: session.state, exitCode: session.exitCode, recentOutput: session.recentOutput.slice(-(input.maxCharacters ?? 4_000)) })); return ok({ sessions }); });
    this.executors.set('git.status', async () => ok({ status: await this.dependencies.git.status() })); this.executors.set('git.diff', async (input) => ok({ diff: await this.dependencies.git.diff(input.staged) })); this.executors.set('git.log', async (input) => ok({ commits: await this.dependencies.git.log(input.limit) })); this.executors.set('git.branches', async () => ok({ branches: await this.dependencies.git.branches() }));
    this.executors.set('git.stage', async (input) => { await this.dependencies.git.stage(input.files); return ok({}, input.files); }); this.executors.set('git.unstage', async (input) => { await this.dependencies.git.unstage(input.files); return ok({}, input.files); });
    this.executors.set('git.commit', async (input) => { const status = await this.dependencies.git.status(); const staged = status.files.filter((file) => file.indexStatus !== ' ' && file.indexStatus !== '?').map((file) => file.path); if (!staged.length) throw new Error('No staged files are available to commit.'); const commit = await this.dependencies.git.commit(input.message); return ok({ commit, branch: status.branch, stagedFiles: staged }, staged); });
    this.executors.set('git.pull', async () => { const status = await this.dependencies.git.status(); if (status.files.length) throw new Error('Pull is blocked while the working tree is dirty.'); await this.dependencies.git.pull(); return ok({ branch: status.branch }); }); this.executors.set('git.push', async () => { const status = await this.dependencies.git.status(); await this.dependencies.git.push(); return ok({ branch: status.branch }); });
    this.executors.set('shell.run', async (input: ShellRunInput, request) => { const output = await this.dependencies.shell.run(input, request.id); return ok(output, [], { exitCode: output.exitCode, truncated: output.truncated, cancelled: output.cancelled }); });
    this.executors.set('web.search', async (input) => ok(await this.dependencies.web.search(input.query))); for (const name of ['web.fetch', 'web.open']) this.executors.set(name, async (input) => ok(await this.dependencies.web.fetch(input.url)));
    this.executors.set('github.read', async (input) => { if (!this.dependencies.github) throw new Error('GitHub integration is unavailable.'); return ok(await this.dependencies.github.read(input.resource, input)); });
    this.executors.set('github.mutate', async (input) => { if (!this.dependencies.github) throw new Error('GitHub integration is unavailable.'); return ok(await this.dependencies.github.mutate(input.action, input.input)); });
    this.executors.set('task.inspect', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); return ok({ task: await this.dependencies.tasks.get(input.taskId) }); });
    this.executors.set('task.create', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); const { reason: _reason, ...draft } = input; return ok({ task: await this.dependencies.tasks.create(draft) }); });
    this.executors.set('task.resume', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); return ok({ task: await this.dependencies.tasks.resume(input.taskId) }); });
    this.executors.set('task.pause', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); return ok({ task: await this.dependencies.tasks.pause(input.taskId, input.reason) }); });
    this.executors.set('task.cancel', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); return ok({ task: await this.dependencies.tasks.cancel(input.taskId, input.reason, input.trackingOnly) }); });
    this.executors.set('task.checkpoint', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); return ok({ task: await this.dependencies.tasks.checkpoint(input.taskId, input) }); });
    this.executors.set('task.handoff', async (input) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); const handoff = await this.dependencies.tasks.generateHandoff(input.taskId) as { relativePath?: string }; return ok({ handoff }, handoff.relativePath ? [handoff.relativePath] : []); });
    this.executors.set('task.process.start', async (input, request) => { if (!this.dependencies.tasks) throw new Error('Persistent task runtime is unavailable.'); const processInput: ShellRunInput = { command: input.command, args: input.args, workingDirectory: input.workingDirectory, timeoutMs: input.timeoutMs, environment: input.environment, environmentAllowlist: input.environmentAllowlist, reason: input.reason, expectedOutcome: input.expectedOutcome }; const started = await this.dependencies.tasks.startBackground(input.taskId, input.stepId, processInput, request.id) as { process?: { outputPath?: string } }; return ok({ started }, started.process?.outputPath ? [started.process.outputPath] : []); });
  }

  private root(request: ToolRequest): string { const root = this.workspaceRoots.get(request.workspaceId); if (!root) throw new Error('Workspace root is unavailable for this request.'); return root; }
  private assertNotDirty(relative: string): void { if (this.dependencies.dirtyPaths().has(relative)) throw new Error(`The editor has unsaved content for ${relative}; save or discard it before tool execution.`); }
}

async function pathExists(absolute: string): Promise<boolean> {
  try { await fs.access(absolute); return true; }
  catch (error) { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false; throw error; }
}

function applyReplacement(content: string, expected: string, replacement: string, replaceAll: boolean): string {
  if (!content.includes(expected)) throw new Error('Patch precondition failed: expected text was not found.');
  if (!replaceAll && content.indexOf(expected) !== content.lastIndexOf(expected)) throw new Error('Patch is ambiguous; expected text occurs more than once.');
  return replaceAll ? content.split(expected).join(replacement) : content.replace(expected, replacement);
}

export function normalizeNativeToolCall(provider: string, raw: unknown): ProviderToolCall {
  const candidate = raw as { id?: unknown; function?: { name?: unknown; arguments?: unknown }; name?: unknown; arguments?: unknown };
  const name = candidate?.function?.name ?? candidate?.name;
  const args = candidate?.function?.arguments ?? candidate?.arguments;
  if (typeof name !== 'string') throw new ToolValidationError('MALFORMED_ARGUMENTS', 'Provider tool call is missing a name.');
  let parsed = args;
  if (typeof args === 'string') { try { parsed = JSON.parse(args); } catch { throw new ToolValidationError('MALFORMED_ARGUMENTS', 'Provider tool arguments are not valid JSON.'); } }
  return { id: typeof candidate.id === 'string' ? candidate.id : randomUUID(), name, arguments: parsed, provider };
}

export function parseStructuredToolFallback(provider: string, text: string): ProviderToolCall | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  let value: unknown; try { value = JSON.parse(trimmed); } catch { return null; }
  const parsed = z.object({ type: z.literal('forge_tool_request'), id: z.string().optional(), tool: z.string(), arguments: z.unknown() }).strict().safeParse(value);
  if (!parsed.success) return null;
  return { id: parsed.data.id ?? randomUUID(), name: parsed.data.tool, arguments: parsed.data.arguments, provider };
}
