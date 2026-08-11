import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(here, '../..');
const packageSource = (name: string) => resolve(here, `../../packages/${name}/src`);
const rendererRoot = resolve(here, 'src/renderer');

function resolveBuildCommit(): string {
  const explicit = process.env.FORGE_BUILD_COMMIT?.trim();
  if (explicit) return explicit;
  try {
    const topLevel = resolve(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repositoryRoot, encoding: 'utf8' }).trim());
    if (topLevel !== repositoryRoot) return 'unknown';
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const buildCommit = resolveBuildCommit();
const buildDate = process.env.FORGE_BUILD_DATE?.trim() || new Date().toISOString();

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@forge/ipc': packageSource('ipc'), '@forge/workspace': packageSource('workspace'), '@forge/git': packageSource('git'), '@forge/storage': packageSource('storage'), '@forge/agent-tools': packageSource('agent-tools'), '@forge/tool-policy': packageSource('tool-policy'), '@forge/shell': packageSource('shell'), '@forge/web': packageSource('web'), '@forge/tasks': packageSource('tasks') } },
    define: {
      __FORGE_BUILD_COMMIT__: JSON.stringify(buildCommit),
      __FORGE_BUILD_DATE__: JSON.stringify(buildDate)
    }
  },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: { '@forge/ipc': packageSource('ipc') } }, build: { rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } } } },
  renderer: { root: rendererRoot, plugins: [react()], resolve: { alias: { '@renderer': resolve(rendererRoot, 'src'), '@forge/ipc': packageSource('ipc') } }, optimizeDeps: { exclude: ['@xterm/xterm', '@xterm/addon-fit'] } }
});
