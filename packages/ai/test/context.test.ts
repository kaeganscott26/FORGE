import { describe, it, expect } from 'vitest';
import { ContextBuilderImpl } from '../src/context';

// Create lightweight mocks for services
class MockWorkspace {
  private files: Record<string, string>;
  listedPaths: string[] = [];
  constructor(files: Record<string, string> = {}) { this.files = files; }
  info() { return { rootPath: '/repo', name: 'repo' }; }
  async list(path = '') { this.listedPaths.push(path); return Object.keys(this.files).map((filePath) => ({ path: filePath, relativePath: filePath, name: filePath, type: 'file', extension: filePath.split('.').at(-1) })); }
  async readFile(path: string) { if (this.files[path]) return { path, content: this.files[path], modifiedAt: Date.now() }; throw new Error('not found'); }
}

class MockGit {
  async status() { return { branch: 'main' }; }
  async log(_limit = 10) { return [{ hash: 'a1', message: 'first', author: 'me', timestamp: 1 }]; }
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
    expect(ws.listedPaths).toEqual(['']);
  });

  it('assembles FORGE philosophy and project evidence automatically', async () => {
    const ws = new MockWorkspace({ 'README.md': '# Local-first project', 'package.json': '{"name":"repo"}' });
    const builder = new ContextBuilderImpl(ws as any, new MockGit() as any, new MockStorage() as any);
    const result = await builder.assemble('What should I build next?');
    expect(result.systemPrompt).toContain('The project folder is the source of truth');
    expect(result.systemPrompt).toContain('Prefer architectural evolution');
    expect(result.systemPrompt).toContain('Persistent tasks belong to the workspace');
    expect(result.systemPrompt).toContain('Do not repeat completed or externally verified work');
    expect(result.artifacts.some((artifact) => artifact.id === 'project-metadata')).toBe(true);
  });

  it('adds relevant source snapshots as current implementation evidence', async () => {
    const ws = new MockWorkspace({ 'packages/ai/src/context.ts': 'export const context = true;', 'apps/desktop/src/App.tsx': 'export const app = true;' });
    const builder = new ContextBuilderImpl(ws as any, new MockGit() as any, new MockStorage() as any);
    const context = await builder.buildContext('How does context assembly work?');
    expect(context.sourceFiles.map((file) => file.path)).toContain('packages/ai/src/context.ts');
    const result = await builder.assemble('How does context assembly work?');
    expect(result.artifacts.some((artifact) => artifact.id === 'source:packages/ai/src/context.ts')).toBe(true);
  });

  it('does not disclose unrelated source snapshots and classifies package metadata as configuration', async () => {
    const ws = new MockWorkspace({ 'package.json': '{"name":"repo"}', 'src/unrelated.ts': 'export const unrelated = true;' });
    const builder = new ContextBuilderImpl(ws as any, new MockGit() as any, new MockStorage() as any);
    const result = await builder.assemble('Explain ripple theory');
    expect(result.artifacts.some((artifact) => artifact.id === 'source:src/unrelated.ts')).toBe(false);
    expect(result.artifacts.find((artifact) => artifact.id === 'package-json')?.kind).toBe('configuration');
  });

  it('assembles every required workspace evidence class before the user turn', async () => {
    const ws = new MockWorkspace({
      'README.md': '# Product documentation',
      'docs/ARCHITECTURE.md': '# Architecture decisions',
      'package.json': '{"name":"repo"}',
      'packages/ai/src/context.ts': 'export const architectureFirst = true;'
    });
    const builder = new ContextBuilderImpl(ws as any, new MockGit() as any, new MockStorage() as any);
    const result = await builder.assemble('How does context architecture work?', [{
      id: 'memory-1', workspaceId: 'p1', type: 'decision', title: 'Durable decision', content: 'Keep project memory durable.', createdAt: 1, updatedAt: 1
    }]);
    const kinds = new Set(result.artifacts.map((artifact) => artifact.kind));
    expect(result.systemPrompt).toContain('repository "repo"');
    expect(result.systemPrompt).toContain('Core philosophy:');
    expect([...kinds]).toEqual(expect.arrayContaining(['architecture', 'documentation', 'source', 'git', 'memory', 'metadata']));
    expect(result.artifacts.some((artifact) => artifact.id === 'workspace-inventory')).toBe(true);
    expect(result.artifacts.some((artifact) => artifact.id === 'git-history')).toBe(true);
  });
});
