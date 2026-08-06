import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GitService } from '@forge/git';
import type { ShellService, ShellRunInput } from '@forge/shell';
import type { WebService } from '@forge/web';
import { PolicyEngine, SessionPermissionStore, ToolRegistry, ToolValidationError, z, type ProviderToolCall, type ToolDefinition, type ToolRequest, type ToolResult, type ToolRiskTier } from '@forge/tool-policy';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type { ProviderToolCall, ToolRequest, ToolResult, ToolRiskTier } from '@forge/tool-policy';

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
  riskTier: ToolRiskTier;
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
  listActions(filters?: { conversationId?: string; toolName?: string; riskTier?: ToolRiskTier; success?: boolean; from?: number; to?: number }): Promise<AuditRecord[]>;
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

const definition = <I, O>(value: ToolDefinition<I, O>): ToolDefinition<I, O> => value;

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const base = { outputSchema: textOutput, cancellable: true };
  registry.register(definition({ ...base, name: 'file.list', purpose: 'List workspace files.', inputSchema: z.object({ path: z.string().max(4_096).default('.'), recursive: z.boolean().default(false), maxDepth: z.number().int().min(0).max(20).default(2) }), riskTier: 0, approval: 'automatic', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? '.', describeEffect: () => 'Read a bounded workspace directory listing.' }));
  registry.register(definition({ ...base, name: 'file.read', purpose: 'Read a supported workspace text file.', inputSchema: z.object({ path: relativePath }), riskTier: 0, approval: 'automatic', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Read text without changing the workspace.' }));
  registry.register(definition({ ...base, name: 'file.search', purpose: 'Search supported workspace text files.', inputSchema: z.object({ query: z.string().min(1).max(500), path: z.string().max(4_096).default('.'), caseSensitive: z.boolean().default(false), maxResults: z.number().int().min(1).max(MAX_SEARCH_RESULTS).default(50) }), riskTier: 0, approval: 'automatic', workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'filesystem', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? '.', describeEffect: (input) => `Search workspace text for ${JSON.stringify(input.query)}.` }));
  registry.register(definition({ ...base, name: 'file.create', purpose: 'Create a workspace file.', inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Create a new file atomically.', sessionScope: (input) => input.path }));
  registry.register(definition({ ...base, name: 'file.write', purpose: 'Replace a workspace text file after showing a diff.', inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Atomically write the approved diff with a rollback backup.', sessionScope: (input) => input.path }));
  registry.register(definition({ ...base, name: 'file.patch', purpose: 'Apply a targeted workspace text replacement.', inputSchema: z.object({ path: relativePath, expected: z.string().min(1).max(MAX_TEXT_BYTES), replacement: z.string().max(MAX_TEXT_BYTES), replaceAll: z.boolean().default(false), reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Apply the displayed targeted patch atomically.', sessionScope: (input) => input.path }));
  for (const name of ['file.rename', 'file.move'] as const) registry.register(definition({ ...base, name, purpose: 'Move a workspace path without overwriting.', inputSchema: z.object({ from: relativePath, to: relativePath, reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `${input.from} → ${input.to}`, describeEffect: () => 'Move the path without overwriting the destination.', sessionScope: (input) => `${input.from}\0${input.to}` }));
  registry.register(definition({ ...base, name: 'directory.create', purpose: 'Create a workspace directory.', inputSchema: z.object({ path: relativePath, reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 10_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Create a directory inside the workspace.', sessionScope: (input) => input.path }));
  registry.register(definition({ ...base, name: 'file.delete', purpose: 'Delete a workspace path after creating a rollback backup.', inputSchema: z.object({ path: relativePath, reason }), riskTier: 2, approval: 'always', workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => 'Back up then delete the selected source path.' }));
  registry.register(definition({ ...base, name: 'terminal.read', purpose: 'Read bounded recent output from an existing user terminal session.', inputSchema: z.object({ sessionId: z.string().uuid().optional(), maxCharacters: z.number().int().min(100).max(20_000).default(4_000) }), riskTier: 0, approval: 'automatic', workspaceBoundary: 'required', timeoutMs: 5_000, audit: { category: 'shell', recordsAffectedPaths: false, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.sessionId ?? 'all terminal sessions', describeEffect: () => 'Read bounded, redacted recent terminal evidence without changing the session.' }));

  const gitRead = (name: 'git.status' | 'git.diff' | 'git.log' | 'git.branches', schema: any, effect: string): void => registry.register(definition({ ...base, name, purpose: effect, inputSchema: schema, riskTier: 0, approval: 'automatic', workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'git', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => 'active Git workspace', describeEffect: () => effect }));
  gitRead('git.status', z.object({}), 'Inspect current branch and working tree status.'); gitRead('git.diff', z.object({ staged: z.boolean().default(false) }), 'Inspect the Git diff.'); gitRead('git.log', z.object({ limit: z.number().int().min(1).max(100).default(30) }), 'Inspect recent Git history.'); gitRead('git.branches', z.object({}), 'Inspect Git branches.');
  for (const name of ['git.stage', 'git.unstage'] as const) registry.register(definition({ ...base, name, purpose: `${name === 'git.stage' ? 'Stage' : 'Unstage'} selected Git paths.`, inputSchema: z.object({ files: z.array(relativePath).min(1).max(200), reason }), riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 20_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.files.join(', '), describeEffect: () => `${name === 'git.stage' ? 'Stage' : 'Unstage'} only the listed paths.`, sessionScope: (input) => [...input.files].sort().join('\0') }));
  registry.register(definition({ ...base, name: 'git.commit', purpose: 'Commit the exact staged Git paths.', inputSchema: z.object({ message: z.string().min(1).max(5_000), reason }), riskTier: 2, approval: 'always', workspaceBoundary: 'required', timeoutMs: 60_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => 'current branch and staged files', describeEffect: (input) => `Create a commit with message ${JSON.stringify(input.message)}.` }));
  for (const name of ['git.pull', 'git.push'] as const) registry.register(definition({ ...base, name, purpose: `${name === 'git.pull' ? 'Pull from' : 'Push to'} the configured remote.`, inputSchema: z.object({ reason }), riskTier: 2, approval: 'always', workspaceBoundary: 'required', timeoutMs: 120_000, audit: { category: 'git', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: () => 'origin and current branch', describeEffect: () => `${name === 'git.pull' ? 'Receive remote changes' : 'Send local commits'} using protected Git credentials.` }));
  registry.register(definition({ ...base, name: 'shell.run', purpose: 'Run an approved executable with an argument array.', inputSchema: z.object({ command: z.string().min(1).max(4_096), args: z.array(z.string().max(32_000)).max(500).default([]), workingDirectory: z.string().max(4_096).default('.'), timeoutMs: z.number().int().min(100).max(600_000).default(120_000), environment: z.record(z.string()).optional(), environmentAllowlist: z.array(z.string()).max(100).default([]), reason, expectedOutcome: z.string().min(1).max(2_000) }), riskTier: 2, approval: 'always', workspaceBoundary: 'required', timeoutMs: 600_000, audit: { category: 'shell', recordsAffectedPaths: true, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => [input.command, ...(input.args ?? [])].map(quoteArgument).join(' '), describeEffect: (input) => input.expectedOutcome }));
  registry.register(definition({ ...base, name: 'web.search', purpose: 'Search the public web as explicitly approved external research.', inputSchema: z.object({ query: z.string().min(1).max(1_000), reason, projectDataSent: z.string().max(2_000).default('None') }), riskTier: 2, approval: 'always', workspaceBoundary: 'not-applicable', timeoutMs: 30_000, audit: { category: 'web', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.query, describeEffect: () => 'Send the exact query to an external search service and return cited results.' }));
  for (const name of ['web.fetch', 'web.open'] as const) registry.register(definition({ ...base, name, purpose: 'Retrieve an approved public HTTP(S) resource.', inputSchema: z.object({ url: z.string().url().max(8_000), reason, projectDataSent: z.string().max(2_000).default('None') }), riskTier: 2, approval: 'always', workspaceBoundary: 'not-applicable', timeoutMs: 30_000, audit: { category: 'web', recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.url, describeEffect: () => 'Retrieve bounded external web evidence without browser automation.' }));
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
  readonly sessions: SessionPermissionStore;
  readonly policy: PolicyEngine;
  private readonly requests = new Map<string, ToolRequest>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly executors = new Map<string, ToolExecutor>();
  private readonly workspaceRoots = new Map<string, string>();

  constructor(private readonly dependencies: { git: GitService; shell: ShellService; terminal?: { list(): Array<{ id: string; cwd: string; state: string; exitCode: number | null; recentOutput: string }> }; web: WebService; audit: AuditStore; dirtyPaths: () => ReadonlySet<string> }) {
    this.registry = createToolRegistry(); this.sessions = new SessionPermissionStore(); this.policy = new PolicyEngine(this.sessions); this.installExecutors();
  }

  definitions(): ToolDefinition<any, any>[] { return this.registry.list(); }
  providerDefinitions(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> { return this.registry.list().map((entry) => ({ name: entry.name, description: `${entry.purpose} Risk Tier ${entry.riskTier}; ${entry.approval === 'automatic' ? 'may run automatically' : 'requires user approval'}.`, parameters: zodToJsonSchema(entry.inputSchema, { target: 'openApi3' }) as Record<string, unknown> })); }
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
      toolName: definition.name, input, riskTier: definition.riskTier, reason: typeof input.reason === 'string' ? input.reason : definition.purpose,
      target: prediction.target ?? definition.describeTarget(input), workingDirectory: typeof input.workingDirectory === 'string' ? input.workingDirectory : undefined,
      expectedEffect: definition.describeEffect(input), predictedAffectedPaths: prediction.paths, networkAccess: definition.networkAccess,
      externalDataDescription: typeof input.projectDataSent === 'string' ? input.projectDataSent : undefined, diff: prediction.diff,
      state: 'pending', requestedAt: now, updatedAt: now, sessionApprovalAvailable: definition.riskTier === 1 && Boolean(definition.sessionScope)
    };
    this.requests.set(request.id, request);
    if (!this.policy.requiresApproval(context.workspaceId, definition, input)) {
      const result = await this.execute(request.id, context, 'automatic');
      return { request: { ...request }, result };
    }
    return { request: { ...request } };
  }

  async approve(requestId: string, context: ToolRouterContext, choice: 'run-once' | 'session'): Promise<ToolResult> {
    const request = this.required(requestId);
    const definition = this.registry.get(request.toolName)!;
    if (request.workspaceId !== context.workspaceId) throw new Error('Tool request belongs to another workspace.');
    if (request.state !== 'pending') throw new Error('Tool request is no longer pending.');
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
    return { id: randomUUID(), timestamp: Date.now(), workspaceId: request.workspaceId, conversationId: request.conversationId, modelId: request.modelId, toolName: request.toolName, sanitizedInputs: sanitizeToolData(request.input), riskTier: request.riskTier, approvalDecision, executionDurationMs, success, result: { success, summary: resultSummary, exitCode: exitCode ?? null, affectedPathCount: affectedPaths.length, rollbackAvailable: rollback?.available ?? false }, resultSummary, affectedPaths, exitCode, rollback };
  }

  private async auditValidationFailure(call: ProviderToolCall, context: ToolRouterContext, error: unknown): Promise<void> {
    const summary = error instanceof Error ? error.message : String(error);
    await this.dependencies.audit.appendAction({ id: randomUUID(), timestamp: Date.now(), workspaceId: context.workspaceId, conversationId: context.conversationId, modelId: context.modelId, toolName: call.name, sanitizedInputs: sanitizeToolData(call.arguments), riskTier: 2, approvalDecision: 'validation-failed', executionDurationMs: 0, success: false, result: { success: false, summary }, resultSummary: summary, affectedPaths: [] });
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
    this.executors.set('file.list', async (input, request) => { const absolute = await resolveContainedPath(this.root(request), input.path === '.' ? '.' : input.path); const entries: Array<{ path: string; type: string; size: number }> = []; const visit = async (current: string, depth: number): Promise<void> => { for (const entry of await fs.readdir(current, { withFileTypes: true })) { if (['.git', '.forge', 'node_modules', 'dist_electron', 'out'].includes(entry.name)) continue; const child = path.join(current, entry.name); const stat = await fs.lstat(child); entries.push({ path: path.relative(this.root(request), child), type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file', size: stat.size }); if (input.recursive && entry.isDirectory() && depth < input.maxDepth) await visit(child, depth + 1); } }; await visit(absolute, 0); return ok({ entries: entries.slice(0, 5_000), truncated: entries.length > 5_000 }); });
    this.executors.set('file.read', async (input, request) => { const absolute = await resolveContainedPath(this.root(request), input.path); const data = await readText(absolute); return ok({ path: input.path, content: data.content, encoding: data.encoding }); });
    this.executors.set('file.search', async (input, request, signal) => { const absolute = await resolveContainedPath(this.root(request), input.path === '.' ? '.' : input.path); const matches: Array<{ path: string; line: number; text: string }> = []; const query = input.caseSensitive ? input.query : input.query.toLowerCase(); const visit = async (current: string): Promise<void> => { if (signal.aborted || matches.length >= input.maxResults) return; for (const entry of await fs.readdir(current, { withFileTypes: true })) { if (signal.aborted || matches.length >= input.maxResults) return; if (['.git', '.forge', '.obsidian', 'node_modules', 'dist_electron', 'out'].includes(entry.name)) continue; const child = path.join(current, entry.name); if (entry.isDirectory()) await visit(child); else if (entry.isFile()) { try { const data = await readText(child); for (const [index, line] of data.content.split(/\r?\n/).entries()) { const haystack = input.caseSensitive ? line : line.toLowerCase(); if (haystack.includes(query)) matches.push({ path: path.relative(this.root(request), child), line: index + 1, text: line.slice(0, 2_000) }); if (matches.length >= input.maxResults) break; } } catch { /* skip unsupported files */ } } } }; await visit(absolute); return ok({ matches, truncated: matches.length >= input.maxResults }); });
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
  }

  private root(request: ToolRequest): string { const root = this.workspaceRoots.get(request.workspaceId); if (!root) throw new Error('Workspace root is unavailable for this request.'); return root; }
  private assertNotDirty(relative: string): void { if (this.dependencies.dirtyPaths().has(relative)) throw new Error(`The editor has unsaved content for ${relative}; save or discard it before tool execution.`); }
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
