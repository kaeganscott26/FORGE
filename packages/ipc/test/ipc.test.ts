import { describe, it, expect } from 'vitest';
import { formatAppBuildInfo, IPC_CHANNELS } from '../src';

describe('IPC contract', () => {
  it('exposes agent channels', () => {
    expect(IPC_CHANNELS.agentAsk).toBe('agent.ask');
    expect(IPC_CHANNELS.agentExplainProject).toBe('agent.explainProject');
    expect(IPC_CHANNELS.agentReviewChanges).toBe('agent.reviewChanges');
  });

  it('exposes non-secret build diagnostics and copy channels', () => {
    expect(IPC_CHANNELS.appBuildInfo).toBe('app.build.info');
    expect(IPC_CHANNELS.appBuildInfoCopy).toBe('app.build.info.copy');
    expect(formatAppBuildInfo({
      version: '1.0.1',
      commit: 'abc123',
      buildDate: '2026-08-06T12:00:00.000Z',
      runtime: 'packaged',
      rendererSource: 'file:// packaged app.asar',
      platform: 'darwin',
      architecture: 'arm64'
    })).toContain('FORGE v1.0.1\nCommit: abc123');
  });
});
