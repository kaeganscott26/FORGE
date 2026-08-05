import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const packageSource = (name: string) => resolve(here, `../../packages/${name}/src`);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@forge/ipc': packageSource('ipc'), '@forge/workspace': packageSource('workspace'), '@forge/git': packageSource('git'), '@forge/storage': packageSource('storage') } }
  },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: { '@forge/ipc': packageSource('ipc') } } },
  renderer: { root: here, plugins: [react()], resolve: { alias: { '@renderer': resolve(here, 'src/renderer/src'), '@forge/ipc': packageSource('ipc') } } }
});
