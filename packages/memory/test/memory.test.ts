import { afterEach, describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyWorkspaceKnowledge, MemoryIndexer, MemoryService, MemoryRetriever } from '../src';
import { StorageService } from '@forge/storage';

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('Memory Retriever scoring', () => {
  it('scores exact matches and recency', async () => {
    const storage = new StorageService();
    const directory = await mkdtemp(join(tmpdir(), 'forge-memory-'));
    temporaryDirectories.push(directory);
    await storage.init(directory);
    const memsvc = new MemoryService(storage as any);
    await memsvc.create({ type: 'note', title: 'Important note', content: 'This is about deployment and CI' });
    await memsvc.create({ type: 'note', title: 'Other', content: 'Unrelated content' });
    await memsvc.create({ type: 'configuration', title: 'package.json', content: 'deployment CI build configuration', metadata: { classification: 'Configuration' } });
    await memsvc.create({ type: 'code', title: 'appearance.json', content: 'Obsidian appearance configuration for deployment CI', metadata: { path: '.obsidian/appearance.json' } });
    const retriever = new MemoryRetriever(memsvc);
    const results = await retriever.search('deployment CI');
    expect(results).toHaveLength(1);
    expect(results[0].title?.toLowerCase()).toContain('important');
    expect(results[0].relevance).toBeGreaterThanOrEqual(80);
    expect(results[0].reasons?.[0]).toContain('query concepts matched');
    expect(await retriever.search('missing ripple theory')).toHaveLength(0);
    expect((await retriever.search('build configuration'))[0]?.title).toBe('package.json');
    expect((await retriever.search('Obsidian appearance'))[0]?.title).toBe('appearance.json');
    await storage.close();
  });

  it('classifies project knowledge and excludes machine-specific Obsidian state', () => {
    expect(classifyWorkspaceKnowledge('README.md', 'md')?.type).toBe('architecture');
    expect(classifyWorkspaceKnowledge('docs/UserManual.md', 'md')?.type).toBe('documentation');
    expect(classifyWorkspaceKnowledge('packages/storage/src/index.ts', 'ts')?.type).toBe('source');
    expect(classifyWorkspaceKnowledge('vitest.config.ts', 'ts')?.type).toBe('configuration');
    expect(classifyWorkspaceKnowledge('.obsidian/appearance.json', 'json')).toBeNull();
  });

  it('upserts classified indexed knowledge without duplicate or excluded records', async () => {
    const storage = new StorageService();
    const directory = await mkdtemp(join(tmpdir(), 'forge-indexer-'));
    temporaryDirectories.push(directory);
    await storage.init(directory);
    const memory = new MemoryService(storage as any);
    const contents: Record<string, string> = {
      'README.md': '# Product intent',
      'UserManual.md': '# Guide',
      'package.json': '{"name":"test"}',
      'packages/storage/index.ts': 'export const storage = true;',
      '.obsidian/appearance.json': '{"theme":"dark"}'
    };
    const files = Object.keys(contents).map((path) => ({ type: 'file', name: path.split('/').at(-1), relativePath: path, path, extension: path.split('.').at(-1) }));
    const workspace = { list: async () => files, readFile: async (path: string) => ({ path, content: contents[path], modifiedAt: 1 }) };
    const indexer = new MemoryIndexer(memory, workspace as any);
    await indexer.indexWorkspaceFiles();
    await indexer.indexWorkspaceFiles();
    const records = await memory.list();
    expect(records).toHaveLength(4);
    expect(records.map((record) => record.type)).toEqual(expect.arrayContaining(['architecture', 'documentation', 'configuration', 'source']));
    expect(records.some((record) => (record.metadata as { path?: string })?.path?.startsWith('.obsidian'))).toBe(false);
    await storage.close();
  });
});
