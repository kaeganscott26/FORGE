import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../src';

describe('IPC contract', () => {
  it('exposes agent channels', () => {
    expect(IPC_CHANNELS.agentAsk).toBe('agent.ask');
    expect(IPC_CHANNELS.agentExplainProject).toBe('agent.explainProject');
    expect(IPC_CHANNELS.agentReviewChanges).toBe('agent.reviewChanges');
  });
});
