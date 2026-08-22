import type { IPCChannel, IPCResult, RuntimeEvent, TerminalEventView } from '@forge/ipc';

async function fallbackResponse<C extends IPCChannel>(channel: C): Promise<IPCResult<any>> {
  // Provide lightweight mock data for common channels when running in a browser dev server
  switch (channel) {
    case 'file.list':
      return { success: true, data: [] };
    case 'git.status':
      return { success: true, data: null };
    case 'meta.dashboard':
      return { success: true, data: { project: null, recentCommits: [], contextHealth: { hasReadme: false, noteCount: 0, codeFileCount: 0 } } };
    case 'file.read':
      return { success: true, data: { content: '' } } as any;
    case 'agent.conversations.list':
      return { success: true, data: [] } as any;
    case 'agent.conversations.state':
      return { success: true, data: { activeConversationId: 'browser-preview', threads: [{ id: 'browser-preview', title: 'Browser preview', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 }], messages: [] } } as any;
    case 'agent.memories.list':
      return { success: true, data: [] } as any;
    case 'app.update.status':
      return { success: true, data: { currentVersion: 'development', state: 'development', message: 'Update checks run in the packaged app.' } } as any;
    case 'app.build.info':
    case 'app.build.info.copy':
      return { success: true, data: { version: '2.3.0-beta.1-dev', channel: 'development', commit: 'unavailable in browser preview', buildDate: new Date().toISOString(), runtime: 'development', rendererSource: 'development URL', platform: navigator.platform, architecture: 'browser' } } as any;
    case 'settings.get':
      return { success: true, data: { apiBaseUrl: 'https://api.openai.com/v1', apiModel: 'gpt-5.6-sol', apiKeyConfigured: false, githubUsername: '', githubTokenConfigured: false, secureStorageAvailable: false, webResearchEnabled: true, updateChannel: 'stable' } } as any;
    case 'workspace.layout.get':
      return { success: true, data: { explorerWidth: 245, intelligenceWidth: 360, bottomHeight: 240, contextHeight: 300 } } as any;
    default:
      return { success: false, error: { message: 'Forge API bridge not available in this environment.' } } as any;
  }
}

export async function forgeInvoke<C extends IPCChannel>(channel: C, request?: unknown): Promise<IPCResult<any>> {
  // If running inside Electron with the preload bridge, forward the call.
  // Otherwise return a harmless fallback so the dev server UI can render.
  const fw = (window as any).forge;
  if (fw && typeof fw.invoke === 'function') {
    try {
      return await fw.invoke(channel as any, request as any) as IPCResult<any>;
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : String(e) } } as any;
    }
  }
  return fallbackResponse(channel as any);
}

export function onTerminalEvent(listener: (event: TerminalEventView) => void): () => void {
  const fw = (window as any).forge;
  return fw && typeof fw.onTerminalEvent === 'function' ? fw.onTerminalEvent(listener) : () => undefined;
}

export function onRuntimeEvent(listener: (event: RuntimeEvent) => void): () => void {
  const fw = (window as any).forge;
  return fw && typeof fw.onRuntimeEvent === 'function' ? fw.onRuntimeEvent(listener) : () => undefined;
}

export default forgeInvoke;
