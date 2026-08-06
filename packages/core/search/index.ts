import * as path from 'node:path';
import type { FileEntry, FileSystem } from '../filesystem/index.js';

export interface SearchDocument {
  id: string;
  path: string;
  content: string;
  title?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface SearchMatch {
  term: string;
  occurrences: number;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  matches: SearchMatch[];
  snippet: string;
}

export interface SearchOptions {
  limit?: number;
  minimumScore?: number;
}

export interface IndexDirectoryOptions {
  extensions?: readonly string[];
  ignoredDirectoryNames?: readonly string[];
  maxFileSizeBytes?: number;
}

export interface IndexFailure {
  path: string;
  reason: string;
}

export interface IndexResult {
  indexed: number;
  skipped: number;
  failures: IndexFailure[];
}

export interface SearchIndexStats {
  documentCount: number;
  termCount: number;
  totalTokens: number;
}

export interface SearchEngine {
  indexDocument(document: SearchDocument): Promise<void>;
  indexDirectory(rootPath: string, options?: IndexDirectoryOptions): Promise<IndexResult>;
  removeDocument(documentId: string): Promise<boolean>;
  clear(): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  stats(): Promise<SearchIndexStats>;
}

export interface SemanticDocument {
  id: string;
  content: string;
  path?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface SemanticSearchResult {
  document: SemanticDocument;
  similarity: number;
}

export interface SemanticSearchOptions {
  limit?: number;
  minimumSimilarity?: number;
  filter?: Readonly<Record<string, string | number | boolean>>;
}

export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface SemanticSearchEngine {
  indexDocuments(documents: readonly SemanticDocument[]): Promise<void>;
  removeDocuments(documentIds: readonly string[]): Promise<number>;
  search(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult[]>;
  clear(): Promise<void>;
}

interface IndexedDocument {
  document: SearchDocument;
  termFrequency: Map<string, number>;
  tokenCount: number;
}

export type Tokenizer = (text: string) => string[];

const DEFAULT_EXTENSIONS = [
  '.md', '.mdx', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss',
  '.html', '.py', '.rs', '.go', '.java', '.c', '.cc', '.cpp', '.h', '.hpp'
] as const;

const DEFAULT_IGNORED_DIRECTORIES = [
  '.git', '.cache', 'node_modules', 'dist', 'out', 'build', 'coverage', '.next', '__pycache__'
] as const;

export const defaultTokenizer: Tokenizer = (text) => (
  text.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[_'-][\p{L}\p{N}]+)*/gu) ?? []
);

function assertDocument(document: SearchDocument): void {
  if (!document.id.trim()) throw new Error('Search document id is required.');
  if (!document.path.trim()) throw new Error('Search document path is required.');
  if (typeof document.content !== 'string') throw new Error('Search document content must be a string.');
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasIgnoredDirectory(filePath: string, rootPath: string, ignored: ReadonlySet<string>): boolean {
  const relative = path.relative(rootPath, filePath);
  return relative.split(path.sep).slice(0, -1).some((part) => ignored.has(part));
}

function snippetFor(content: string, queryTerms: readonly string[]): string {
  const normalized = content.toLocaleLowerCase();
  const indexes = queryTerms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0);
  const matchIndex = indexes.length > 0 ? Math.min(...indexes) : 0;
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(content.length, matchIndex + 180);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export class KeywordSearchEngine implements SearchEngine {
  private readonly documents = new Map<string, IndexedDocument>();
  private readonly postings = new Map<string, Map<string, number>>();
  private totalTokens = 0;

  constructor(
    private readonly fileSystem: FileSystem,
    private readonly tokenize: Tokenizer = defaultTokenizer
  ) {}

  async indexDocument(document: SearchDocument): Promise<void> {
    assertDocument(document);
    await this.removeDocument(document.id);
    const tokens = this.tokenize(`${document.title ?? ''} ${document.content}`);
    const termFrequency = new Map<string, number>();
    for (const token of tokens) termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);

    const storedDocument: SearchDocument = {
      ...document,
      metadata: document.metadata ? { ...document.metadata } : undefined
    };
    this.documents.set(document.id, { document: storedDocument, termFrequency, tokenCount: tokens.length });
    this.totalTokens += tokens.length;
    for (const [term, frequency] of termFrequency) {
      const termPostings = this.postings.get(term) ?? new Map<string, number>();
      termPostings.set(document.id, frequency);
      this.postings.set(term, termPostings);
    }
  }

  async indexDirectory(rootPath: string, options: IndexDirectoryOptions = {}): Promise<IndexResult> {
    const resolvedRoot = await this.fileSystem.realPath(rootPath);
    const rootEntry = await this.fileSystem.stat(resolvedRoot);
    if (rootEntry.type !== 'directory') throw new Error(`Search root is not a directory: ${resolvedRoot}`);

    const extensions = new Set((options.extensions ?? DEFAULT_EXTENSIONS).map((extension) => (
      extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`
    )));
    const ignoredDirectories = new Set(options.ignoredDirectoryNames ?? DEFAULT_IGNORED_DIRECTORIES);
    const maxFileSizeBytes = options.maxFileSizeBytes ?? 2 * 1024 * 1024;
    if (!Number.isInteger(maxFileSizeBytes) || maxFileSizeBytes < 1) {
      throw new Error('maxFileSizeBytes must be a positive integer.');
    }

    const entries = await this.fileSystem.listDirectory(resolvedRoot, { recursive: true, includeHidden: true });
    const result: IndexResult = { indexed: 0, skipped: 0, failures: [] };
    const discoveredDocumentIds = new Set<string>();
    for (const entry of entries) {
      if (!this.shouldIndex(entry, resolvedRoot, extensions, ignoredDirectories, maxFileSizeBytes)) {
        result.skipped++;
        continue;
      }
      const relativePath = path.relative(resolvedRoot, entry.path);
      discoveredDocumentIds.add(relativePath);
      try {
        const content = await this.fileSystem.readFile(entry.path);
        await this.indexDocument({
          id: relativePath,
          path: entry.path,
          title: path.basename(entry.path, path.extname(entry.path)),
          content,
          metadata: { relativePath, modifiedAt: entry.modifiedAt, indexRoot: resolvedRoot }
        });
        result.indexed++;
      } catch (error) {
        result.failures.push({ path: entry.path, reason: failureReason(error) });
      }
    }
    for (const [documentId, indexed] of this.documents) {
      if (indexed.document.metadata?.indexRoot === resolvedRoot && !discoveredDocumentIds.has(documentId)) {
        await this.removeDocument(documentId);
      }
    }
    return result;
  }

  async removeDocument(documentId: string): Promise<boolean> {
    const indexed = this.documents.get(documentId);
    if (!indexed) return false;
    this.documents.delete(documentId);
    this.totalTokens -= indexed.tokenCount;
    for (const term of indexed.termFrequency.keys()) {
      const termPostings = this.postings.get(term);
      termPostings?.delete(documentId);
      if (termPostings?.size === 0) this.postings.delete(term);
    }
    return true;
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.postings.clear();
    this.totalTokens = 0;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const queryTerms = [...new Set(this.tokenize(query))];
    if (queryTerms.length === 0) return [];
    const limit = options.limit ?? 20;
    const minimumScore = options.minimumScore ?? 0;
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Search limit must be a positive integer.');
    if (!Number.isFinite(minimumScore) || minimumScore < 0) throw new Error('minimumScore must be a non-negative number.');

    const candidateIds = new Set<string>();
    for (const term of queryTerms) for (const documentId of this.postings.get(term)?.keys() ?? []) candidateIds.add(documentId);
    const averageLength = this.documents.size === 0 ? 0 : this.totalTokens / this.documents.size;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const results: SearchResult[] = [];

    for (const documentId of candidateIds) {
      const indexed = this.documents.get(documentId)!;
      let score = 0;
      const matches: SearchMatch[] = [];
      for (const term of queryTerms) {
        const frequency = indexed.termFrequency.get(term) ?? 0;
        if (frequency === 0) continue;
        const documentFrequency = this.postings.get(term)?.size ?? 0;
        const inverseDocumentFrequency = Math.log(1 + (this.documents.size - documentFrequency + 0.5) / (documentFrequency + 0.5));
        const lengthNormalization = averageLength === 0 ? 1 : 1 - 0.75 + 0.75 * (indexed.tokenCount / averageLength);
        score += inverseDocumentFrequency * ((frequency * 2.2) / (frequency + 1.2 * lengthNormalization));
        matches.push({ term, occurrences: frequency });
      }

      const lowerContent = indexed.document.content.toLocaleLowerCase();
      const lowerTitle = indexed.document.title?.toLocaleLowerCase() ?? '';
      if (queryTerms.length > 1 && lowerContent.includes(normalizedQuery)) score *= 1.35;
      if (queryTerms.some((term) => lowerTitle.includes(term))) score *= 1.2;
      if (score >= minimumScore) {
        results.push({
          document: { ...indexed.document, metadata: indexed.document.metadata ? { ...indexed.document.metadata } : undefined },
          score,
          matches,
          snippet: snippetFor(indexed.document.content, queryTerms)
        });
      }
    }

    return results.sort((left, right) => right.score - left.score || left.document.path.localeCompare(right.document.path)).slice(0, limit);
  }

  async stats(): Promise<SearchIndexStats> {
    return { documentCount: this.documents.size, termCount: this.postings.size, totalTokens: this.totalTokens };
  }

  private shouldIndex(
    entry: FileEntry,
    rootPath: string,
    extensions: ReadonlySet<string>,
    ignoredDirectories: ReadonlySet<string>,
    maxFileSizeBytes: number
  ): boolean {
    return entry.type === 'file'
      && entry.size <= maxFileSizeBytes
      && extensions.has(path.extname(entry.path).toLowerCase())
      && !hasIgnoredDirectory(entry.path, rootPath, ignoredDirectories);
  }
}
