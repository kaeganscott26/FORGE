/**
 * @forge/workspace — Filesystem workspace service
 *
 * Manages the open project directory: reading, writing, listing, watching files.
 * This service runs in the Electron main process and is the only code that
 * directly touches the filesystem for workspace operations.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type {
  FileNode,
  FileContent,
  WorkspaceInfo,
  ParsedMarkdown,
} from '@forge/ipc';

// ─── Ignored patterns ─────────────────────────────────────────────────────

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', '.next',
  '__pycache__', '.cache', '.parcel-cache', 'coverage', '.nuxt',
  '.turbo', '.vercel', '.idea', '.vscode',
]);

const IGNORED_FILE_PATTERNS = [
  /\.DS_Store$/, /\.log$/, /\.pyc$/, /\.class$/,
  /\.o$/, /\.exe$/, /\.dll$/, /\.so$/, /\.dylib$/,
];

// ─── Markdown Parser ───────────────────────────────────────────────────────

/**
 * Lightweight Markdown parser that extracts frontmatter, wiki-links, tags,
 * and heading hierarchy without a full AST. We intentionally avoid heavyweight
 * dependencies here — this runs on every file save and needs to be fast.
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const frontmatter: Record<string, unknown> = {};
  let body = content;

  // Extract frontmatter (YAML between --- delimiters)
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    body = content.slice(fmMatch[0].length);
    // Simple YAML parsing for key: value pairs
    for (const line of fmMatch[1].split('\n')) {
      const kvMatch = line.match(/^(\w[\w\s]*):\s*(.*)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        // Parse arrays [item1, item2]
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key] = value
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else {
          frontmatter[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  // Extract wiki-links [[note-name]] or [[note-name|alias]]
  const wikiLinks: string[] = [];
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = wikiLinkRegex.exec(body)) !== null) {
    if (match[1]) {
      wikiLinks.push(match[1].trim());
    }
  }

  // Extract #tags (not in code blocks)
  const tags: string[] = [];
  const lines = body.split('\n');
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const tagRegex = /(?:^|\s)#([\w-]+)/g;
    while ((match = tagRegex.exec(line)) !== null) {
      if (match[1] && !match[1].match(/^\d+$/)) {
        tags.push(match[1]);
      }
    }
  }

  // Extract headings
  const headings: { level: number; text: string; slug: string }[] = [];
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      headings.push({ level, text, slug });
    }
  }

  return {
    content: body,
    frontmatter,
    wikiLinks: [...new Set(wikiLinks)],
    tags: [...new Set(tags)],
    headings,
  };
}

// ─── Workspace Service ─────────────────────────────────────────────────────

export class WorkspaceService extends EventEmitter {
  private rootPath: string | null = null;
  private watcher: fsSync.FSWatcher | null = null;

  /** Open a workspace at the given path */
  async open(rootPath: string): Promise<WorkspaceInfo> {
    const stat = await fs.stat(rootPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootPath}`);
    }

    this.rootPath = path.resolve(rootPath);

    // Check for git repo
    let gitRoot: string | null = null;
    try {
      await fs.access(path.join(this.rootPath, '.git'));
      gitRoot = path.join(this.rootPath, '.git');
    } catch {
      // Walk up parent directories to find .git
      let current = this.rootPath;
      while (current !== path.dirname(current)) {
        try {
          await fs.access(path.join(current, '.git'));
          gitRoot = path.join(current, '.git');
          break;
        } catch {
          current = path.dirname(current);
        }
      }
    }

    const name = path.basename(this.rootPath);

    const info: WorkspaceInfo = {
      rootPath: this.rootPath,
      name,
      gitRoot,
      createdAt: stat.birthtime.getTime(),
    };

    return info;
  }

  getRootPath(): string | null {
    return this.rootPath;
  }

  isReady(): boolean {
    return this.rootPath !== null;
  }

  /** Close the current workspace */
  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.rootPath = null;
  }

  /** List files in a directory (or root if no path given) */
  async list(dirPath?: string): Promise<FileNode[]> {
    this.ensureOpen();
    const target = dirPath
      ? this.resolvePath(dirPath)
      : this.rootPath!;

    return this.listDirectory(target, '');
  }

  /** Recursively list directory contents.
   *  For large workspaces, this can be expensive. The UI should call
   *  list(dirPath) for lazy expansion instead of relying on full recursion.
   *  We cap recursion depth at 3 levels to prevent freezing on huge repos. */
  private async listDirectory(
    absPath: string,
    relativePath: string,
    depth = 0,
  ): Promise<FileNode[]> {
    const entries = await fs.readdir(absPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip ignored directories
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      // Skip ignored file patterns
      if (entry.isFile() && IGNORED_FILE_PATTERNS.some((p) => p.test(entry.name))) {
        continue;
      }

      const entryPath = path.join(absPath, entry.name);
      const relPath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      const node: FileNode = {
        path: entryPath,
        name: entry.name,
        relativePath: relPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        extension: entry.isFile()
          ? path.extname(entry.name).slice(1) || undefined
          : undefined,
      };

      if (entry.isDirectory()) {
        // Only recurse up to depth 2 for the initial tree.
        // Deeper levels are loaded lazily when the user expands the directory.
        if (depth < 2) {
          node.children = await this.listDirectory(entryPath, relPath, depth + 1);
        }
      } else {
        const stat = await fs.stat(entryPath);
        node.size = stat.size;
        node.modifiedAt = stat.mtimeMs;
      }

      nodes.push(node);
    }

    // Sort: directories first, then files, alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  /** Read a file's content */
  async readFile(filePath: string): Promise<FileContent> {
    this.ensureOpen();
    const absPath = this.resolvePath(filePath);
    const content = await fs.readFile(absPath, 'utf-8');
    const stat = await fs.stat(absPath);

    return {
      path: absPath,
      content,
      encoding: 'utf-8',
      modifiedAt: stat.mtimeMs,
    };
  }

  /** Write content to a file */
  async writeFile(filePath: string, content: string): Promise<{ path: string; modifiedAt: number }> {
    this.ensureOpen();
    const absPath = this.resolvePath(filePath);

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, 'utf-8');
    const stat = await fs.stat(absPath);

    return { path: absPath, modifiedAt: stat.mtimeMs };
  }

  /** Create a new file or directory */
  async create(
    targetPath: string,
    type: 'file' | 'directory',
    content?: string,
  ): Promise<FileNode> {
    this.ensureOpen();
    const absPath = this.resolvePath(targetPath);

    if (type === 'directory') {
      await fs.mkdir(absPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, content ?? '', 'utf-8');
    }

    const stat = await fs.stat(absPath);
    const relativePath = path.relative(this.rootPath!, absPath);

    return {
      path: absPath,
      name: path.basename(absPath),
      relativePath,
      type,
      extension: type === 'file'
        ? path.extname(absPath).slice(1) || undefined
        : undefined,
      size: stat.size,
      modifiedAt: stat.mtimeMs,
    };
  }

  /** Delete a file or directory */
  async delete(targetPath: string): Promise<void> {
    this.ensureOpen();
    const absPath = this.resolvePath(targetPath);
    const stat = await fs.stat(absPath);

    if (stat.isDirectory()) {
      await fs.rm(absPath, { recursive: true });
    } else {
      await fs.unlink(absPath);
    }
  }

  /** Rename or move a file/directory */
  async rename(oldPath: string, newPath: string): Promise<FileNode> {
    this.ensureOpen();
    const absOld = this.resolvePath(oldPath);
    const absNew = this.resolvePath(newPath);

    await fs.mkdir(path.dirname(absNew), { recursive: true });
    await fs.rename(absOld, absNew);

    const stat = await fs.stat(absNew);
    const relativePath = path.relative(this.rootPath!, absNew);

    return {
      path: absNew,
      name: path.basename(absNew),
      relativePath,
      type: stat.isDirectory() ? 'directory' : 'file',
      extension: stat.isFile()
        ? path.extname(absNew).slice(1) || undefined
        : undefined,
      size: stat.size,
      modifiedAt: stat.mtimeMs