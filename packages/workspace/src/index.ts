import { EventEmitter } from 'node:events';
import { promises as fs, watch as watchFs, type Dirent } from 'node:fs';
import * as path from 'node:path';
import type { FileContent, FileNode, ParsedMarkdown, WorkspaceInfo } from '@forge/ipc';

const IGNORED = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.next', '.forge', 'coverage', '__pycache__']);
const IGNORED_PATH_PATTERNS = [
  /(?:^|[/])\.local[/]share[/]containers(?:[/]|$)/i,
  /(?:^|[/])\.cache(?:[/]|$)/i,
  /(?:^|[/])\.npm(?:[/]|$)/i,
  /(?:^|[/])\.cargo[/]registry(?:[/]|$)/i,
  /(?:^|[/])\.rustup(?:[/]|$)/i
];
function isSkippableFileSystemError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && ['EACCES', 'EPERM', 'ENOENT'].includes(String(error.code));
}
function shouldIgnore(relativePath: string): boolean {
  const normalized = relativePath.replaceAll('\\', '/');
  return normalized.split('/').some((part) => IGNORED.has(part)) || IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}
export function parseMarkdown(content: string): ParsedMarkdown {
  const frontmatter: Record<string, string | string[]> = {};
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const body = matched ? content.slice(matched[0].length) : content;
  if (matched) for (const line of matched[1].split(/\r?\n/)) {
    const pair = line.match(/^([\w-]+):\s*(.+)$/);
    if (pair) frontmatter[pair[1]] = pair[2].startsWith('[') ? pair[2].slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean) : pair[2].replace(/^['"]|['"]$/g, '');
  }
  const wikiLinks = [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].trim());
  const tags: string[] = []; let fenced = false;
  for (const line of body.split(/\r?\n/)) { if (line.trim().startsWith('```')) { fenced = !fenced; continue; } if (!fenced) tags.push(...[...line.matchAll(/(?:^|\s)#([\w-]+)/g)].map((m) => m[1])); }
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => ({ level: m[1].length, text: m[2].trim(), slug: m[2].trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') }));
  return { content: body, frontmatter, wikiLinks: [...new Set(wikiLinks)], tags: [...new Set(tags)], headings };
}

export class WorkspaceService extends EventEmitter {
  private rootPath: string | null = null;
  private realRoot: string | null = null;
  private workspaceInfo: WorkspaceInfo | null = null;
  private watcher?: ReturnType<typeof watchFs>;

  async open(rootPath: string): Promise<WorkspaceInfo> {
    const stat = await fs.stat(rootPath); if (!stat.isDirectory()) throw new Error('Workspace must be a directory.');
    this.rootPath = path.resolve(rootPath); this.realRoot = await fs.realpath(this.rootPath);
    const gitPath = path.join(this.rootPath, '.git'); const gitRoot = await fs.access(gitPath).then(() => gitPath).catch(() => null);
    this.workspaceInfo = { rootPath: this.rootPath, name: path.basename(this.rootPath), gitRoot, createdAt: stat.birthtimeMs };
    return { ...this.workspaceInfo };
  }
  info(): WorkspaceInfo | null { return this.workspaceInfo ? { ...this.workspaceInfo } : null; }
  async close(): Promise<void> { this.watcher?.close(); this.watcher = undefined; this.rootPath = null; this.realRoot = null; this.workspaceInfo = null; }
  async list(relativePath = '', options: { recursive?: boolean; maxEntries?: number } = {}): Promise<FileNode[]> {
    const budget = { count: 0, maximum: Math.max(1, options.maxEntries ?? 5_000) };
    return this.listDirectory(await this.resolve(relativePath), relativePath, options.recursive !== false, budget);
  }
  async readFile(relativePath: string): Promise<FileContent> {
    const absolute = await this.resolve(relativePath);
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) throw new Error('Path is not a file.');
    const bytes = await fs.readFile(absolute);
    if (bytes.includes(0)) throw new Error('Forge cannot open binary files. Choose a text or source file.');
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error('Forge could not decode this file as UTF-8 text.'); }
    return { path: relativePath, content, modifiedAt: stat.mtimeMs };
  }
  async writeFile(relativePath: string, content: string): Promise<FileContent> { const absolute = await this.resolve(relativePath, true); await fs.mkdir(path.dirname(absolute), { recursive: true }); await fs.writeFile(absolute, content, 'utf8'); const stat = await fs.stat(absolute); return { path: relativePath, content, modifiedAt: stat.mtimeMs }; }
  async create(relativePath: string, type: 'file' | 'directory', content = ''): Promise<FileNode> { const absolute = await this.resolve(relativePath, true); await fs.mkdir(path.dirname(absolute), { recursive: true }); if (type === 'directory') await fs.mkdir(absolute, { recursive: false }); else await fs.writeFile(absolute, content, { flag: 'wx' }); return this.nodeFor(absolute); }
  async delete(relativePath: string): Promise<void> { const absolute = await this.resolve(relativePath); if (absolute === this.realRoot) throw new Error('Cannot delete the workspace root.'); await fs.rm(absolute, { recursive: true, force: false }); }
  async rename(oldPath: string, newPath: string): Promise<FileNode> { const oldAbsolute = await this.resolve(oldPath); const newAbsolute = await this.resolve(newPath, true); await fs.mkdir(path.dirname(newAbsolute), { recursive: true }); await fs.rename(oldAbsolute, newAbsolute); return this.nodeFor(newAbsolute); }
  async copy(sourcePath: string, destinationPath: string): Promise<FileNode> {
    const source = await this.resolve(sourcePath);
    const destination = await this.resolve(destinationPath, true);
    if (source === destination) throw new Error('Cannot paste a file or folder onto itself.');
    await fs.access(destination).then(() => { throw new Error(`A file or folder already exists at ${destinationPath}.`); }).catch((error: unknown) => {
      if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
    });
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const sourceStat = await fs.stat(source);
    if (sourceStat.isDirectory() && destination.startsWith(`${source}${path.sep}`)) throw new Error('A folder cannot be copied into itself or one of its children.');
    await fs.cp(source, destination, { recursive: sourceStat.isDirectory(), force: false, errorOnExist: true });
    return this.nodeFor(destination);
  }
  async parse(relativePath: string): Promise<ParsedMarkdown> { return parseMarkdown((await this.readFile(relativePath)).content); }
  watch(): void {
    if (!this.rootPath) throw new Error('No workspace is open.');
    this.watcher?.close();
    try {
      this.watcher = watchFs(this.rootPath, { recursive: true }, (_event, filename) => { if (filename && !shouldIgnore(filename.toString())) this.emit('changed', filename.toString()); });
      this.watcher.on('error', (error) => { this.watcher?.close(); if (!isSkippableFileSystemError(error)) this.emit('watch-error', error); });
    } catch (error) {
      if (!isSkippableFileSystemError(error)) throw error;
    }
  }

  private async listDirectory(absolute: string, relative: string, recursive: boolean, budget: { count: number; maximum: number }): Promise<FileNode[]> {
    let entries: Dirent[];
    try { entries = await fs.readdir(absolute, { withFileTypes: true }); }
    catch (error) { if (isSkippableFileSystemError(error)) return []; throw error; }
    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (budget.count >= budget.maximum) break;
      const childRelative = relative ? path.join(relative, entry.name) : entry.name;
      if (shouldIgnore(childRelative) || entry.isSymbolicLink()) continue;
      const childAbsolute = path.join(absolute, entry.name);
      try {
        const node = await this.nodeFor(childAbsolute, childRelative);
        budget.count += 1;
        if (entry.isDirectory() && recursive) node.children = await this.listDirectory(childAbsolute, childRelative, recursive, budget);
        nodes.push(node);
      } catch (error) {
        if (!isSkippableFileSystemError(error)) throw error;
      }
    }
    return nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
  }
  private async nodeFor(absolute: string, relative = path.relative(this.rootPath!, absolute)): Promise<FileNode> { const stat = await fs.stat(absolute); return { path: absolute, relativePath: relative, name: path.basename(absolute), type: stat.isDirectory() ? 'directory' : 'file', extension: stat.isFile() ? path.extname(absolute).slice(1) || undefined : undefined, size: stat.isFile() ? stat.size : undefined, modifiedAt: stat.mtimeMs }; }
  private async resolve(input: string, allowMissing = false): Promise<string> { if (!this.rootPath || !this.realRoot) throw new Error('No workspace is open.'); if (path.isAbsolute(input)) throw new Error('Workspace paths must be relative.'); const candidate = path.resolve(this.rootPath, input); if (candidate !== this.rootPath && !candidate.startsWith(`${this.rootPath}${path.sep}`)) throw new Error('Path escapes the workspace.'); let inspect = candidate; if (allowMissing) while (inspect !== this.rootPath) { try { await fs.access(inspect); break; } catch { inspect = path.dirname(inspect); } } const resolved = await fs.realpath(inspect); if (resolved !== this.realRoot && !resolved.startsWith(`${this.realRoot}${path.sep}`)) throw new Error('Symlink escapes the workspace.'); return candidate; }
}
