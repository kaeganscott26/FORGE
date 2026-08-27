import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageService, type SemanticRecord } from '@forge/storage';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  chunkText,
  containsLikelySecret,
  cosineSimilarity,
  isSensitiveOrGeneratedPath,
  OpenAICompatibleEmbeddingClient,
  SemanticIndexer,
  SemanticContextService,
  type EmbeddingConfiguration
} from '../src/semantic';

const configuration = async (): Promise<EmbeddingConfiguration> => ({ enabled: true, provider: 'openai-compatible', baseUrl: 'http://127.0.0.1:11434/v1', model: 'embed-test' });

function record(overrides: Partial<SemanticRecord> = {}): SemanticRecord {
  const now = Date.now();
  return {
    id: overrides.id ?? crypto.randomUUID(), workspaceId: 'workspace', sourceType: 'source', sourceId: 'src/app.ts', sourceUri: 'src/app.ts', sourceRevision: 'one', chunkIndex: 0,
    contentHash: overrides.contentHash ?? crypto.randomUUID(), text: 'semantic retrieval context governor', embedding: [1, 0], embeddingModel: 'embed-test', embeddingDimensions: 2,
    createdAt: now, updatedAt: now, lastVerifiedAt: now, usageCount: 0, authorityScore: 0.94, lifecycle: 'active', metadata: {}, ...overrides
  };
}

function service(records: SemanticRecord[], fetcher: typeof fetch) {
  vi.stubGlobal('fetch', fetcher);
  const storage = { semanticIndexStatus: vi.fn(async () => ({ state: 'ready', embeddingModel: 'embed-test' })), semanticRecords: vi.fn(async () => records) };
  return new SemanticContextService(storage as any, new OpenAICompatibleEmbeddingClient(configuration), configuration);
}

afterEach(() => vi.unstubAllGlobals());

describe('semantic primitives', () => {
  it('chunks headings and paragraphs deterministically with provenance ranges', () => {
    const text = ['# Context', '', 'First paragraph '.repeat(80), '', '## Retrieval', 'Second paragraph '.repeat(80)].join('\n');
    const first = chunkText(text, { maxChars: 500, overlapLines: 2 });
    expect(first).toEqual(chunkText(text, { maxChars: 500, overlapLines: 2 }));
    expect(first.length).toBeGreaterThan(2);
    expect(first.every((chunk, index) => chunk.index === index && chunk.lineStart > 0 && chunk.lineEnd >= chunk.lineStart && chunk.contentHash.length === 64)).toBe(true);
  });

  it('calculates cosine similarity without accepting incompatible vector spaces', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(-1);
  });

  it('rejects generated paths, credential paths, environment files, and secret contents', () => {
    for (const value of ['node_modules/x.js', 'build/iso/root.txt', '.git/config', '.forge/metadata.sqlite', '.env', 'config/private-key.pem', 'credentials.json']) expect(isSensitiveOrGeneratedPath(value)).toBe(true);
    expect(isSensitiveOrGeneratedPath('src/context.ts')).toBe(false);
    expect(containsLikelySecret('api_key=super-secret-value')).toBe(true);
    expect(containsLikelySecret('ordinary documentation')).toBe(false);
  });
});

describe('OpenAI-compatible embedding client', () => {
  it('posts OpenAI-compatible batches to loopback Ollama and orders returned vectors', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).not.toHaveProperty('Authorization');
      expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'embed-test', input: ['one', 'two'], encoding_format: 'float' });
      return new Response(JSON.stringify({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(new OpenAICompatibleEmbeddingClient(configuration).embed(['one', 'two'])).resolves.toEqual([[1, 0], [0, 1]]);
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:11434/v1/embeddings', expect.anything());
  });

  it('parses model catalogs and validates vector dimensions', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url).endsWith('/models')
      ? new Response(JSON.stringify({ models: [{ name: 'embed-test' }] }), { status: 200 })
      : new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 2, 3] }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(new OpenAICompatibleEmbeddingClient(configuration).validateModel()).resolves.toMatchObject({ exists: true, dimensions: 3 });
  });

  it('unloads a loopback Ollama model after a scoped embedding session', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url).endsWith('/api/generate')
      ? new Response(JSON.stringify({ done: true, done_reason: 'unload' }), { status: 200 })
      : new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const client = new OpenAICompatibleEmbeddingClient(configuration);
    await client.withModelSession(() => client.embed(['query']));
    expect(fetcher).toHaveBeenLastCalledWith(new URL('http://127.0.0.1:11434/api/generate'), expect.objectContaining({ body: expect.stringContaining('"keep_alive":0') }));
  });

  it('refuses insecure remote endpoints and malformed vectors', async () => {
    const remote = async (): Promise<EmbeddingConfiguration> => ({ enabled: true, provider: 'openai-compatible', baseUrl: 'http://example.com/v1', model: 'x', apiKey: 'secret' });
    await expect(new OpenAICompatibleEmbeddingClient(remote).embed(['x'])).rejects.toThrow(/HTTPS/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [] }] }), { status: 200 })));
    await expect(new OpenAICompatibleEmbeddingClient(configuration).embed(['x'])).rejects.toThrow(/malformed/);
  });
});

describe('context governor', () => {
  const embedFetch = vi.fn(async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }), { status: 200 }));

  it('combines relevance with authority and freshness rather than ranking by cosine alone', async () => {
    const now = Date.now();
    const runtime = record({ id: 'runtime', sourceType: 'runtime', authorityScore: 1, lastVerifiedAt: now, embedding: [0.92, 0.08] });
    const oldConversation = record({ id: 'conversation', sourceType: 'conversation', authorityScore: 0.48, lastVerifiedAt: now - 300 * 86_400_000, embedding: [1, 0] });
    const result = await service([oldConversation, runtime], embedFetch as any).searchSemanticContext('runtime config');
    expect(result.candidates[0].record.id).toBe('runtime');
    expect(result.candidates[0].score).toMatchObject({ authority: 1 });
  });

  it('does not inject stale historical failures as current workspace truth', async () => {
    const stale = record({ id: 'stale-error', lifecycle: 'stale', lastVerifiedAt: Date.now() - 400 * 86_400_000, text: 'ECONNRESET Hermes bridge failure', embedding: [1, 0] });
    const result = await service([stale], embedFetch as any).searchSemanticContext('ECONNRESET Hermes bridge failure');
    expect(result.candidates).toEqual([]);
  });

  it('filters ordinary superseded records and deduplicates identical or near-identical chunks', async () => {
    const superseded = record({ id: 'superseded', lifecycle: 'superseded', embedding: [0, 1] });
    const first = record({ id: 'first', contentHash: 'same' });
    const duplicate = record({ id: 'duplicate', sourceId: 'docs/copy.md', contentHash: 'same' });
    const result = await service([superseded, first, duplicate], embedFetch as any).searchSemanticContext('semantic retrieval');
    expect(result.candidates.map((candidate) => candidate.record.id)).toEqual(['first']);
  });

  it('honors token budgets and reports live context-health metrics', async () => {
    const records = [record({ id: 'one', text: 'x'.repeat(400), embedding: [1, 0] }), record({ id: 'two', sourceId: 'src/two.ts', text: 'y'.repeat(400), embedding: [0.9, 0.1] })];
    const semantic = service(records, embedFetch as any);
    const result = await semantic.searchSemanticContext('x', { tokenBudget: 110 });
    expect(result.candidates).toHaveLength(1);
    expect(semantic.health()).toMatchObject({ tokenBudget: 110, recordsConsidered: 2, recordsSelected: 1, degraded: false });
  });

  it('injects no cached records when the embedding endpoint is offline', async () => {
    const semantic = service([record({ id: 'lexical', text: 'unique fallback needle', embedding: [0, 1] })], vi.fn(async () => { throw new Error('offline'); }) as any);
    const result = await semantic.searchSemanticContext('fallback needle');
    expect(result.degraded).toBe(true);
    expect(result.candidates).toEqual([]);
    expect(semantic.health().fallbackReason).toContain('offline');
  });

  it('hard-caps results and selects at most one chunk from each source', async () => {
    const records = Array.from({ length: 20 }, (_, index) => record({ id: `record-${index}`, sourceId: index < 4 ? 'src/repeated.ts' : `src/file-${index}.ts`, contentHash: `hash-${index}`, embedding: [1, index / 100] }));
    const result = await service(records, embedFetch as any).searchSemanticContext('context', { limit: 100, tokenBudget: 100_000 });
    expect(result.candidates.length).toBeLessThanOrEqual(10);
    expect(new Set(result.candidates.map((candidate) => candidate.record.sourceId)).size).toBe(result.candidates.length);
  });

  it('rejects changed file records and incomplete indexes before injection', async () => {
    vi.stubGlobal('fetch', embedFetch);
    const staleRecord = record({ metadata: { path: 'src/app.ts', modifiedAt: 10, size: 20 } });
    const readyStorage = { semanticIndexStatus: async () => ({ state: 'ready', embeddingModel: 'embed-test' }), semanticRecords: vi.fn(async () => [staleRecord]) };
    const changed = new SemanticContextService(readyStorage as any, new OpenAICompatibleEmbeddingClient(configuration), configuration, undefined, { metadata: async () => ({ modifiedAt: 11, size: 20 }) } as any);
    expect((await changed.searchSemanticContext('context')).candidates).toEqual([]);
    const incompleteStorage = { semanticIndexStatus: async () => ({ state: 'indexing', embeddingModel: 'embed-test' }), semanticRecords: vi.fn(async () => [staleRecord]) };
    const incomplete = new SemanticContextService(incompleteStorage as any, new OpenAICompatibleEmbeddingClient(configuration), configuration);
    expect(await incomplete.searchSemanticContext('context')).toMatchObject({ candidates: [], degraded: true });
    expect(incompleteStorage.semanticRecords).not.toHaveBeenCalled();
  });
});

describe('incremental semantic indexing', () => {
  it('does not re-embed unchanged deterministic chunks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-semantic-index-'));
    try {
      const storage = new StorageService(); await storage.init(directory);
      const embed = vi.fn(async (input: string[]) => input.map(() => [1, 0]));
      const indexer = new SemanticIndexer({} as any, storage, { embed } as any, configuration);
      const source = { sourceType: 'source', sourceId: 'src/app.ts', sourceUri: 'src/app.ts', revision: 'r1', text: '# Context\n\nDeterministic semantic indexing.' };
      expect((await indexer.indexSource(source)).embedded).toBe(1);
      expect((await indexer.indexSource(source)).embedded).toBe(0);
      expect(embed).toHaveBeenCalledTimes(1);
      await storage.close();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('rebuilds a 66-record workspace in bounded batches and two database exports', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-semantic-rebuild-'));
    try {
      const storage = new StorageService(); await storage.init(directory); const persist = vi.spyOn(storage as any, 'persist');
      const files = Array.from({ length: 66 }, (_, index) => ({ path: `src/file-${index}.ts`, relativePath: `src/file-${index}.ts`, type: 'file', extension: 'ts' }));
      const workspace = {
        list: vi.fn(async () => files),
        metadata: vi.fn(async (filePath: string) => ({ text: true, size: 40, modifiedAt: 100, path: filePath })),
        readFile: vi.fn(async (filePath: string) => ({ path: filePath, content: `export const record = ${JSON.stringify(filePath)};`, modifiedAt: 100 }))
      };
      const embed = vi.fn(async (input: string[]) => input.map(() => Array.from({ length: 16 }, (_, index) => index / 16)));
      const embeddings = { embed, withModelSession: async <T>(operation: () => Promise<T>) => operation() };
      const indexer = new SemanticIndexer(workspace as any, storage, embeddings as any, configuration);
      const status = await indexer.rebuild();
      expect(status).toMatchObject({ state: 'ready', indexedRecords: 66, embeddingDimensions: 16 });
      expect(embed).toHaveBeenCalledTimes(9);
      expect(persist).toHaveBeenCalledTimes(2);
      embed.mockClear(); persist.mockClear();
      await indexer.incremental();
      expect(embed).not.toHaveBeenCalled();
      expect(persist).toHaveBeenCalledTimes(2);
      await storage.close();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('supersedes durable records after their source is deleted', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-semantic-durable-delete-'));
    try {
      const storage = new StorageService(); await storage.init(directory);
      const embeddings = { embed: vi.fn(async (input: string[]) => input.map(() => [1, 0])), withModelSession: async <T>(operation: () => Promise<T>) => operation() };
      const indexer = new SemanticIndexer({} as any, storage, embeddings as any, configuration);
      await indexer.indexSource({ sourceType: 'note', sourceId: 'deleted-memory', revision: 'one', text: 'Historical memory that no longer exists.', metadata: { memoryId: 'deleted-memory' } });
      expect(await storage.semanticRecords()).toHaveLength(1);

      await indexer.refreshDurableState();

      expect(await storage.semanticRecords()).toEqual([]);
      expect(await storage.semanticRecords({ includeSuperseded: true })).toMatchObject([{ sourceId: 'deleted-memory', lifecycle: 'superseded' }]);
      await storage.close();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
