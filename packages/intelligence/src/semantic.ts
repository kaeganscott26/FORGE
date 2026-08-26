import { createHash, randomUUID } from 'node:crypto';
import * as path from 'node:path';
import type { StorageService, SemanticIndexStatus, SemanticLifecycle, SemanticRecord } from '@forge/storage';
import type { WorkspaceService } from '@forge/workspace';

export const DEFAULT_EMBEDDING_BASE_URL = 'http://127.0.0.1:11434/v1';
export const DEFAULT_EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
export const SEMANTIC_SCHEMA_VERSION = 1;
export const DEFAULT_CONTEXT_TOKEN_BUDGET = 32_000;

export interface EmbeddingConfiguration {
  enabled: boolean;
  provider: 'openai-compatible';
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface EmbeddingModelInfo { id: string; ownedBy?: string }
export interface SemanticEvent { type: 'semantic.index.start' | 'semantic.index.complete' | 'semantic.index.error' | 'semantic.embedding.request' | 'semantic.retrieval' | 'semantic.fallback' | 'semantic.stale.detected'; payload: Record<string, unknown> }
export type SemanticEventSink = (event: SemanticEvent) => void | Promise<void>;

export interface TextChunk {
  index: number;
  text: string;
  lineStart: number;
  lineEnd: number;
  contentHash: string;
}

export interface SemanticSearchOptions {
  taskId?: string;
  sourceTypes?: string[];
  limit?: number;
  minimumScore?: number;
  freshnessPreference?: number;
  authorityPreference?: number;
  tokenBudget?: number;
  branch?: string;
  paths?: string[];
}

export interface SemanticScoreBreakdown {
  semanticRelevance: number;
  taskRelationship: number;
  authority: number;
  freshness: number;
  priorUsefulness: number;
  stalenessPenalty: number;
  redundancyPenalty: number;
  supersessionPenalty: number;
  finalScore: number;
}

export interface SemanticCandidate {
  record: SemanticRecord;
  score: SemanticScoreBreakdown;
  estimatedTokens: number;
  retrievalMode: 'semantic' | 'lexical';
}

export interface ContextHealthMetrics {
  tokensUsed: number;
  tokenBudget: number;
  relevance: number;
  freshness: number;
  authority: number;
  redundancy: number;
  staleRatio: number;
  recordsConsidered: number;
  recordsSelected: number;
  sourceDistribution: Record<string, number>;
  degraded: boolean;
  fallbackReason?: string;
}

const SOURCE_AUTHORITY: Readonly<Record<string, number>> = Object.freeze({
  runtime: 1, configuration: 0.96, source: 0.94, git: 0.9, documentation: 0.82,
  architecture: 0.86, task: 0.78, decision: 0.8, memory: 0.72, tool: 0.7,
  event: 0.66, conversation: 0.48
});

export const GOVERNOR_WEIGHTS = Object.freeze({
  semanticRelevance: 0.45,
  taskRelationship: 0.12,
  authority: 0.16,
  freshness: 0.12,
  priorUsefulness: 0.05,
  stalenessPenalty: 0.08,
  redundancyPenalty: 0.08,
  supersessionPenalty: 0.2
});

const SENSITIVE_SEGMENTS = new Set(['.env', '.ssh', '.gnupg', 'credentials', 'secrets', 'private', 'keychain', 'keystore']);
const GENERATED_SEGMENTS = new Set(['.git', '.forge', 'node_modules', 'dist', 'dist_electron', 'out', 'build', 'release', 'coverage', '.cache', '__pycache__', 'archiso-work', 'archiso-profile', 'airootfs']);
const INDEXABLE_EXTENSIONS = new Set(['md', 'markdown', 'txt', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'go', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'hpp', 'css', 'scss', 'html', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'sql', 'graphql']);

export function normalizePortablePath(value: string): string { return value.replaceAll('\\', '/').replace(/^\.\//, ''); }

export function isSensitiveOrGeneratedPath(value: string): boolean {
  const normalized = normalizePortablePath(value).toLowerCase();
  const parts = normalized.split('/');
  const name = parts.at(-1) ?? '';
  return parts.some((part) => GENERATED_SEGMENTS.has(part) || SENSITIVE_SEGMENTS.has(part))
    || /^\.env(?:\.|$)/i.test(name)
    || /(?:^|[._-])(?:secrets?|credentials?|passwords?|private[_-]?key|api[_-]?key)(?:[._-]|$)/i.test(name)
    || /\.(?:pem|p12|pfx|key|kdbx)$/i.test(name);
}

export function containsLikelySecret(text: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-|github_pat_|gh[oprsu]_)[A-Za-z0-9_-]{16,}|\b(?:api[_-]?key|access[_-]?token|password)\s*[:=]\s*['"]?[^\s'"]{8,}/i.test(text);
}

function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function bounded(value: number): number { return Math.max(0, Math.min(1, value)); }
export function estimateTokens(value: string): number { return Math.max(1, Math.ceil(value.length / 4)); }

/** Deterministic heading/paragraph-aware chunks with a small line overlap. */
export function chunkText(text: string, options: { maxChars?: number; overlapLines?: number } = {}): TextChunk[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const maximum = Math.max(400, options.maxChars ?? 2_400); const overlapLines = Math.max(0, Math.min(12, options.overlapLines ?? 3));
  const lines = normalized.split('\n'); const chunks: TextChunk[] = [];
  let start = 0;
  while (start < lines.length) {
    let end = start; let characters = 0; let preferredEnd = -1;
    while (end < lines.length) {
      const addition = lines[end].length + (end > start ? 1 : 0);
      if (characters + addition > maximum && end > start) break;
      characters += addition; end += 1;
      if (end < lines.length && (/^#{1,6}\s/.test(lines[end]) || (lines[end - 1].trim() === '' && characters >= maximum * 0.55))) preferredEnd = end;
    }
    if (preferredEnd > start && end < lines.length) end = preferredEnd;
    const value = lines.slice(start, end).join('\n').trim();
    if (value) chunks.push({ index: chunks.length, text: value, lineStart: start + 1, lineEnd: end, contentHash: hash(value) });
    if (end >= lines.length) break;
    start = Math.max(start + 1, end - overlapLines);
  }
  return chunks;
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (!left.length || left.length !== right.length) return -1;
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) { dot += left[index] * right[index]; leftNorm += left[index] ** 2; rightNorm += right[index] ** 2; }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : -1;
}

export class OpenAICompatibleEmbeddingClient {
  constructor(private readonly configuration: () => Promise<EmbeddingConfiguration>, private readonly events?: SemanticEventSink) {}

  async listModels(overrides: Partial<EmbeddingConfiguration> = {}): Promise<EmbeddingModelInfo[]> {
    const config = { ...await this.configuration(), ...overrides };
    const response = await this.request(`${normalizeBaseUrl(config.baseUrl)}/models`, config);
    if (!response.ok) throw new Error(`Embedding provider model discovery failed (${response.status}).`);
    const payload = await response.json() as { data?: Array<{ id?: unknown; owned_by?: unknown }>; models?: Array<{ id?: unknown; name?: unknown; owned_by?: unknown }> };
    const models = payload.data ?? payload.models?.map((entry) => ({ id: entry.id ?? entry.name, owned_by: entry.owned_by })) ?? [];
    return models.filter((entry): entry is { id: string; owned_by?: unknown } => typeof entry.id === 'string').map((entry) => ({ id: entry.id, ownedBy: typeof entry.owned_by === 'string' ? entry.owned_by : undefined })).sort((a, b) => a.id.localeCompare(b.id));
  }

  async validateModel(model?: string, overrides: Partial<EmbeddingConfiguration> = {}): Promise<{ model: string; exists: boolean; availableCount: number; dimensions?: number }> {
    const config = { ...await this.configuration(), ...overrides }; const selected = (model || config.model).trim();
    const models = await this.listModels(config); const exists = models.some((entry) => entry.id === selected);
    const dimensions = exists ? (await this.embed(['FORGE semantic context model validation'], { ...config, model: selected }))[0]?.length : undefined;
    return { model: selected, exists, availableCount: models.length, dimensions };
  }

  async embed(input: string[], overrides: Partial<EmbeddingConfiguration> = {}): Promise<number[][]> {
    if (!input.length) return [];
    const config = { ...await this.configuration(), ...overrides };
    if (!config.enabled && overrides.enabled === undefined) throw new Error('Semantic context is disabled.');
    await this.events?.({ type: 'semantic.embedding.request', payload: { model: config.model, batchSize: input.length } });
    const response = await this.request(`${normalizeBaseUrl(config.baseUrl)}/embeddings`, config, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, input, encoding_format: 'float' }) });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500).replace(/[\r\n]+/g, ' ');
      throw new Error(`Embedding request failed (${response.status}): ${detail || response.statusText}`);
    }
    const payload = await response.json() as { data?: Array<{ index?: unknown; embedding?: unknown }> };
    if (!Array.isArray(payload.data)) throw new Error('Embedding provider returned an invalid response.');
    const ordered = [...payload.data].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
    const vectors = ordered.map((entry) => Array.isArray(entry.embedding) ? entry.embedding.map(Number) : []);
    if (vectors.length !== input.length || vectors.some((vector) => !vector.length || vector.some((value) => !Number.isFinite(value)))) throw new Error('Embedding provider returned malformed or incomplete vectors.');
    const dimensions = vectors[0].length;
    if (vectors.some((vector) => vector.length !== dimensions)) throw new Error('Embedding provider returned inconsistent vector dimensions.');
    return vectors;
  }

  private async request(url: string, configuration: EmbeddingConfiguration, init: RequestInit = {}): Promise<Response> {
    const parsed = new URL(url); const loopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol === 'http:' && !loopback) throw new Error('Remote embedding endpoints must use HTTPS.');
    if (!configuration.apiKey && !loopback) throw new Error('A securely stored API key is required for remote embedding endpoints.');
    return fetch(url, { ...init, signal: AbortSignal.timeout(20_000), headers: configuration.apiKey ? { ...init.headers, Authorization: `Bearer ${configuration.apiKey}` } : init.headers });
  }
}

function normalizeBaseUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Embedding API base URL is invalid.');
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
  if (parsed.protocol === 'http:' && !loopback) throw new Error('Remote embedding endpoints must use HTTPS.');
  return parsed.toString().replace(/\/$/, '');
}

function flattenFiles(nodes: Array<{ type: string; relativePath?: string; path: string; extension?: string; children?: any[] }>): Array<{ path: string; extension?: string }> {
  return nodes.flatMap((node) => [...(node.type === 'file' ? [{ path: normalizePortablePath(node.relativePath || node.path), extension: node.extension }] : []), ...flattenFiles(node.children ?? [])]);
}

function authorityFor(sourceType: string): number { return SOURCE_AUTHORITY[sourceType] ?? 0.6; }

export class SemanticIndexer {
  private running: Promise<SemanticIndexStatus> | null = null;
  constructor(private readonly workspace: WorkspaceService, private readonly storage: StorageService, private readonly embeddings: OpenAICompatibleEmbeddingClient, private readonly configuration: () => Promise<EmbeddingConfiguration>, private readonly events?: SemanticEventSink) {}

  incremental(): Promise<SemanticIndexStatus> { return this.run(false); }
  rebuild(): Promise<SemanticIndexStatus> { return this.run(true); }

  async indexSource(source: { sourceType: string; sourceId: string; sourceUri?: string; revision: string; text: string; authority?: number; metadata?: Record<string, unknown> }): Promise<{ records: SemanticRecord[]; embedded: number }> {
    if (!source.text.trim() || containsLikelySecret(source.text)) return { records: [], embedded: 0 };
    const config = await this.configuration(); const chunks = chunkText(source.text); const existing = await this.storage.semanticRecords({ sourceType: source.sourceType, sourceId: source.sourceId, embeddingModel: config.model, includeSuperseded: true });
    const existingByHash = new Map(existing.map((record) => [`${record.chunkIndex}:${record.contentHash}`, record]));
    const missing = chunks.filter((chunk) => !existingByHash.has(`${chunk.index}:${chunk.contentHash}`));
    const vectors: number[][] = [];
    for (let offset = 0; offset < missing.length; offset += 16) vectors.push(...await this.embeddings.embed(missing.slice(offset, offset + 16).map((chunk) => chunk.text)));
    let vectorIndex = 0; const records: SemanticRecord[] = [];
    for (const chunk of chunks) {
      const prior = existingByHash.get(`${chunk.index}:${chunk.contentHash}`); const embedding = prior?.embedding ?? vectors[vectorIndex++];
      const result = await this.storage.upsertSemanticRecord({ id: prior?.id ?? randomUUID(), sourceType: source.sourceType, sourceId: source.sourceId, sourceUri: source.sourceUri, sourceRevision: source.revision, chunkIndex: chunk.index, lineStart: chunk.lineStart, lineEnd: chunk.lineEnd, contentHash: chunk.contentHash, text: chunk.text, embedding, embeddingModel: config.model, embeddingDimensions: embedding.length, authorityScore: source.authority ?? authorityFor(source.sourceType), lifecycle: 'active', metadata: { schemaVersion: SEMANTIC_SCHEMA_VERSION, ...source.metadata } });
      records.push(result.record);
    }
    await this.storage.supersedeSemanticSource(source.sourceType, source.sourceId, source.revision, records.map((record) => record.id));
    return { records, embedded: missing.length };
  }

  private run(rebuild: boolean): Promise<SemanticIndexStatus> {
    if (this.running) return this.running;
    this.running = this.execute(rebuild).finally(() => { this.running = null; });
    return this.running;
  }

  private async execute(rebuild: boolean): Promise<SemanticIndexStatus> {
    const config = await this.configuration();
    if (!config.enabled) return this.storage.setSemanticIndexState({ state: 'degraded', lastError: 'Semantic context is disabled.' });
    const prior = await this.storage.semanticIndexStatus();
    if (!rebuild && prior.embeddingModel && prior.embeddingModel !== config.model) return this.storage.setSemanticIndexState({ state: 'rebuild-required', lastError: `Embedding model changed from ${prior.embeddingModel} to ${config.model}. Rebuild the semantic index before retrieval.` });
    await this.events?.({ type: 'semantic.index.start', payload: { rebuild, model: config.model } });
    await this.storage.setSemanticIndexState({ state: 'indexing', embeddingModel: config.model });
    try {
      if (rebuild) await this.storage.clearSemanticIndex();
      const files = flattenFiles(await this.workspace.list('', { recursive: true, maxEntries: 20_000, showHidden: false })).filter((file) => !isSensitiveOrGeneratedPath(file.path) && INDEXABLE_EXTENSIONS.has((file.extension ?? path.extname(file.path).slice(1)).toLowerCase()));
      let embedded = 0;
      for (const file of files) {
        const metadata = await this.workspace.metadata(file.path).catch(() => null);
        if (!metadata?.text || metadata.size > 1_000_000) continue;
        const content = await this.workspace.readFile(file.path).catch(() => null);
        if (!content || content.binary || containsLikelySecret(content.content)) continue;
        const result = await this.indexSource({ sourceType: classifySource(file.path), sourceId: file.path, sourceUri: file.path, revision: `${metadata.modifiedAt}:${metadata.size}:${hash(content.content)}`, text: content.content, metadata: { path: file.path, modifiedAt: metadata.modifiedAt } });
        embedded += result.embedded;
      }
      embedded += await this.indexDurableState();
      await this.storage.updateSemanticLifecycle();
      const records = await this.storage.semanticRecords({ embeddingModel: config.model });
      const dimensions = records[0]?.embeddingDimensions;
      if (records.some((record) => record.embeddingDimensions !== dimensions)) return this.storage.setSemanticIndexState({ state: 'rebuild-required', embeddingModel: config.model, lastError: 'The semantic index contains incompatible embedding dimensions.' });
      const status = await this.storage.setSemanticIndexState({ state: 'ready', embeddingModel: config.model, embeddingDimensions: dimensions, lastIndexedAt: Date.now() });
      await this.events?.({ type: 'semantic.index.complete', payload: { indexedRecords: status.indexedRecords, newlyEmbedded: embedded, model: config.model, dimensions } });
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.events?.({ type: 'semantic.index.error', payload: { message } });
      return this.storage.setSemanticIndexState({ state: 'degraded', embeddingModel: config.model, lastError: message });
    }
  }

  private async indexDurableState(): Promise<number> {
    let embedded = 0;
    const project = await this.storage.dashboard();
    for (const task of project?.tasks ?? []) {
      const text = [task.title, task.description, task.progressSummary, task.resumeInstructions, ...task.steps.map((step) => `${step.name}: ${step.purpose}`), ...task.events.map((event) => event.summary), ...task.checkpoints.map((checkpoint) => checkpoint.summary)].filter(Boolean).join('\n');
      embedded += (await this.indexSource({ sourceType: 'task', sourceId: task.id, revision: String(task.updatedAt), text, authority: 0.78, metadata: { taskId: task.id, branch: task.associatedBranch, status: task.status } })).embedded;
    }
    for (const memory of await this.storage.listMemories(500, 200_000)) embedded += (await this.indexSource({ sourceType: memory.type, sourceId: memory.id, revision: String(memory.updatedAt), text: `${memory.title ?? ''}\n${memory.content}`, metadata: { memoryId: memory.id } })).embedded;
    for (const thread of await this.storage.listConversationThreads()) {
      const messages = await this.storage.listConversationMessages(thread.id); const text = messages.slice(-20).map((message) => `${message.role}: ${message.content}`).join('\n\n');
      embedded += (await this.indexSource({ sourceType: 'conversation', sourceId: thread.id, revision: String(thread.updatedAt), text, metadata: { conversationId: thread.id } })).embedded;
    }
    for (const action of await this.storage.listActions()) {
      const text = `${action.toolName}: ${action.resultSummary}`;
      embedded += (await this.indexSource({ sourceType: 'tool', sourceId: action.id, revision: String(action.timestamp), text, metadata: { taskId: action.taskId, success: action.success, toolName: action.toolName } })).embedded;
    }
    return embedded;
  }
}

function classifySource(filePath: string): string {
  const normalized = filePath.toLowerCase(); const extension = path.extname(normalized);
  if (/\.(?:json|jsonc|ya?ml|toml|ini|conf)$/.test(extension) || /(?:^|\/)package\.json$/.test(normalized)) return 'configuration';
  if (/\.(?:md|markdown|txt)$/.test(extension)) return /(?:architecture|decision|adr)/.test(normalized) ? 'architecture' : 'documentation';
  return 'source';
}

function lexicalSimilarity(query: string, text: string): number {
  const tokens = new Set(query.toLowerCase().split(/[^a-z0-9_]+/).filter((token) => token.length > 2));
  if (!tokens.size) return 0;
  const haystack = text.toLowerCase(); let matched = 0;
  for (const token of tokens) if (haystack.includes(token)) matched += 1;
  return matched / tokens.size;
}

function relationship(record: SemanticRecord, options: SemanticSearchOptions): number {
  const metadata = record.metadata;
  if (options.taskId && metadata.taskId === options.taskId) return 1;
  if (options.paths?.some((candidate) => normalizePortablePath(String(metadata.path ?? record.sourceUri ?? '')) === normalizePortablePath(candidate))) return 0.9;
  if (options.branch && metadata.branch === options.branch) return 0.75;
  return 0.35;
}

function freshness(record: SemanticRecord, now: number): number {
  const ageDays = Math.max(0, now - record.lastVerifiedAt) / 86_400_000;
  return Math.exp(-ageDays / 120);
}

function lifecyclePenalty(lifecycle: SemanticLifecycle, relevance: number): number {
  if (lifecycle === 'superseded') return relevance >= 0.92 ? 0.25 : 1;
  if (lifecycle === 'archived') return relevance >= 0.9 ? 0.18 : 0.55;
  if (lifecycle === 'stale') return relevance >= 0.88 ? 0.04 : 0.32;
  if (lifecycle === 'aging') return 0.08;
  return 0;
}

export class SemanticContextService {
  private lastHealth: ContextHealthMetrics = { tokensUsed: 0, tokenBudget: DEFAULT_CONTEXT_TOKEN_BUDGET, relevance: 0, freshness: 0, authority: 0, redundancy: 0, staleRatio: 0, recordsConsidered: 0, recordsSelected: 0, sourceDistribution: {}, degraded: true, fallbackReason: 'No context packet has been assembled.' };
  constructor(private readonly storage: StorageService, private readonly embeddings: OpenAICompatibleEmbeddingClient, private readonly configuration: () => Promise<EmbeddingConfiguration>, private readonly events?: SemanticEventSink) {}

  health(): ContextHealthMetrics { return structuredClone(this.lastHealth); }

  async searchSemanticContext(query: string, options: SemanticSearchOptions = {}): Promise<{ candidates: SemanticCandidate[]; considered: number; degraded: boolean; fallbackReason?: string }> {
    const config = await this.configuration(); const records = await this.storage.semanticRecords({ embeddingModel: config.model, includeSuperseded: true, limit: 50_000 });
    const filtered = options.sourceTypes?.length ? records.filter((record) => options.sourceTypes!.includes(record.sourceType)) : records;
    let queryVector: number[] | undefined; let fallbackReason: string | undefined;
    if (config.enabled) {
      try { queryVector = (await this.embeddings.embed([query]))[0]; }
      catch (error) { fallbackReason = error instanceof Error ? error.message : String(error); await this.events?.({ type: 'semantic.fallback', payload: { reason: fallbackReason } }); }
    } else fallbackReason = 'Semantic context is disabled.';
    const compatible = queryVector ? filtered.filter((record) => record.embeddingDimensions === queryVector!.length) : filtered;
    if (queryVector && compatible.length !== filtered.length) fallbackReason = 'Incompatible vector dimensions were excluded; rebuild the semantic index.';
    const now = Date.now(); const candidates = compatible.map((record): SemanticCandidate => {
      const semanticRelevance = bounded(queryVector ? (cosineSimilarity(queryVector, record.embedding) + 1) / 2 : lexicalSimilarity(query, `${record.sourceId} ${record.text}`));
      const taskRelationship = relationship(record, options); const authority = bounded(record.authorityScore); const fresh = freshness(record, now); const priorUsefulness = Math.min(1, Math.log1p(record.usageCount) / Math.log(16));
      const stalenessPenalty = lifecyclePenalty(record.lifecycle, semanticRelevance); const supersessionPenalty = record.lifecycle === 'superseded' && semanticRelevance < 0.92 ? 1 : 0;
      const raw = semanticRelevance * GOVERNOR_WEIGHTS.semanticRelevance + taskRelationship * GOVERNOR_WEIGHTS.taskRelationship + authority * GOVERNOR_WEIGHTS.authority * (options.authorityPreference ?? 1) + fresh * GOVERNOR_WEIGHTS.freshness * (options.freshnessPreference ?? 1) + priorUsefulness * GOVERNOR_WEIGHTS.priorUsefulness - stalenessPenalty * GOVERNOR_WEIGHTS.stalenessPenalty - supersessionPenalty * GOVERNOR_WEIGHTS.supersessionPenalty;
      return { record, score: { semanticRelevance, taskRelationship, authority, freshness: fresh, priorUsefulness, stalenessPenalty, redundancyPenalty: 0, supersessionPenalty, finalScore: bounded(raw) }, estimatedTokens: estimateTokens(record.text), retrievalMode: queryVector ? 'semantic' : 'lexical' };
    }).filter((candidate) => candidate.score.finalScore >= (options.minimumScore ?? 0.2) && candidate.score.supersessionPenalty < 1).sort((a, b) => b.score.finalScore - a.score.finalScore || b.record.lastVerifiedAt - a.record.lastVerifiedAt);
    const deduplicated: SemanticCandidate[] = []; let redundant = 0;
    for (const candidate of candidates) {
      const duplicate = deduplicated.some((selected) => selected.record.contentHash === candidate.record.contentHash || (selected.record.sourceId === candidate.record.sourceId && rangesOverlap(selected.record, candidate.record)) || (selected.record.embeddingDimensions === candidate.record.embeddingDimensions && cosineSimilarity(selected.record.embedding, candidate.record.embedding) > 0.985));
      if (duplicate) { candidate.score.redundancyPenalty = 1; redundant += 1; continue; }
      deduplicated.push(candidate);
    }
    const tokenBudget = options.tokenBudget ?? DEFAULT_CONTEXT_TOKEN_BUDGET; const selected: SemanticCandidate[] = []; let used = 0;
    for (const candidate of deduplicated) { if (selected.length >= (options.limit ?? 20) || used + candidate.estimatedTokens > tokenBudget) continue; selected.push(candidate); used += candidate.estimatedTokens; }
    this.lastHealth = metricsFor(selected, filtered.length, tokenBudget, redundant, Boolean(fallbackReason), fallbackReason);
    await this.events?.({ type: 'semantic.retrieval', payload: { candidateCount: filtered.length, selectedCount: selected.length, tokensUsed: used, fallback: Boolean(fallbackReason) } });
    return { candidates: selected, considered: filtered.length, degraded: Boolean(fallbackReason), fallbackReason };
  }
}

function rangesOverlap(left: SemanticRecord, right: SemanticRecord): boolean {
  if (left.lineStart === undefined || left.lineEnd === undefined || right.lineStart === undefined || right.lineEnd === undefined) return false;
  const intersection = Math.max(0, Math.min(left.lineEnd, right.lineEnd) - Math.max(left.lineStart, right.lineStart) + 1);
  return intersection / Math.max(1, Math.min(left.lineEnd - left.lineStart + 1, right.lineEnd - right.lineStart + 1)) > 0.6;
}

function metricsFor(selected: SemanticCandidate[], considered: number, tokenBudget: number, redundant: number, degraded: boolean, fallbackReason?: string): ContextHealthMetrics {
  const average = (selector: (candidate: SemanticCandidate) => number): number => selected.length ? selected.reduce((sum, candidate) => sum + selector(candidate), 0) / selected.length : 0;
  const sourceDistribution: Record<string, number> = {};
  for (const candidate of selected) sourceDistribution[candidate.record.sourceType] = (sourceDistribution[candidate.record.sourceType] ?? 0) + 1;
  return { tokensUsed: selected.reduce((sum, candidate) => sum + candidate.estimatedTokens, 0), tokenBudget, relevance: average((candidate) => candidate.score.semanticRelevance), freshness: average((candidate) => candidate.score.freshness), authority: average((candidate) => candidate.score.authority), redundancy: considered ? redundant / considered : 0, staleRatio: selected.length ? selected.filter((candidate) => ['stale', 'archived', 'superseded'].includes(candidate.record.lifecycle)).length / selected.length : 0, recordsConsidered: considered, recordsSelected: selected.length, sourceDistribution, degraded, fallbackReason };
}
