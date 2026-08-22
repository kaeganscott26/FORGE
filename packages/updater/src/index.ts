import { compare, gt, prerelease, valid } from 'semver';
import { fetch } from 'undici';
import { z } from 'zod';

export type LogicalUpdateChannel = 'stable' | 'beta';
export type UpdatePlatform = 'darwin' | 'win32' | 'linux';

const supportedBetaIdentifiers = new Set(['beta', 'rc']);
const githubAssetSchema = z.object({
  name: z.string().min(1).max(200),
  browser_download_url: z.string().url().max(2_048)
});
const githubReleaseSchema = z.object({
  draft: z.boolean(),
  prerelease: z.boolean(),
  tag_name: z.string().min(1).max(100),
  published_at: z.string().datetime().nullable(),
  assets: z.array(githubAssetSchema).max(50)
});
const githubReleasesSchema = z.array(githubReleaseSchema).max(100);

export type GitHubRelease = z.infer<typeof githubReleaseSchema>;

export interface DiscoveredUpdateRelease {
  version: string;
  tagName: string;
  prerelease: boolean;
  feedBaseUrl: string;
  feedChannel: 'latest' | 'beta';
  metadataAssetUrl: string;
}

interface DiscoveryResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ReleaseDiscoveryFetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<DiscoveryResponse>;

export interface GitHubReleaseDiscoveryOptions {
  owner: string;
  repo: string;
  platform?: UpdatePlatform;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetch?: ReleaseDiscoveryFetch;
}

function isCompatibleVersion(version: string, releaseIsPrerelease: boolean, channel: LogicalUpdateChannel): boolean {
  const identifiers = prerelease(version);
  if (identifiers === null) return !releaseIsPrerelease;
  if (channel === 'stable' || !releaseIsPrerelease) return false;
  return typeof identifiers[0] === 'string' && supportedBetaIdentifiers.has(identifiers[0]);
}

function safeMetadataAssetUrl(rawUrl: string, owner: string, repo: string, tagName: string, assetName: string): URL | null {
  try {
    const url = new URL(rawUrl);
    const expectedPath = `/${owner}/${repo}/releases/download/${tagName}/${assetName}`;
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) return null;
    return url;
  } catch {
    return null;
  }
}

function metadataAssetName(channel: 'latest' | 'beta', platform: UpdatePlatform): string {
  if (platform === 'darwin') return `${channel}-mac.yml`;
  if (platform === 'linux') return `${channel}-linux.yml`;
  return `${channel}.yml`;
}

export function selectCompatibleRelease(
  releases: GitHubRelease[],
  currentVersion: string,
  channel: LogicalUpdateChannel,
  repository: { owner: string; repo: string },
  platform: UpdatePlatform = 'darwin'
): DiscoveredUpdateRelease | null {
  if (!valid(currentVersion)) return null;
  const candidates: DiscoveredUpdateRelease[] = [];
  for (const release of releases) {
    if (release.draft || release.published_at === null) continue;
    const version = valid(release.tag_name);
    if (!version || !gt(version, currentVersion) || !isCompatibleVersion(version, release.prerelease, channel)) continue;
    const isPrerelease = prerelease(version) !== null;
    const feedChannel = isPrerelease ? 'beta' : 'latest';
    const assetName = metadataAssetName(feedChannel, platform);
    const asset = release.assets.find((entry) => entry.name === assetName);
    const assetUrl = asset ? safeMetadataAssetUrl(asset.browser_download_url, repository.owner, repository.repo, release.tag_name, assetName) : null;
    if (!assetUrl) continue;
    candidates.push({
      version,
      tagName: release.tag_name,
      prerelease: isPrerelease,
      feedBaseUrl: new URL('.', assetUrl).href,
      feedChannel,
      metadataAssetUrl: assetUrl.href
    });
  }
  return candidates.sort((left, right) => compare(right.version, left.version))[0] ?? null;
}

export class GitHubReleaseDiscovery {
  private readonly owner: string;
  private readonly repo: string;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly request: ReleaseDiscoveryFetch;
  private readonly platform: UpdatePlatform;

  constructor(options: GitHubReleaseDiscoveryOptions) {
    if (!/^[A-Za-z0-9_.-]+$/.test(options.owner) || !/^[A-Za-z0-9_.-]+$/.test(options.repo)) throw new Error('Invalid GitHub repository coordinates.');
    this.owner = options.owner;
    this.repo = options.repo;
    this.platform = options.platform ?? (process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : 'darwin');
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxResponseBytes = options.maxResponseBytes ?? 1_000_000;
    this.request = options.fetch ?? ((url, init) => fetch(url, init) as Promise<DiscoveryResponse>);
  }

  async discover(currentVersion: string, channel: LogicalUpdateChannel, signal?: AbortSignal): Promise<DiscoveredUpdateRelease | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('GitHub release discovery timed out.')), this.timeoutMs);
    const abort = (): void => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=50`;
      const response = await this.request(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'FORGE-Updater',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`GitHub release discovery failed with HTTP ${response.status}.`);
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.toLowerCase().includes('application/json')) throw new Error('GitHub release discovery returned an unsupported content type.');
      const declaredLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > this.maxResponseBytes) throw new Error('GitHub release discovery response exceeded its size limit.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > this.maxResponseBytes) throw new Error('GitHub release discovery response exceeded its size limit.');
      let payload: unknown;
      try { payload = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { throw new Error('GitHub release discovery returned malformed JSON.'); }
      const releases = githubReleasesSchema.parse(payload);
      return selectCompatibleRelease(releases, currentVersion, channel, { owner: this.owner, repo: this.repo }, this.platform);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}
