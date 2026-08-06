import { afterEach, describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryService, MemoryRetriever } from '../src';
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
    const retriever = new MemoryRetriever(memsvc);
    const results = await retriever.search('deployment CI');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title?.toLowerCase()).toContain('important');
    await storage.close();
  });
});
