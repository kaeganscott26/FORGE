import { chmod, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);

const electronPathFile = resolve('node_modules', 'electron', 'path.txt');
try { await access(electronPathFile); }
catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  await run(process.execPath, [resolve('node_modules', 'electron', 'install.js')]);
}

if (process.platform === 'darwin') {
  const helper = resolve('node_modules', 'node-pty', 'prebuilds', `darwin-${process.arch}`, 'spawn-helper');
  try { await access(helper); await chmod(helper, 0o755); }
  catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
}
