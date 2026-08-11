import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as pty from 'node-pty';

const SECRET_NAME = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASS|KEY|CREDENTIAL|AUTH)(?:_|$)/i;
const SAFE_PARENT_ENV = [
  'PATH', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR',
  'DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS',
  'XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME',
  'XDG_DATA_DIRS', 'XDG_CONFIG_DIRS', 'XDG_CURRENT_DESKTOP', 'XDG_SESSION_TYPE',
  'DESKTOP_SESSION', 'FORGE_OS_SESSION', 'FORGE_SHELL_MODE', 'FORGE_OS_VERSION',
  'BROWSER'
] as const;

function validSessionVariable(name: string, value: string): boolean {
  if (value.includes('\0') || value.includes('\n') || value.includes('\r')) return false;
  if (name === 'DISPLAY') return /^:[0-9]+(?:\.[0-9]+)?$/.test(value) || /^[A-Za-z0-9_.-]+:[0-9]+(?:\.[0-9]+)?$/.test(value);
  if (name === 'DBUS_SESSION_BUS_ADDRESS') return /^(?:unix:(?:path|abstract)=|autolaunch:)/.test(value);
  if (name === 'XDG_RUNTIME_DIR' || name === 'XAUTHORITY') return path.isAbsolute(value);
  return true;
}

export interface ShellRunInput {
  command: string;
  args: string[];
  workingDirectory: string;
  timeoutMs: number;
  environment?: Record<string, string>;
  environmentAllowlist?: string[];
  /** Declares the intended network capability for approval and audit. */
  networkProfile?: 'offline' | 'network' | 'package-manager' | 'git';
  reason: string;
  expectedOutcome: string;
}

const NETWORK_COMMANDS = new Map<string, ShellRunInput['networkProfile']>([
  ['curl', 'network'], ['wget', 'network'], ['ssh', 'network'], ['scp', 'network'],
  ['npm', 'package-manager'], ['npx', 'package-manager'], ['pnpm', 'package-manager'], ['yarn', 'package-manager'], ['bun', 'package-manager'],
  ['git', 'git']
]);

function assertNetworkProfile(input: ShellRunInput): void {
  const executable = path.basename(input.command).toLowerCase();
  let required = NETWORK_COMMANDS.get(executable);
  const primaryArgument = input.args.find((argument) => !argument.startsWith('-'))?.toLowerCase();
  if (executable === 'git' && !['clone', 'fetch', 'pull', 'push', 'ls-remote'].includes(primaryArgument ?? '')) required = undefined;
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(executable) && !['install', 'ci', 'add', 'update', 'publish', 'dlx', 'create'].includes(primaryArgument ?? '')) required = undefined;
  const profile = input.networkProfile ?? 'offline';
  if (required && profile === 'offline') throw new Error(`${executable} requires an explicit ${required} network profile; offline commands may not use a known network-capable executable.`);
  if (required === 'package-manager' && !['package-manager', 'network'].includes(profile)) throw new Error(`${executable} requires the package-manager or network profile.`);
  if (required === 'git' && !['git', 'network'].includes(profile)) throw new Error('git requires the git or network profile.');
}

export interface ShellRunOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  cancelled: boolean;
  truncated: boolean;
}

export interface BackgroundShellRunOutput { requestId: string; pid: number; outputPath: string; startedAt: number; }

export async function resolveWorkspacePath(workspaceRoot: string, requested = '.'): Promise<string> {
  if (path.isAbsolute(requested)) throw new Error('Absolute paths require a separate, explicitly approved policy.');
  const root = await fs.realpath(workspaceRoot);
  const candidate = path.resolve(root, requested);
  const resolved = await fs.realpath(candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error('Working directory escapes the active workspace.');
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error('Working directory must be a directory.');
  return resolved;
}

export function filteredEnvironment(requested: Record<string, string> = {}, allowlist: string[] = []): NodeJS.ProcessEnv {
  const allowed = new Set(allowlist);
  const environment: NodeJS.ProcessEnv = {};
  for (const name of SAFE_PARENT_ENV) {
    const value = process.env[name];
    if (value && validSessionVariable(name, value)) environment[name] = value;
  }
  for (const [name, value] of Object.entries(requested)) {
    if (!allowed.has(name)) continue;
    if (SECRET_NAME.test(name)) throw new Error(`Secret-like environment variable is blocked: ${name}`);
    environment[name] = value;
  }
  return environment;
}

export function terminalEnvironment(shell: string): Record<string, string> {
  const home = os.homedir();
  const username = os.userInfo().username;
  const inherited = filteredEnvironment();
  const pathEntries = [
    `${home}/.local/bin`,
    `${home}/.opencode/bin`,
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    ...(inherited.PATH ?? '').split(path.delimiter)
  ].filter(Boolean);
  return {
    ...inherited,
    HOME: home,
    USER: username,
    LOGNAME: username,
    SHELL: shell,
    TERM: inherited.TERM ?? 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'FORGE',
    PATH: [...new Set(pathEntries)].join(path.delimiter)
  };
}

/**
 * Select a shell that exists on the minimal Linux systems FORGE supports when
 * a graphical launcher did not preserve the user's SHELL environment variable.
 */
export function defaultTerminalShell(environment: NodeJS.ProcessEnv = process.env): string {
  const configuredShell = environment.SHELL;
  if (configuredShell && path.isAbsolute(configuredShell)) return configuredShell;
  if (process.platform === 'win32') return environment.COMSPEC || 'cmd.exe';
  return '/bin/bash';
}

export class ShellService {
  private readonly running = new Map<string, ChildProcess>();
  constructor(private readonly workspaceRoot: () => string | null, private readonly outputLimit = 1_000_000) {}

  async run(input: ShellRunInput, requestId: string = randomUUID()): Promise<ShellRunOutput> {
    const root = this.workspaceRoot();
    if (!root) throw new Error('Open a workspace before running a shell tool.');
    if (!input.command.trim() || input.command.includes('\0')) throw new Error('A valid executable is required.');
    if (input.args.some((argument) => argument.includes('\0'))) throw new Error('Shell arguments may not contain null bytes.');
    assertNetworkProfile(input);
    const cwd = await resolveWorkspacePath(root, input.workingDirectory || '.');
    const timeoutMs = Math.min(Math.max(input.timeoutMs, 100), 10 * 60_000);
    const environment = filteredEnvironment(input.environment, input.environmentAllowlist);

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let truncated = false;
      let timedOut = false;
      let cancelled = false;
      let settled = false;
      const child = spawn(input.command, input.args, { cwd, env: environment, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      this.running.set(requestId, child);
      const append = (current: string, chunk: Buffer): string => {
        if (current.length >= this.outputLimit) { truncated = true; return current; }
        const next = current + chunk.toString('utf8');
        if (next.length > this.outputLimit) { truncated = true; return next.slice(0, this.outputLimit); }
        return next;
      };
      child.stdout?.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
      child.stderr?.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
      const stopTree = (): void => {
        if (!child.pid) return;
        try { if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
      };
      const timer = setTimeout(() => { timedOut = true; stopTree(); }, timeoutMs);
      child.once('error', (error) => {
        clearTimeout(timer); this.running.delete(requestId);
        if (!settled) { settled = true; reject(error); }
      });
      child.once('close', (code, signal) => {
        clearTimeout(timer); this.running.delete(requestId);
        cancelled = cancelled || this.cancelled.has(requestId); this.cancelled.delete(requestId);
        if (!settled) { settled = true; resolve({ stdout, stderr, exitCode: code, signal, timedOut, cancelled, truncated }); }
      });
    });
  }

  async startBackground(input: ShellRunInput, outputPath: string, requestId: string = randomUUID()): Promise<BackgroundShellRunOutput> {
    const root = this.workspaceRoot(); if (!root) throw new Error('Open a workspace before running a background shell task.');
    if (!input.command.trim() || input.command.includes('\0') || input.args.some((argument) => argument.includes('\0'))) throw new Error('A valid executable and null-free arguments are required.');
    assertNetworkProfile(input);
    if (!outputPath || path.isAbsolute(outputPath) || outputPath.split(/[\\/]/).includes('..')) throw new Error('Background output path must be workspace-relative.');
    const cwd = await resolveWorkspacePath(root, input.workingDirectory || '.'); const realRoot = await fs.realpath(root); const requestedOutput = path.resolve(root, outputPath);
    if (requestedOutput === path.resolve(root) || !requestedOutput.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error('Background output path escapes the active workspace.');
    await fs.mkdir(path.dirname(requestedOutput), { recursive: true }); const realParent = await fs.realpath(path.dirname(requestedOutput));
    if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path.sep}`)) throw new Error('Background output path resolves outside the active workspace.');
    const absoluteOutput = path.join(realParent, path.basename(requestedOutput)); const output = await fs.open(absoluteOutput, 'a'); const environment = filteredEnvironment(input.environment, input.environmentAllowlist); const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const child = spawn(input.command, input.args, { cwd, env: environment, shell: false, detached: true, stdio: ['ignore', output.fd, output.fd] });
      const cleanupError = (error: Error): void => { this.running.delete(requestId); void output.close(); reject(error); };
      child.once('error', cleanupError);
      child.once('spawn', () => {
        child.removeListener('error', cleanupError); this.running.set(requestId, child); child.unref(); void output.close();
        const timeoutMs = Math.min(Math.max(input.timeoutMs, 100), 24 * 60 * 60_000);
        const timer = setTimeout(() => {
          const running = this.running.get(requestId);
          if (!running?.pid) return;
          try {
            if (process.platform === 'win32') running.kill('SIGTERM');
            else process.kill(-running.pid, 'SIGTERM');
          } catch {
            running.kill('SIGTERM');
          }
        }, timeoutMs);
        timer.unref();
        child.once('close', () => { clearTimeout(timer); this.running.delete(requestId); });
        resolve({ requestId, pid: child.pid!, outputPath, startedAt });
      });
    });
  }

  private readonly cancelled = new Set<string>();
  cancel(requestId: string): boolean {
    const child = this.running.get(requestId);
    if (!child?.pid) return false;
    this.cancelled.add(requestId);
    try { if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    return true;
  }
}

export type TerminalState = 'running' | 'exited';
export interface TerminalSessionInfo { id: string; cwd: string; pid: number; state: TerminalState; exitCode: number | null; createdAt: number; title: string; recentOutput: string; }
export interface TerminalEvent { sessionId: string; type: 'output' | 'exit'; data?: string; exitCode?: number; }

interface TerminalSession { info: TerminalSessionInfo; process: pty.IPty; workspaceRoot: string; canonicalWorkspaceRoot: string; }

export class TerminalService {
  private readonly sessions = new Map<string, TerminalSession>();
  constructor(private readonly workspaceRoot: () => string | null, private readonly publish: (event: TerminalEvent) => void, private readonly outputLimit = 120_000) {}

  async create(requestedCwd = '.', columns = 100, rows = 30, requestedId?: string): Promise<TerminalSessionInfo> {
    const root = this.workspaceRoot();
    if (!root) throw new Error('Open a workspace before creating a terminal.');
    const cwd = await resolveWorkspacePath(root, requestedCwd);
    const canonicalWorkspaceRoot = await fs.realpath(root);
    const id = requestedId ?? randomUUID();
    if (this.sessions.has(id)) throw new Error('Terminal session already exists.');
    const shell = defaultTerminalShell();
    const terminal = pty.spawn(shell, ['-l'], { name: 'xterm-256color', cols: Math.max(20, columns), rows: Math.max(5, rows), cwd, env: terminalEnvironment(shell) });
    const info: TerminalSessionInfo = { id, cwd, pid: terminal.pid, state: 'running', exitCode: null, createdAt: Date.now(), title: path.basename(cwd), recentOutput: '' };
    const session = { info, process: terminal, workspaceRoot: root, canonicalWorkspaceRoot };
    this.sessions.set(id, session);
    terminal.onData((data) => {
      info.recentOutput = `${info.recentOutput}${data}`.slice(-this.outputLimit);
      this.publish({ sessionId: id, type: 'output', data });
    });
    terminal.onExit(({ exitCode }) => {
      info.state = 'exited'; info.exitCode = exitCode;
      this.publish({ sessionId: id, type: 'exit', exitCode });
    });
    return { ...info };
  }

  list(): TerminalSessionInfo[] { return [...this.sessions.values()].map(({ info }) => ({ ...info })); }
  input(id: string, data: string): void {
    const session = this.required(id);
    if (session.info.state !== 'running') throw new Error('Terminal session is not running.');
    if (!data || data.length > 65_536 || data.includes('\0')) throw new Error('Terminal input must contain between 1 and 65,536 non-null characters.');
    session.process.write(data);
  }
  resize(id: string, columns: number, rows: number): void { this.required(id).process.resize(Math.max(20, columns), Math.max(5, rows)); }
  terminate(id: string): void { const session = this.required(id); if (session.info.state === 'running') session.process.kill(); }
  async restart(id: string): Promise<TerminalSessionInfo> { const current = this.required(id); const relative = path.relative(current.canonicalWorkspaceRoot, current.info.cwd) || '.'; this.terminate(id); this.sessions.delete(id); return this.create(relative, 100, 30, id); }
  remove(id: string): void { this.terminate(id); this.sessions.delete(id); }
  dispose(): void { for (const id of [...this.sessions.keys()]) this.remove(id); }
  private required(id: string): TerminalSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Unknown terminal session.');
    if (this.workspaceRoot() !== session.workspaceRoot) throw new Error('Terminal session does not belong to the active workspace.');
    return session;
  }
}
