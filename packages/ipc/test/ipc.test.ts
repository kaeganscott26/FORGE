import { describe, it, expect } from 'vitest';
import { buildReleaseIdentity, formatAppBuildInfo, IPC_CHANNELS, normalizeUpdateChannel } from '../src';

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
      channel: 'stable',
      commit: 'abc123',
      buildDate: '2026-08-06T12:00:00.000Z',
      runtime: 'packaged',
      rendererSource: 'file:// packaged app.asar',
      platform: 'darwin',
      architecture: 'arm64'
    })).toContain('FORGE v1.0.1\nChannel: stable\nCommit: abc123');
  });

  it('selects development, preview, and stable release identities safely', () => {
    expect(buildReleaseIdentity('1.1.0-alpha.1', false)).toEqual({ version: '1.1.0-alpha.1-dev', channel: 'development' });
    expect(buildReleaseIdentity('1.1.0-alpha.1', true)).toEqual({ version: '1.1.0-alpha.1', channel: 'preview' });
    expect(buildReleaseIdentity('1.1.0', true)).toEqual({ version: '1.1.0', channel: 'stable' });
    expect(normalizeUpdateChannel('preview')).toBe('preview'); expect(normalizeUpdateChannel('anything-else')).toBe('stable');
  });
});
