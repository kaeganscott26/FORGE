import { describe, it, expect } from 'vitest';
import { MemoryService, MemoryRetriever } from '../src';
import { StorageService } from '@forge/storage';

class InMemoryStorage extends StorageService {
  // reuse StorageService but keep using init to create db; tests will call init with temp dir
}

describe('Memory Retriever scoring', () => {
  it('scores exact matches and recency', async () => {
    const storage = new StorageService();
    // initialize a temp project in test workspace root
    await storage.init(process.cwd());
    const memsvc = new MemoryService(storage as any);
    await memsvc.create({ type: 'note', title: 'Important note', content: 'This is about deployment and CI' });
    await memsvc.create({ type: 'note', title: 'Other', content: 'Unrelated content' });
    const retriever = new MemoryRetriever(memsvc);
    const results = await retriever.search('deployment CI');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title?.toLowerCase()).toContain('important');
  });
});
