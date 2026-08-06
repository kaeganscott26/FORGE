import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const packageSource = (name: string) => resolve(here, `../../packages/${name}/src`);
const rendererRoot = resolve(here, 'src/renderer');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@forge/ipc': packageSource('ipc'), '@forge/workspace': packageSource('workspace'), '@forge/git': packageSource('git'), '@forge/storage': packageSource('storage') } }
  },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: { '@forge/ipc': packageSource('ipc') } } },
  renderer: { root: rendererRoot, plugins: [react()], resolve: { alias: { '@renderer': resolve(rendererRoot, 'src'), '@forge/ipc': packageSource('ipc') } } }
});
