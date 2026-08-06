import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeFileSystem } from '../filesystem/index.js';
import { KeywordSearchEngine } from '../search/index.js';

describe('KeywordSearchEngine', () => {
  let rootPath: string;
  let engine: KeywordSearchEngine;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(tmpdir(), 'forge-core-search-'));
    engine = new KeywordSearchEngine(new NodeFileSystem());
    await fs.mkdir(path.join(rootPath, '.notes'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.git'), { recursive: true });
    await fs.writeFile(path.join(rootPath, '.notes', 'architecture.md'), 'FORGE core architecture workspace workspace');
    await fs.writeFile(path.join(rootPath, '.notes', 'meeting.md'), 'A meeting about the FORGE roadmap');
    await fs.writeFile(path.join(rootPath, '.git', 'ignored.md'), 'workspace workspace workspace');
    await fs.writeFile(path.join(rootPath, 'binary.dat'), 'workspace');
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('recursively indexes supported files, ignores excluded directories, and ranks results', async () => {
    const indexed = await engine.indexDirectory(rootPath);
    expect(indexed.indexed).toBe(2);
    expect(indexed.failures).toEqual([]);
    await expect(engine.stats()).resolves.toMatchObject({ documentCount: 2 });

    const results = await engine.search('core workspace');
    expect(results).toHaveLength(1);
    expect(results[0].document.path.endsWith(path.join('.notes', 'architecture.md'))).toBe(true);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('FORGE core architecture');

    await fs.rm(path.join(rootPath, '.notes', 'architecture.md'));
    await engine.indexDirectory(rootPath);
    await expect(engine.search('workspace')).resolves.toEqual([]);
  });

  it('updates and removes indexed documents without stale terms', async () => {
    await engine.indexDocument({ id: 'one', path: '/one.md', content: 'alpha beta beta' });
    await engine.indexDocument({ id: 'one', path: '/one.md', content: 'gamma' });
    await expect(engine.search('beta')).resolves.toEqual([]);
    await expect(engine.search('gamma')).resolves.toHaveLength(1);
    await expect(engine.removeDocument('one')).resolves.toBe(true);
    await expect(engine.stats()).resolves.toEqual({ documentCount: 0, termCount: 0, totalTokens: 0 });
  });
});
