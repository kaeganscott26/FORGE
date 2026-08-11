import { mkdtemp, realpath, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultTerminalShell, filteredEnvironment, ShellService, terminalEnvironment, TerminalService } from '../src';

describe('shell and terminal services', () => {
  it('filters the parent environment and blocks secret-like requested variables', () => {
    const environment = filteredEnvironment({ SAFE_VALUE: 'yes', API_TOKEN: 'no' }, ['SAFE_VALUE']);
    expect(environment.SAFE_VALUE).toBe('yes'); expect(environment.API_TOKEN).toBeUndefined();
    expect(() => filteredEnvironment({ API_TOKEN: 'no' }, ['API_TOKEN'])).toThrow(/Secret-like/);
  });

  it('builds a safe interactive environment with common user CLI locations', () => {
    const environment = terminalEnvironment('/bin/zsh');
    expect(environment.HOME).toBe(os.homedir());
    expect(environment.SHELL).toBe('/bin/zsh');
    expect(environment.TERM_PROGRAM).toBe('FORGE');
    expect(environment.PATH?.split(path.delimiter)).toEqual(expect.arrayContaining(['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin')]));
    expect(environment.OPENAI_API_KEY).toBeUndefined();
  });

  it('inherits validated graphical session variables without inheriting secrets', () => {
    const previous = { DISPLAY: process.env.DISPLAY, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR, DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS, FORGE_OS_SESSION: process.env.FORGE_OS_SESSION, FORGE_SHELL_MODE: process.env.FORGE_SHELL_MODE, FORGE_OS_VERSION: process.env.FORGE_OS_VERSION };
    process.env.DISPLAY = ':7'; process.env.XDG_RUNTIME_DIR = '/run/user/1000'; process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus'; process.env.FORGE_OS_SESSION = '1'; process.env.FORGE_SHELL_MODE = '1'; process.env.FORGE_OS_VERSION = '0.1.0-alpha';
    try {
      const environment = terminalEnvironment('/bin/bash');
      expect(environment.DISPLAY).toBe(':7');
      expect(environment.XDG_RUNTIME_DIR).toBe('/run/user/1000');
      expect(environment.DBUS_SESSION_BUS_ADDRESS).toBe('unix:path=/run/user/1000/bus');
      expect(environment.FORGE_OS_SESSION).toBe('1');
      expect(environment.FORGE_SHELL_MODE).toBe('1');
      expect(environment.FORGE_OS_VERSION).toBe('0.1.0-alpha');
      const toolEnvironment = filteredEnvironment();
      expect(toolEnvironment.FORGE_OS_SESSION).toBe('1');
      expect(toolEnvironment.FORGE_SHELL_MODE).toBe('1');
      expect(toolEnvironment.FORGE_OS_VERSION).toBe('0.1.0-alpha');
    } finally {
      for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    }
  });

  it('drops malformed graphical session variables', () => {
    const previous = process.env.DBUS_SESSION_BUS_ADDRESS;
    process.env.DBUS_SESSION_BUS_ADDRESS = 'tcp:host=untrusted.example';
    try { expect(terminalEnvironment('/bin/bash').DBUS_SESSION_BUS_ADDRESS).toBeUndefined(); }
    finally { if (previous === undefined) delete process.env.DBUS_SESSION_BUS_ADDRESS; else process.env.DBUS_SESSION_BUS_ADDRESS = previous; }
  });

  it('uses the configured absolute shell or a minimal-Linux Bash fallback', () => {
    expect(defaultTerminalShell({ SHELL: '/bin/fish' })).toBe('/bin/fish');
    if (process.platform !== 'win32') expect(defaultTerminalShell({})).toBe('/bin/bash');
  });

  it('enforces output limits and timeouts', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-shell-')); const service = new ShellService(() => root, 20);
    const output = await service.run({ command: '/bin/sh', args: ['-c', 'printf 1234567890123456789012345'], workingDirectory: '.', timeoutMs: 2_000, reason: 'test', expectedOutcome: 'bounded output' });
    expect(output.truncated).toBe(true); expect(output.stdout.length).toBe(20);
    const timeout = await service.run({ command: '/bin/sh', args: ['-c', 'sleep 2'], workingDirectory: '.', timeoutMs: 100, reason: 'test', expectedOutcome: 'timeout' });
    expect(timeout.timedOut).toBe(true);
  });

  it('requires an explicit network profile for known network-capable executables', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-shell-profile-')); const service = new ShellService(() => root);
    await expect(service.run({ command: 'npm', args: ['install'], workingDirectory: '.', timeoutMs: 2_000, reason: 'test', expectedOutcome: 'dependencies' })).rejects.toThrow(/network profile/);
  });

  it('cancels process trees', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-cancel-')); const service = new ShellService(() => root); const id = 'cancel-me';
    const running = service.run({ command: '/bin/sh', args: ['-c', 'sleep 5'], workingDirectory: '.', timeoutMs: 10_000, reason: 'test', expectedOutcome: 'cancel' }, id);
    await new Promise((resolve) => setTimeout(resolve, 80)); expect(service.cancel(id)).toBe(true); expect((await running).cancelled).toBe(true);
  });

  it('starts detached workspace-owned output without blocking the caller', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-background-')); const service = new ShellService(() => root);
    const started = await service.startBackground({ command: '/bin/sh', args: ['-c', 'printf background-ready'], workingDirectory: '.', timeoutMs: 2_000, reason: 'test background process', expectedOutcome: 'output file' }, '.forge/task-output/test.log', 'background-test');
    expect(started.pid).toBeGreaterThan(0); expect(started.outputPath).toBe('.forge/task-output/test.log');
    await new Promise((resolve) => setTimeout(resolve, 80)); expect(await (await import('node:fs/promises')).readFile(path.join(root, started.outputPath), 'utf8')).toContain('background-ready');
  });

  it.skipIf(process.platform !== 'darwin')('forwards PTY input, rejects exited sessions, and restarts writable in the active workspace', async () => {
    const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'forge-terminal-'))); const linkedRoot = `${root}-link`; await symlink(root, linkedRoot); const otherRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'forge-terminal-other-'))); let activeRoot = linkedRoot; const events: any[] = []; const service = new TerminalService(() => activeRoot, (event) => events.push(event));
    const session = await service.create('.', 80, 24); expect(session.cwd).toBe(root); expect(session.state).toBe('running');
    service.input(session.id, 'pwd\n');
    await new Promise<void>((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (events.some((event) => event.data?.includes(root))) { clearInterval(timer); resolve(); } else if (Date.now() - started > 3_000) { clearInterval(timer); reject(new Error('PTY output timeout')); } }, 20); });
    activeRoot = otherRoot; expect(() => service.input(session.id, 'pwd\n')).toThrow(/active workspace/); activeRoot = linkedRoot;
    service.input(session.id, 'exit\n');
    await new Promise<void>((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (service.list().find((entry) => entry.id === session.id)?.state === 'exited') { clearInterval(timer); resolve(); } else if (Date.now() - started > 3_000) { clearInterval(timer); reject(new Error('PTY exit timeout')); } }, 20); });
    expect(() => service.input(session.id, 'pwd\n')).toThrow(/not running/);
    const restarted = await service.restart(session.id); expect(restarted.id).toBe(session.id); service.input(restarted.id, 'printf restart-writable\\n\n');
    await new Promise<void>((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (events.some((event) => event.data?.includes('restart-writable'))) { clearInterval(timer); resolve(); } else if (Date.now() - started > 3_000) { clearInterval(timer); reject(new Error('PTY restart input timeout')); } }, 20); });
    service.terminate(session.id); service.dispose();
  });
});
