import { describe, expect, it } from 'vitest';
import { GitHubService } from '../src';

describe('GitHub REST adapter', () => {
  it('reads active-repository metadata through a bounded official API request', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const service = new GitHubService(async () => 'git@github.com:forge/example.git', async () => ({ token: 'test-token' }), async (url, init) => {
      requests.push({ url: String(url), authorization: new Headers(init?.headers).get('Authorization') });
      return new Response(JSON.stringify({ full_name: 'forge/example' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    await expect(service.read('metadata')).resolves.toEqual({ full_name: 'forge/example' });
    expect(requests[0]).toEqual({ url: 'https://api.github.com/repos/forge/example', authorization: 'Bearer test-token' });
  });

  it('requires configured credentials for a mutation and rejects non-GitHub origins', async () => {
    const service = new GitHubService(async () => 'https://git.example.com/forge/example.git');
    await expect(service.read('metadata')).rejects.toThrow(/GitHub repository/);
    const configuredOrigin = new GitHubService(async () => 'https://github.com/forge/example.git');
    await expect(configuredOrigin.mutate('create-issue', { title: 'Issue' })).rejects.toThrow(/token/);
  });
});
