export interface GitHubCredentials { token: string; }
export type GitHubReadResource = 'metadata' | 'branches' | 'commits' | 'issues' | 'pulls' | 'issue-comments' | 'pull-comments' | 'workflow-runs' | 'workflow-jobs' | 'releases' | 'release-assets';
export type GitHubMutation = 'create-issue' | 'update-issue' | 'comment-issue' | 'create-branch' | 'create-file' | 'create-pull-request' | 'comment-pull-request' | 'retry-workflow' | 'create-release' | 'update-release';

const bounded = (value: unknown): unknown => JSON.parse(JSON.stringify(value).slice(0, 1_500_000));

/** GitHub REST adapter: credentials are injected from app-global secure storage. */
export class GitHubService {
  constructor(private readonly origin: () => Promise<string>, private readonly credentials?: () => Promise<GitHubCredentials | null>, private readonly requestImpl: typeof fetch = fetch) {}

  async read(resource: GitHubReadResource, options: { number?: number; runId?: number; releaseId?: number; page?: number } = {}): Promise<unknown> {
    const page = Math.min(Math.max(options.page ?? 1, 1), 100);
    let suffix = '';
    switch (resource) {
      case 'metadata': break;
      case 'branches': suffix = `/branches?per_page=100&page=${page}`; break;
      case 'commits': suffix = `/commits?per_page=100&page=${page}`; break;
      case 'issues': suffix = `/issues?state=all&per_page=100&page=${page}`; break;
      case 'pulls': suffix = `/pulls?state=all&per_page=100&page=${page}`; break;
      case 'issue-comments': suffix = `/issues/${required(options.number, 'number')}/comments?per_page=100&page=${page}`; break;
      case 'pull-comments': suffix = `/pulls/${required(options.number, 'number')}/comments?per_page=100&page=${page}`; break;
      case 'workflow-runs': suffix = `/actions/runs?per_page=100&page=${page}`; break;
      case 'workflow-jobs': suffix = `/actions/runs/${required(options.runId, 'runId')}/jobs?per_page=100&page=${page}`; break;
      case 'releases': suffix = `/releases?per_page=100&page=${page}`; break;
      case 'release-assets': suffix = `/releases/${required(options.releaseId, 'releaseId')}/assets?per_page=100&page=${page}`; break;
    }
    return this.api(suffix, 'GET');
  }

  async mutate(action: GitHubMutation, input: Record<string, unknown>): Promise<unknown> {
    let operation: { method: string; path: string; body: Record<string, unknown> };
    switch (action) {
      case 'create-issue': operation = { method: 'POST', path: '/issues', body: pick(input, 'title', 'body', 'labels', 'assignees') }; break;
      case 'update-issue': operation = { method: 'PATCH', path: `/issues/${requiredNumber(input.number, 'number')}`, body: pick(input, 'title', 'body', 'state', 'labels', 'assignees') }; break;
      case 'comment-issue': operation = { method: 'POST', path: `/issues/${requiredNumber(input.number, 'number')}/comments`, body: pick(input, 'body') }; break;
      case 'create-branch': operation = { method: 'POST', path: '/git/refs', body: { ref: `refs/heads/${requiredString(input.branch, 'branch')}`, sha: requiredString(input.sha, 'sha') } }; break;
      case 'create-file': operation = { method: 'PUT', path: `/contents/${encodeURIComponent(requiredString(input.path, 'path')).replace(/%2F/g, '/')}`, body: pick(input, 'message', 'content', 'branch', 'sha') }; break;
      case 'create-pull-request': operation = { method: 'POST', path: '/pulls', body: pick(input, 'title', 'head', 'base', 'body', 'draft') }; break;
      case 'comment-pull-request': operation = { method: 'POST', path: `/issues/${requiredNumber(input.number, 'number')}/comments`, body: pick(input, 'body') }; break;
      case 'retry-workflow': operation = { method: 'POST', path: `/actions/runs/${requiredNumber(input.runId, 'runId')}/rerun`, body: {} }; break;
      case 'create-release': operation = { method: 'POST', path: '/releases', body: pick(input, 'tag_name', 'target_commitish', 'name', 'body', 'draft', 'prerelease') }; break;
      case 'update-release': operation = { method: 'PATCH', path: `/releases/${requiredNumber(input.releaseId, 'releaseId')}`, body: pick(input, 'tag_name', 'target_commitish', 'name', 'body', 'draft', 'prerelease') }; break;
    }
    return this.api(operation.path, operation.method, operation.body, true);
  }

  private async api(path: string, method: string, body?: unknown, requireCredentials = false): Promise<unknown> {
    const repository = await this.repository(); const credentials = await this.credentials?.();
    if (requireCredentials && !credentials) throw new Error('A GitHub token is required for this operation.');
    const response = await this.requestImpl(`https://api.github.com/repos/${repository.owner}/${repository.repo}${path}`, { method, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'FORGE-desktop', ...(credentials ? { Authorization: `Bearer ${credentials.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}).`);
    if (response.status === 204) return { success: true };
    return bounded(await response.json());
  }

  private async repository(): Promise<{ owner: string; repo: string }> {
    const origin = await this.origin();
    const match = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(origin);
    if (!match) throw new Error('The active Git remote is not a supported GitHub repository.');
    return { owner: match[1], repo: match[2] };
  }
}

const required = (value: number | undefined, name: string): number => { if (!Number.isSafeInteger(value) || value! < 1) throw new Error(`GitHub ${name} is required.`); return value!; };
const requiredNumber = (value: unknown, name: string): number => required(typeof value === 'number' ? value : undefined, name);
const requiredString = (value: unknown, name: string): string => { if (typeof value !== 'string' || !value.trim()) throw new Error(`GitHub ${name} is required.`); return value.trim(); };
const pick = (value: Record<string, unknown>, ...keys: string[]): Record<string, unknown> => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
