import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { is } from '@electron-toolkit/utils';
import { buildReleaseIdentity, formatAppBuildInfo, IPC_CHANNELS, type AppBuildInfo, type IPCChannel, type IPCRequestMap, type IPCResponseMap, type IPCResult } from '@forge/ipc';
import { WorkspaceService } from '@forge/workspace';
import { GitService } from '@forge/git';
import { StorageService } from '@forge/storage';
import { OpenAIProvider, ContextBuilderImpl, Agent, type AgentMessage } from '@forge/ai';
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

async function openWorkspaceAt(rootPath: string): Promise<NonNullable<ReturnType<WorkspaceService['info']>>> {
  terminalService.dispose(); dirtyEditorPaths.clear(); toolRouter.sessions.clear(); await storage.close();
  const info = await workspace.open(rootPath); await git.init(info.rootPath); await storage.init(info.rootPath); return info;
}

function registerHandlers(): void {
  register(IPC_CHANNELS.workspaceOpen, async () => { const selection = await dialog.showOpenDialog({ title: 'Open Forge workspace', properties: ['openDirectory', 'createDirectory'] }); if (selection.canceled || !selection.filePaths[0]) throw new Error('Workspace selection was cancelled.'); return openWorkspaceAt(selection.filePaths[0]); });
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
  register(IPC_CHANNELS.appBuildInfo, async () => appBuildInfo());
  register(IPC_CHANNELS.appBuildInfoCopy, async () => {
    const info = appBuildInfo();
    clipboard.writeText(formatAppBuildInfo(info));
    return info;
  });
  register(IPC_CHANNELS.settingsGet, async () => settings.publicSettings());
  register(IPC_CHANNELS.settingsSave, async (request) => { const result = await settings.save(request); await applyAISettings(); updater.setChannel(result.updateChannel); return result; });
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
  const recordTaskOutcome = async (request: { id: string; input: unknown; toolName?: string }, result: any): Promise<string | null> => {
    const link = taskEvidenceLink(request); if (!link) return null;
    try { await taskRuntime.recordToolOutcome(link.taskId, link.stepId, request.id, result); return null; }
    catch (error) { return `Task checkpoint link failed: ${error instanceof Error ? error.message : String(error)}`; }
  };
  const runAgentTurn = async (conversationId: string, prompt: string) => {
    const state = await resolveConversation(conversationId);
    const history = await historyFor(state.activeConversationId);
    await storage.appendConversation(state.activeConversationId, 'user', prompt);
    const definitions = toolRouter.providerDefinitions();
    const firstTurn = await agent.askWithTools(prompt, history, definitions);
    let turn = firstTurn;
    const project = await storage.dashboard();
    const info = workspace.info();
    if (!project || !info) throw new Error('Open a workspace before requesting agent tools.');
    const toolOutcomes: ToolRequestOutcome[] = [];
    const taskLinkWarnings: string[] = [];
    const continuationHistory: AgentMessage[] = [...history, { role: 'user', content: prompt }];
    const executedCallKeys = new Set<string>();
    const synthesizeObservedResults = async (): Promise<string> => {
      const evidence = toolOutcomes.filter((outcome) => outcome.result).map((outcome) => boundedToolEvidence(outcome.result!)).join('\n\n');
      return (await agent.askWithContext(`The required FORGE tool has already completed. Do not output JSON and do not request another tool. Answer the original request using only these observed Tool Result records.\n\n${evidence}`, continuationHistory)).content;
    };
    let modelContent = '';
    let completedRounds = 0;
    for (; completedRounds < 3; completedRounds += 1) {
      const calls: ProviderToolCall[] = [...turn.toolCalls];
      const fallback = calls.length ? null : parseStructuredToolFallback(aiProvider.id, turn.content);
      if (fallback) calls.push(fallback);
      if (calls.length === 0) {
        if (toolOutcomes.length && looksLikeRepeatedToolRequest(turn.content)) {
          modelContent = await synthesizeObservedResults();
        } else modelContent = turn.content;
        break;
      }
      const freshCalls = calls.filter((call) => !executedCallKeys.has(toolCallKey(call)));
      if (freshCalls.length === 0) { modelContent = await synthesizeObservedResults(); break; }
      if (toolOutcomes.length + freshCalls.length > 5) throw new Error('The model requested too many tools in one turn.');
      const roundOutcomes: ToolRequestOutcome[] = [];
      for (const originalCall of freshCalls) {
        executedCallKeys.add(toolCallKey(originalCall));
        let call = originalCall;
        const link = taskEvidenceLink({ input: originalCall.arguments, toolName: originalCall.name });
        if (link) {
          try {
            const task = await taskRuntime.get(link.taskId);
            if (!task.steps.some((step) => step.id === link.stepId)) throw new Error('Unknown task step.');
          } catch {
            const { taskContext: _invalidTaskContext, ...argumentsWithoutTaskContext } = originalCall.arguments as Record<string, unknown>;
            call = { ...originalCall, arguments: argumentsWithoutTaskContext };
          }
        }
        const outcome = await toolRouter.request(call, { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: state.activeConversationId, modelId: turn.modelId ?? settings.publicSettings().apiModel });
        roundOutcomes.push(outcome); toolOutcomes.push(outcome);
      }
      for (const outcome of roundOutcomes) {
        const link = taskApprovalLink(outcome.request); if (!link) continue;
        if (outcome.result) { const warning = await recordTaskOutcome(outcome.request, outcome.result); if (warning) taskLinkWarnings.push(warning); }
        else await storage.recordTaskApproval(link.taskId, link.stepId, { toolRequestId: outcome.request.id, decision: 'pending', scope: `${link.taskId}:${link.stepId}:${outcome.request.toolName}` });
      }
      if (roundOutcomes.some((outcome) => !outcome.result)) { modelContent = turn.content; break; }
      const evidence = roundOutcomes.map((outcome) => boundedToolEvidence(outcome.result!)).join('\n\n');
      continuationHistory.push({ role: 'assistant', content: turn.content || 'I requested FORGE tools.' });
      turn = await agent.askWithTools(`Continue the original request using these bounded Tool Result records. If a filesystem result reports a missing path, follow its recovery instruction and inspect the workspace root before concluding. Do not repeat a completed request.\n\n${evidence}`, continuationHistory, definitions);
    }
    if (!modelContent && completedRounds >= 3) {
      const evidence = toolOutcomes.filter((outcome) => outcome.result).map((outcome) => boundedToolEvidence(outcome.result!)).join('\n\n');
      modelContent = (await agent.askWithContext(`Answer the original request from the observed Tool Results. The bounded continuation limit was reached; do not claim unobserved work.\n\n${evidence}`, continuationHistory)).content;
    }
    const toolSummary = toolOutcomes.map(({ request, result }) => result
      ? `Tool ${request.toolName} ${result.success ? 'succeeded' : 'failed'} (${result.durationMs} ms).${result.error ? ` ${result.error.message}` : ''}`
      : `Tool ${request.toolName} requires Tier ${request.riskTier} approval before FORGE can execute it.`).join('\n');
    const content = [modelContent, toolSummary, ...taskLinkWarnings].filter(Boolean).join('\n\n') || 'FORGE received no response from the model.';
    await storage.appendConversation(state.activeConversationId, 'assistant', content);
    return {
      content,
      contextUsed: turn.context.artifacts.length > 0,
      conversationId: state.activeConversationId,
      memories: firstTurn.memories.map((memory) => ({ id: memory.id, title: memory.title })),
      contextSources: [...firstTurn.context.artifacts.map((artifact) => ({
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.title,
        path: artifact.path,
        relevance: typeof artifact.metadata?.relevance === 'number' ? artifact.metadata.relevance : undefined,
        reason: typeof artifact.metadata?.reason === 'string' ? artifact.metadata.reason : undefined
      })), ...toolOutcomes.filter((outcome) => outcome.result).map(({ request, result }) => ({ id: `tool:${request.id}`, kind: 'tool', title: request.toolName, relevance: 100, reason: result?.success ? 'Structured result returned by the FORGE tool runtime.' : 'Structured tool failure returned by FORGE.' }))]
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
  const toolContext = async () => {
    const project = await storage.dashboard(); const info = workspace.info(); const conversation = await storage.conversationState();
    if (!project || !info) throw new Error('Open a workspace first.');
    return { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: conversation.activeConversationId, modelId: settings.publicSettings().apiModel };
  };
  register(IPC_CHANNELS.toolRequestsList, async () => { const project = await storage.dashboard(); return (project ? toolRouter.listRequests(project.id) : []) as any; });
  register(IPC_CHANNELS.toolRequestApprove, async (request) => {
    const pending = toolRouter.requestById(request.requestId); if (!pending) throw new Error('Unknown tool request.');
    const link = taskApprovalLink(pending);
    if (link) await storage.recordTaskApproval(link.taskId, link.stepId, { toolRequestId: pending.id, decision: request.choice, scope: `${link.taskId}:${link.stepId}:${pending.toolName}`, decidedAt: Date.now(), expiresAt: request.choice === 'session' ? Date.now() + 30 * 60_000 : undefined });
    const result = await toolRouter.approve(request.requestId, await toolContext(), request.choice);
    const taskWarning = await recordTaskOutcome(pending, result);
    const history = await historyFor(pending.conversationId);
    const evidence = boundedToolEvidence(result);
    try {
      const followUp = await agent.askWithContext(`FORGE has completed the previously approved ${pending.toolName} request. Continue the active task using this bounded, redacted Tool Result. Report success or failure exactly as returned.\n\n${evidence}`, history);
      await storage.appendConversation(pending.conversationId, 'assistant', [followUp.content, taskWarning].filter(Boolean).join('\n\n'));
    } catch {
      await storage.appendConversation(pending.conversationId, 'assistant', `FORGE tool result: ${pending.toolName} ${result.success ? 'succeeded' : 'failed'}.${result.error ? ` ${result.error.message}` : ''}`);
    }
    return result as any;
  });
  register(IPC_CHANNELS.toolRequestReject, async (request) => { const pending = toolRouter.requestById(request.requestId); if (!pending) throw new Error('Unknown tool request.'); await toolRouter.reject(request.requestId, await toolContext()); const link = taskApprovalLink(pending); if (link) await storage.recordTaskApproval(link.taskId, link.stepId, { toolRequestId: pending.id, decision: 'rejected', scope: `${link.taskId}:${link.stepId}:${pending.toolName}`, decidedAt: Date.now() }); return undefined; });
  register(IPC_CHANNELS.toolRequestCancel, async (request) => toolRouter.cancel(request.requestId, await toolContext()));
  register(IPC_CHANNELS.toolActionsList, async (request) => storage.listActions(request) as any);
  register(IPC_CHANNELS.editorDirtyUpdate, async (request) => { dirtyEditorPaths.clear(); for (const value of request.paths) if (value && !value.split(/[\\/]/).includes('..')) dirtyEditorPaths.add(value); return undefined; });
  register(IPC_CHANNELS.terminalCreate, async (request) => terminalService.create(request?.workingDirectory, request?.columns, request?.rows) as any);
  register(IPC_CHANNELS.terminalList, async () => terminalService.list() as any);
  register(IPC_CHANNELS.terminalInput, async (request) => { terminalService.input(request.sessionId, request.data); return undefined; });
  register(IPC_CHANNELS.terminalResize, async (request) => { terminalService.resize(request.sessionId, request.columns, request.rows); return undefined; });
  register(IPC_CHANNELS.terminalTerminate, async (request) => { terminalService.terminate(request.sessionId); return undefined; });
  register(IPC_CHANNELS.terminalRestart, async (request) => terminalService.restart(request.sessionId) as any);
  register(IPC_CHANNELS.terminalRemove, async (request) => { terminalService.remove(request.sessionId); return undefined; });
  register(IPC_CHANNELS.tasksList, async () => taskRuntime.list());
  register(IPC_CHANNELS.tasksGet, async (request) => taskRuntime.get(request.taskId));
  register(IPC_CHANNELS.tasksCreate, async (request) => taskRuntime.create(request));
  register(IPC_CHANNELS.tasksCreateRelease, async (request) => taskRuntime.createRelease(request.version, request.originatingConversationId));
  register(IPC_CHANNELS.tasksResume, async (request) => taskRuntime.resume(request.taskId));
  register(IPC_CHANNELS.tasksPause, async (request) => taskRuntime.pause(request.taskId, request.reason));
  register(IPC_CHANNELS.tasksCancel, async (request) => taskRuntime.cancel(request.taskId, request.reason, request.trackingOnly));
  register(IPC_CHANNELS.tasksRetryStep, async (request) => taskRuntime.retryStep(request.taskId, request.stepId));
  register(IPC_CHANNELS.tasksHandoff, async (request) => taskRuntime.generateHandoff(request.taskId));
}

import { existsSync } from 'node:fs';

function createWindow(): void {
  const rendererFile = join(__dirname, '../renderer/index.html');
  const packagedRendererUrl = pathToFileURL(rendererFile).toString();
  const window = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: 'Forge',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  window.on('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const developmentUrl = process.env.ELECTRON_RENDERER_URL;
    const allowed = is.dev && developmentUrl ? new URL(url).origin === new URL(developmentUrl).origin : url === packagedRendererUrl;
    if (!allowed) event.preventDefault();
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    rendererSource = 'development URL';
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    rendererSource = app.isPackaged ? 'file:// packaged app.asar' : 'file:// development build';
    window.loadFile(rendererFile);
  }
}

app.setName('FORGE');
app.whenReady().then(() => {
  const developmentIcon = join(process.cwd(), 'apps/desktop/resources/ForgeIcon-1024.png');
  if (process.platform === 'darwin' && is.dev && app.dock && existsSync(developmentIcon)) app.dock.setIcon(developmentIcon);
  settings.init().then(async () => {
    await applyAISettings();
    updater.setChannel(settings.updateChannel());
    registerHandlers();
    const startupWorkspace = process.argv.find((argument) => argument.startsWith('--workspace='))?.slice('--workspace='.length);
    if (startupWorkspace) await openWorkspaceAt(startupWorkspace);
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch((error) => {
    dialog.showErrorBox('FORGE could not start', error instanceof Error ? error.message : String(error));
    app.quit();
  });
});
app.on('window-all-closed', async () => { terminalService.dispose(); await storage.close(); if (process.platform !== 'darwin') app.quit(); });
