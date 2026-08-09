import simpleGit, { type SimpleGit } from 'simple-git';
import type { DiffLine, GitBranch, GitCommit, GitDiff, GitDiffFile, GitStatus } from '@forge/ipc';
export * from './github';

const safeFiles = (files: string[]) => files.map((file) => { if (!file || file.startsWith('/') || file.split(/[\\/]/).includes('..')) throw new Error('Git paths must be workspace-relative.'); return file; });
const toCommit = (entry: { hash: string; author_name: string; author_email: string; message: string; date: string }): GitCommit => ({ hash: entry.hash, shortHash: entry.hash.slice(0, 7), author: entry.author_name, email: entry.author_email, message: entry.message, timestamp: new Date(entry.date).getTime() });

export class GitService {
  private git: SimpleGit | null = null;
  private rootPath: string | null = null;
  constructor(private readonly credentials?: () => Promise<{ username: string; token: string; askPassPath: string } | null>) {}
  async init(rootPath: string): Promise<boolean> { const git = simpleGit(rootPath); if (!await git.checkIsRepo()) { this.git = null; this.rootPath = null; return false; } this.git = git; this.rootPath = rootPath; return true; }
  async status(): Promise<GitStatus> { const git = this.ready(); const summary = await git.status(); let head: GitCommit | null = null; try { const log = await git.log({ maxCount: 1 }); if (log.latest) head = toCommit(log.latest); } catch { /* empty repository */ } return { branch: summary.current || 'HEAD', ahead: summary.ahead, behind: summary.behind, files: summary.files.map((file) => ({ path: file.path, indexStatus: file.index, workingStatus: file.working_dir, untracked: file.index === '?' || file.working_dir === '?' })), head }; }
  async branches(): Promise<GitBranch[]> { const data = await this.ready().branch(['-a']); return data.all.map((name) => ({ name, current: name === data.current })); }
  async log(limit = 30): Promise<GitCommit[]> { return (await this.ready().log({ maxCount: Math.min(Math.max(limit, 1), 100) })).all.map(toCommit); }
  async stage(files: string[]): Promise<void> { await this.ready().add(safeFiles(files)); }
  async unstage(files: string[]): Promise<void> { await this.ready().raw(['reset', 'HEAD', '--', ...safeFiles(files)]); }
  async commit(message: string, files?: string[]): Promise<GitCommit> { if (!message.trim()) throw new Error('Commit message is required.'); const git = this.ready(); if (files?.length) await git.add(safeFiles(files)); await git.commit(message.trim()); const latest = (await git.log({ maxCount: 1 })).latest; if (!latest) throw new Error('Git did not return the new commit.'); return toCommit(latest); }
  async pull(): Promise<void> { const git = await this.remoteGit(); const branch = (await git.branch()).current; await git.pull('origin', branch); }
  async push(): Promise<void> { const git = await this.remoteGit(); const branch = (await git.branch()).current; await git.push('origin', branch, ['--set-upstream']); }
  async originUrl(): Promise<string> { const origin = await this.ready().remote(['get-url', 'origin']); if (typeof origin !== 'string' || !origin.trim()) throw new Error('The active Git repository has no origin remote.'); return origin.trim(); }
  async diff(staged: boolean): Promise<GitDiff> { const text = await this.ready().diff(staged ? ['--cached', '--no-color'] : ['--no-color']); return parseDiff(text); }
  private ready(): SimpleGit { if (!this.git) throw new Error('The opened workspace is not a Git repository.'); return this.git; }
  private async remoteGit(): Promise<SimpleGit> {
    const git = this.ready();
    const remote = await git.remote(['get-url', 'origin']).catch(() => undefined);
    if (typeof remote !== 'string' || !/^https:\/\/github\.com\//i.test(remote.trim()) || !this.credentials || !this.rootPath) return git;
    const credentials = await this.credentials();
    if (!credentials) return git;
    return simpleGit({ baseDir: this.rootPath }).env({
      ...process.env,
      GIT_ASKPASS: credentials.askPassPath,
      GIT_TERMINAL_PROMPT: '0',
      FORGE_GITHUB_USERNAME: credentials.username,
      FORGE_GITHUB_TOKEN: credentials.token
    });
  }
}

export function parseDiff(text: string): GitDiff {
  const files: GitDiffFile[] = []; let current: GitDiffFile | undefined; let oldLine = 0; let newLine = 0;
  for (const line of text.split('\n')) {
    const header = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (header) { current = { path: header[2], status: 'M', additions: 0, deletions: 0, lines: [] }; files.push(current); continue; }
    if (!current) continue;
    if (line.startsWith('new file')) { current.status = 'A'; continue; }
    if (line.startsWith('deleted file')) { current.status = 'D'; continue; }
    if (line.startsWith('rename ')) { current.status = 'R'; continue; }
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/); if (hunk) { oldLine = Number(hunk[1]); newLine = Number(hunk[2]); continue; }
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('\\')) continue;
    let diffLine: DiffLine | undefined;
    if (line.startsWith('+')) { diffLine = { type: 'addition', oldLineNumber: null, newLineNumber: newLine++, content: line.slice(1) }; current.additions++; }
    else if (line.startsWith('-')) { diffLine = { type: 'deletion', oldLineNumber: oldLine++, newLineNumber: null, content: line.slice(1) }; current.deletions++; }
    else if (line.startsWith(' ')) diffLine = { type: 'context', oldLineNumber: oldLine++, newLineNumber: newLine++, content: line.slice(1) };
    if (diffLine) current.lines.push(diffLine);
  }
  return { files };
}
