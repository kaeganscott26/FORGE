import type { WorkspaceService } from '@forge/workspace';
import type { GitService } from '@forge/git';
import type { StorageService } from '@forge/storage';
import type { FileNode } from '@forge/ipc';

export interface ProjectContext {
  projectName: string | null;
  rootPath: string | null;
  files: Array<{ path: string; type: 'file' | 'directory'; extension?: string }>;
  readme?: { path: string; content: string } | null;
  packageJson?: { path: string; content: string } | null;
  gitStatus?: unknown | null;
  recentCommits?: Array<{ hash: string; message: string; author?: string; timestamp?: number }> | null;
  metadata?: unknown | null;
}

export class ContextBuilderImpl {
  constructor(private workspace: WorkspaceService, private git: GitService, private storage: StorageService) {}

  private flattenFiles(nodes: FileNode[], base = ''): Array<{ path: string; type: 'file' | 'directory'; extension?: string }> {
    const out: Array<{ path: string; type: 'file' | 'directory'; extension?: string }> = [];
    for (const n of nodes) {
      out.push({ path: n.relativePath || n.path, type: n.type, extension: n.extension });
      if (n.children && n.children.length) {
        out.push(...this.flattenFiles(n.children, n.relativePath));
      }
    }
    return out;
  }

  async buildContext(): Promise<ProjectContext> {
    const ctx: ProjectContext = { projectName: null, rootPath: null, files: [], readme: null, packageJson: null, gitStatus: null, recentCommits: null, metadata: null };
    // Workspace info
    try {
      const info = this.workspace.info();
      if (info) {
        ctx.projectName = info.name ?? null;
        ctx.rootPath = info.rootPath ?? null;
      }
    } catch (e) {
      // leave nulls
    }

    // File list
    try {
      const nodes = await this.workspace.list('');
      ctx.files = this.flattenFiles(nodes);
    } catch (e) {
      ctx.files = [];
    }

    // README
    try {
      const readme = await this.workspace.readFile('README.md').catch(() => null);
      if (readme) ctx.readme = { path: readme.path, content: readme.content };
    } catch (e) {
      ctx.readme = null;
    }

    // package.json
    try {
      const pkg = await this.workspace.readFile('package.json').catch(() => null);
      if (pkg) ctx.packageJson = { path: pkg.path, content: pkg.content };
    } catch (e) {
      ctx.packageJson = null;
    }

    // Git status and recent commits
    try {
      const status = await this.git.status();
      ctx.gitStatus = status;
    } catch (e) {
      ctx.gitStatus = null;
    }
    try {
      const commits = await this.git.log(10);
      ctx.recentCommits = Array.isArray(commits) && commits.length ? commits.map((c: any) => ({ hash: c.hash, message: c.message, author: c.author, timestamp: c.timestamp })) : null;
    } catch (e) {
      ctx.recentCommits = null;
    }

    // Storage metadata
    try {
      const meta = await this.storage.dashboard().catch(() => null);
      ctx.metadata = meta ?? null;
    } catch (e) {
      ctx.metadata = null;
    }

    return ctx;
  }
}

export default ContextBuilderImpl;
