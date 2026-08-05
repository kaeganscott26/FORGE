import { describe, it, expect } from 'vitest';
import { ContextBuilderImpl, ProjectContext } from '../src/context';

// Create lightweight mocks for services
class MockWorkspace {
  private files: Record<string, string>;
  constructor(files: Record<string, string> = {}) { this.files = files; }
  info() { return { rootPath: '/repo', name: 'repo' }; }
  async list() { return []; }
  async readFile(path: string) { if (this.files[path]) return { path, content: this.files[path], modifiedAt: Date.now() }; throw new Error('not found'); }
}

class MockGit {
  async status() { return { branch: 'main' }; }
  async log(limit = 10) { return [{ hash: 'a1', message: 'first', author: 'me', timestamp: 1 }]; }
}

class MockStorage {
  async dashboard() { return { id: 'p1', name: 'repo' }; }
}

describe('ContextBuilder', () => {
  it('generates context with README and package.json when present', async () => {
    const ws = new MockWorkspace({ 'README.md': '# Hello', 'package.json': '{"name":"repo"}' });
    const git = new MockGit();
    const storage = new MockStorage();
    const builder = new ContextBuilderImpl(ws as any, git as any, storage as any);
    const ctx = await builder.buildContext();
    expect(ctx.projectName).toBe('repo');
    expect(ctx.readme?.content).toBe('# Hello');
    expect(ctx.packageJson?.content).toContain('"name"');
    expect(ctx.gitStatus).not.toBeNull();
    expect(ctx.recentCommits && ctx.recentCommits.length).toBeGreaterThan(0);
  });

  it('handles missing README gracefully', async () => {
    const ws = new MockWorkspace({ 'package.json': '{"name":"repo"}' });
    const git = new MockGit();
    const storage = new MockStorage();
    const builder = new ContextBuilderImpl(ws as any, git as any, storage as any);
    const ctx = await builder.buildContext();
    expect(ctx.readme).toBeNull();
  });

  it('handles non-git projects', async () => {
    const ws = new MockWorkspace({ 'README.md': '# hi' });
    const git = { status: async () => { throw new Error('not a git repo'); }, log: async () => { throw new Error('not a git repo'); } } as any;
    const storage = new MockStorage();
    const builder = new ContextBuilderImpl(ws as any, git as any, storage as any);
    const ctx = await builder.buildContext();
    expect(ctx.gitStatus).toBeNull();
    expect(ctx.recentCommits).toBeNull();
  });

  it('handles empty workspace', async () => {
    const ws = new MockWorkspace();
    const git = new MockGit();
    const storage = new MockStorage();
    const builder = new ContextBuilderImpl(ws as any, git as any, storage as any);
    const ctx = await builder.buildContext();
    expect(ctx.files).toBeInstanceOf(Array);
  });
});
