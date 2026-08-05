import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { IPC_CHANNELS, type IPCChannel, type IPCRequestMap, type IPCResponseMap, type IPCResult } from '@forge/ipc';
import { WorkspaceService } from '@forge/workspace';
import { GitService } from '@forge/git';
import { StorageService } from '@forge/storage';
import { OpenAIProvider, ContextBuilderImpl, Agent } from '@forge/ai';

const workspace = new WorkspaceService();
const git = new GitService();
const storage = new StorageService();

// AI/core instances (provider-agnostic wiring)
const aiProvider = new OpenAIProvider();
const contextBuilder = new ContextBuilderImpl(workspace, git, storage);
const agent = new Agent(aiProvider as any, contextBuilder as any);

function register<C extends IPCChannel>(channel: C, action: (request: IPCRequestMap[C]) => Promise<IPCResponseMap[C]>): void {
  ipcMain.handle(channel, async (_event, request: IPCRequestMap[C]): Promise<IPCResult<IPCResponseMap[C]>> => {
    try { return { success: true, data: await action(request) }; }
    catch (error) { return { success: false, error: { message: error instanceof Error ? error.message : 'An unexpected error occurred.' } }; }
  });
}

function registerHandlers(): void {
  register(IPC_CHANNELS.workspaceOpen, async () => { const selection = await dialog.showOpenDialog({ title: 'Open Forge workspace', properties: ['openDirectory', 'createDirectory'] }); if (selection.canceled || !selection.filePaths[0]) throw new Error('Workspace selection was cancelled.'); await storage.close(); const info = await workspace.open(selection.filePaths[0]); await git.init(info.rootPath); await storage.init(info.rootPath); return info; });
  register(IPC_CHANNELS.workspaceInfo, async () => workspace.info());
  register(IPC_CHANNELS.fileList, async (request) => workspace.list(request?.path));
  register(IPC_CHANNELS.fileRead, async (request) => workspace.readFile(request.path));
  register(IPC_CHANNELS.fileWrite, async (request) => workspace.writeFile(request.path, request.content));
  register(IPC_CHANNELS.fileCreate, async (request) => workspace.create(request.path, request.type, request.content));
  register(IPC_CHANNELS.fileDelete, async (request) => workspace.delete(request.path));
  register(IPC_CHANNELS.fileRename, async (request) => workspace.rename(request.oldPath, request.newPath));
  register(IPC_CHANNELS.markdownParse, async (request) => workspace.parse(request.path));
  register(IPC_CHANNELS.gitStatus, async () => git.status()); register(IPC_CHANNELS.gitBranches, async () => git.branches()); register(IPC_CHANNELS.gitLog, async (request) => git.log(request?.limit)); register(IPC_CHANNELS.gitDiff, async (request) => git.diff(request.staged)); register(IPC_CHANNELS.gitStage, async (request) => git.stage(request.files)); register(IPC_CHANNELS.gitUnstage, async (request) => git.unstage(request.files)); register(IPC_CHANNELS.gitCommit, async (request) => git.commit(request.message, request.files)); register(IPC_CHANNELS.gitPull, async () => git.pull()); register(IPC_CHANNELS.gitPush, async () => git.push());
  register(IPC_CHANNELS.metaDashboard, async () => { const project = await storage.dashboard(); const files = await workspace.list(); const all = (nodes: typeof files): typeof files => nodes.flatMap((node) => [node, ...(node.children ? all(node.children) : [])]); const flattened = all(files); return { project, recentCommits: await git.log(8).catch(() => []), contextHealth: { score: project ? (flattened.some((file) => /^readme\.md$/i.test(file.name)) ? 65 : 35) : 0, hasReadme: flattened.some((file) => /^readme\.md$/i.test(file.name)), noteCount: flattened.filter((file) => file.extension === 'md').length, codeFileCount: flattened.filter((file) => ['ts', 'tsx', 'js', 'jsx', 'py', 'cpp', 'c'].includes(file.extension ?? '')).length } }; });
  register(IPC_CHANNELS.metaGoalCreate, async (request) => storage.createGoal(request.title, request.description)); register(IPC_CHANNELS.metaTaskCreate, async (request) => storage.createTask(request.title, request.description, request.priority));
  // Agent IPC handlers
  register(IPC_CHANNELS.agentAsk, async (request) => {
    if (!request || typeof (request as any).prompt !== 'string') throw new Error('Invalid agent.ask request');
    const resp = await agent.ask((request as any).prompt);
    return { content: String(resp), contextUsed: true };
  });
  register(IPC_CHANNELS.agentExplainProject, async () => {
    const resp = await agent.explainProject();
    return { content: String(resp), contextUsed: true };
  });
  register(IPC_CHANNELS.agentReviewChanges, async () => {
    const resp = await agent.reviewChanges();
    return { content: String(resp), contextUsed: true };
  });
}

function createWindow(): void { const window = new BrowserWindow({ width: 1500, height: 950, minWidth: 1100, minHeight: 700, show: false, title: 'Forge', webPreferences: { preload: join(__dirname, '../preload/index.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: false } }); window.on('ready-to-show', () => window.show()); if (is.dev && process.env.ELECTRON_RENDERER_URL) window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/src/renderer/index.html`); else window.loadFile(join(__dirname, '../renderer/src/renderer/index.html')); }
app.whenReady().then(() => { registerHandlers(); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', async () => { await storage.close(); if (process.platform !== 'darwin') app.quit(); });
