import { describe, it, expect } from 'vitest';
import { ContextBuilderImpl } from '../src/context';
import { Agent } from '../src/agent';
import { WorkspaceService } from '@forge/workspace';
import { GitService } from '@forge/git';
import { StorageService } from '@forge/storage';

class MockProvider {
  id = 'mock';
  async isConfigured() { return true; }
  async chat(_messages: any[]) { return 'MOCK_REPLY'; }
}

describe('Agent headless integration', () => {
  it('builds context and returns provider response', async () => {
    const workspace = new WorkspaceService();
    const git = new GitService();
    const storage = new StorageService();
    const ctxBuilder = new ContextBuilderImpl(workspace, git, storage);
    const agent = new Agent(new MockProvider() as any, ctxBuilder as any);

    const resp = await agent.ask('Explain this repository');
    expect(resp).toBe('MOCK_REPLY');

    const ctx = await ctxBuilder.buildContext();
    expect(ctx).toHaveProperty('files');
    expect(Array.isArray(ctx.files)).toBe(true);
  });
});
