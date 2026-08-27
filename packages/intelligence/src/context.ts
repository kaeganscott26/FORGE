import type { WorkspaceService } from '@forge/workspace';
import type { GitService } from '@forge/git';
import type { StorageService } from '@forge/storage';
import type { FileNode } from '@forge/ipc';
import type { MemoryEntry } from '@forge/memory';
import type { CompiledWorkspaceContext, ContextBudgetPolicy, WorkspaceArtifact, AgentContextEnvelope } from './types';
import { DEFAULT_CONTEXT_TOKEN_BUDGET, DEFAULT_SEMANTIC_RESULT_LIMIT, DEFAULT_SEMANTIC_TOKEN_BUDGET, estimateTokens, type SemanticContextService } from './semantic';

const DEFAULT_CONTEXT_BUDGET = 28_000;
const DOCUMENT_PATTERN = /(?:^|\/)(?:readme|architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes|goals?|memory)\.md$/i;

export interface ProjectContext {
  projectName: string | null;
  rootPath: string | null;
  files: Array<{ path: string; type: 'file' | 'directory'; extension?: string }>;
  documents: Array<{ path: string; content: string }>;
  sourceFiles: Array<{ path: string; content: string; changed: boolean; relevance: number; reason: string }>;
  packageJson?: { path: string; content: string } | null;
  gitStatus?: unknown | null;
  recentCommits?: Array<{ hash: string; message: string; author?: string; timestamp?: number }> | null;
  metadata?: unknown | null;
  memories?: MemoryEntry[] | null;
}

export class PriorityContextBudgetPolicy implements ContextBudgetPolicy {
  select(artifacts: readonly WorkspaceArtifact[], characterBudget: number): { selected: readonly WorkspaceArtifact[]; omittedArtifactIds: readonly string[] } {
    const ordered = [...artifacts].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
    const selected: WorkspaceArtifact[] = [];
    const omittedArtifactIds: string[] = [];
    let remaining = characterBudget;
    for (const artifact of ordered) {
      if (remaining <= 0) { omittedArtifactIds.push(artifact.id); continue; }
      const allowance = Math.min(artifact.content.length, 4_000, remaining);
      if (allowance <= 0) { omittedArtifactIds.push(artifact.id); continue; }
      const content = artifact.content.length > allowance ? `${artifact.content.slice(0, Math.max(0, allowance - 1))}…` : artifact.content;
      selected.push({ ...artifact, content });
      remaining -= content.length;
      if (content.length < artifact.content.length) omittedArtifactIds.push(`${artifact.id}:truncated`);
    }
    return { selected, omittedArtifactIds };
  }
}

export class WorkspaceContextEngine {
  private tokenBudget = DEFAULT_CONTEXT_TOKEN_BUDGET;
  constructor(
    private workspace: WorkspaceService,
    private git: GitService,
    private storage: StorageService,
    private budgetPolicy: ContextBudgetPolicy = new PriorityContextBudgetPolicy(),
    private semantic?: SemanticContextService
  ) {}

  useSemanticContext(service: SemanticContextService): void { this.semantic = service; }
  setTokenBudget(value: number): void { this.tokenBudget = Math.min(128_000, Math.max(4_000, Math.round(value))); }

  private flattenFiles(nodes: FileNode[]): Array<{ path: string; type: 'file' | 'directory'; extension?: string }> {
    const out: Array<{ path: string; type: 'file' | 'directory'; extension?: string }> = [];
    for (const node of nodes) {
      out.push({ path: node.relativePath || node.path, type: node.type, extension: node.extension });
      if (node.children?.length) out.push(...this.flattenFiles(node.children));
    }
    return out;
  }

  async buildContext(query = '', memories?: MemoryEntry[] | null): Promise<ProjectContext> {
    const context: ProjectContext = { projectName: null, rootPath: null, files: [], documents: [], sourceFiles: [], packageJson: null, gitStatus: null, recentCommits: null, metadata: null, memories: memories ?? null };
    try { const info = this.workspace.info(); if (info) { context.projectName = info.name ?? null; context.rootPath = info.rootPath ?? null; } } catch { /* unopened workspace */ }
    try { context.files = this.flattenFiles(await this.workspace.list('')); } catch { context.files = []; }

    const candidatePaths = [...new Set(context.files.filter((file) => file.type === 'file' && DOCUMENT_PATTERN.test(file.path)).map((file) => file.path))].slice(0, 10);
    for (const documentPath of candidatePaths) {
      try { const file = await this.workspace.readFile(documentPath); context.documents.push({ path: documentPath, content: file.content }); } catch { /* unreadable evidence */ }
    }
    try { const packageJson = await this.workspace.readFile('package.json'); context.packageJson = { path: packageJson.path, content: packageJson.content }; } catch { /* optional configuration */ }
    try { context.gitStatus = await this.git.status(); } catch { /* Git may be unavailable */ }
    try { const commits = await this.git.log(12); context.recentCommits = commits.map((commit) => ({ hash: commit.hash, message: commit.message, author: commit.author, timestamp: commit.timestamp })); } catch { /* Git history may be unavailable */ }
    try { context.metadata = await this.storage.dashboard(); } catch { /* storage may not be initialized */ }

    const queryTokens = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
    const changedPaths = new Set(context.gitStatus && typeof context.gitStatus === 'object' && 'files' in context.gitStatus && Array.isArray((context.gitStatus as { files?: unknown }).files) ? ((context.gitStatus as { files: Array<{ path?: unknown }> }).files).map((file) => String(file.path ?? '')) : []);
    const sourceExtensions = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'c', 'cpp', 'rs', 'go', 'java']);
    const sourceCandidates = context.files.filter((file) => file.type === 'file' && sourceExtensions.has(file.extension?.toLowerCase() ?? '')).map((file) => ({ path: file.path, changed: changedPaths.has(file.path), score: (changedPaths.has(file.path) ? 100 : 0) + [...queryTokens].reduce((score, token) => score + (file.path.toLowerCase().includes(token) ? 10 : 0), 0) })).filter((candidate) => candidate.changed || candidate.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 6);
    for (const candidate of sourceCandidates) {
      try { const file = await this.workspace.readFile(candidate.path); context.sourceFiles.push({ path: candidate.path, content: file.content, changed: candidate.changed, relevance: candidate.changed ? 96 : 84, reason: candidate.changed ? 'Changed implementation file.' : 'Source path matches the current question.' }); } catch { /* unreadable source evidence */ }
    }
    return context;
  }

  async assemble(query: string, memories?: MemoryEntry[] | null, characterBudget = DEFAULT_CONTEXT_BUDGET): Promise<CompiledWorkspaceContext> {
    characterBudget = Math.min(characterBudget, this.tokenBudget * 4);
    const context = await this.buildContext(query, memories);
    const artifacts: WorkspaceArtifact[] = [];
    const add = (artifact: WorkspaceArtifact): void => { if (artifact.content.trim()) artifacts.push(artifact); };
    add({ id: 'workspace-inventory', kind: 'source', title: 'Workspace inventory', priority: 60, content: `${context.files.length} indexed entries\n${context.files.slice(0, 180).map((file) => `${file.type === 'directory' ? 'dir' : 'file'}: ${file.path}`).join('\n')}`, metadata: { relevance: 70, reason: 'Workspace identity and file inventory.' } });
    for (const document of context.documents) add({ id: `document:${document.path}`, kind: /(?:architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes)/i.test(document.path) ? 'architecture' : 'documentation', title: document.path, path: document.path, content: document.content, priority: /architecture/i.test(document.path) ? 82 : /^readme/i.test(document.path) ? 78 : 74, metadata: { relevance: 90, reason: 'Current workspace documentation selected by deterministic context policy.' } });
    for (const sourceFile of context.sourceFiles) add({ id: `source:${sourceFile.path}`, kind: 'source', title: sourceFile.path, path: sourceFile.path, content: sourceFile.content, priority: sourceFile.changed ? 98 : 96, metadata: { relevance: sourceFile.relevance, reason: sourceFile.reason } });
    if (context.packageJson) add({ id: 'package-json', kind: 'configuration', title: 'package.json', path: context.packageJson.path, content: context.packageJson.content, priority: 90 });
    if (context.gitStatus) add({ id: 'git-status', kind: 'git', title: 'Current Git state', content: JSON.stringify(context.gitStatus, null, 2), priority: 94 });
    if (context.recentCommits?.length) add({ id: 'git-history', kind: 'git', title: 'Recent Git history', content: context.recentCommits.map((commit) => `${commit.hash.slice(0, 8)} ${commit.message}`).join('\n'), priority: 92 });
    if (context.metadata) add({ id: 'project-metadata', kind: 'metadata', title: 'Current project goals, tasks, and runtime metadata', content: JSON.stringify(context.metadata, null, 2), priority: 88 });
    for (const memory of context.memories ?? []) add({ id: `memory:${memory.id}`, kind: 'memory', title: memory.title || memory.type, content: memory.content, priority: memory.type === 'decision' ? 54 : 50, updatedAt: memory.updatedAt, metadata: { relevance: memory.relevance ?? 80, reason: memory.reasons?.join(' · ') ?? 'Durable historical workspace knowledge; current source and tool evidence take precedence.' } });

    let metrics = this.semantic?.health() ?? { tokensUsed: 0, tokenBudget: DEFAULT_CONTEXT_TOKEN_BUDGET, relevance: 0, freshness: 0, authority: 0, redundancy: 0, staleRatio: 0, recordsConsidered: 0, recordsSelected: 0, sourceDistribution: {}, degraded: true, fallbackReason: 'Semantic context has not been initialized.' };
    if (this.semantic && shouldUseSemanticRetrieval(query, context)) {
      const retrieval = await this.semantic.searchSemanticContext(query, { limit: DEFAULT_SEMANTIC_RESULT_LIMIT, tokenBudget: Math.min(DEFAULT_SEMANTIC_TOKEN_BUDGET, Math.floor(this.tokenBudget * 0.2)) });
      metrics = this.semantic.health();
      for (const candidate of retrieval.candidates) {
        const record = candidate.record;
        add({ id: `semantic:${record.id}`, kind: semanticArtifactKind(record.sourceType), title: record.sourceUri ?? record.sourceId, path: record.sourceUri, content: record.text, priority: Math.min(58, 28 + Math.round(candidate.score.finalScore * 30)), updatedAt: record.updatedAt, metadata: { semanticRecordId: record.id, sourceType: record.sourceType, sourceRevision: record.sourceRevision, lineStart: record.lineStart, lineEnd: record.lineEnd, lifecycle: record.lifecycle, relevance: Math.round(candidate.score.semanticRelevance * 100), authority: candidate.score.authority, freshness: candidate.score.freshness, finalScore: candidate.score.finalScore, retrievalMode: candidate.retrievalMode, reason: `${candidate.retrievalMode} discovery evidence; current files, Git, task state, and direct Tool Results remain authoritative.` } });
      }
    } else if (this.semantic) metrics = this.semantic.skip('Semantic retrieval was not needed; deterministic workspace evidence and direct tools have priority.');

    const budgeted = this.budgetPolicy.select(artifacts, characterBudget);
    const evidence = budgeted.selected.map((artifact) => `## ${artifact.title}${artifact.path ? ` (${artifact.path})` : ''}\n${artifact.content}`).join('\n\n');
    const projectName = context.projectName ?? 'the active workspace';
    const systemPrompt = `You are consuming context compiled by FORGE for the repository "${projectName}".\n\nFORGE owns workspace intelligence: project evidence, durable memory, task state, Git chronology, terminal observations, and relevance filtering. The active LLM or CLI agent owns reasoning and execution. Treat the project folder as authority and distinguish evidence from inference.\n\nEvidence authority, highest first: (1) explicit files or tools requested by the user, (2) direct current source-code Tool Results, (3) current Git state/history/diff, (4) current task/runtime state, (5) semantic discovery, (6) durable historical memory, (7) model prior knowledge. Semantic context is a discovery hint, never proof and never a substitute for tool use. When the user asks to read/search/inspect the workspace, use the corresponding direct tool. A file.search result identifies candidates; read the relevant implementation with file.read, trace callers, inspect relevant tests and Git evidence, then conclude.\n\nWorkspace evidence for this turn:\n${evidence || 'No workspace evidence was available.'}`;
    return { systemPrompt, artifacts: budgeted.selected, omittedArtifactIds: budgeted.omittedArtifactIds, characterBudget, characterCount: systemPrompt.length, tokenBudget: this.tokenBudget, tokenCount: estimateTokens(systemPrompt), metrics: { ...metrics, tokensUsed: estimateTokens(systemPrompt), tokenBudget: this.tokenBudget } };
  }

  async envelope(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<AgentContextEnvelope> {
    const compiled = await this.assemble(query, memories, characterBudget);
    return { ...compiled, query, generatedAt: Date.now() };
  }
}

export function shouldUseSemanticRetrieval(query: string, context: Pick<ProjectContext, 'sourceFiles'>): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized || context.sourceFiles.length > 0) return false;
  if (/^(?:continue the original request|every requested tool call)/.test(normalized)) return false;
  if (/\b(?:file\.(?:read|search)|git\.(?:log|diff|status)|read (?:this|the) file|use (?:agent |workspace )?tools?|inspect (?:the )?(?:workspace|repository|source|file)|current (?:source|git|diff)|stack trace|exact error|diagnos\w*|debug\w*|regression|bug|crash|failure)\b/.test(normalized)) return false;
  return /\b(?:explain|overview|architecture|concept|relationship|relate|historical|why does|how does|where is|discover|find related)\b/.test(normalized);
}

function semanticArtifactKind(sourceType: string): WorkspaceArtifact['kind'] {
  if (['source'].includes(sourceType)) return 'source';
  if (['configuration'].includes(sourceType)) return 'configuration';
  if (['documentation'].includes(sourceType)) return 'documentation';
  if (['architecture', 'decision'].includes(sourceType)) return 'architecture';
  if (sourceType === 'conversation') return 'conversation';
  if (sourceType === 'git') return 'git';
  if (['memory', 'note'].includes(sourceType)) return 'memory';
  return 'metadata';
}

export { WorkspaceContextEngine as ContextBuilderImpl };
