import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@forge/ipc';
import type { BrowserStateView, ForgeAPI, IPCChannel, IPCRequestMap, IPCResponseMap, IPCResult, RuntimeEvent, TerminalEventView } from '@forge/ipc';

const allowedChannels = new Set<string>(Object.values(IPC_CHANNELS));
const forge: ForgeAPI = {
  invoke: <C extends IPCChannel>(channel: C, request: IPCRequestMap[C]) => {
    if (!allowedChannels.has(channel)) return Promise.resolve({ success: false, error: { message: 'IPC channel is not allowlisted.' } }) as Promise<IPCResult<IPCResponseMap[C]>>;
    return ipcRenderer.invoke(channel, request) as Promise<IPCResult<IPCResponseMap[C]>>;
  },
  onTerminalEvent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: TerminalEventView): void => listener(payload);
    ipcRenderer.on('terminal.event', handler);
    return () => ipcRenderer.removeListener('terminal.event', handler);
  },
  onBrowserState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: BrowserStateView): void => listener(payload);
    ipcRenderer.on('browser.state', handler);
    return () => ipcRenderer.removeListener('browser.state', handler);
  },
  onRuntimeEvent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: RuntimeEvent): void => listener(payload);
    ipcRenderer.on('runtime.event', handler);
    return () => ipcRenderer.removeListener('runtime.event', handler);
  }
};

contextBridge.exposeInMainWorld('forge', forge);
