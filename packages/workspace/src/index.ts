import { EventEmitter } from 'node:events';
import { promises as fs, watch as watchFs } from 'node:fs';
import * as path from 'node:path';
import type { FileContent, FileNode, ParsedMarkdown, WorkspaceInfo } from '@forge/ipc';

const IGNORED = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.next', '.forge', 'coverage', '__pycache__']);
const TEXT_EXTENSIONS = new Set(['md', 'txt', 'ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'py', 'cpp', 'c', 'h', 'java', 'rs', 'go', 'yml', 'yaml']);

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
  async list(relativePath = ''): Promise<FileNode[]> { return this.listDirectory(await this.resolve(relativePath), relativePath, 0); }
  async readFile(relativePath: string): Promise<FileContent> { const absolute = await this.resolve(relativePath); const stat = await fs.stat(absolute); if (!stat.isFile()) throw new Error('Path is not a file.'); if (!TEXT_EXTENSIONS.has(path.extname(absolute).slice(1).toLowerCase())) throw new Error('Forge only opens supported text files.'); return { path: relativePath, content: await fs.readFile(absolute, 'utf8'), modifiedAt: stat.mtimeMs }; }
  async writeFile(relativePath: string, content: string): Promise<FileContent> { const absolute = await this.resolve(relativePath, true); await fs.mkdir(path.dirname(absolute), { recursive: true }); await fs.writeFile(absolute, content, 'utf8'); const stat = await fs.stat(absolute); return { path: relativePath, content, modifiedAt: stat.mtimeMs }; }
  async create(relativePath: string, type: 'file' | 'directory', content = ''): Promise<FileNode> { const absolute = await this.resolve(relativePath, true); if (type === 'directory') await fs.mkdir(absolute, { recursive: false }); else { await fs.mkdir(path.dirname(absolute), { recursive: true }); await fs.writeFile(absolute, content, { flag: 'wx' }); } return this.nodeFor(absolute); }
  async delete(relativePath: string): Promise<void> { const absolute = await this.resolve(relativePath); if (absolute === this.realRoot) throw new Error('Cannot delete the workspace root.'); await fs.rm(absolute, { recursive: true, force: false }); }
  async rename(oldPath: string, newPath: string): Promise<FileNode> { const oldAbsolute = await this.resolve(oldPath); const newAbsolute = await this.resolve(newPath, true); await fs.mkdir(path.dirname(newAbsolute), { recursive: true }); await fs.rename(oldAbsolute, newAbsolute); return this.nodeFor(newAbsolute); }
  async parse(relativePath: string): Promise<ParsedMarkdown> { return parseMarkdown((await this.readFile(relativePath)).content); }
  watch(): void { if (!this.rootPath) throw new Error('No workspace is open.'); this.watcher?.close(); this.watcher = watchFs(this.rootPath, { recursive: true }, (_event, filename) => { if (filename && !filename.toString().split(path.sep).some((part) => IGNORED.has(part))) this.emit('changed', filename.toString()); }); }

  private async listDirectory(absolute: string, relative: string, depth: number): Promise<FileNode[]> { const entries = await fs.readdir(absolute, { withFileTypes: true }); const nodes: FileNode[] = []; for (const entry of entries) { if (IGNORED.has(entry.name)) continue; const childRelative = relative ? path.join(relative, entry.name) : entry.name; const childAbsolute = path.join(absolute, entry.name); const node = await this.nodeFor(childAbsolute, childRelative); if (entry.isDirectory() && depth < 1) node.children = await this.listDirectory(childAbsolute, childRelative, depth + 1); nodes.push(node); } return nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1); }
  private async nodeFor(absolute: string, relative = path.relative(this.rootPath!, absolute)): Promise<FileNode> { const stat = await fs.stat(absolute); return { path: absolute, relativePath: relative, name: path.basename(absolute), type: stat.isDirectory() ? 'directory' : 'file', extension: stat.isFile() ? path.extname(absolute).slice(1) || undefined : undefined, size: stat.isFile() ? stat.size : undefined, modifiedAt: stat.mtimeMs }; }
  private async resolve(input: string, allowMissing = false): Promise<string> { if (!this.rootPath || !this.realRoot) throw new Error('No workspace is open.'); if (path.isAbsolute(input)) throw new Error('Workspace paths must be relative.'); const candidate = path.resolve(this.rootPath, input); if (candidate !== this.rootPath && !candidate.startsWith(`${this.rootPath}${path.sep}`)) throw new Error('Path escapes the workspace.'); const inspect = allowMissing ? path.dirname(candidate) : candidate; const resolved = await fs.realpath(inspect); if (resolved !== this.realRoot && !resolved.startsWith(`${this.realRoot}${path.sep}`)) throw new Error('Symlink escapes the workspace.'); return candidate; }
}
