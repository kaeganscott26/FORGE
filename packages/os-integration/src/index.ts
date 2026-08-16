import { execFile, spawn } from 'node:child_process';
import { readFile, readdir, statfs } from 'node:fs/promises';
import { homedir, hostname, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const FIELD_CODE = /^%[fFuUdDnNickvm]$/;
export interface DesktopApplication { id: string; name: string; description: string; icon?: string; executable: string; arguments: string[]; categories: string[]; desktopFile: string; terminal: boolean; hidden: boolean; noDisplay: boolean; }
export interface ForgeOsContext { platform: string; forgeOsSession: boolean; shellMode: boolean; sessionType: string; recoveryMode: boolean; liveRecoveryMode: boolean; }
export interface SystemOverview { hostname: string; os: string; kernel: string; cpu: string; memoryBytes: number; storage: { totalBytes: number; freeBytes: number }; forgeVersion: string; forgeOsVersion: string; sessionType: string; }
function tokenizeExec(value: string): string[] {
  const tokens: string[] = []; let token = '', quote = '', escaped = false;
  for (const character of value.trim()) {
    if (escaped) { token += character; escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ''; else token += character; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (/\s/.test(character)) { if (token) { tokens.push(token); token = ''; } continue; }
    token += character;
  }
  if (escaped || quote) throw new Error('Malformed desktop Exec field.');
  if (token) tokens.push(token); return tokens;
}
export function parseDesktopEntry(contents: string, desktopFile: string): DesktopApplication | null {
  const values = new Map<string, string>(); let section = '';
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) { section = line.slice(1, -1); continue; }
    if (section !== 'Desktop Entry') continue; const separator = line.indexOf('=');
    if (separator > 0) values.set(line.slice(0, separator), line.slice(separator + 1));
  }
  if (values.get('Type') !== 'Application' || !values.get('Name') || !values.get('Exec')) return null;
  const tokens = tokenizeExec(values.get('Exec')!); if (!tokens.length || tokens[0].includes('\0')) return null;
  const arguments_: string[] = [];
  for (const token of tokens.slice(1)) { if (token === '%%') arguments_.push('%'); else if (FIELD_CODE.test(token) || /%[fFuUdDnNickvm]/.test(token)) continue; else arguments_.push(token); }
  return { id: path.basename(desktopFile), name: values.get('Name')!, description: values.get('Comment') ?? '', icon: values.get('Icon'), executable: tokens[0], arguments: arguments_, categories: (values.get('Categories') ?? '').split(';').filter(Boolean), desktopFile, terminal: values.get('Terminal') === 'true', hidden: values.get('Hidden') === 'true', noDisplay: values.get('NoDisplay') === 'true' };
}
function applicationDirectories(environment: NodeJS.ProcessEnv): string[] {
  const dataHome = environment.XDG_DATA_HOME || path.join(homedir(), '.local/share');
  return [dataHome, ...(environment.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':').filter(Boolean)].map((directory) => path.join(directory, 'applications'));
}
function trustedInternalApplication(application: DesktopApplication): boolean {
  if (!application.id.startsWith('forge-internal-') || application.desktopFile !== path.join('/usr/share/applications', application.id)) return false;
  return ['/usr/local/bin/forge-system-surface', '/usr/local/bin/forge-session-control'].includes(application.executable);
}
export class ForgeOsService {
  private applications = new Map<string, DesktopApplication>();
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env, private readonly operatingSystem: () => string = platform) {}
  context(): ForgeOsContext {
    const currentPlatform = this.operatingSystem();
    const forgeOsSession = currentPlatform === 'linux' && (this.environment.FORGE_OS_SESSION === '1' || this.environment.XDG_CURRENT_DESKTOP?.toUpperCase() === 'FORGE');
    const recoveryMode = forgeOsSession && this.environment.FORGE_RECOVERY_MODE === '1';
    const liveRecoveryMode = recoveryMode && this.environment.FORGE_LIVE_RECOVERY === '1';
    return { platform: currentPlatform, forgeOsSession, shellMode: forgeOsSession && this.environment.FORGE_SHELL_MODE !== '0', sessionType: this.environment.XDG_SESSION_TYPE || 'unknown', recoveryMode, liveRecoveryMode };
  }
  async discoverApplications(): Promise<DesktopApplication[]> {
    const discovered = new Map<string, DesktopApplication>();
    for (const directory of applicationDirectories(this.environment)) for (const file of (await readdir(directory).catch(() => [] as string[])).filter((entry) => entry.endsWith('.desktop')).sort()) {
      if (discovered.has(file)) continue; const desktopFile = path.join(directory, file); const parsed = parseDesktopEntry(await readFile(desktopFile, 'utf8').catch(() => ''), desktopFile); if (parsed) discovered.set(file, parsed);
    }
    this.applications = discovered; return [...discovered.values()].filter((entry) => !entry.hidden && !entry.noDisplay).sort((a, b) => a.name.localeCompare(b.name));
  }
  async launchApplication(id: string): Promise<void> {
    if (!this.context().shellMode) throw new Error('Application launch is available only in FORGE-OS shell mode.'); if (!this.applications.size) await this.discoverApplications();
    const application = this.applications.get(id);
    if (!application) throw new Error('Application is not available.');
    const trustedInternal = trustedInternalApplication(application);
    if ((application.hidden || application.noDisplay) && !trustedInternal) throw new Error('Application is not available.');
    const child = spawn(application.executable, application.arguments, { detached: true, stdio: 'ignore', shell: false, env: this.environment }); child.once('error', () => undefined); child.unref();
  }
  async overview(forgeVersion: string): Promise<SystemOverview> {
    const osRelease = await readFile('/etc/os-release', 'utf8').catch(() => ''); const pretty = /^PRETTY_NAME=(?:"([^"]+)"|(.*))$/m.exec(osRelease); const cpu = (await readFile('/proc/cpuinfo', 'utf8').catch(() => '')).match(/^model name\s*:\s*(.+)$/m)?.[1] ?? 'Unknown'; const disk = await statfs(homedir());
    return { hostname: hostname(), os: pretty?.[1] || pretty?.[2] || platform(), kernel: release(), cpu, memoryBytes: totalmem(), storage: { totalBytes: disk.blocks * disk.bsize, freeBytes: disk.bavail * disk.bsize }, forgeVersion, forgeOsVersion: this.environment.FORGE_OS_VERSION || '0.x development', sessionType: this.environment.XDG_SESSION_TYPE || 'unknown' };
  }
  async sessionAction(action: 'lock' | 'logout' | 'restart' | 'shutdown'): Promise<void> {
    if (!this.context().shellMode) throw new Error('Session actions are available only in FORGE-OS shell mode.');
    const sessionId = this.environment.XDG_SESSION_ID;
    if (action === 'lock') { await execFileAsync('loginctl', sessionId ? ['lock-session', sessionId] : ['lock-session'], { timeout: 10_000 }); return; }
    if (action === 'logout') {
      if (sessionId) await execFileAsync('loginctl', ['terminate-session', sessionId], { timeout: 10_000 });
      else await execFileAsync('systemctl', ['--user', 'exit'], { timeout: 10_000 });
      return;
    }
    const systemAction = action === 'restart' ? 'reboot' : 'poweroff';
    try { await execFileAsync('systemctl', [systemAction, '--no-block'], { timeout: 10_000 }); }
    catch { await execFileAsync('pkexec', ['/usr/bin/systemctl', systemAction, '--no-block'], { timeout: 10_000 }); }
  }
}
