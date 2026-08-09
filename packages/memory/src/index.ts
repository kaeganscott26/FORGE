import type { StorageService } from '@forge/storage';
import type { WorkspaceService } from '@forge/workspace';

export type MemoryType = 'conversation' | 'note' | 'decision' | 'architecture' | 'documentation' | 'source' | 'configuration' | 'document' | 'code';
export interface MemoryEntry { id: string; workspaceId: string; type: MemoryType; title?: string | null; content: string; contentLength?: number; metadata?: unknown; createdAt: number; updatedAt: number; relevance?: number; reasons?: string[] }

export interface WorkspaceKnowledgeClassification {
  type: Extract<MemoryType, 'architecture' | 'documentation' | 'source' | 'configuration'>;
  label: string;
  reason: string;
}

const EXCLUDED_PATH_PARTS = new Set(['.git', '.forge', '.obsidian', 'node_modules', 'dist_electron', 'out', 'coverage', 'build', '.next', '__pycache__']);
const SOURCE_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'go']);
const CONFIGURATION_NAMES = /^(?:package(?:-lock)?\.json|tsconfig(?:\.[^.]+)?\.json|vitest\.config\.[^.]+|vite\.config\.[^.]+|electron\.vite\.config\.[^.]+|eslint\.config\.[^.]+|\.env\.example)$/i;
const ARCHITECTURE_NAMES = /^(?:readme|architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes|goals?|memory)(?:\.[^.]+)?\.md$/i;

export function classifyWorkspaceKnowledge(path: string, extension?: string): WorkspaceKnowledgeClassification | null {
  const normalized = path.replaceAll('\\', '/');
  const parts = normalized.toLowerCase().split('/');
  if (parts.some((part) => EXCLUDED_PATH_PARTS.has(part))) return null;
  const name = parts.at(-1) ?? '';
  const ext = (extension || name.split('.').at(-1) || '').toLowerCase();
  if (ARCHITECTURE_NAMES.test(name) || parts.includes('architecture')) {
    return { type: 'architecture', label: 'Architecture', reason: 'Defines project intent, architecture, status, or durable direction.' };
  }
  if (ext === 'md' || ext === 'txt') {
    return { type: 'documentation', label: 'Documentation', reason: 'Human-authored project documentation.' };
  }
  if (CONFIGURATION_NAMES.test(name) || ['json', 'yml', 'yaml'].includes(ext)) {
    return { type: 'configuration', label: 'Configuration', reason: 'Build, tooling, or project configuration.' };
  }
  if (SOURCE_EXTENSIONS.has(ext)) {
    return { type: 'source', label: 'Source Code', reason: 'Current implementation source.' };
  }
  return null;
}

export class MemoryService {
  constructor(private storage: StorageService) {}

  async create(entry: { type: MemoryType; title?: string | null; content: string; metadata?: unknown }) {
    return this.storage.createMemory(entry.type, entry.title ?? null, entry.content, entry.metadata);
  }

  async list(limit = 100, contentLimit = 12_000) {
    return this.storage.listMemories(limit, contentLimit);
  }

  async update(id: string, fields: { type?: MemoryType; title?: string | null; content?: string; metadata?: unknown }) {
    return this.storage.updateMemory(id, fields);
  }

  async delete(id: string) {
    return this.storage.deleteMemory(id);
  }
}

export class MemoryRetriever {
  constructor(private memoryService: MemoryService) {}

  private tokenize(text: string) {
    const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with']);
    return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !stopWords.has(token));
  }

  // TF-IDF based scoring with optional metadata weighting and recency bonus
  async search(query: string, limit = 10) {
    const asksForObsidian = /\bobsidian\b/i.test(query);
    const asksForConfiguration = /\b(?:config|configuration|build|tooling|package|typescript|test|vitest|eslint|vite)\b/i.test(query);
    const scoringLimit = 24_000;
    const entries: any[] = (await this.memoryService.list(500, scoringLimit)).filter((entry) => {
      const metadata = typeof entry.metadata === 'object' && entry.metadata ? entry.metadata as Record<string, unknown> : {};
      const sourcePath = String(metadata.path ?? '');
      if (/(?:^|\/)\.obsidian(?:\/|$)/i.test(sourcePath) && !asksForObsidian) return false;
      if ((metadata.classification === 'Configuration' || entry.type === 'configuration' || /(?:\.json|\.ya?ml|(?:^|\/)\w+\.config\.[^/]+)$/i.test(sourcePath)) && !asksForConfiguration && !asksForObsidian) return false;
      return true;
    });
    const now = Date.now();
    // Score a bounded projection and return bounded evidence. A very large
    // imported note must not exhaust the local WASM runtime or provider input.
    const returnedLimit = 12_000;
    const docs = entries.map((e) => ({ id: e.id, type: e.type as MemoryType, title: (e.title ?? '') as string, content: String(e.content ?? ''), metadata: e.metadata, createdAt: e.createdAt || 0, updatedAt: e.updatedAt || e.createdAt || 0 }));
    const N = docs.length || 1;
    const docTokens = docs.map((d) => this.tokenize(d.title + ' ' + d.content));
    const df: Record<string, number> = {};
    for (const toks of docTokens) {
      const seen = new Set<string>();
      for (const t of toks) { if (!seen.has(t)) { seen.add(t); df[t] = (df[t] || 0) + 1; } }
    }
    const idf: Record<string, number> = {};
    for (const [t, f] of Object.entries(df)) idf[t] = Math.log(1 + N / (1 + f));

    const qTokens = this.tokenize(query);
    const qFreq: Record<string, number> = {};
    for (const t of qTokens) qFreq[t] = (qFreq[t] || 0) + 1;

    const scores = docs.map((d, i) => {
      const tf: Record<string, number> = {};
      for (const t of docTokens[i]) tf[t] = (tf[t] || 0) + 1;
      let score = 0;
      let titleMatches = 0;
      let tagMatches = 0;
      const matchedTokens = new Set<string>();
      for (const qt of Object.keys(qFreq)) {
        const wIdf = idf[qt] ?? Math.log(1 + N);
        const docTf = tf[qt] ?? 0;
        score += docTf * wIdf * qFreq[qt];
        if (docTf > 0) matchedTokens.add(qt);
        if (d.title.toLowerCase().includes(qt)) { score += 2 * wIdf; titleMatches += 1; matchedTokens.add(qt); }
      }
      if (d.metadata && (d.metadata as any).tags) {
        const tags: string[] = (d.metadata as any).tags.map((t: string) => String(t).toLowerCase());
        for (const qt of Object.keys(qFreq)) if (tags.includes(qt)) { score += 3; tagMatches += 1; matchedTokens.add(qt); }
      }
      if (matchedTokens.size === 0) return null;
      const ageDays = Math.max(0, (now - (d.createdAt || 0)) / (1000 * 60 * 60 * 24));
      const recency = Math.max(0, 1.5 - ageDays / 45);
      score += recency;
      const coverage = matchedTokens.size / Math.max(1, Object.keys(qFreq).length);
      const relevance = Math.min(99, Math.round(45 + (coverage * 35) + Math.min(12, titleMatches * 6) + Math.min(7, tagMatches * 4)));
      const reasons = [
        `${matchedTokens.size}/${Math.max(1, Object.keys(qFreq).length)} query concepts matched`,
        titleMatches ? `${titleMatches} title match${titleMatches === 1 ? '' : 'es'}` : '',
        tagMatches ? `${tagMatches} tag match${tagMatches === 1 ? '' : 'es'}` : ''
      ].filter(Boolean);
      return { entry: d, score, relevance, reasons };
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry && entry.relevance >= 55));
    scores.sort((a, b) => b.relevance - a.relevance || b.score - a.score);
    return scores.slice(0, limit).map((result) => ({
      id: result.entry.id,
      workspaceId: '',
      type: result.entry.type,
      title: result.entry.title || null,
      content: result.entry.content.slice(0, returnedLimit),
      metadata: { ...(typeof result.entry.metadata === 'object' && result.entry.metadata ? result.entry.metadata : {}), relevance: result.relevance, reasons: result.reasons },
      createdAt: result.entry.createdAt,
      updatedAt: result.entry.updatedAt,
      relevance: result.relevance,
      reasons: result.reasons
    }));
  }
}

export class MemoryIndexer {
  constructor(private memoryService: MemoryService, private workspace: WorkspaceService) {}

  async indexConversations(_limit = 100) {
    // conversations are stored in StorageService; memoryService may rely on StorageService to persist
    // leave this as-is if storage is accessible externally
    return;
  }

  async indexWorkspaceFiles(limitPerType = 200) {
    const files = await this.workspace.list();
    const all: Array<{ relative: string } & any> = [];
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.type === 'file') all.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(files as any[]);
    const existing = await this.memoryService.list(2_000, 0) as MemoryEntry[];
    const indexed = existing.filter((entry) => {
      const metadata = typeof entry.metadata === 'object' && entry.metadata ? entry.metadata as Record<string, unknown> : {};
      return metadata.origin === 'workspace-index' || (['document', 'code'].includes(entry.type) && typeof metadata.path === 'string');
    });
    const byPath = new Map<string, MemoryEntry[]>();
    for (const entry of indexed) {
      const sourcePath = String((entry.metadata as Record<string, unknown>).path);
      byPath.set(sourcePath, [...(byPath.get(sourcePath) ?? []), entry]);
    }
    const classified = all.map((file) => ({ file, sourcePath: file.relativePath || file.path, classification: classifyWorkspaceKnowledge(file.relativePath || file.path, file.extension) }))
      .filter((entry): entry is typeof entry & { classification: WorkspaceKnowledgeClassification } => Boolean(entry.classification));
    const eligiblePaths = new Set(classified.map((entry) => entry.sourcePath));
    for (const entry of indexed) {
      const sourcePath = String((entry.metadata as Record<string, unknown>).path);
      if (!eligiblePaths.has(sourcePath)) await this.memoryService.delete(entry.id);
    }
    let count = 0;
    for (const { file: f, sourcePath, classification } of classified) {
      if (count >= limitPerType) break;
      try {
        const fc = await this.workspace.readFile(sourcePath);
        const indexedContent = fc.content.slice(0, 120_000);
        const metadata = { origin: 'workspace-index', path: sourcePath, classification: classification.label, reason: classification.reason, truncated: indexedContent.length < fc.content.length };
        const matches = byPath.get(sourcePath) ?? [];
        if (matches[0]) {
          await this.memoryService.update(matches[0].id, { type: classification.type, title: f.name, content: indexedContent, metadata });
          for (const duplicate of matches.slice(1)) await this.memoryService.delete(duplicate.id);
        } else {
          await this.memoryService.create({ type: classification.type, title: f.name, content: indexedContent, metadata });
        }
        count += 1;
      } catch {
        // skip unreadable files
      }
    }
    return { indexed: count, excluded: all.length - classified.length };
  }
}

export default MemoryService;
export interface MemoryEngine { reindex(): Promise<void>; }
