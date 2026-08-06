import { describe, it, expect } from 'vitest';
import { buildReleaseIdentity, buildUpdatePolicy, formatAppBuildInfo, IPC_CHANNELS, isUpdateVersionEligible, normalizeUpdateChannel } from '../src';

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
    expect(buildUpdatePolicy('stable')).toEqual({ allowPrerelease: false, allowDowngrade: false });
    expect(buildUpdatePolicy('preview')).toEqual({ allowPrerelease: true, allowDowngrade: false });
  });

  it('only permits forward updates that belong to the selected channel', () => {
    expect(isUpdateVersionEligible('1.0.1', '1.1.0-alpha.1', 'stable')).toBe(false);
    expect(isUpdateVersionEligible('1.0.1', '1.1.0-alpha.2', 'stable')).toBe(false);
    expect(isUpdateVersionEligible('1.0.1', '1.1.0-beta.1', 'stable')).toBe(false);
    expect(isUpdateVersionEligible('1.0.1', '1.1.0', 'stable')).toBe(true);
    expect(isUpdateVersionEligible('1.0.1', '1.1.0-alpha.1', 'preview')).toBe(true);
    expect(isUpdateVersionEligible('1.1.0-alpha.1', '1.1.0-alpha.2', 'preview')).toBe(true);
    expect(isUpdateVersionEligible('1.1.0-alpha.2', '1.1.0-alpha.1', 'preview')).toBe(false);
    expect(isUpdateVersionEligible('1.1.0-alpha.2', '1.1.0-beta.1', 'preview')).toBe(true);
    expect(isUpdateVersionEligible('1.1.0-beta.1', '1.1.0', 'preview')).toBe(true);
    expect(isUpdateVersionEligible('1.1.0', '1.1.0-beta.1', 'preview')).toBe(false);
    expect(isUpdateVersionEligible('1.1.0-alpha.2', '1.1.0-rc.1', 'preview')).toBe(true);
    expect(isUpdateVersionEligible('1.1.0-alpha.2', '1.1.0-preview.3', 'preview')).toBe(false);
    expect(isUpdateVersionEligible('invalid', '1.1.0', 'preview')).toBe(false);
    expect(isUpdateVersionEligible('1.1.0', 'invalid', 'preview')).toBe(false);
  });
});
