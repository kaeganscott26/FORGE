import type { WorkspaceService } from '@forge/workspace';
import type { GitService } from '@forge/git';
import type { StorageService } from '@forge/storage';
import type { FileNode } from '@forge/ipc';
import type { MemoryEntry } from '@forge/memory';
import type { CompiledWorkspaceContext, ContextBudgetPolicy, WorkspaceArtifact, AgentContextEnvelope } from './types';

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
  constructor(
    private workspace: WorkspaceService,
    private git: GitService,
    private storage: StorageService,
    private budgetPolicy: ContextBudgetPolicy = new PriorityContextBudgetPolicy()
  ) {}

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
    const context = await this.buildContext(query, memories);
    const artifacts: WorkspaceArtifact[] = [];
    const add = (artifact: WorkspaceArtifact): void => { if (artifact.content.trim()) artifacts.push(artifact); };
    add({ id: 'workspace-inventory', kind: 'source', title: 'Workspace inventory', priority: 60, content: `${context.files.length} indexed entries\n${context.files.slice(0, 180).map((file) => `${file.type === 'directory' ? 'dir' : 'file'}: ${file.path}`).join('\n')}`, metadata: { relevance: 70, reason: 'Workspace identity and file inventory.' } });
    for (const document of context.documents) add({ id: `document:${document.path}`, kind: /(?:architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes)/i.test(document.path) ? 'architecture' : 'documentation', title: document.path, path: document.path, content: document.content, priority: /architecture/i.test(document.path) ? 100 : /^readme/i.test(document.path) ? 90 : 80, metadata: { relevance: 90, reason: 'Project documentation selected by workspace context policy.' } });
    for (const sourceFile of context.sourceFiles) add({ id: `source:${sourceFile.path}`, kind: 'source', title: sourceFile.path, path: sourceFile.path, content: sourceFile.content, priority: sourceFile.changed ? 92 : 70, metadata: { relevance: sourceFile.relevance, reason: sourceFile.reason } });
    if (context.packageJson) add({ id: 'package-json', kind: 'configuration', title: 'package.json', path: context.packageJson.path, content: context.packageJson.content, priority: 72 });
    if (context.gitStatus) add({ id: 'git-status', kind: 'git', title: 'Current Git state', content: JSON.stringify(context.gitStatus, null, 2), priority: 88 });
    if (context.recentCommits?.length) add({ id: 'git-history', kind: 'git', title: 'Recent Git history', content: context.recentCommits.map((commit) => `${commit.hash.slice(0, 8)} ${commit.message}`).join('\n'), priority: 86 });
    if (context.metadata) add({ id: 'project-metadata', kind: 'metadata', title: 'Project goals and metadata', content: JSON.stringify(context.metadata, null, 2), priority: 94 });
    for (const memory of context.memories ?? []) add({ id: `memory:${memory.id}`, kind: 'memory', title: memory.title || memory.type, content: memory.content, priority: memory.type === 'decision' ? 98 : Math.max(70, Math.min(92, memory.relevance ?? 84)), updatedAt: memory.updatedAt, metadata: { relevance: memory.relevance ?? 80, reason: memory.reasons?.join(' · ') ?? 'Relevant durable workspace knowledge.' } });

    const budgeted = this.budgetPolicy.select(artifacts, characterBudget);
    const evidence = budgeted.selected.map((artifact) => `## ${artifact.title}${artifact.path ? ` (${artifact.path})` : ''}\n${artifact.content}`).join('\n\n');
    const projectName = context.projectName ?? 'the active workspace';
    const systemPrompt = `You are consuming context compiled by FORGE for the repository "${projectName}".\n\nFORGE owns workspace intelligence: project evidence, durable memory, task state, Git chronology, terminal observations, and relevance filtering. The active LLM or CLI agent owns reasoning and execution. Treat the project folder as authority, distinguish evidence from inference, and preserve durable project decisions across model changes.\n\nWorkspace evidence for this turn:\n${evidence || 'No workspace evidence was available.'}`;
    return { systemPrompt, artifacts: budgeted.selected, omittedArtifactIds: budgeted.omittedArtifactIds, characterBudget, characterCount: systemPrompt.length };
  }

  async envelope(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<AgentContextEnvelope> {
    const compiled = await this.assemble(query, memories, characterBudget);
    return { ...compiled, query, generatedAt: Date.now() };
  }
}

export { WorkspaceContextEngine as ContextBuilderImpl };
