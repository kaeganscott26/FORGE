import { mkdtemp, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { filteredEnvironment, ShellService, TerminalService } from '../src';

describe('shell and terminal services', () => {
  it('filters the parent environment and blocks secret-like requested variables', () => {
    const environment = filteredEnvironment({ SAFE_VALUE: 'yes', API_TOKEN: 'no' }, ['SAFE_VALUE']);
    expect(environment.SAFE_VALUE).toBe('yes'); expect(environment.API_TOKEN).toBeUndefined();
    expect(() => filteredEnvironment({ API_TOKEN: 'no' }, ['API_TOKEN'])).toThrow(/Secret-like/);
  });

  it('enforces output limits and timeouts', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-shell-')); const service = new ShellService(() => root, 20);
    const output = await service.run({ command: '/bin/sh', args: ['-c', 'printf 1234567890123456789012345'], workingDirectory: '.', timeoutMs: 2_000, reason: 'test', expectedOutcome: 'bounded output' });
    expect(output.truncated).toBe(true); expect(output.stdout.length).toBe(20);
    const timeout = await service.run({ command: '/bin/sh', args: ['-c', 'sleep 2'], workingDirectory: '.', timeoutMs: 100, reason: 'test', expectedOutcome: 'timeout' });
    expect(timeout.timedOut).toBe(true);
  });

  it('cancels process trees', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-cancel-')); const service = new ShellService(() => root); const id = 'cancel-me';
    const running = service.run({ command: '/bin/sh', args: ['-c', 'sleep 5'], workingDirectory: '.', timeoutMs: 10_000, reason: 'test', expectedOutcome: 'cancel' }, id);
    await new Promise((resolve) => setTimeout(resolve, 80)); expect(service.cancel(id)).toBe(true); expect((await running).cancelled).toBe(true);
  });

  it.skipIf(process.platform !== 'darwin')('creates a workspace-scoped PTY, streams pwd, and terminates it', async () => {
    const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'forge-terminal-'))); const events: any[] = []; const service = new TerminalService(() => root, (event) => events.push(event));
    const session = await service.create('.', 80, 24); expect(session.cwd).toBe(root); expect(session.state).toBe('running');
    service.input(session.id, 'pwd\n');
    await new Promise<void>((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (events.some((event) => event.data?.includes(root))) { clearInterval(timer); resolve(); } else if (Date.now() - started > 3_000) { clearInterval(timer); reject(new Error('PTY output timeout')); } }, 20); });
    service.terminate(session.id); service.dispose();
  });
});
