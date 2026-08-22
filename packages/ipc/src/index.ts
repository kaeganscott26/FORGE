import { gt, prerelease, valid } from 'semver';

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
export interface FileCopyRequest { sourcePath: string; destinationPath: string; }
export interface ParsedMarkdown { content: string; frontmatter: Record<string, string | string[]>; wikiLinks: string[]; tags: string[]; headings: Array<{ level: number; text: string; slug: string }>; }
export interface GitStatusFile { path: string; indexStatus: string; workingStatus: string; untracked: boolean; }
export interface GitCommit { hash: string; shortHash: string; author: string; email: string; message: string; timestamp: number; }
export interface GitStatus { branch: string; ahead: number; behind: number; files: GitStatusFile[]; head: GitCommit | null; }
export interface GitBranch { name: string; current: boolean; upstream?: string; }
export interface DiffLine { type: 'context' | 'addition' | 'deletion'; oldLineNumber: number | null; newLineNumber: number | null; content: string; }
export interface GitDiffFile { path: string; status: string; additions: number; deletions: number; lines: DiffLine[]; }
export interface GitDiff { files: GitDiffFile[]; }
export interface Goal { id: string; title: string; description?: string; status: 'active' | 'completed' | 'archived'; createdAt: number; updatedAt: number; }
export type TaskStatus = 'draft' | 'ready' | 'running' | 'waiting' | 'blocked' | 'paused' | 'failed' | 'cancelled' | 'completed';
export type TaskStepStatus = 'pending' | 'running' | 'waiting' | 'blocked' | 'failed' | 'skipped' | 'completed';
export type TaskResumabilityState = 'resumable' | 'reconcile-required' | 'approval-required' | 'not-resumable' | 'complete';
export type TaskEventType = 'task.created' | 'task.started' | 'step.started' | 'step.waiting' | 'step.completed' | 'step.failed' | 'step.retried' | 'task.paused' | 'task.resumed' | 'task.blocked' | 'task.completed' | 'task.cancelled' | 'state.reconciled' | 'external.process.detected' | 'external.asset.verified' | 'handoff.generated';
export interface TaskRetryPolicy { maxAttempts: number; backoffMs: number; retryableErrorCodes: string[]; }
export interface TaskStep {
  id: string; taskId: string; position: number; name: string; purpose: string; status: TaskStepStatus; riskTier: 0 | 1 | 2;
  requiredTool?: string; expectedInput?: unknown; expectedOutput?: unknown; startedAt?: number; completedAt?: number; attempts: number;
  lastError?: { message: string; code?: string; exitCode?: number | null; stdout?: string; stderr?: string; retryable: boolean; suggestedNextAction?: string };
  retryPolicy: TaskRetryPolicy; timeoutMs: number; approvalState: 'not-required' | 'required' | 'pending' | 'approved' | 'expired' | 'rejected' | 'consumed';
  externalProcessId?: number; outputPath?: string; artifactPaths: string[]; verificationCriteria: string[]; rollbackInstructions?: string;
  auditReferences: string[]; dependencies: string[];
}
export interface TaskCheckpoint { id: string; taskId: string; stepId?: string; name: string; summary: string; verified: boolean; evidence: unknown; auditReferences: string[]; createdAt: number; }
export interface TaskArtifact { id: string; taskId: string; stepId?: string; kind: string; path?: string; uri?: string; sha256?: string; size?: number; verifiedAt?: number; metadata?: unknown; createdAt: number; }
export interface TaskExternalReference { id: string; taskId: string; stepId?: string; type: 'pull-request' | 'release' | 'workflow-run' | 'asset' | 'process' | 'url' | 'other'; provider?: string; externalId: string; url?: string; state?: string; metadata?: unknown; verifiedAt?: number; createdAt: number; updatedAt: number; }
export interface TaskApproval { id: string; taskId: string; stepId: string; toolRequestId?: string; decision: 'pending' | 'run-once' | 'session' | 'rejected' | 'expired' | 'consumed'; scope: string; requestedAt: number; decidedAt?: number; expiresAt?: number; auditReference?: string; }
export interface TaskEvent { id: string; taskId: string; stepId?: string; type: TaskEventType; summary: string; details?: unknown; auditReference?: string; createdAt: number; }
export interface Task {
  id: string; workspaceId: string; title: string; description?: string; taskType: string; status: TaskStatus; priority: 'low' | 'medium' | 'high';
  currentStepId?: string; createdAt: number; updatedAt: number; startedAt?: number; completedAt?: number; originatingConversationId?: string;
  lastActiveConversationId?: string; assignedProvider?: string; assignedModel?: string; progressSummary: string; retryMetadata?: unknown;
  interruptionReason?: string; resumabilityState: TaskResumabilityState; resumeInstructions: string; associatedBranch?: string; associatedCommitSha?: string;
  associatedPullRequest?: string; associatedReleaseTag?: string; associatedWorkflowRun?: string; processIds: number[]; externalResourceIds: string[];
  steps: TaskStep[]; taskDependencies: string[]; checkpoints: TaskCheckpoint[]; artifacts: TaskArtifact[]; externalReferences: TaskExternalReference[];
  approvals: TaskApproval[]; events: TaskEvent[];
}
export interface TaskStepDraft { id?: string; name: string; purpose: string; riskTier: 0 | 1 | 2; requiredTool?: string; expectedInput?: unknown; expectedOutput?: unknown; retryPolicy?: Partial<TaskRetryPolicy>; timeoutMs?: number; artifactPaths?: string[]; verificationCriteria: string[]; rollbackInstructions?: string; dependencies?: string[]; }
export interface TaskDraft { title: string; description?: string; taskType: string; priority?: Task['priority']; originatingConversationId?: string; assignedProvider?: string; assignedModel?: string; progressSummary?: string; resumeInstructions: string; associatedBranch?: string; associatedCommitSha?: string; associatedPullRequest?: string; associatedReleaseTag?: string; associatedWorkflowRun?: string; taskDependencies?: string[]; steps: TaskStepDraft[]; }
export interface TaskRealitySnapshot { observedAt: number; workspaceId: string; git?: { branch?: string; commitSha?: string; workingTreeClean?: boolean }; processes: Array<{ pid: number; state: 'running' | 'exited' | 'missing'; exitCode?: number | null }>; stepObservations: Array<{ stepId: string; state: 'running' | 'waiting' | 'completed' | 'failed'; verified: boolean; summary: string; evidence?: unknown; error?: TaskStep['lastError']; auditReference?: string }>; }
export interface TaskHandoff { taskId: string; relativePath: string; markdown: string; generatedAt: number; }
export interface ProjectMetadata { id: string; name: string; rootPath: string; createdAt: number; updatedAt: number; goals: Goal[]; tasks: Task[]; }
export interface DashboardData { project: ProjectMetadata | null; recentCommits: GitCommit[]; contextHealth: { hasReadme: boolean; noteCount: number; codeFileCount: number }; }

export interface AppUpdateStatus {
  currentVersion: string;
  availableVersion?: string;
  state: 'idle' | 'development' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  message: string;
}

export interface AppBuildInfo {
  version: string;
  channel: 'development' | 'beta' | 'stable';
  commit: string;
  buildDate: string;
  runtime: 'packaged' | 'development';
  rendererSource: 'file:// packaged app.asar' | 'development URL' | 'file:// development build';
  platform: string;
  architecture: string;
}
export interface ForgeOsContext { platform: string; forgeOsSession: boolean; shellMode: boolean; sessionType: string; }
export interface DesktopApplication { id: string; name: string; description: string; icon?: string; executable: string; arguments: string[]; categories: string[]; desktopFile: string; terminal: boolean; hidden: boolean; noDisplay: boolean; }
export interface SystemOverview { hostname: string; os: string; kernel: string; cpu: string; memoryBytes: number; storage: { totalBytes: number; freeBytes: number }; forgeVersion: string; forgeOsVersion: string; sessionType: string; }

export function buildReleaseIdentity(baseVersion: string, packaged: boolean): Pick<AppBuildInfo, 'version' | 'channel'> {
  if (!packaged) return { version: `${baseVersion}-dev`, channel: 'development' };
  return { version: baseVersion, channel: baseVersion.includes('-') ? 'beta' : 'stable' };
}

export function normalizeUpdateChannel(value: unknown): 'stable' | 'beta' {
  return value === 'beta' || value === 'preview' ? 'beta' : 'stable';
}

export function buildUpdatePolicy(channel: 'stable' | 'beta'): { allowPrerelease: boolean; allowDowngrade: false } {
  return { allowPrerelease: channel === 'beta', allowDowngrade: false };
}

export function isUpdateVersionEligible(currentVersion: string, candidateVersion: string, channel: 'stable' | 'beta'): boolean {
  if (!valid(currentVersion) || !valid(candidateVersion) || !gt(candidateVersion, currentVersion)) return false;
  const identifiers = prerelease(candidateVersion);
  if (identifiers === null) return true;
  return channel === 'beta' && typeof identifiers[0] === 'string' && ['beta', 'rc'].includes(identifiers[0]);
}

export function formatAppBuildInfo(info: AppBuildInfo): string {
  return [
    `FORGE v${info.version}`,
    `Channel: ${info.channel}`,
    `Commit: ${info.commit}`,
    `Build date: ${info.buildDate}`,
    `Runtime: ${info.runtime}`,
    `Renderer: ${info.rendererSource}`,
    `Platform: ${info.platform} ${info.architecture}`
  ].join('\n');
}

export interface UserSettings {
  apiBaseUrl: string;
  apiModel: string;
  apiKeyConfigured: boolean;
  githubUsername: string;
  githubTokenConfigured: boolean;
  secureStorageAvailable: boolean;
  webResearchEnabled: boolean;
  updateChannel: 'stable' | 'beta';
}

export interface SettingsSaveRequest {
  apiBaseUrl: string;
  apiModel: string;
  apiKey?: string;
  clearApiKey?: boolean;
  githubUsername: string;
  githubToken?: string;
  clearGithubToken?: boolean;
  webResearchEnabled: boolean;
  updateChannel: 'stable' | 'beta';
}

export interface ToolRequestView {
  id: string; workspaceId: string; conversationId: string; modelId: string; toolName: string; input: unknown;
  reason: string; target: string; workingDirectory?: string; expectedEffect: string;
  predictedAffectedPaths: string[]; networkAccess: boolean; externalDataDescription?: string; diff?: string;
  approvalRequired: boolean; sessionApprovalAvailable: boolean;
  state: 'pending' | 'approved' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'cancelled';
  requestedAt: number; updatedAt: number;
}
export interface ToolResultView { requestId: string; toolName: string; success: boolean; output?: unknown; affectedPaths: string[]; diff?: string; warnings: string[]; error?: { code: string; message: string; details?: string }; rollback?: { available: boolean; instructions?: string; backupPath?: string }; exitCode?: number | null; durationMs: number; truncated?: boolean; cancelled?: boolean; }
export interface ActionLogView { id: string; timestamp: number; workspaceId: string; conversationId: string; modelId: string; toolName: string; sanitizedInputs: unknown; approvalDecision: string; executionDurationMs: number; success: boolean; result: unknown; resultSummary: string; affectedPaths: string[]; exitCode?: number | null; rollback?: ToolResultView['rollback']; }
export interface TerminalSessionView { id: string; cwd: string; pid: number; state: 'running' | 'exited'; exitCode: number | null; createdAt: number; title: string; recentOutput: string; }
export interface TerminalEventView { sessionId: string; type: 'output' | 'exit'; data?: string; exitCode?: number; }
export interface BrowserTabView { id: string; url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean; error?: string; }
export interface BrowserBookmark { id: string; url: string; title: string; createdAt: number; }
export interface BrowserHistoryEntry { id: string; url: string; title: string; visitedAt: number; visitCount: number; }
export interface BrowserStateView {
  url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean; error?: string;
  activeTabId?: string; showingHome: boolean; tabs: BrowserTabView[]; bookmarks: BrowserBookmark[]; history: BrowserHistoryEntry[];
}
export interface BrowserLayoutRequest { visible: boolean; bounds?: { x: number; y: number; width: number; height: number }; }
export type RuntimeEventType = 'workspace.changed' | 'file.changed' | 'git.changed' | 'task.changed' | 'context.invalidated' | 'context.updated' | 'memory.changed' | 'tool.requested' | 'tool.completed' | 'agent.started' | 'agent.progress' | 'agent.completed' | 'agent.blocked' | 'terminal.changed' | 'github.changed';
export interface RuntimeEvent { type: RuntimeEventType; workspaceId: string; occurredAt: number; payload?: Record<string, unknown>; }

export interface ProviderModel { id: string; ownedBy?: string; }
export interface ModelLookupRequest { apiBaseUrl: string; apiKey?: string; }
export interface ModelValidationRequest extends ModelLookupRequest { apiModel: string; }
export interface ModelValidationResult { model: string; exists: boolean; availableCount: number; }

export interface WorkspaceLayout {
  explorerWidth: number;
  intelligenceWidth: number;
  bottomHeight: number;
  contextHeight: number;
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  explorerWidth: 245,
  intelligenceWidth: 360,
  bottomHeight: 240,
  contextHeight: 300
};

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ConversationEntry {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ConversationState {
  activeConversationId: string;
  threads: ConversationThread[];
  messages: ConversationEntry[];
}

export interface ContextSourceSummary {
  id: string;
  kind: string;
  title: string;
  path?: string;
  relevance?: number;
  reason?: string;
}

export interface WorkspaceKnowledgeRecord {
  id: string;
  type: string;
  title?: string | null;
  content: string;
  contentLength?: number;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceMemoryStats {
  recordCount: number;
  indexedCount: number;
  durableCount: number;
  totalContentChars: number;
  largestContentChars: number;
}

export type AgentAskRequest = { prompt: string; conversationId: string };
export interface AgentResponse {
  content: string;
  contextUsed: boolean;
  conversationId: string;
  memories?: Array<{ id: string; title?: string | null }>;
  contextSources?: ContextSourceSummary[];
}

export const IPC_CHANNELS = {
  workspaceOpen: 'workspace.open', workspaceOpenHome: 'workspace.open.home', workspaceInfo: 'workspace.info', workspaceLayoutGet: 'workspace.layout.get', workspaceLayoutSave: 'workspace.layout.save',
  fileList: 'file.list', fileRead: 'file.read', fileWrite: 'file.write', fileCreate: 'file.create', fileDelete: 'file.delete', fileRename: 'file.rename', fileCopy: 'file.copy',
  markdownParse: 'markdown.parse', gitStatus: 'git.status', gitBranches: 'git.branches', gitLog: 'git.log', gitDiff: 'git.diff', gitStage: 'git.stage', gitUnstage: 'git.unstage', gitCommit: 'git.commit', gitPull: 'git.pull', gitPush: 'git.push',
  metaDashboard: 'meta.dashboard', metaGoalCreate: 'meta.goal.create', metaTaskCreate: 'meta.task.create',
  appUpdateStatus: 'app.update.status', appUpdateCheck: 'app.update.check', appUpdateInstall: 'app.update.install', appReleaseOpen: 'app.release.open', appBuildInfo: 'app.build.info', appBuildInfoCopy: 'app.build.info.copy',
  settingsGet: 'settings.get', settingsSave: 'settings.save', settingsTestApi: 'settings.test.api', settingsTestGithub: 'settings.test.github', settingsModelsList: 'settings.models.list', settingsModelValidate: 'settings.model.validate',
  agentAsk: 'agent.ask', agentExplainProject: 'agent.explainProject', agentReviewChanges: 'agent.reviewChanges',
  agentConversationsState: 'agent.conversations.state', agentConversationsList: 'agent.conversations.list', agentConversationsAppend: 'agent.conversations.append',
  agentConversationCreate: 'agent.conversation.create', agentConversationSelect: 'agent.conversation.select', agentConversationRename: 'agent.conversation.rename', agentConversationClear: 'agent.conversation.clear', agentConversationDelete: 'agent.conversation.delete', agentConversationsClearAll: 'agent.conversations.clearAll',
  agentMemoriesList: 'agent.memories.list', agentMemoriesStats: 'agent.memories.stats', agentMemoriesDelete: 'agent.memories.delete', agentMemoriesClear: 'agent.memories.clear', agentMemoriesReindex: 'agent.memories.reindex'
  , toolRequestsList: 'tool.requests.list', toolRequestApprove: 'tool.request.approve', toolRequestReject: 'tool.request.reject', toolRequestCancel: 'tool.request.cancel', toolActionsList: 'tool.actions.list', editorDirtyUpdate: 'editor.dirty.update',
  terminalCreate: 'terminal.create', terminalList: 'terminal.list', terminalInput: 'terminal.input', terminalResize: 'terminal.resize', terminalTerminate: 'terminal.terminate', terminalRestart: 'terminal.restart', terminalRemove: 'terminal.remove',
  tasksList: 'tasks.list', tasksGet: 'tasks.get', tasksCreate: 'tasks.create', tasksCreateRelease: 'tasks.create.release', tasksResume: 'tasks.resume', tasksPause: 'tasks.pause', tasksCancel: 'tasks.cancel', tasksDelete: 'tasks.delete', tasksRetryStep: 'tasks.retry.step', tasksHandoff: 'tasks.handoff',
  browserNavigate: 'browser.navigate', browserLayout: 'browser.layout', browserBack: 'browser.back', browserForward: 'browser.forward', browserReload: 'browser.reload',
  browserHome: 'browser.home', browserTabClose: 'browser.tab.close', browserTabSelect: 'browser.tab.select', browserBookmarkAdd: 'browser.bookmark.add', browserBookmarkRemove: 'browser.bookmark.remove',
  forgeOsContext: 'forge-os.context', forgeOsApplications: 'forge-os.applications', forgeOsApplicationLaunch: 'forge-os.application.launch', forgeOsOverview: 'forge-os.overview', forgeOsSessionAction: 'forge-os.session.action'
} as const;

export interface IPCRequestMap {
  'workspace.open': undefined; 'workspace.open.home': undefined; 'workspace.info': undefined; 'workspace.layout.get': undefined; 'workspace.layout.save': WorkspaceLayout;
  'file.list': { path?: string; recursive?: boolean }; 'file.read': { path: string }; 'file.write': { path: string; content: string }; 'file.create': { path: string; type: 'file' | 'directory'; content?: string }; 'file.delete': { path: string }; 'file.rename': { oldPath: string; newPath: string }; 'file.copy': FileCopyRequest;
  'markdown.parse': { path: string }; 'git.status': undefined; 'git.branches': undefined; 'git.log': { limit?: number }; 'git.diff': { staged: boolean }; 'git.stage': { files: string[] }; 'git.unstage': { files: string[] }; 'git.commit': { message: string; files?: string[] }; 'git.pull': undefined; 'git.push': undefined;
  'meta.dashboard': undefined; 'meta.goal.create': { title: string; description?: string }; 'meta.task.create': { title: string; description?: string; priority?: Task['priority'] };
  'app.update.status': undefined; 'app.update.check': undefined; 'app.update.install': undefined; 'app.release.open': undefined; 'app.build.info': undefined; 'app.build.info.copy': undefined;
  'settings.get': undefined; 'settings.save': SettingsSaveRequest; 'settings.test.api': undefined; 'settings.test.github': undefined; 'settings.models.list': ModelLookupRequest; 'settings.model.validate': ModelValidationRequest;
  'agent.ask': AgentAskRequest; 'agent.explainProject': { conversationId?: string } | undefined; 'agent.reviewChanges': { conversationId?: string } | undefined;
  'agent.conversations.state': { conversationId?: string } | undefined; 'agent.conversations.list': { conversationId?: string } | undefined; 'agent.conversations.append': { conversationId?: string; entries: Array<{ role: ConversationEntry['role']; content: string }> };
  'agent.conversation.create': { title?: string }; 'agent.conversation.select': { conversationId: string }; 'agent.conversation.rename': { conversationId: string; title: string }; 'agent.conversation.clear': { conversationId: string }; 'agent.conversation.delete': { conversationId: string }; 'agent.conversations.clearAll': undefined;
  'agent.memories.list': undefined; 'agent.memories.stats': undefined; 'agent.memories.delete': { id: string }; 'agent.memories.clear': undefined; 'agent.memories.reindex': undefined;
  'tool.requests.list': undefined; 'tool.request.approve': { requestId: string; choice: 'run-once' | 'session' }; 'tool.request.reject': { requestId: string }; 'tool.request.cancel': { requestId: string };
  'tool.actions.list': { conversationId?: string; toolName?: string; success?: boolean; from?: number; to?: number } | undefined; 'editor.dirty.update': { paths: string[] };
  'browser.navigate': { url: string }; 'browser.layout': BrowserLayoutRequest; 'browser.back': undefined; 'browser.forward': undefined; 'browser.reload': undefined;
  'browser.home': undefined; 'browser.tab.close': { tabId: string }; 'browser.tab.select': { tabId: string }; 'browser.bookmark.add': undefined; 'browser.bookmark.remove': { bookmarkId: string };
  'forge-os.context': undefined; 'forge-os.applications': undefined; 'forge-os.application.launch': { id: string }; 'forge-os.overview': undefined; 'forge-os.session.action': { action: 'lock' | 'logout' | 'restart' | 'shutdown' };
  'terminal.create': { workingDirectory?: string; columns?: number; rows?: number }; 'terminal.list': undefined; 'terminal.input': { sessionId: string; data: string }; 'terminal.resize': { sessionId: string; columns: number; rows: number }; 'terminal.terminate': { sessionId: string }; 'terminal.restart': { sessionId: string }; 'terminal.remove': { sessionId: string };
  'tasks.list': undefined; 'tasks.get': { taskId: string }; 'tasks.create': TaskDraft; 'tasks.create.release': { version: string; originatingConversationId?: string }; 'tasks.resume': { taskId: string }; 'tasks.pause': { taskId: string; reason: string }; 'tasks.cancel': { taskId: string; reason: string; trackingOnly: boolean }; 'tasks.delete': { taskId: string }; 'tasks.retry.step': { taskId: string; stepId: string }; 'tasks.handoff': { taskId: string };
}

export interface IPCResponseMap {
  'workspace.open': WorkspaceInfo; 'workspace.open.home': WorkspaceInfo; 'workspace.info': WorkspaceInfo | null; 'workspace.layout.get': WorkspaceLayout; 'workspace.layout.save': WorkspaceLayout;
  'file.list': FileNode[]; 'file.read': FileContent; 'file.write': FileContent; 'file.create': FileNode; 'file.delete': void; 'file.rename': FileNode; 'file.copy': FileNode;
  'markdown.parse': ParsedMarkdown; 'git.status': GitStatus; 'git.branches': GitBranch[]; 'git.log': GitCommit[]; 'git.diff': GitDiff; 'git.stage': void; 'git.unstage': void; 'git.commit': GitCommit; 'git.pull': void; 'git.push': void;
  'meta.dashboard': DashboardData; 'meta.goal.create': Goal; 'meta.task.create': Task;
  'app.update.status': AppUpdateStatus; 'app.update.check': AppUpdateStatus; 'app.update.install': void; 'app.release.open': void; 'app.build.info': AppBuildInfo; 'app.build.info.copy': AppBuildInfo;
  'settings.get': UserSettings; 'settings.save': UserSettings; 'settings.test.api': ModelValidationResult; 'settings.test.github': { login: string }; 'settings.models.list': ProviderModel[]; 'settings.model.validate': ModelValidationResult;
  'agent.ask': AgentResponse; 'agent.explainProject': AgentResponse; 'agent.reviewChanges': AgentResponse;
  'agent.conversations.state': ConversationState; 'agent.conversations.list': ConversationEntry[]; 'agent.conversations.append': void;
  'agent.conversation.create': ConversationState; 'agent.conversation.select': ConversationState; 'agent.conversation.rename': ConversationState; 'agent.conversation.clear': ConversationState; 'agent.conversation.delete': ConversationState; 'agent.conversations.clearAll': ConversationState;
  'agent.memories.list': WorkspaceKnowledgeRecord[]; 'agent.memories.stats': WorkspaceMemoryStats; 'agent.memories.delete': void; 'agent.memories.clear': { deleted: number }; 'agent.memories.reindex': void;
  'tool.requests.list': ToolRequestView[]; 'tool.request.approve': ToolResultView; 'tool.request.reject': void; 'tool.request.cancel': boolean; 'tool.actions.list': ActionLogView[]; 'editor.dirty.update': void;
  'browser.navigate': BrowserStateView; 'browser.layout': BrowserStateView; 'browser.back': BrowserStateView; 'browser.forward': BrowserStateView; 'browser.reload': BrowserStateView;
  'browser.home': BrowserStateView; 'browser.tab.close': BrowserStateView; 'browser.tab.select': BrowserStateView; 'browser.bookmark.add': BrowserStateView; 'browser.bookmark.remove': BrowserStateView;
  'forge-os.context': ForgeOsContext; 'forge-os.applications': DesktopApplication[]; 'forge-os.application.launch': undefined; 'forge-os.overview': SystemOverview; 'forge-os.session.action': undefined;
  'terminal.create': TerminalSessionView; 'terminal.list': TerminalSessionView[]; 'terminal.input': void; 'terminal.resize': void; 'terminal.terminate': void; 'terminal.restart': TerminalSessionView; 'terminal.remove': void;
  'tasks.list': Task[]; 'tasks.get': Task; 'tasks.create': Task; 'tasks.create.release': Task; 'tasks.resume': Task; 'tasks.pause': Task; 'tasks.cancel': Task; 'tasks.delete': void; 'tasks.retry.step': Task; 'tasks.handoff': TaskHandoff;
}

export type IPCChannel = keyof IPCRequestMap;
export type ForgeAPI = { invoke<C extends IPCChannel>(channel: C, request: IPCRequestMap[C]): Promise<IPCResult<IPCResponseMap[C]>>; onTerminalEvent(listener: (event: TerminalEventView) => void): () => void; onBrowserState(listener: (state: BrowserStateView) => void): () => void; onRuntimeEvent(listener: (event: RuntimeEvent) => void): () => void };
