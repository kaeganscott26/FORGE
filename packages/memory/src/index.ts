import type { StorageService } from '@forge/storage';
import type { WorkspaceService } from '@forge/workspace';

export type MemoryType = 'conversation' | 'note' | 'document' | 'code' | 'decision';
export interface MemoryEntry { id: string; workspaceId: string; type: MemoryType; title?: string | null; content: string; metadata?: unknown; createdAt: number; updatedAt: number }

export class MemoryService {
  constructor(private storage: StorageService) {}

  async create(entry: { type: MemoryType; title?: string | null; content: string; metadata?: unknown }) {
    return this.storage.createMemory(entry.type, entry.title ?? null, entry.content, entry.metadata);
  }

  async list(limit = 100) {
    return this.storage.listMemories(limit);
  }

  async update(id: string, fields: { title?: string | null; content?: string; metadata?: unknown }) {
    return this.storage.updateMemory(id, fields);
  }

  async delete(id: string) {
    return this.storage.deleteMemory(id);
  }
}

export class MemoryRetriever {
  constructor(private memoryService: MemoryService) {}

  private tokenize(text: string) { return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }

  // TF-IDF based scoring with optional metadata weighting and recency bonus
  async search(query: string, limit = 10) {
    const entries: any[] = await this.memoryService.list(500);
    const now = Date.now();
    const docs = entries.map((e) => ({ id: e.id, title: (e.title ?? '') as string, content: (e.content ?? '') as string, metadata: e.metadata, createdAt: e.createdAt || 0 }));
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
      for (const qt of Object.keys(qFreq)) {
        const wIdf = idf[qt] ?? Math.log(1 + N);
        const docTf = tf[qt] ?? 0;
        score += docTf * wIdf * qFreq[qt];
        // title substring boost
        if (d.title.toLowerCase().includes(qt)) score += 2 * wIdf;
      }
      // metadata weighting: if metadata has tags array, boost by tag matches
      if (d.metadata && (d.metadata as any).tags) {
        const tags: string[] = (d.metadata as any).tags.map((t: string) => String(t).toLowerCase());
        for (const qt of Object.keys(qFreq)) if (tags.includes(qt)) score += 3;
      }
      // recency bonus scaled by age (days)
      const ageDays = Math.max(0, (now - (d.createdAt || 0)) / (1000 * 60 * 60 * 24));
      const recency = Math.max(0, 1.5 - ageDays / 45); // up to +1.5
      score += recency;
      return { entry: d, score };
    });
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit).map((s) => ({ id: s.entry.id, workspaceId: '', type: 'note' as MemoryType, title: s.entry.title || null, content: s.entry.content, metadata: s.entry.metadata, createdAt: s.entry.createdAt, updatedAt: s.entry.createdAt }));
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
    const textExt = new Set(['md', 'txt', 'ts', 'tsx', 'js', 'jsx', 'json', 'py', 'java', 'c', 'cpp', 'rs', 'go']);
    let count = 0;
    for (const f of all) {
      if (count >= limitPerType) break;
      const ext = (f.extension || '').toLowerCase();
      if (!textExt.has(ext)) continue;
      try {
        const fc = await this.workspace.readFile(f.relativePath || f.path);
        await this.memoryService.create({ type: ext === 'md' ? 'document' : 'code', title: f.name, content: fc.content, metadata: { path: f.relativePath || f.path } });
        count += 1;
      } catch {
        // skip unreadable files
      }
    }
  }
}

export default MemoryService;
export interface MemoryEngine { reindex(): Promise<void>; }
