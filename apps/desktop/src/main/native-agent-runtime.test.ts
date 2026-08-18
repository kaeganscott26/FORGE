import { describe, expect, it } from 'vitest';
import { assertToolIdentity, runtimeToolRecoveryGuidance } from './native-agent-runtime';

describe('native agent tool routing', () => {
  const conversationId = '0d4df9fc-a584-4dbe-8cce-7f9b783581f3';
  const requestId = '2d5e799a-7d73-48b8-a4e9-d314944b5b95';

  it('preserves request and conversation identities across tool results', () => {
    const request = { id: requestId, toolName: 'file.list', conversationId };
    const result = { requestId, toolName: 'file.list' };
    expect(() => assertToolIdentity(request, result, conversationId)).not.toThrow();
  });

  it('rejects mismatched request, tool, or conversation identities before continuation', () => {
    const request = { id: requestId, toolName: 'file.list', conversationId };
    expect(() => assertToolIdentity(request, { requestId: '72b59bd4-42b1-4288-9513-dba43b9103a0', toolName: 'file.list' }, conversationId)).toThrow(/request mismatch/i);
    expect(() => assertToolIdentity(request, { requestId, toolName: 'shell.run' }, conversationId)).toThrow(/name mismatch/i);
    expect(() => assertToolIdentity({ ...request, conversationId: 'c2cff4f7-f41f-445e-b6f5-8b9ef5d55051' }, undefined, conversationId)).toThrow(/conversation mismatch/i);
  });

  it('turns workspace path-policy failures into actionable recovery without hiding available tools', () => {
    const tools = new Set(['file.list', 'file.read', 'shell.run', 'terminal.read', 'browser.read']);
    const guidance = runtimeToolRecoveryGuidance('file.list', 'Path must be workspace-relative and may not traverse upward.', tools);
    expect(guidance).toContain('Runtime tool catalog:');
    expect(guidance).toContain('shell.run');
    expect(guidance).toContain('workspace-scoped');
    expect(guidance).toContain('Do not retry them with absolute paths');
  });

  it('treats permission-denied scans as skippable rather than a reason to mutate ownership', () => {
    const guidance = runtimeToolRecoveryGuidance('file.list', "EACCES: permission denied, scandir '/home/user/.local/share/containers/storage/overlay/layer'", new Set(['file.list', 'shell.run']));
    expect(guidance).toMatch(/skippable evidence/i);
    expect(guidance).toMatch(/Do not chmod\/chown/i);
  });
});
