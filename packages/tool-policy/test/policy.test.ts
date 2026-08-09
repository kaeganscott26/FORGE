import { describe, expect, it } from 'vitest';
import { ToolRegistry, ToolValidationError, z, type ToolDefinition } from '../src';

const tool: ToolDefinition<{ path: string }, { success: boolean }> = {
  name: 'file.write', purpose: 'write', inputSchema: z.object({ path: z.string().min(1) }), outputSchema: z.object({ success: z.boolean() }),
  sideEffect: 'workspace-write', approval: 'session',
  workspaceBoundary: 'required', timeoutMs: 1_000,
  audit: { category: 'filesystem', recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, cancellable: true, networkAccess: false,
  describeTarget: (input) => input.path, describeEffect: () => 'write'
};

describe('tool registry', () => {
  it('rejects unknown tools and malformed arguments before execution', () => {
    const registry = new ToolRegistry(); registry.register(tool);
    expect(() => registry.parse({ id: '1', name: 'shell.unknown', arguments: {}, provider: 'test' })).toThrowError(ToolValidationError);
    expect(() => registry.parse({ id: '2', name: 'file.write', arguments: {}, provider: 'test' })).toThrow(/Invalid arguments/);
  });
});
