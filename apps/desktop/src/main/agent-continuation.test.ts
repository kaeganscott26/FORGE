import { describe, expect, it } from 'vitest';
import { looksLikeRepeatedToolRequest, toolCallKey } from './agent-continuation';

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
});
