/**
 * @forge/ipc — Typed IPC Contract Layer
 *
 * This package defines the complete communication contract between the
 * Electron main process and the renderer process. The renderer never touches
 * Node APIs directly — it goes through the preload bridge which exposes a
 * typed `window.forge` object backed by these contracts.
 *
 * Architecture rule: all filesystem, Git, database, and AI operations live
 * in the main process. The renderer is a pure UI client.
 */

// ─── Core Types ───────────────────────────────────────────────────────────

export interface FileNode {
  /** Full absolute path on disk */
  path: string;
  /** Display name (e.g. "README.md") */
  name: string;
  /** Relative path from workspace root */
  relativePath: string;
  type: 'file' | 'directory';
  /** File extension without dot (e.g. "md", "ts", "py") */
  extension?: string;
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
  /** True if this is a git-tracked file */
  gitTracked?: boolean;
}

export interface WorkspaceInfo {
  rootPath: string;
  name: string;
  /** Path to .git directory, or null if not a git repo */
  gitRoot: string | null;
  createdAt: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  modifiedAt: number;
}

export interface MarkdownFrontmatter {
  [key: string]: unknown;
}

export interface ParsedMarkdown {
  content: string;
  frontmatter: MarkdownFrontmatter;
  /** Extracted wiki-links like [[note-name]] */
  wikiLinks: string[];
  /** Extracted #tags */
  tags: string[];
  /** Extracted heading hierarchy */
  headings: { level: number; text: string; slug: string }[];
}

// ─── Git Types ────────────────────────────────────────────────────────────

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
  /** Current HEAD commit */
  head: GitCommit | null;
}

export interface GitStatusFile {
  path: string;
  /** Index status (staged) */
  indexStatus: GitStatusCode;
  /** Working tree status (unstaged) */
  workingStatus: GitStatusCode;
  untracked: boolean;
}

export type GitStatusCode = ' ' | 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?';

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  message: string;
  timestamp: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
}

export interface GitDiff {
  files: GitDiffFile[];
}

export interface GitDiffFile {
  path: string;
  oldPath?: string;
  status: GitStatusCode;
  additions: number;
  deletions: number;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

// ─── Storage / Metadata Types ──────────────────────────────────────────────

export interface ProjectMetadata {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
  /** User-defined goals tracked on the dashboard */
  goals: Goal[];
  /** AI-extracted or user-defined tags */
  tags: string[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  createdAt: number;
  updatedAt: number;
  /** Linked file paths */
  linkedFiles: string[];
}

// ─── AI Context Types (Phase 2+ stubs) ─────────────────────────────────────

export interface ContextChunk {
  source: string;
  sourceType: 'file' | 'note' | 'code' | 'doc' | 'git' | 'task';
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface AssembledContext {
  chunks: ContextChunk[];
  totalTokens: number;
  /** Human-readable explanation of what was included and why */
  rationale: string;
}

export interface AIProviderConfig {
  provider: 'openai' | 'ollama' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxContextTokens: number;
}

// Phase 2-4 Extended Types

export interface SearchResult {
  path: string;
  relativePath: string;
  content: string;
  score: number;
  sourceType: 'file' | 'note' | 'code' | 'doc';
  metadata: { title?: string; headings?: string[]; tags?: string[] };
}

export interface SearchIndexStatus {
  totalFiles: number;
  indexedFiles: number;
  lastIndexed: number | null;
  isIndexing: boolean;
}

export interface GraphNodeData {
  id: string;
  label: string;
  type: 'note' | 'file' | 'code' | 'concept' | 'person' | 'project' | 'task';
  path?: string;
  tags: string[];
  size: number;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: 'links_to' | 'references' | 'depends_on' | 'defines' | 'implements' | 'relates_to';
  weight: number;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  clusters: { id: string; label: string; nodeIds: string[] }[];
}

export interface ContextHealth {
  score: number;
  hasReadme: boolean;
  hasArchitecture: boolean;
  hasTODOs: boolean;
  noteCount: number;
  codeFileCount: number;
  indexedCount: number;
  wikiLinkCount: number;
  backlinkCoverage: number;
}

export interface AIExecutionRequest {
  prompt: string;
  tools?: string[];
  maxIterations?: number;
  requireApproval?: boolean;
  contextFiles?: string[];
}

export interface AIExecutionResponse {
  success: boolean;
  output: string;
  toolCalls: { name: string; args: Record<string, unknown>; result: unknown; timestamp: number }[];
  proposedChanges: {
    type: 'file_create' | 'file_modify' | 'file_delete' | 'file_rename';
    path: string;
    content?: string;
    oldPath?: string;
  }[];
  applied: boolean;
}

export interface AIToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
}

export interface ProviderSettings {
  provider: 'openai' | 'ollama' | 'custom';
  model: string;
  baseUrl?: string;
  isConfigured: boolean;
  models: string[];
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  tools: AIToolInfo[];
  commands: { id: string; title: string }[];
}

// ─── IPC Channel Definitions ──────────────────────────────────────────────

/**
 * Each IPC channel follows a request/response pattern.
 * The channel name is a dotted namespace: domain.action
 */
export const IPC_CHANNELS = {
  // Workspace
  WORKSPACE_OPEN: 'workspace.open',
  WORKSPACE_INFO: 'workspace.info',
  WORKSPACE_CLOSE: 'workspace.close',
  WORKSPACE_RECENT: 'workspace.recent',

  // Files
  FILE_READ: 'file.read',
  FILE_WRITE: 'file.write',
  FILE_LIST: 'file.list',
  FILE_CREATE: 'file.create',
  FILE_DELETE: 'file.delete',
  FILE_RENAME: 'file.rename',
  FILE_MOVE: 'file.move',
  FILE_WATCH: 'file.watch',

  // Markdown
  MARKDOWN_PARSE: 'markdown.parse',
  MARKDOWN_LINKS: 'markdown.links',
  MARKDOWN_BACKLINKS: 'markdown.backlinks',

  // Git
  GIT_STATUS: 'git.status',
  GIT_BRANCHES: 'git.branches',
  GIT_DIFF: 'git.diff',
  GIT_COMMIT: 'git.commit',
  GIT_PUSH: 'git.push',
  GIT_PULL: 'git.pull',
  GIT_CHECKOUT: 'git.checkout',
  GIT_BRANCH_CREATE: 'git.branch.create',
  GIT_LOG: 'git.log',
  GIT_STAGE: 'git.stage',
  GIT_UNSTAGE: 'git.unstage',

  // Storage / Metadata
  META_PROJECT_GET: 'meta.project.get',
  META_PROJECT_UPDATE: 'meta.project.update',
  META_GOAL_CREATE: 'meta.goal.create',
  META_GOAL_UPDATE: 'meta.goal.update',
  META_TASK_LIST: 'meta.task.list',
  META_TASK_CREATE: 'meta.task.create',
  META_TASK_UPDATE: 'meta.task.update',

  // AI
  AI_QUERY: 'ai.query',
  AI_ASSEMBLE_CONTEXT: 'ai.assembleContext',
  AI_PROVIDER_CONFIG: 'ai.provider.config',
  AI_PROVIDER_GET: 'ai.provider.get',
  AI_PROVIDER_TEST: 'ai.provider.test',
  AI_EXECUTE: 'ai.execute',
  AI_AVAILABLE_TOOLS: 'ai.availableTools',

  // Search
  SEARCH_SEMANTIC: 'search.semantic',
  SEARCH_KEYWORD: 'search.keyword',
  SEARCH_HYBRID: 'search.hybrid',
  SEARCH_INDEX_WORKSPACE: 'search.indexWorkspace',
  SEARCH_REINDEX_FILE: 'search.reindexFile',
  SEARCH_STATUS: 'search.status',

  // Memory / Knowledge Graph
  MEMORY_GRAPH: 'memory.graph',
  MEMORY_BACKLINKS: 'memory.backlinks',
  MEMORY_CONTEXT_HEALTH: 'memory.contextHealth',
  MEMORY_REINDEX: 'memory.reindex',

  // Plugins
  PLUGIN_LIST: 'plugin.list',
  PLUGIN_ENABLE: 'plugin.enable',
  PLUGIN_DISABLE: 'plugin.disable',
  PLUGIN_COMMANDS: 'plugin.commands',
  PLUGIN_TOOLS: 'plugin.tools',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// ─── IPC Request/Response Maps ─────────────────────────────────────────────

export interface IPCRequestMap {
  [IPC_CHANNELS.WORKSPACE_OPEN]: { path?: string };
  [IPC_CHANNELS.WORKSPACE_INFO]: void;
  [IPC_CHANNELS.WORKSPACE_CLOSE]: void;
  [IPC_CHANNELS.WORKSPACE_RECENT]: void;

  [IPC_CHANNELS.FILE_READ]: { path: string };
  [IPC_CHANNELS.FILE_WRITE]: { path: string; content: string };
  [IPC_CHANNELS.FILE_LIST]: { path?: string } | void;
  [IPC_CHANNELS.FILE_CREATE]: { path: string; type: 'file' | 'directory'; content?: string };
  [IPC_CHANNELS.FILE_DELETE]: { path: string };
  [IPC_CHANNELS.FILE_RENAME]: { oldPath: string; newPath: string };
  [IPC_CHANNELS.FILE_MOVE]: { oldPath: string; newPath: string };
  [IPC_CHANNELS.FILE_WATCH]: { path: string };

  [IPC_CHANNELS.MARKDOWN_PARSE]: { path: string };
  [IPC_CHANNELS.MARKDOWN_LINKS]: { path: string };
  [IPC_CHANNELS.MARKDOWN_BACKLINKS]: { noteName: string };

  [IPC_CHANNELS.GIT_STATUS]: void;
  [IPC_CHANNELS.GIT_BRANCHES]: void;
  [IPC_CHANNELS.GIT_DIFF]: { staged: boolean } | void;
  [IPC_CHANNELS.GIT_COMMIT]: { message: string; files?: string[] };
  [IPC_CHANNELS.GIT_PUSH]: { remote?: string; branch?: string };
  [IPC_CHANNELS.GIT_PULL]: { remote?: string; branch?: string };
  [IPC_CHANNELS.GIT