export type IPCResult<T> = { success: true; data: T } | { success: false; error: { message: string; code?: string } };

export interface FileNode {
  path: string;
  relativePath: string;
  name: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
}

export interface WorkspaceInfo { rootPath: string; name: string; gitRoot: string | null; createdAt: number; }
export interface FileContent { path: string; content: string; modifiedAt: number; }
export interface ParsedMarkdown { content: string; frontmatter: Record<string, string | string[]>; wikiLinks: string[]; tags: string[]; headings: Array<{ level: number; text: string; slug: string }>; }
export interface GitStatusFile { path: string; indexStatus: string; workingStatus: string; untracked: boolean; }
export interface GitCommit { hash: string; shortHash: string; author: string; email: string; message: string; timestamp: number; }
export interface GitStatus { branch: string; ahead: number; behind: number; files: GitStatusFile[]; head: GitCommit | null; }
export interface GitBranch { name: string; current: boolean; upstream?: string; }
export interface DiffLine { type: 'context' | 'addition' | 'deletion'; oldLineNumber: number | null; newLineNumber: number | null; content: string; }
export interface GitDiffFile { path: string; status: string; additions: number; deletions: number; lines: DiffLine[]; }
export interface GitDiff { files: GitDiffFile[]; }
export interface Goal { id: string; title: string; description?: string; status: 'active' | 'completed' | 'archived'; createdAt: number; updatedAt: number; }
export interface Task { id: string; title: string; description?: string; status: 'todo' | 'in-progress' | 'done' | 'blocked'; priority: 'low' | 'medium' | 'high'; createdAt: number; updatedAt: number; }
export interface ProjectMetadata { id: string; name: string; rootPath: string; createdAt: number; updatedAt: number; goals: Goal[]; tasks: Task[]; }
export interface DashboardData { project: ProjectMetadata | null; recentCommits: GitCommit[]; contextHealth: { score: number; hasReadme: boolean; noteCount: number; codeFileCount: number }; }

export const IPC_CHANNELS = {
  workspaceOpen: 'workspace.open', workspaceInfo: 'workspace.info',
  fileList: 'file.list', fileRead: 'file.read', fileWrite: 'file.write', fileCreate: 'file.create', fileDelete: 'file.delete', fileRename: 'file.rename',
  markdownParse: 'markdown.parse', gitStatus: 'git.status', gitBranches: 'git.branches', gitLog: 'git.log', gitDiff: 'git.diff', gitStage: 'git.stage', gitUnstage: 'git.unstage', gitCommit: 'git.commit', gitPull: 'git.pull', gitPush: 'git.push',
  metaDashboard: 'meta.dashboard', metaGoalCreate: 'meta.goal.create', metaTaskCreate: 'meta.task.create',
  agentAsk: 'agent.ask', agentExplainProject: 'agent.explainProject', agentReviewChanges: 'agent.reviewChanges',
  agentConversationsList: 'agent.conversations.list', agentConversationsAppend: 'agent.conversations.append'
  , agentMemoriesList: 'agent.memories.list', agentMemoriesDelete: 'agent.memories.delete', agentMemoriesReindex: 'agent.memories.reindex'
} as const;

// Agent IPC types
export type AgentAskRequest = { prompt: string };
export interface AgentResponse { content: string; contextUsed: boolean; metadata?: unknown }
export interface ConversationEntry { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }

export interface IPCRequestMap {
  'workspace.open': undefined; 'workspace.info': undefined;
  'file.list': { path?: string }; 'file.read': { path: string }; 'file.write': { path: string; content: string }; 'file.create': { path: string; type: 'file' | 'directory'; content?: string }; 'file.delete': { path: string }; 'file.rename': { oldPath: string; newPath: string };
  'markdown.parse': { path: string }; 'git.status': undefined; 'git.branches': undefined; 'git.log': { limit?: number }; 'git.diff': { staged: boolean }; 'git.stage': { files: string[] }; 'git.unstage': { files: string[] }; 'git.commit': { message: string; files?: string[] }; 'git.pull': undefined; 'git.push': undefined;
  'meta.dashboard': undefined; 'meta.goal.create': { title: string; description?: string }; 'meta.task.create': { title: string; description?: string; priority?: Task['priority'] };
  'agent.ask': AgentAskRequest; 'agent.explainProject': undefined; 'agent.reviewChanges': undefined; 'agent.conversations.list': undefined; 'agent.conversations.append': { entries: Array<{ role: ConversationEntry['role']; content: string }> } ;
  'agent.memories.list': undefined; 'agent.memories.delete': { id: string }; 'agent.memories.reindex': undefined;
}
export interface IPCResponseMap {
  'workspace.open': WorkspaceInfo; 'workspace.info': WorkspaceInfo | null;
  'file.list': FileNode[]; 'file.read': FileContent; 'file.write': FileContent; 'file.create': FileNode; 'file.delete': void; 'file.rename': FileNode;
  'markdown.parse': ParsedMarkdown; 'git.status': GitStatus; 'git.branches': GitBranch[]; 'git.log': GitCommit[]; 'git.diff': GitDiff; 'git.stage': void; 'git.unstage': void; 'git.commit': GitCommit; 'git.pull': void; 'git.push': void;
  'meta.dashboard': DashboardData; 'meta.goal.create': Goal; 'meta.task.create': Task;
  'agent.ask': AgentResponse; 'agent.explainProject': AgentResponse; 'agent.reviewChanges': AgentResponse; 'agent.conversations.list': ConversationEntry[]; 'agent.conversations.append': void;
  'agent.memories.list': Array<{ id: string; type: string; title?: string | null; content: string; metadata?: unknown; createdAt: number; updatedAt: number }>; 'agent.memories.delete': void; 'agent.memories.reindex': void;
}
export type IPCChannel = keyof IPCRequestMap;
export type ForgeAPI = { invoke<C extends IPCChannel>(channel: C, request: IPCRequestMap[C]): Promise<IPCResult<IPCResponseMap[C]>> };
