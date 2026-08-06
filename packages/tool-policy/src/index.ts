import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

export type ToolRiskTier = 0 | 1 | 2;
export type ApprovalRequirement = 'automatic' | 'explicit' | 'always';
export type ToolExecutionState = 'pending' | 'approved' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'cancelled';

export interface ToolAuditMetadata {
  category: 'filesystem' | 'git' | 'shell' | 'web' | 'memory';
  recordsAffectedPaths: boolean;
  recordsExitCode: boolean;
  externalDataTransfer: boolean;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  purpose: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  riskTier: ToolRiskTier;
  approval: ApprovalRequirement;
  workspaceBoundary: 'required' | 'not-applicable';
  timeoutMs: number;
  audit: ToolAuditMetadata;
  cancellable: boolean;
  networkAccess: boolean;
  describeTarget(input: I): string;
  describeEffect(input: I): string;
  sessionScope?(input: I): string;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: unknown;
  provider: string;
}

export interface ToolRequest<I = unknown> {
  id: string;
  workspaceId: string;
  conversationId: string;
  modelId: string;
  toolName: string;
  input: I;
  riskTier: ToolRiskTier;
  reason: string;
  target: string;
  workingDirectory?: string;
  expectedEffect: string;
  predictedAffectedPaths: string[];
  networkAccess: boolean;
  externalDataDescription?: string;
  diff?: string;
  state: ToolExecutionState;
  requestedAt: number;
  updatedAt: number;
  sessionApprovalAvailable: boolean;
}

export interface ToolResult<T = unknown> {
  requestId: string;
  toolName: string;
  success: boolean;
  output?: T;
  affectedPaths: string[];
  diff?: string;
  warnings: string[];
  error?: { code: string; message: string; details?: string };
  rollback?: { available: boolean; instructions?: string; backupPath?: string };
  exitCode?: number | null;
  durationMs: number;
  truncated?: boolean;
  cancelled?: boolean;
}

export interface SessionPermission {
  id: string;
  workspaceId: string;
  toolName: string;
  scopeHash: string;
  expiresAt: number;
}

export class ToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition<any, any>>();

  register<I, O>(definition: ToolDefinition<I, O>): void {
    if (!/^[a-z]+(?:\.[a-z]+)+$/.test(definition.name)) throw new Error(`Invalid tool name: ${definition.name}`);
    if (this.definitions.has(definition.name)) throw new Error(`Duplicate tool name: ${definition.name}`);
    this.definitions.set(definition.name, definition);
  }

  get(name: string): ToolDefinition<any, any> | undefined { return this.definitions.get(name); }
  list(): ToolDefinition<any, any>[] { return [...this.definitions.values()]; }

  parse(call: ProviderToolCall): { definition: ToolDefinition<any, any>; input: any } {
    const definition = this.definitions.get(call.name);
    if (!definition) throw new ToolValidationError('UNKNOWN_TOOL', `Unknown tool name: ${call.name}`);
    const parsed = definition.inputSchema.safeParse(call.arguments);
    if (!parsed.success) throw new ToolValidationError('MALFORMED_ARGUMENTS', `Invalid arguments for ${call.name}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
    return { definition, input: parsed.data };
  }
}

export class ToolValidationError extends Error {
  constructor(public readonly code: 'UNKNOWN_TOOL' | 'MALFORMED_ARGUMENTS' | 'MALFORMED_OUTPUT', message: string) { super(message); }
}

const scopeHash = (workspaceId: string, toolName: string, scope: string): string => createHash('sha256').update(`${workspaceId}\0${toolName}\0${scope}`).digest('hex');

export class SessionPermissionStore {
  private readonly permissions = new Map<string, SessionPermission>();
  constructor(private readonly now: () => number = Date.now) {}

  grant(workspaceId: string, definition: ToolDefinition<any, any>, input: unknown, ttlMs = 30 * 60_000): SessionPermission {
    if (definition.riskTier !== 1 || !definition.sessionScope) throw new Error('Session permissions are only available for narrowly scoped Tier 1 tools.');
    const permission: SessionPermission = {
      id: randomUUID(), workspaceId, toolName: definition.name,
      scopeHash: scopeHash(workspaceId, definition.name, definition.sessionScope(input)),
      expiresAt: this.now() + Math.min(Math.max(ttlMs, 1_000), 60 * 60_000)
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  allows(workspaceId: string, definition: ToolDefinition<any, any>, input: unknown): boolean {
    this.expire();
    if (definition.riskTier !== 1 || !definition.sessionScope) return false;
    const expected = scopeHash(workspaceId, definition.name, definition.sessionScope(input));
    return [...this.permissions.values()].some((permission) => permission.workspaceId === workspaceId && permission.toolName === definition.name && permission.scopeHash === expected);
  }

  expire(): void {
    const now = this.now();
    for (const [id, permission] of this.permissions) if (permission.expiresAt <= now) this.permissions.delete(id);
  }

  clear(): void { this.permissions.clear(); }
}

export class PolicyEngine {
  constructor(private readonly sessions: SessionPermissionStore) {}

  requiresApproval(workspaceId: string, definition: ToolDefinition<any, any>, input: unknown): boolean {
    if (definition.riskTier === 0 && definition.approval === 'automatic') return false;
    if (definition.riskTier === 1 && definition.approval === 'explicit' && this.sessions.allows(workspaceId, definition, input)) return false;
    return true;
  }
}

export { z };
