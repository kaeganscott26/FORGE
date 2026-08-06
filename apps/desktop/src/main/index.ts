import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { IPC_CHANNELS, type IPCChannel, type IPCRequestMap, type IPCResponseMap, type IPCResult } from '@forge/ipc';
import { WorkspaceService } from '@forge/workspace';
import { GitService } from '@forge/git';
import { StorageService } from '@forge/storage';
import { OpenAIProvider, ContextBuilderImpl, Agent, type AgentMessage } from '@forge/ai';
import { MemoryService, MemoryRetriever, MemoryIndexer } from '@forge/memory';
import { UpdaterService } from './updater';
import { SettingsService } from './settings';

const workspace = new WorkspaceService();
const settings = new SettingsService();
const git = new GitService(() => settings.githubCredentials());
const storage = new StorageService();
const updater = new UpdaterService();

// AI/core instances (provider-agnostic wiring)
const aiProvider = new OpenAIProvider();
const contextBuilder = new ContextBuilderImpl(workspace, git, storage);
const memoryService = new MemoryService(storage as any);
const memoryRetriever = new MemoryRetriever(memoryService as any);
const memoryIndexer = new MemoryIndexer(memoryService as any, workspace as any);
const agent = new Agent(aiProvider as any, contextBuilder as any, memoryRetriever as any);

async function applyAISettings(): Promise<void> {
  aiProvider.configure(await settings.apiConfiguration());
}

function register<C extends IPCChannel>(channel: C, action: (request: IPCRequestMap[C]) => Promise<IPCResponseMap[C]>): void {
  ipcMain.handle(channel, async (_event, request: IPCRequestMap[C]): Promise<IPCResult<IPCResponseMap[C]>> => {
    try { return { success: true, data: await action(request) }; }
    catch (error) { return { success: false, error: { message: error instanceof Error ? error.message : 'An unexpected error occurred.' } }; }
  });
}

function registerHandlers(): void {
  register(IPC_CHANNELS.workspaceOpen, async () => { const selection = await dialog.showOpenDialog({ title: 'Open Forge workspace', properties: ['openDirectory', 'createDirectory'] }); if (selection.canceled || !selection.filePaths[0]) throw new Error('Workspace selection was cancelled.'); await storage.close(); const info = await workspace.open(selection.filePaths[0]); await git.init(info.rootPath); await storage.init(info.rootPath); return info; });
  register(IPC_CHANNELS.workspaceInfo, async () => workspace.info());
  register(IPC_CHANNELS.workspaceLayoutGet, async () => storage.getWorkspaceLayout());
  register(IPC_CHANNELS.workspaceLayoutSave, async (request) => storage.saveWorkspaceLayout(request));
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
  register(IPC_CHANNELS.appUpdateStatus, async () => updater.status());
  register(IPC_CHANNELS.appUpdateCheck, async () => updater.check());
  register(IPC_CHANNELS.appUpdateInstall, async () => updater.install());
  register(IPC_CHANNELS.appReleaseOpen, async () => updater.openLatestRelease());
  register(IPC_CHANNELS.settingsGet, async () => settings.publicSettings());
  register(IPC_CHANNELS.settingsSave, async (request) => { const result = await settings.save(request); await applyAISettings(); return result; });
  register(IPC_CHANNELS.settingsTestApi, async () => aiProvider.testConnection());
  register(IPC_CHANNELS.settingsModelsList, async (request) => {
    const configuration = await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl });
    return new OpenAIProvider(configuration).listModels();
  });
  register(IPC_CHANNELS.settingsModelValidate, async (request) => {
    const configuration = await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl, model: request.apiModel });
    return new OpenAIProvider(configuration).validateModel(request.apiModel);
  });
  register(IPC_CHANNELS.settingsTestGithub, async () => settings.testGitHub());
  const resolveConversation = async (conversationId?: string) => storage.conversationState(conversationId);
  const historyFor = async (conversationId: string): Promise<AgentMessage[]> => (await storage.listConversationMessages(conversationId))
    .map((entry) => ({ role: entry.role, content: entry.content }));
  const runAgentTurn = async (conversationId: string, prompt: string) => {
    const state = await resolveConversation(conversationId);
    const history = await historyFor(state.activeConversationId);
    await storage.appendConversation(state.activeConversationId, 'user', prompt);
    const turn = await agent.askWithContext(prompt, history);
    await storage.appendConversation(state.activeConversationId, 'assistant', turn.content);
    return {
      content: turn.content,
      contextUsed: turn.context.artifacts.length > 0,
      conversationId: state.activeConversationId,
      memories: turn.memories.map((memory) => ({ id: memory.id, title: memory.title })),
      contextSources: turn.context.artifacts.map((artifact) => ({ id: artifact.id, kind: artifact.kind, title: artifact.title, path: artifact.path }))
    };
  };
  register(IPC_CHANNELS.agentAsk, async (request) => {
    if (!request.prompt.trim()) throw new Error('A prompt is required.');
    return runAgentTurn(request.conversationId, request.prompt.trim());
  });
  register(IPC_CHANNELS.agentExplainProject, async (request) => {
    const state = await resolveConversation(request?.conversationId);
    return runAgentTurn(state.activeConversationId, 'Explain this repository as an evidence-grounded architecture summary.');
  });
  register(IPC_CHANNELS.agentReviewChanges, async (request) => {
    const state = await resolveConversation(request?.conversationId);
    return runAgentTurn(state.activeConversationId, 'Review the current repository changes against its documented architecture and project goals.');
  });
  register(IPC_CHANNELS.agentConversationsState, async (request) => storage.conversationState(request?.conversationId));
  register(IPC_CHANNELS.agentConversationsList, async (request) => {
    const state = await storage.conversationState(request?.conversationId);
    return state.messages;
  });
  register(IPC_CHANNELS.agentConversationsAppend, async (request) => {
    const state = await storage.conversationState(request.conversationId);
    for (const entry of request.entries) {
      await storage.appendConversation(state.activeConversationId, entry.role, entry.content);
    }
    return undefined;
  });
  register(IPC_CHANNELS.agentConversationCreate, async (request) => storage.createConversation(request.title));
  register(IPC_CHANNELS.agentConversationSelect, async (request) => storage.selectConversation(request.conversationId));
  register(IPC_CHANNELS.agentConversationRename, async (request) => storage.renameConversation(request.conversationId, request.title));
  register(IPC_CHANNELS.agentConversationClear, async (request) => storage.clearConversation(request.conversationId));
  // Memories IPC
  register(IPC_CHANNELS.agentMemoriesList, async () => {
    return (await storage.listMemories()) as any;
  });
  register(IPC_CHANNELS.agentMemoriesDelete, async (request) => {
    if (!request.id) throw new Error('Memory id required'); await storage.deleteMemory(request.id); return undefined;
  });
  register(IPC_CHANNELS.agentMemoriesReindex, async () => {
    await memoryIndexer.indexWorkspaceFiles(); return undefined;
  });
}

import { existsSync } from 'node:fs';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: 'Forge',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.on('ready-to-show', () => window.show());

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const rendererIndex = join(__dirname, '../renderer/src/renderer/index.html');
    const fallbackIndex = join(__dirname, '../renderer/index.html');
    window.loadFile(existsSync(rendererIndex) ? rendererIndex : fallbackIndex);
  }
}

app.setName('FORGE');
app.whenReady().then(() => {
  const developmentIcon = join(process.cwd(), 'apps/desktop/resources/ForgeIcon-1024.png');
  if (process.platform === 'darwin' && is.dev && app.dock && existsSync(developmentIcon)) app.dock.setIcon(developmentIcon);
  settings.init().then(async () => {
    await applyAISettings();
    registerHandlers();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch((error) => {
    dialog.showErrorBox('FORGE could not start', error instanceof Error ? error.message : String(error));
    app.quit();
  });
});
app.on('window-all-closed', async () => { await storage.close(); if (process.platform !== 'darwin') app.quit(); });
