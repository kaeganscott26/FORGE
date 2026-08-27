import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StorageService } from '../packages/storage/src/index';
import { WorkspaceService } from '../packages/workspace/src/index';
import { OpenAICompatibleEmbeddingClient, SemanticContextService, SemanticIndexer, type EmbeddingConfiguration } from '../packages/intelligence/src/semantic';
import { WorkspaceContextEngine } from '../packages/intelligence/src/context';

const model = process.env.FORGE_PROFILE_EMBEDDING_MODEL || 'qwen3-embedding:0.6b';
const baseUrl = process.env.FORGE_PROFILE_EMBEDDING_URL || 'http://127.0.0.1:11434/v1';
const iterations = Math.min(10, Math.max(1, Number(process.env.FORGE_PROFILE_ITERATIONS) || 3));
let enabled = false;
const configuration = async (): Promise<EmbeddingConfiguration> => ({ enabled, provider: 'openai-compatible', baseUrl, model });

async function ollamaMemory(): Promise<{ rssBytes: number; processes: Array<{ pid: number; rssBytes: number; command: string }>; loadedModels: unknown[] }> {
  const processes: Array<{ pid: number; rssBytes: number; command: string }> = [];
  for (const entry of await fs.readdir('/proc').catch(() => [])) {
    if (!/^\d+$/.test(entry)) continue;
    const command = await fs.readFile(`/proc/${entry}/cmdline`, 'utf8').catch(() => '');
    if (!/ollama|llama-server/i.test(command)) continue;
    const status = await fs.readFile(`/proc/${entry}/status`, 'utf8').catch(() => '');
    const rssKb = Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0);
    processes.push({ pid: Number(entry), rssBytes: rssKb * 1024, command: command.replaceAll('\0', ' ').trim() });
  }
  const origin = new URL(baseUrl).origin;
  const loadedModels = await fetch(new URL('/api/ps', origin), { signal: AbortSignal.timeout(5_000) }).then((response) => response.json()).then((payload: any) => payload.models ?? []).catch(() => []);
  return { rssBytes: processes.reduce((total, process) => total + process.rssBytes, 0), processes, loadedModels };
}

async function sample(label: string, startedAt = Date.now()): Promise<void> {
  const memory = process.memoryUsage();
  console.log(JSON.stringify({ label, elapsedMs: Date.now() - startedAt, process: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal, externalBytes: memory.external, arrayBuffersBytes: memory.arrayBuffers }, ollama: await ollamaMemory(), capturedAt: new Date().toISOString() }));
}

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-semantic-memory-'));
const workspace = new WorkspaceService(); const storage = new StorageService();
try {
  await fs.mkdir(path.join(temporary, 'src'));
  for (let index = 0; index < 66; index += 1) await fs.writeFile(path.join(temporary, 'src', `record-${index}.ts`), `export const semanticRecord${index} = "bounded workspace evidence ${index}";\n`, 'utf8');
  await workspace.open(temporary); await storage.init(temporary);
  const client = new OpenAICompatibleEmbeddingClient(configuration);
  const semantic = new SemanticContextService(storage, client, configuration, undefined, workspace);
  const indexer = new SemanticIndexer(workspace, storage, client, configuration);
  await sample('fresh-launch-semantic-disabled');

  enabled = true;
  await sample('semantic-enabled-idle');

  let startedAt = Date.now(); await client.embed(['load the embedding model for an idle measurement']);
  await sample('embedding-model-loaded-idle', startedAt);

  const seed = new Float32Array(1024); seed[0] = 1;
  await storage.withSemanticWriteBatch(async () => {
    for (let index = 0; index < 66; index += 1) {
      const sourceId = `src/record-${index}.ts`; const metadata = await workspace.metadata(sourceId);
      await storage.upsertSemanticRecord({ id: `seed-${index}`, sourceType: 'source', sourceId, sourceUri: sourceId, sourceRevision: `${metadata.modifiedAt}:${metadata.size}:seed`, chunkIndex: 0, lineStart: 1, lineEnd: 1, contentHash: `seed-${index}`, text: `bounded workspace evidence ${index}`, embedding: seed, embeddingModel: model, embeddingDimensions: seed.length, authorityScore: 0.94, lifecycle: 'active', metadata: { path: sourceId, modifiedAt: metadata.modifiedAt, size: metadata.size } });
    }
    await storage.setSemanticIndexState({ state: 'ready', embeddingModel: model, embeddingDimensions: seed.length, lastIndexedAt: Date.now() });
  });
  await client.withModelSession(async () => undefined);

  startedAt = Date.now(); const retrieval = await semantic.searchSemanticContext('Explain the relationship among bounded workspace evidence records.');
  await sample(`semantic-query-${retrieval.candidates.length}-results`, startedAt);

  startedAt = Date.now(); const rebuilt = await indexer.rebuild();
  await sample(`semantic-index-rebuild-${rebuilt.indexedRecords}-records`, startedAt);

  const directContext = new WorkspaceContextEngine(workspace, { status: async () => ({ branch: 'profile', files: [] }), log: async () => [] } as any, storage);
  startedAt = Date.now(); await directContext.assemble('Use agent tools to inspect the workspace and read src/record-1.ts'); await workspace.readFile('src/record-1.ts');
  await sample('normal-direct-workspace-workflow', startedAt);

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    startedAt = Date.now(); await semantic.searchSemanticContext(`Explain related workspace evidence cycle ${iteration}.`); await indexer.incremental();
    global.gc?.();
    await sample(`repeated-retrieval-index-cycle-${iteration}`, startedAt);
  }

  global.gc?.();
  await new Promise((resolve) => setTimeout(resolve, 250));
  await sample('post-operation-release');
} finally {
  await storage.close().catch(() => undefined); await workspace.close().catch(() => undefined); await fs.rm(temporary, { recursive: true, force: true });
}
