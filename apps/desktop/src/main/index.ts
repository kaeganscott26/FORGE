import { app, BrowserWindow, clipboard, dialog, ipcMain, WebContentsView } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { is } from '@electron-toolkit/utils';
import { buildReleaseIdentity, formatAppBuildInfo, IPC_CHANNELS, type AppBuildInfo, type IPCChannel, type IPCRequestMap, type IPCResponseMap, type IPCResult, type RuntimeEventType } from '@forge/ipc';
import { WorkspaceService } from '@forge/workspace';
import { GitHubService, GitService } from '@forge/git';
import { StorageService } from '@forge/storage';
import { OpenAIProvider, Agent } from '@forge/ai';
import { WorkspaceContextEngine, WorkspaceIntelligenceService } from '@forge/intelligence';
import { MemoryService, MemoryRetriever, MemoryIndexer } from '@forge/memory';
import { UpdaterService } from './updater';
import { SettingsService } from './settings';
import { ToolRouter } from '@forge/agent-tools';
import { ShellService, TerminalService } from '@forge/shell';
import { validateExternalUrl, WebService } from '@forge/web';
import { TaskRuntime } from '@forge/tasks';
import { createNativeAgentRuntime } from './native-agent-runtime';

declare const __FORGE_BUILD_COMMIT__: string;
declare const __FORGE_BUILD_DATE__: string;

const workspace = new WorkspaceService();
const settings = new SettingsService();
const git = new GitService(() => settings.githubCredentials());
const github = new GitHubService(() => git.originUrl(), async () => {
  const credentials = await settings.githubCredentials();
  return credentials ? { token: credentials.token } : null;
});
const storage = new StorageService();
const updater = new UpdaterService();
const dirtyEditorPaths = new Set<string>();
const shellService = new ShellService(() => workspace.info()?.rootPath ?? null);
const webService = new WebService(() => settings.webResearchEnabled());
const terminalService = new TerminalService(() => workspace.info()?.rootPath ?? null, (event) => {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('terminal.event', event);
});
const taskRuntime = new TaskRuntime({ storage, workspaceRoot: () => workspace.info()?.rootPath ?? null, git, shell: shellService });
const toolRouter = new ToolRouter({ git, github, shell: shellService, terminal: terminalService, tasks: taskRuntime, web: webService, audit: storage, dirtyPaths: () => dirtyEditorPaths });
let mainWindow: BrowserWindow | null = null;
let browserView: WebContentsView | null = null;
let rendererSource: AppBuildInfo['rendererSource'] = 'file:// development build';

function appBuildInfo(): AppBuildInfo {
  return {
    ...buildReleaseIdentity(app.getVersion(), app.isPackaged),
    commit: __FORGE_BUILD_COMMIT__, buildDate: __FORGE_BUILD_DATE__,
    runtime: app.isPackaged ? 'packaged' : 'development', rendererSource,
    platform: process.platform, architecture: process.arch
  };
}

const aiProvider = new OpenAIProvider();
const contextBuilder = new WorkspaceContextEngine(workspace, git, storage);
const intelligence = new WorkspaceIntelligenceService(contextBuilder, storage);
const memoryService = new MemoryService(storage as any);
const memoryRetriever = new MemoryRetriever(memoryService as any);
const memoryIndexer = new MemoryIndexer(memoryService as any, workspace as any);
const agent = new Agent(aiProvider as any, intelligence as any, memoryRetriever as any);

async function applyAISettings(): Promise<void> { aiProvider.configure(await settings.apiConfiguration()); }

async function emitRuntimeEvent(type: RuntimeEventType, payload?: Record<string, unknown>): Promise<void> {
  if (type === 'context.invalidated') await intelligence.invalidate(String(payload?.channel ?? 'runtime-event'), payload);
  const workspaceId = (await storage.dashboard().catch(() => null))?.id;
  if (!workspaceId) return;
  const event = { type, workspaceId, occurredAt: Date.now(), payload };
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('runtime.event', event);
}

function eventForChannel(channel: IPCChannel): RuntimeEventType | null {
  if (['file.write', 'file.create', 'file.delete', 'file.rename', 'file.copy'].includes(channel)) return 'file.changed';
  if (['git.stage', 'git.unstage', 'git.commit', 'git.pull', 'git.push'].includes(channel)) return 'git.changed';
  if (channel.startsWith('tasks.')) return 'task.changed';
  if (channel.startsWith('agent.memories')) return 'memory.changed';
  if (channel.startsWith('terminal.')) return 'terminal.changed';
  if (channel === IPC_CHANNELS.workspaceOpen) return 'workspace.changed';
  return null;
}

function register<C extends IPCChannel>(channel: C, action: (request: IPCRequestMap[C]) => Promise<IPCResponseMap[C]>): void {
  ipcMain.handle(channel, async (_event, request: IPCRequestMap[C]): Promise<IPCResult<IPCResponseMap[C]>> => {
    try {
      const data = await action(request);
      const event = eventForChannel(channel);
      if (event) { await emitRuntimeEvent(event, { channel }); await emitRuntimeEvent('context.invalidated', { channel }); }
      return { success: true, data };
    }
    catch (error) { return { success: false, error: { message: error instanceof Error ? error.message : 'An unexpected error occurred.' } }; }
  });
}

async function openWorkspaceAt(rootPath: string): Promise<NonNullable<ReturnType<WorkspaceService['info']>>> {
  terminalService.dispose(); dirtyEditorPaths.clear(); await storage.close();
  const info = await workspace.open(rootPath);
  await git.init(info.rootPath);
  await storage.init(info.rootPath);
  return info;
}

function browserState(): { url: string; title: string; canGoBack: boolean; canGoForward: boolean } {
  const contents = browserView?.webContents;
  return { url: contents?.getURL() ?? '', title: contents?.getTitle() ?? '', canGoBack: contents?.canGoBack() ?? false, canGoForward: contents?.canGoForward() ?? false };
}

function ensureBrowserView(): WebContentsView {
  if (browserView && !browserView.webContents.isDestroyed()) return browserView;
  browserView = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  browserView.setBackgroundColor('#0d1116');
  browserView.webContents.setWindowOpenHandler(({ url }) => { void navigateBrowser(url); return { action: 'deny' }; });
  browserView.webContents.on('will-navigate', (event, url) => { event.preventDefault(); void navigateBrowser(url); });
  browserView.webContents.on('did-navigate', () => mainWindow?.webContents.send('browser.state', browserState()));
  browserView.webContents.on('did-navigate-in-page', () => mainWindow?.webContents.send('browser.state', browserState()));
  mainWindow?.contentView.addChildView(browserView);
  return browserView;
}

async function navigateBrowser(value: string): Promise<{ url: string; title: string; canGoBack: boolean; canGoForward: boolean }> {
  const url = (await validateExternalUrl(value)).toString();
  const view = ensureBrowserView();
  await view.webContents.loadURL(url);
  return browserState();
}

function setBrowserLayout(request: { visible: boolean; bounds?: { x: number; y: number; width: number; height: number } }): void {
  if (!browserView || browserView.webContents.isDestroyed()) return;
  browserView.setVisible(request.visible);
  if (request.visible && request.bounds) {
    const { x, y, width, height } = request.bounds;
    browserView.setBounds({ x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) });
  }
}

function registerHandlers(): void {
  register(IPC_CHANNELS.workspaceOpen, async () => {
    const selection = await dialog.showOpenDialog({ title: 'Open Forge workspace', properties: ['openDirectory', 'createDirectory'] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error('Workspace selection was cancelled.');
    return openWorkspaceAt(selection.filePaths[0]);
  });
  register(IPC_CHANNELS.workspaceInfo, async () => workspace.info());
  register(IPC_CHANNELS.workspaceLayoutGet, async () => storage.getWorkspaceLayout());
  register(IPC_CHANNELS.workspaceLayoutSave, async (request) => storage.saveWorkspaceLayout(request));
  register(IPC_CHANNELS.fileList, async (request) => workspace.list(request?.path));
  register(IPC_CHANNELS.fileRead, async (request) => workspace.readFile(request.path));
  register(IPC_CHANNELS.fileWrite, async (request) => workspace.writeFile(request.path, request.content));
  register(IPC_CHANNELS.fileCreate, async (request) => workspace.create(request.path, request.type, request.content));
  register(IPC_CHANNELS.fileDelete, async (request) => workspace.delete(request.path));
  register(IPC_CHANNELS.fileRename, async (request) => workspace.rename(request.oldPath, request.newPath));
  register(IPC_CHANNELS.fileCopy, async (request) => workspace.copy(request.sourcePath, request.destinationPath));
  register(IPC_CHANNELS.markdownParse, async (request) => workspace.parse(request.path));
  register(IPC_CHANNELS.gitStatus, async () => git.status());
  register(IPC_CHANNELS.gitBranches, async () => git.branches());
  register(IPC_CHANNELS.gitLog, async (request) => git.log(request?.limit));
  register(IPC_CHANNELS.gitDiff, async (request) => git.diff(request.staged));
  register(IPC_CHANNELS.gitStage, async (request) => git.stage(request.files));
  register(IPC_CHANNELS.gitUnstage, async (request) => git.unstage(request.files));
  register(IPC_CHANNELS.gitCommit, async (request) => git.commit(request.message, request.files));
  register(IPC_CHANNELS.gitPull, async () => git.pull());
  register(IPC_CHANNELS.gitPush, async () => git.push());
  register(IPC_CHANNELS.metaDashboard, async () => {
    const project = await storage.dashboard();
    const all = (nodes: any[]): any[] => nodes.flatMap((node) => [node, ...(node.children ? all(node.children) : [])]);
    const files = all(await workspace.list());
    return { project, recentCommits: await git.log(8).catch(() => []), contextHealth: { score: project ? (files.some((file) => /^readme\.md$/i.test(file.name)) ? 65 : 35) : 0, hasReadme: files.some((file) => /^readme\.md$/i.test(file.name)), noteCount: files.filter((file) => file.extension === 'md').length, codeFileCount: files.filter((file) => ['ts', 'tsx', 'js', 'jsx', 'py', 'cpp', 'c'].includes(file.extension ?? '')).length } };
  });
  register(IPC_CHANNELS.metaGoalCreate, async (request) => storage.createGoal(request.title, request.description));
  register(IPC_CHANNELS.metaTaskCreate, async (request) => storage.createTask(request.title, request.description, request.priority));
  register(IPC_CHANNELS.appUpdateStatus, async () => updater.status());
  register(IPC_CHANNELS.appUpdateCheck, async () => updater.check());
  register(IPC_CHANNELS.appUpdateInstall, async () => updater.install());
  register(IPC_CHANNELS.appReleaseOpen, async () => updater.openLatestRelease());
  register(IPC_CHANNELS.appBuildInfo, async () => appBuildInfo());
  register(IPC_CHANNELS.appBuildInfoCopy, async () => { const info = appBuildInfo(); clipboard.writeText(formatAppBuildInfo(info)); return info; });
  register(IPC_CHANNELS.settingsGet, async () => settings.publicSettings());
  register(IPC_CHANNELS.settingsSave, async (request) => { const result = await settings.save(request); await applyAISettings(); updater.setChannel(result.updateChannel); return result; });
  register(IPC_CHANNELS.settingsTestApi, async () => aiProvider.testConnection());
  register(IPC_CHANNELS.settingsModelsList, async (request) => new OpenAIProvider(await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl })).listModels());
  register(IPC_CHANNELS.settingsModelValidate, async (request) => new OpenAIProvider(await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl, model: request.apiModel })).validateModel(request.apiModel));
  register(IPC_CHANNELS.settingsTestGithub, async () => settings.testGitHub());

  const nativeAgent = createNativeAgentRuntime({ storage, workspace, agent, toolRouter, taskRuntime, settings, aiProvider, git, emitRuntimeEvent });
  register(IPC_CHANNELS.agentAsk, async (request) => { if (!request.prompt.trim()) throw new Error('A prompt is required.'); return nativeAgent.runAgentTurn(request.conversationId, request.prompt.trim()); });
  register(IPC_CHANNELS.agentExplainProject, async (request) => nativeAgent.runAgentTurn(request?.conversationId, 'Explain this repository as an evidence-grounded architecture summary.'));
  register(IPC_CHANNELS.agentReviewChanges, async (request) => nativeAgent.runAgentTurn(request?.conversationId, 'Review the current repository changes against its documented architecture and project goals.'));
  register(IPC_CHANNELS.agentConversationsState, async (request) => storage.conversationState(request?.conversationId));
  register(IPC_CHANNELS.agentConversationsList, async (request) => (await storage.conversationState(request?.conversationId)).messages);
  register(IPC_CHANNELS.agentConversationsAppend, async (request) => { const state = await storage.conversationState(request.conversationId); for (const entry of request.entries) await storage.appendConversation(state.activeConversationId, entry.role, entry.content); return undefined; });
  register(IPC_CHANNELS.agentConversationCreate, async (request) => storage.createConversation(request.title));
  register(IPC_CHANNELS.agentConversationSelect, async (request) => storage.selectConversation(request.conversationId));
  register(IPC_CHANNELS.agentConversationRename, async (request) => storage.renameConversation(request.conversationId, request.title));
  register(IPC_CHANNELS.agentConversationClear, async (request) => storage.clearConversation(request.conversationId));
  register(IPC_CHANNELS.agentMemoriesList, async () => storage.listMemories());
  register(IPC_CHANNELS.agentMemoriesDelete, async (request) => { await storage.deleteMemory(request.id); return undefined; });
  register(IPC_CHANNELS.agentMemoriesReindex, async () => { await memoryIndexer.indexWorkspaceFiles(); return undefined; });
  const toolContext = async () => {
    const project = await storage.dashboard(); const info = workspace.info(); const conversation = await storage.conversationState();
    if (!project || !info) throw new Error('Open a workspace first.');
    return { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: conversation.activeConversationId, modelId: settings.publicSettings().apiModel };
  };
  register(IPC_CHANNELS.toolRequestsList, async () => { const project = await storage.dashboard(); return project ? toolRouter.listRequests(project.id) : []; });
  register(IPC_CHANNELS.toolRequestApprove, async (request) => {
    const result = await toolRouter.approve(request.requestId, await toolContext(), request.choice);
    const approved = toolRouter.requestById(request.requestId);
    if (approved) void nativeAgent.continueAfterApproval(approved, result).catch(async (error) => emitRuntimeEvent('agent.blocked', { requestId: approved.id, message: error instanceof Error ? error.message : String(error) }));
    return result;
  });
  register(IPC_CHANNELS.toolRequestReject, async (request) => { await toolRouter.reject(request.requestId, await toolContext()); return undefined; });
  register(IPC_CHANNELS.toolRequestCancel, async (request) => toolRouter.cancel(request.requestId, await toolContext()));
  register(IPC_CHANNELS.toolActionsList, async (request) => storage.listActions(request));
  register(IPC_CHANNELS.editorDirtyUpdate, async (request) => { dirtyEditorPaths.clear(); for (const value of request.paths) if (value && !value.split(/[\\/]/).includes('..')) dirtyEditorPaths.add(value); return undefined; });
  register(IPC_CHANNELS.terminalCreate, async (request) => terminalService.create(request?.workingDirectory, request?.columns, request?.rows));
  register(IPC_CHANNELS.terminalList, async () => terminalService.list());
  register(IPC_CHANNELS.terminalInput, async (request) => { terminalService.input(request.sessionId, request.data); return undefined; });
  register(IPC_CHANNELS.terminalResize, async (request) => { terminalService.resize(request.sessionId, request.columns, request.rows); return undefined; });
  register(IPC_CHANNELS.terminalTerminate, async (request) => { terminalService.terminate(request.sessionId); return undefined; });
  register(IPC_CHANNELS.terminalRestart, async (request) => terminalService.restart(request.sessionId));
  register(IPC_CHANNELS.terminalRemove, async (request) => { terminalService.remove(request.sessionId); return undefined; });
  register(IPC_CHANNELS.tasksList, async () => taskRuntime.list());
  register(IPC_CHANNELS.tasksGet, async (request) => taskRuntime.get(request.taskId));
  register(IPC_CHANNELS.tasksCreate, async (request) => taskRuntime.create(request));
  register(IPC_CHANNELS.tasksCreateRelease, async (request) => taskRuntime.createRelease(request.version, request.originatingConversationId));
  register(IPC_CHANNELS.tasksResume, async (request) => nativeAgent.runTaskStep(request.taskId));
  register(IPC_CHANNELS.tasksPause, async (request) => taskRuntime.pause(request.taskId, request.reason));
  register(IPC_CHANNELS.tasksCancel, async (request) => taskRuntime.cancel(request.taskId, request.reason, request.trackingOnly));
  register(IPC_CHANNELS.tasksRetryStep, async (request) => { await taskRuntime.retryStep(request.taskId, request.stepId); return nativeAgent.runTaskStep(request.taskId); });
  register(IPC_CHANNELS.tasksHandoff, async (request) => taskRuntime.generateHandoff(request.taskId));
  register(IPC_CHANNELS.browserNavigate, async (request) => navigateBrowser(request.url));
  register(IPC_CHANNELS.browserLayout, async (request) => { setBrowserLayout(request); return browserState(); });
  register(IPC_CHANNELS.browserBack, async () => { if (browserView?.webContents.canGoBack()) browserView.webContents.goBack(); return browserState(); });
  register(IPC_CHANNELS.browserForward, async () => { if (browserView?.webContents.canGoForward()) browserView.webContents.goForward(); return browserState(); });
  register(IPC_CHANNELS.browserReload, async () => { browserView?.webContents.reload(); return browserState(); });
}

function createWindow(): void {
  const rendererFile = join(__dirname, '../renderer/index.html');
  const packagedRendererUrl = pathToFileURL(rendererFile).toString();
  mainWindow = new BrowserWindow({ width: 1500, height: 950, minWidth: 1100, minHeight: 700, show: false, title: 'FORGE', webPreferences: { preload: join(__dirname, '../preload/index.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { browserView = null; mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { const developmentUrl = process.env.ELECTRON_RENDERER_URL; const allowed = is.dev && developmentUrl ? new URL(url).origin === new URL(developmentUrl).origin : url === packagedRendererUrl; if (!allowed) event.preventDefault(); });
  if (is.dev && process.env.ELECTRON_RENDERER_URL) { rendererSource = 'development URL'; void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL); }
  else { rendererSource = app.isPackaged ? 'file:// packaged app.asar' : 'file:// development build'; void mainWindow.loadFile(rendererFile); }
}

app.setName('FORGE');
app.whenReady().then(async () => {
  const developmentIcon = join(process.cwd(), 'apps/desktop/resources/ForgeIcon-1024.png');
  if (process.platform === 'darwin' && is.dev && app.dock && existsSync(developmentIcon)) app.dock.setIcon(developmentIcon);
  try { await settings.init(); await applyAISettings(); updater.setChannel(settings.updateChannel()); registerHandlers(); const startupWorkspace = process.argv.find((argument) => argument.startsWith('--workspace='))?.slice('--workspace='.length); if (startupWorkspace) await openWorkspaceAt(startupWorkspace); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); }
  catch (error) { dialog.showErrorBox('FORGE could not start', error instanceof Error ? error.message : String(error)); app.quit(); }
});
app.on('window-all-closed', async () => { terminalService.dispose(); await storage.close(); if (process.platform !== 'darwin') app.quit(); });
