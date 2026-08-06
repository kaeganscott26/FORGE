import { describe, expect, it } from 'vitest';
import { PolicyEngine, SessionPermissionStore, ToolRegistry, ToolValidationError, z, type ToolDefinition } from '../src';

const tier1: ToolDefinition<{ path: string }, { success: boolean }> = {
  name: 'file.write', purpose: 'write', inputSchema: z.object({ path: z.string().min(1) }), outputSchema: z.object({ success: z.boolean() }),
  riskTier: 1, approval: 'explicit', workspaceBoundary: 'required', timeoutMs: 1_000,
  audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, cancellable: true, networkAccess: false,
  describeTarget: (input) => input.path, describeEffect: () => 'write', sessionScope: (input) => input.path
};

describe('tool policy', () => {
  it('rejects unknown tools and malformed arguments before policy evaluation', () => {
    const registry = new ToolRegistry(); registry.register(tier1);
    expect(() => registry.parse({ id: '1', name: 'shell.unknown', arguments: {}, provider: 'test' })).toThrowError(ToolValidationError);
    expect(() => registry.parse({ id: '2', name: 'file.write', arguments: {}, provider: 'test' })).toThrow(/Invalid arguments/);
  });

  it('expires narrowly scoped Tier 1 permissions and never applies them to another path', () => {
    let now = 1_000; const sessions = new SessionPermissionStore(() => now); const policy = new PolicyEngine(sessions);
    expect(policy.requiresApproval('workspace', tier1, { path: 'a.txt' })).toBe(true);
    sessions.grant('workspace', tier1, { path: 'a.txt' }, 1_000);
    expect(policy.requiresApproval('workspace', tier1, { path: 'a.txt' })).toBe(false);
    expect(policy.requiresApproval('workspace', tier1, { path: 'b.txt' })).toBe(true);
    now = 2_001;
    expect(policy.requiresApproval('workspace', tier1, { path: 'a.txt' })).toBe(true);
  });

  it('never grants session permission to Tier 2 tools', () => {
    const sessions = new SessionPermissionStore();
    expect(() => sessions.grant('workspace', { ...tier1, name: 'shell.run', riskTier: 2, approval: 'always' }, { path: 'a' })).toThrow(/Tier 1/);
  });
});
