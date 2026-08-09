import { describe, expect, it } from 'vitest';
import { looksLikeRepeatedToolRequest, ProgressAwareLoopGuard, toolCallKey } from './agent-continuation';

describe('agent continuation synthesis', () => {
  it('recognizes plain and fenced JSON tool repetitions', () => {
    expect(looksLikeRepeatedToolRequest('{"name":"file.read","parameters":{"path":"draft.txt"}}')).toBe(true);
    expect(looksLikeRepeatedToolRequest('```json\n{"tool":"file.read","arguments":{"path":"draft.txt"}}\n```')).toBe(true);
  });

  it('does not replace an ordinary assistant answer', () => {
    expect(looksLikeRepeatedToolRequest('draft-two-content')).toBe(false);
    expect(looksLikeRepeatedToolRequest('{not json}')).toBe(false);
  });

  it('deduplicates equivalent calls without trusting provider task links', () => {
    expect(toolCallKey({ name: 'file.read', arguments: { path: 'draft.txt', taskContext: { taskId: 'invented', stepId: 'step' } } }))
      .toBe(toolCallKey({ name: 'file.read', arguments: { path: 'draft.txt' } }));
  });

  it('allows long and meaningful tool sequences while stopping only same-call same-state loops', () => {
    const guard = new ProgressAwareLoopGuard();
    for (let index = 0; index < 12; index += 1) {
      const call = { name: 'file.read', arguments: { path: `source-${index}.ts` } };
      expect(guard.shouldRun(call, 'head-a')).toBe(true);
      guard.record(call, 'head-a', { success: true, file: index });
    }
    const repeated = { name: 'file.read', arguments: { path: 'source-0.ts' } };
    expect(guard.shouldRun(repeated, 'head-a')).toBe(false);
    expect(guard.shouldRun(repeated, 'head-b')).toBe(true);
  });
});
