import { contextBridge, ipcRenderer } from 'electron';
import type { ForgeAPI, IPCChannel, IPCRequestMap, IPCResponseMap, IPCResult } from '@forge/ipc';

const forge: ForgeAPI = { invoke: <C extends IPCChannel>(channel: C, request: IPCRequestMap[C]) => ipcRenderer.invoke(channel, request) as Promise<IPCResult<IPCResponseMap[C]>> };

contextBridge.exposeInMainWorld('forge', forge);
