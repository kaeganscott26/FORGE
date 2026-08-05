import { describe, it, expect } from 'vitest';
import { Agent } from '../src/agent';

class MockProvider {
  id = 'mock';
  async isConfigured() { return true; }
  async chat(messages: any[]) { return `response to: ${messages[messages.length - 1].content.slice(0, 32)}`; }
}

class MockBuilder {
  async buildContext() {
    return { projectName: 'repo', rootPath: '/repo', files: [], readme: null, packageJson: null, gitStatus: null, recentCommits: null, metadata: null };
  }
}

describe('Agent', () => {
  it('ask calls provider and returns response', async () => {
    const provider = new MockProvider();
    const builder = new MockBuilder();
    const agent = new Agent(provider as any, builder as any);
    const r = await agent.ask('What is this repo?');
    expect(r).toContain('response to:');
  });

  it('explainProject delegates to ask', async () => {
    const provider = new MockProvider();
    const builder = new MockBuilder();
    const agent = new Agent(provider as any, builder as any);
    const r = await agent.explainProject();
    expect(r).toContain('response to:');
  });
});
