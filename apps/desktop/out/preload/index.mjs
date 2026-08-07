import { contextBridge, ipcRenderer } from "electron";
const forge = { invoke: (channel, request) => ipcRenderer.invoke(channel, request) };
contextBridge.exposeInMainWorld("forge", forge);
