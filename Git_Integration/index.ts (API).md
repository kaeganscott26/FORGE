/**
 * @forge/git — Git integration service
 *
 * Wraps simple-git to provide a clean, typed API for all Git operations.
 * Runs in the Electron main process. The renderer never touches Git directly.
 *
 * Design decisions:
 * - We use simple-git rather than spawning `git` processes manually because
 *   it handles edge cases (binary diffs, encoding, non-ASCII filenames) reliably.
 * - Diff parsing is done in-house to produce structured DiffLine objects that
 *   the Monaco diff editor can consume directly.
 */

import simpleGit, { type SimpleGit } from 'simple-git';
import type {
  GitStatus,
  GitStatusFile,
  GitStatusCode,
  GitCommit,
  GitBranch,
  GitDiff,
  GitDiffFile,
  GitDiffHunk,
  DiffLine,
} from '@forge/ipc';

export class GitService {
  private git: SimpleGit | null = null;
  private rootPath: string | null = null;

  /** Initialize Git service for a workspace root */
  async init(rootPath: string): Promise<boolean> {
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);
    // Check if this is actually a git repo
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      this.git = null;
      return false;
    }
    return true;
  }

  isReady(): boolean {
    return this.git !== null;
  }

  /** Get current git status */
  async getStatus(): Promise<GitStatus> {
    this.ensureReady();
    const status = await this.git!.status();

    // Fetch HEAD commit info from log
    let head: GitCommit | null = null;
    try {
      const log = await this.git!.log({ maxCount: 1 });
      if (log.latest) {
        head = {
          hash: log.latest.hash,
          shortHash: log.latest.hash.slice(0, 7),
          author: log.latest.author_name,
          email: log.latest.author_email,
          message: log.latest.message,
          timestamp: new Date(log.latest.date).getTime(),
        };
      }
    } catch {
      // No commits yet
    }

    const files: GitStatusFile[] = status.files.map((f) => {
      const indexStatus = this.parseStatusCode(f.index);
      const workingStatus = this.parseStatusCode(f.working_dir);
      return {
        path: f.path,
        indexStatus,
        workingStatus,
        untracked: f.working_dir === '?',
      };
    });

    return {
      branch: status.current || 'HEAD',
      ahead: status.ahead,
      behind: status.behind,
      files,
      head,
    };
  }

  /** List all branches */
  async getBranches(): Promise<GitBranch[]> {
    this.ensureReady();
    const branchSummary = await this.git!.branchLocal();

    return branchSummary.all.map((name) => ({
      name,
      current: name === branchSummary.current,
    }));
  }

  /** Get commit log */
  async getLog(limit = 50): Promise<GitCommit[]> {
    this.ensureReady();
    const log = await this.git!.log({ maxCount: limit });

    return log.all.map((entry) => ({
      hash: entry.hash,
      shortHash: entry.hash.slice(0, 7),
      author: entry.author_name,
      email: entry.author_email,
      message: entry.message,
      timestamp: new Date(entry.date).getTime(),
    }));
  }

  /** Stage files */
  async stage(files: string[]): Promise<void> {
    this.ensureReady();
    await this.git!.add(files);
  }

  /** Unstage files */
  async unstage(files: string[]): Promise<void> {
    this.ensureReady();
    // git reset HEAD <files>
    await this.git!.raw(['reset', 'HEAD', '--', ...files]);
  }

  /** Commit staged changes */
  async commit(message: string, files?: string[]): Promise<GitCommit> {
    this.ensureReady();
    if (files && files.length > 0) {
      await this.git!.add(files);
    }
    const result = await this.git!.commit(message);
    const log = await this.git!.log({ maxCount: 1 });

    const latest = log.latest;
    return {
      hash: result.commit,
      shortHash: result.commit.slice(0, 7),
      author: latest?.author_name ?? '',
      email: latest?.author_email ?? '',
      message: latest?.message ?? message,
      timestamp: latest ? new Date(latest.date).getTime() : Date.now(),
    };
  }

  /** Push to remote */
  async push(remote = 'origin', branch?: string): Promise<void> {
    this.ensureReady();
    const currentBranch = branch ?? (await this.git!.branch()).current;
    await this.git!.push(remote, currentBranch, { '--set-upstream': null });
  }

  /** Pull from remote */
  async pull(remote = 'origin', branch?: string): Promise<void> {
    this.ensureReady();
    const currentBranch = branch ?? (await this.git!.branch()).current;
    await this.git!.pull(remote, currentBranch);
  }

  /** Checkout a branch */
  async checkout(branch: string): Promise<void> {
    this.ensureReady();
    await this.git!.checkout(branch);
  }

  /** Create a new branch */
  async createBranch(name: string, from?: string): Promise<GitBranch> {
    this.ensureReady();
    if (from) {
      await this.git!.checkoutBranch(name, from);
    } else {
      await this.git!.checkoutLocalBranch(name);
    }
    return { name, current: true };
  }

  /** Get diff (staged or unstaged) as structured hunks */
  async getDiff(staged: boolean): Promise<GitDiff> {
    this.ensureReady();
    const diffText = staged
      ? await this.git!.diff(['--cached', '--no-color'])
      : await this.git!.diff(['--no-color']);

    return this.parseDiff(diffText);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private parseStatusCode(code: string): GitStatusCode {
    const valid: GitStatusCode[] = [' ', 'M', 'A', 'D', 'R', 'C', 'U', '?'];
    return valid.includes(code as GitStatusCode)
      ? (code as GitStatusCode)
      : 'M'; // Default to modified
  }

  private parseDiff(diffText: string): GitDiff {
    if (!diffText.trim()) {
      return { files: [] };
    }

    const files: GitDiffFile[] = [];
    const lines = diffText.split('\n');

    let currentFile: GitDiffFile | null = null;
    let currentHunk: GitDiffHunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // File header: diff --git a/path b/path
      const fileMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (fileMatch) {
        if (currentFile && currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        currentFile = {
          path: fileMatch[2],
          oldPath: fileMatch[1] !== fileMatch[2] ? fileMatch[1] : undefined,
          status: 'M',
          additions: 0,
          deletions: 0,
          hunks: [],
        };
        files.push(currentFile);
        currentHunk = null;
        continue;
      }

      // New file
      if (line.startsWith('new file')) {
        if (currentFile) currentFile.status = 'A';
        continue;
      }
      if (line.startsWith('deleted file')) {
        if (currentFile) currentFile.status = 'D';
        continue;
      }
      if (line.startsWith('rename from') || line.startsWith('rename to')) {
        if (currentFile) currentFile.status = 'R';
        continue;
      }

      // Hunk header: @@ -start,lines +start,lines @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        if (currentFile && currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: parseInt(hunkMatch[2] ?? '1', 10),
          newStart: parseInt(hunkMatch[3], 10),
          newLines: parseInt(hunkMatch[4] ?? '1', 10),
          lines: [],
        };
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[3], 10);
        continue;
      }

      if (!currentHunk) continue;

      // Diff lines
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          type: 'addition',
          oldLineNumber: null,
          newLineNumber: newLine++,
          content: line.slice(1),
        });
        if (currentFile) currentFile.additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          type: 'deletion',
          oldLineNumber: oldLine++,
          newLineNumber: null,
          content: line.slice(1),
        });
        if (currentFile) currentFile.deletions++;
      } else if (line.startsWith('\\')) {
        // No newline at end of file marker — skip
        continue;
      } else {
        currentHunk.lines.push({
          type: 'context',
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
          content: line.startsWith(' ') ? line.slice(1) : line,
        });
      }
    }

    // Push the last hunk
    if (currentFile && currentHunk) {
      currentFile.hunks.push(currentHunk);
    }

    return { files };
  }

  private ensureReady(): void {
    if (!this.git) {
      throw new Error('Git service not initialized. Call init() first.');
    }
  }
}

export const gitService = new GitService();
