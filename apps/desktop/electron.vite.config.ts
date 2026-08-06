import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(here, '../..');
const packageSource = (name: string) => resolve(here, `../../packages/${name}/src`);
const rendererRoot = resolve(here, 'src/renderer');
const buildCommit = process.env.FORGE_BUILD_COMMIT?.trim() || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const buildDate = process.env.FORGE_BUILD_DATE?.trim() || new Date().toISOString();

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@forge/ipc': packageSource('ipc'), '@forge/workspace': packageSource('workspace'), '@forge/git': packageSource('git'), '@forge/storage': packageSource('storage') } },
    define: {
      __FORGE_BUILD_COMMIT__: JSON.stringify(buildCommit),
      __FORGE_BUILD_DATE__: JSON.stringify(buildDate)
    }
  },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: { '@forge/ipc': packageSource('ipc') } } },
  renderer: { root: rendererRoot, plugins: [react()], resolve: { alias: { '@renderer': resolve(rendererRoot, 'src'), '@forge/ipc': packageSource('ipc') } } }
});
