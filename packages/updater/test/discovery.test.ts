import { describe, expect, it, vi } from 'vitest';
import { GitHubReleaseDiscovery, selectCompatibleRelease, type GitHubRelease, type LogicalUpdateChannel, type ReleaseDiscoveryFetch } from '../src';

const publishedAt = '2026-08-06T12:00:00.000Z';
const release = (version: string, options: { draft?: boolean; prerelease?: boolean; published?: boolean; asset?: boolean; assetUrl?: string } = {}): GitHubRelease => {
  const prerelease = options.prerelease ?? version.includes('-');
  const channel = prerelease ? 'preview' : 'latest';
  return {
    draft: options.draft ?? false,
    prerelease,
    tag_name: `v${version}`,
    published_at: options.published === false ? null : publishedAt,
    assets: options.asset === false ? [] : [{
      name: `${channel}-mac.yml`,
      browser_download_url: options.assetUrl ?? `https://github.com/kaeganscott26/FORGE/releases/download/v${version}/${channel}-mac.yml`
    }]
  };
};

const select = (current: string, channel: LogicalUpdateChannel, releases: GitHubRelease[]) => selectCompatibleRelease(
  releases,
  current,
  channel,
  { owner: 'kaeganscott26', repo: 'FORGE' }
);

describe('GitHub release discovery policy', () => {
  it('keeps Stable on strictly newer stable semantic versions', () => {
    expect(select('1.0.1', 'stable', [release('1.1.0-alpha.1'), release('1.1.0-beta.1'), release('1.1.0-rc.1')])).toBeNull();
    expect(select('1.0.1', 'stable', [release('1.1.0'), release('1.1.0-alpha.3')])?.version).toBe('1.1.0');
    expect(select('1.1.0-alpha.2', 'stable', [release('1.0.1')])).toBeNull();
  });

  it('moves Preview forward through alpha, beta, rc, and stable', () => {
    expect(select('1.1.0-alpha.1', 'preview', [release('1.1.0-alpha.2')])?.version).toBe('1.1.0-alpha.2');
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3')])?.version).toBe('1.1.0-alpha.3');
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-beta.1')])?.version).toBe('1.1.0-beta.1');
    expect(select('1.1.0-beta.1', 'preview', [release('1.1.0-rc.1')])?.version).toBe('1.1.0-rc.1');
    expect(select('1.1.0-rc.1', 'preview', [release('1.1.0')])?.version).toBe('1.1.0');
  });

  it('rejects downgrades, unsupported prerelease identifiers, drafts, unpublished releases, malformed tags, and unusable feeds', () => {
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.1'), release('1.0.1')])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-preview.3')])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.9', { draft: true }), release('1.1.0-alpha.8', { published: false }), { ...release('1.1.0-alpha.7'), tag_name: 'not-semver' }])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3', { prerelease: false }), release('1.1.0', { prerelease: true })])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3', { asset: false })])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3', { assetUrl: 'https://example.com/preview-mac.yml' })])).toBeNull();
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3', { assetUrl: 'https://github.com/kaeganscott26/FORGE/releases/download/v1.1.0-alpha.4/preview-mac.yml' })])).toBeNull();
  });

  it('selects the highest compatible release regardless of API ordering', () => {
    expect(select('1.1.0-alpha.2', 'preview', [release('1.1.0-alpha.3'), release('1.1.0-rc.1'), release('1.1.0-beta.1')])?.version).toBe('1.1.0-rc.1');
  });

  it('bounds and validates the GitHub API response before selection', async () => {
    const payload = JSON.stringify([release('1.1.0-alpha.3')]);
    const request = vi.fn<ReleaseDiscoveryFetch>(async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : String(Buffer.byteLength(payload)) },
      arrayBuffer: async () => new TextEncoder().encode(payload).buffer
    }));
    const discovery = new GitHubReleaseDiscovery({ owner: 'kaeganscott26', repo: 'FORGE', fetch: request });
    await expect(discovery.discover('1.1.0-alpha.2', 'preview')).resolves.toMatchObject({ version: '1.1.0-alpha.3', feedChannel: 'preview' });
    expect(request).toHaveBeenCalledWith('https://api.github.com/repos/kaeganscott26/FORGE/releases?per_page=50', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(request.mock.calls[0]?.[1].headers).not.toHaveProperty('Authorization');

    const oversized = new GitHubReleaseDiscovery({ owner: 'kaeganscott26', repo: 'FORGE', maxResponseBytes: 10, fetch: request });
    await expect(oversized.discover('1.1.0-alpha.2', 'preview')).rejects.toThrow('size limit');
  });

  it('applies a timeout and cancellation signal to release discovery', async () => {
    const request: ReleaseDiscoveryFetch = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
    const discovery = new GitHubReleaseDiscovery({ owner: 'kaeganscott26', repo: 'FORGE', timeoutMs: 5, fetch: request });
    await expect(discovery.discover('1.1.0-alpha.2', 'preview')).rejects.toThrow('timed out');
  });
});
