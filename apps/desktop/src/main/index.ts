import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { is } from '@electron-toolkit/utils';
import { buildReleaseIdentity, formatAppBuildInfo, IPC_CHANNELS, type AppBuildInfo, type IPCChannel, type IPCRequestMap, type IPCResponseMap, type IPCResult } from '@forge/ipc';
import { WorkspaceService } from '@forge/workspace';
import { GitService } from '@forge/git';
import { StorageService } from '@forge/storage';
import { OpenAIProvider, Agent, type AgentMessage } from '@forge/ai';
import { WorkspaceContextEngine } from '@forge/intelligence';
import { MemoryService, MemoryRetriever, MemoryIndexer } from '@forge/memory';
import { UpdaterService } from './updater';
import { SettingsService } from './settings';
import { boundedToolEvidence, ToolRouter, parseStructuredToolFallback, type ProviderToolCall, type ToolRequestOutcome } from '@forge/agent-tools';
import { ShellService, TerminalService } from '@forge/shell';
import { WebService } from '@forge/web';
import { TaskRuntime } from '@forge/tasks';
import { looksLikeRepeatedToolRequest, toolCallKey } from './agent-continuation';
import { taskApprovalLink, taskEvidenceLink } from './task-links';

declare const __FORGE_BUILD_COMMIT__: string;
declare const __FORGE_BUILD_DATE__: string;

const workspace = new WorkspaceService();
const settings = new SettingsService();
const git = new GitService(() => settings.githubCredentials());
const storage = new StorageService();
const updater = new UpdaterService();
const dirtyEditorPaths = new Set<string>();
const shellService = new ShellService(() => workspace.info()?.rootPath ?? null);
const webService = new WebService(() => settings.webResearchEnabled());
const terminalService = new TerminalService(() => workspace.info()?.rootPath ?? null, (event) => {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('terminal.event', event);
});
const taskRuntime = new TaskRuntime({ storage, workspaceRoot: () => workspace.info()?.rootPath ?? null, git, shell: shellService });
const toolRouter = new ToolRouter({ git, shell: shellService, terminal: terminalService, tasks: taskRuntime, web: webService, audit: storage, dirtyPaths: () => dirtyEditorPaths });
let rendererSource: AppBuildInfo['rendererSource'] = 'file:// development build';

function appBuildInfo(): AppBuildInfo {
  const identity = buildReleaseIdentity(app.getVersion(), app.isPackaged);
  return {
    ...identity,
    commit: __FORGE_BUILD_COMMIT__,
    buildDate: __FORGE_BUILD_DATE__,
    runtime: app.isPackaged ? 'packaged' : 'development',
    rendererSource,
    platform: process.platform,
    architecture: process.arch
  };
}

// FORGE intelligence is provider-neutral. The built-in provider/Agent remains a compatibility client.
const aiProvider = new OpenAIProvider();
const contextBuilder = new WorkspaceContextEngine(workspace, git, storage);
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

async function openWorkspaceAt(rootPath: string): Promise<NonNullable<ReturnType<WorkspaceService['info']>>> {
  terminalService.dispose(); dirtyEditorPaths.clear(); toolRouter.sessions.clear(); await storage.close();
  const info = await workspace.open(rootPath); await git.init(info.rootPath); await storage.init(info.rootPath); return info;
}

function registerHandlers(): void {
  register(IPC_CHANNELS.workspaceOpen, async () => { const selection = await dialog.showOpenDialog({ title: 'Open Forge workspace', properties: ['openDirectory', 'createDirectory'] }); if (selection.canceled || !selection.filePaths[0]) throw new Error('Workspace selection was cancelled.'); return openWorkspaceAt(selection.filePaths[0]); });
  register(IPC_CHANNELS.workspaceInfo, async () => workspace.info());
  register(IPC_CHANNELS.workspaceLayoutGet, async () => storage.getWorkspaceLayout());
  register(IPC_CHANNELS.workspaceLayoutSave, async (request) => storage.saveWorkspaceLayout(request));
}

