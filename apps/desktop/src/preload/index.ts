import { contextBridge, ipcRenderer } from 'electron';
import type { ForgeAPI, IPCChannel, IPCRequestMap, IPCResponseMap, IPCResult } from '@forge/ipc';

const forge: ForgeAPI = { invoke: <C extends IPCChannel>(channel: C, request: IPCRequestMap[C]) => ipcRenderer.invoke(channel, request) as Promise<IPCResult<IPCResponseMap[C]>> };

// expose base invoke (cast to any to append convenience helpers)
(forge as any).agent = {
	ask: (prompt: string) => forge.invoke('agent.ask', { prompt } as any),
	explainProject: () => forge.invoke('agent.explainProject', undefined as any),
	reviewChanges: () => forge.invoke('agent.reviewChanges', undefined as any)
};

contextBridge.exposeInMainWorld('forge', forge as any);

