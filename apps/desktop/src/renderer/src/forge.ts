import type { IPCChannel, IPCResult } from '@forge/ipc';

async function fallbackResponse<C extends IPCChannel>(channel: C): Promise<IPCResult<any>> {
  // Provide lightweight mock data for common channels when running in a browser dev server
  switch (channel) {
    case 'file.list':
      return { success: true, data: [] };
    case 'git.status':
      return { success: true, data: null };
    case 'meta.dashboard':
      return { success: true, data: { project: null, recentCommits: [], contextHealth: { score: 0, hasReadme: false, noteCount: 0, codeFileCount: 0 } } };
    case 'file.read':
      return { success: true, data: { content: '' } } as any;
    case 'agent.conversations.list':
      return { success: true, data: [] } as any;
    case 'agent.memories.list':
      return { success: true, data: [] } as any;
    case 'app.update.status':
      return { success: true, data: { currentVersion: 'development', state: 'development', message: 'Update checks run in the packaged app.' } } as any;
    case 'settings.get':
      return { success: true, data: { apiBaseUrl: 'https://api.openai.com/v1', apiModel: 'gpt-4o', apiKeyConfigured: false, githubUsername: '', githubTokenConfigured: false, secureStorageAvailable: false } } as any;
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

export default forgeInvoke;
