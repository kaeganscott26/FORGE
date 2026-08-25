import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { accessSync, promises as fs, watch, type FSWatcher } from 'node:fs';
import * as path from 'node:path';
import { isIP } from 'node:net';

export type ForgeLiveStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type ForgeLiveMode = 'static' | 'project-dev-server';
export interface ForgeLiveState {
  workspaceId: string; status: ForgeLiveStatus; mode: ForgeLiveMode; host?: string; port?: number; url?: string; pid?: number; startedAt?: number;
  error?: { code: string; message: string };
}
export interface ForgeLiveOptions { preferredPort?: number; portEnd?: number; debounceMs?: number; onState?: (state: ForgeLiveState) => void; onReload?: () => void; }

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 5500;
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', '.cache', '.forge', 'coverage', 'vendor']);
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.avif': 'image/avif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8'
};

export function isIgnoredPath(relativePath: string): boolean { return relativePath.replaceAll('\\', '/').split('/').some((part) => ignoredDirectories.has(part)); }

export function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return hostname === 'localhost' || hostname === '::1' || (isIP(hostname) === 4 && hostname === '127.0.0.1');
  } catch { return false; }
}

export async function allocateLoopbackPort(host = DEFAULT_HOST, start = DEFAULT_PORT, end = 5599): Promise<number> {
  for (let port = start; port <= end; port += 1) {
    const candidate = createServer();
    try {
      await new Promise<void>((resolve, reject) => { candidate.once('error', reject); candidate.listen(port, host, () => resolve()); });
      await new Promise<void>((resolve) => candidate.close(() => resolve()));
      return port;
    } catch { candidate.close(); }
  }
  throw Object.assign(new Error(`No loopback port is available in the range ${start}-${end}.`), { code: 'FORGE_LIVE_PORTS_EXHAUSTED' });
}

function errorCode(error: unknown): string { return error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : 'FORGE_LIVE_ERROR'; }
function safeMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function reloadClient(): string { return `<script>(function(){try{var e=new EventSource('/__forge_live');e.onmessage=function(m){if(m.data==='reload')location.reload()};e.onerror=function(){e.close();setTimeout(arguments.callee,1000)}}catch(_){}})();</script>`; }

export function injectReloadClient(html: string): string {
  const client = reloadClient();
  const closingBody = html.search(/<\/body\s*>/i);
  return closingBody < 0 ? `${html}\n${client}` : `${html.slice(0, closingBody)}${client}${html.slice(closingBody)}`;
}

export function detectProject(rootPath: string, packageJson?: Record<string, unknown> | null): { mode: ForgeLiveMode; reason: string } {
  if (packageJson && typeof packageJson.scripts === 'object' && packageJson.scripts !== null && ['dev', 'start'].some((name) => typeof (packageJson.scripts as Record<string, unknown>)[name] === 'string')) return { mode: 'project-dev-server', reason: 'package.json exposes an explicit dev/start script.' };
  return { mode: 'static', reason: 'FORGE Live will serve the workspace as a static web project.' };
}

export function packageManagerFor(rootPath: string, packageJson?: Record<string, unknown> | null): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  if (typeof packageJson?.packageManager === 'string') { const name = packageJson.packageManager.split('@')[0]; if (['npm', 'pnpm', 'yarn', 'bun'].includes(name)) return name as 'npm' | 'pnpm' | 'yarn' | 'bun'; }
  if (existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm'; if (existsSync(path.join(rootPath, 'yarn.lock'))) return 'yarn'; if (existsSync(path.join(rootPath, 'bun.lockb')) || existsSync(path.join(rootPath, 'bun.lock'))) return 'bun'; return 'npm';
}
function existsSync(value: string): boolean { try { accessSync(value); return true; } catch { return false; } }

export class ForgeLiveService {
  private server: Server | null = null; private watcher: FSWatcher | null = null; private poller: NodeJS.Timeout | null = null; private clients = new Set<ServerResponse>(); private timer: NodeJS.Timeout | null = null;
  private current: ForgeLiveState; private startPromise: Promise<ForgeLiveState> | null = null; private realRoot: string;
  constructor(private readonly rootPath: string, options: ForgeLiveOptions = {}) {
    this.rootPath = path.resolve(rootPath); this.realRoot = this.rootPath; this.preferredPort = options.preferredPort ?? DEFAULT_PORT; this.portEnd = options.portEnd ?? 5599; this.debounceMs = options.debounceMs ?? 150; this.options = options;
    this.current = { workspaceId: this.rootPath, status: 'stopped', mode: 'static' };
  }
  private readonly preferredPort: number; private readonly portEnd: number; private readonly debounceMs: number; private readonly options: ForgeLiveOptions;
  status(): ForgeLiveState { return { ...this.current, error: this.current.error ? { ...this.current.error } : undefined }; }
  async start(): Promise<ForgeLiveState> {
    if (this.current.status === 'running') return this.status(); if (this.startPromise) return this.startPromise;
    this.startPromise = this.startInternal().finally(() => { this.startPromise = null; }); return this.startPromise;
  }
  private async startInternal(): Promise<ForgeLiveState> {
    this.set({ ...this.current, status: 'starting', error: undefined });
    try {
      const stat = await fs.stat(this.rootPath); if (!stat.isDirectory()) throw new Error('The FORGE Live workspace must be a directory.'); this.realRoot = await fs.realpath(this.rootPath);
      const port = await allocateLoopbackPort(DEFAULT_HOST, this.preferredPort, this.portEnd);
      this.server = createServer((request, response) => { void this.handle(request, response); });
      await new Promise<void>((resolve, reject) => { this.server!.once('error', reject); this.server!.listen(port, DEFAULT_HOST, () => resolve()); });
      this.watchFiles();
      this.set({ workspaceId: this.rootPath, status: 'running', mode: 'static', host: DEFAULT_HOST, port, url: `http://${DEFAULT_HOST}:${port}`, startedAt: Date.now() });
      return this.status();
    } catch (error) { await this.cleanup(); const failure = { workspaceId: this.rootPath, status: 'error' as const, mode: 'static' as const, error: { code: errorCode(error), message: safeMessage(error) } }; this.set(failure); throw error; }
  }
  async stop(): Promise<ForgeLiveState> { if (this.current.status === 'stopped') return this.status(); this.set({ ...this.current, status: 'stopping' }); await this.cleanup(); this.set({ workspaceId: this.rootPath, status: 'stopped', mode: 'static' }); return this.status(); }
  async restart(): Promise<ForgeLiveState> { await this.stop(); return this.start(); }
  private async cleanup(): Promise<void> { this.watcher?.close(); this.watcher = null; if (this.poller) clearInterval(this.poller); this.poller = null; if (this.timer) clearTimeout(this.timer); this.timer = null; for (const client of this.clients) client.end(); this.clients.clear(); if (this.server) await new Promise<void>((resolve) => this.server!.close(() => resolve())); this.server = null; }
  private set(next: ForgeLiveState): void { this.current = next; this.options.onState?.(this.status()); }
  private watchFiles(): void {
    const notify = (): void => { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => { this.timer = null; for (const client of this.clients) client.write('data: reload\\n\\n'); this.options.onReload?.(); }, this.debounceMs); };
    try { this.watcher = watch(this.rootPath, { recursive: true }, (_event, filename) => { if (filename && !isIgnoredPath(filename.toString())) notify(); }); this.watcher.on('error', () => undefined); }
    catch { this.poller = setInterval(notify, Math.max(500, this.debounceMs * 4)); }
  }
  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.url === '/__forge_live') { response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': 'null' }); response.write(': connected\\n\\n'); this.clients.add(response); request.once('close', () => this.clients.delete(response)); return; }
    let requested: string; try { requested = decodeURIComponent((request.url ?? '/').split('?')[0]); } catch { response.writeHead(400); response.end('Bad request'); return; }
    if (!requested.startsWith('/')) requested = `/${requested}`;
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    if (isIgnoredPath(relative) || relative.replaceAll('\\', '/').split('/').includes('..')) { response.writeHead(403); response.end('Forbidden'); return; }
    const candidate = path.resolve(this.rootPath, relative);
    if (candidate !== this.rootPath && !candidate.startsWith(`${this.rootPath}${path.sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    try {
      let filePath = candidate; let stat = await fs.stat(filePath); const resolvedCandidate = await fs.realpath(filePath);
      if (resolvedCandidate !== this.realRoot && !resolvedCandidate.startsWith(`${this.realRoot}${path.sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
      if (stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = await fs.stat(filePath); }
      if (!stat.isFile()) throw new Error('not file');
      const extension = path.extname(filePath).toLowerCase(); const body = await fs.readFile(filePath); const output = extension === '.html' || extension === '.htm' ? injectReloadClient(body.toString('utf8')) : body;
      response.writeHead(200, { 'Content-Type': mimeTypes[extension] ?? 'application/octet-stream', 'Content-Length': Buffer.byteLength(output) }); response.end(output);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EACCES') { response.writeHead(403); response.end('Forbidden'); return; }
      const fallback = `<!doctype html><meta charset="utf-8"><title>FORGE Live</title><h1>No index.html found</h1><p>Create an index.html in this workspace to preview it with FORGE Live.</p>`;
      if (relative === 'index.html') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(fallback) }); response.end(fallback); } else { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
    }
  }
}
