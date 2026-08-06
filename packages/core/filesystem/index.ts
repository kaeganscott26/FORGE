import { randomUUID } from 'node:crypto';
import { constants, promises as fs, watch as watchFs, type FSWatcher } from 'node:fs';
import * as path from 'node:path';

export type FileData = string | Uint8Array;
export type FileEntryType = 'file' | 'directory' | 'symbolic-link' | 'other';
export type FileChangeType = 'created' | 'changed' | 'deleted' | 'renamed';

export interface FileEntry {
  path: string;
  name: string;
  type: FileEntryType;
  size: number;
  createdAt: number;
  modifiedAt: number;
}

export interface FileChange {
  type: FileChangeType;
  path: string;
}

export interface WriteFileOptions {
  createParents?: boolean;
  atomic?: boolean;
}

export interface CreateFileOptions {
  createParents?: boolean;
}

export interface DeleteFileOptions {
  recursive?: boolean;
}

export interface MoveFileOptions {
  overwrite?: boolean;
  createParents?: boolean;
}

export interface ListDirectoryOptions {
  recursive?: boolean;
  maxDepth?: number;
  includeHidden?: boolean;
}

export interface WatchDirectoryOptions {
  recursive?: boolean;
  persistent?: boolean;
}

export interface DirectoryWatcher extends AsyncIterable<FileChange> {
  close(): Promise<void>;
  onEvent(listener: (event: FileChange) => void): () => void;
  onError(listener: (error: Error) => void): () => void;
}

export interface FileSystem {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, data: FileData, options?: WriteFileOptions): Promise<void>;
  createFile(filePath: string, data?: FileData, options?: CreateFileOptions): Promise<void>;
  deleteFile(filePath: string, options?: DeleteFileOptions): Promise<void>;
  moveFile(sourcePath: string, destinationPath: string, options?: MoveFileOptions): Promise<void>;
  renameFile(filePath: string, newName: string, options?: MoveFileOptions): Promise<string>;
  watchDirectory(directoryPath: string, options?: WatchDirectoryOptions): Promise<DirectoryWatcher>;
  listDirectory(directoryPath: string, options?: ListDirectoryOptions): Promise<FileEntry[]>;
  ensureDirectory(directoryPath: string): Promise<void>;
  pathExists(targetPath: string): Promise<boolean>;
  stat(targetPath: string): Promise<FileEntry>;
  realPath(targetPath: string): Promise<string>;
}

class NodeDirectoryWatcher implements DirectoryWatcher {
  private readonly listeners = new Set<(event: FileChange) => void>();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private readonly queued: FileChange[] = [];
  private readonly waiters: Array<{
    resolve: (result: IteratorResult<FileChange>) => void;
    reject: (error: Error) => void;
  }> = [];
  private closed = false;
  private terminalError: Error | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(private readonly watcher: FSWatcher) {}

  usePolling(poll: () => Promise<void>, persistent: boolean, replaceNativeWatcher = true): void {
    if (this.closed || this.pollingTimer) return;
    if (replaceNativeWatcher) this.watcher.close();
    const run = async (): Promise<void> => {
      if (this.closed || this.polling) return;
      this.polling = true;
      try { await poll(); }
      catch (error) { this.fail(error instanceof Error ? error : new Error(String(error))); }
      finally { this.polling = false; }
    };
    void run();
    this.pollingTimer = setInterval(() => void run(), 250);
    if (!persistent) this.pollingTimer.unref();
  }

  publish(event: FileChange): void {
    if (this.closed) return;
    for (const listener of this.listeners) listener(event);
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ done: false, value: event });
    else this.queued.push(event);
  }

  fail(error: Error): void {
    if (this.closed) return;
    this.terminalError = error;
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    for (const listener of this.errorListeners) listener(error);
    while (this.waiters.length > 0) this.waiters.shift()?.reject(error);
    this.listeners.clear();
    this.errorListeners.clear();
    this.closed = true;
  }

  onEvent(listener: (event: FileChange) => void): () => void {
    if (this.closed) throw new Error('The directory watcher is closed.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onError(listener: (error: Error) => void): () => void {
    if (this.terminalError) {
      listener(this.terminalError);
      return () => undefined;
    }
    if (this.closed) throw new Error('The directory watcher is closed.');
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.watcher.close();
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.listeners.clear();
    this.errorListeners.clear();
    while (this.waiters.length > 0) this.waiters.shift()?.resolve({ done: true, value: undefined });
  }

  [Symbol.asyncIterator](): AsyncIterator<FileChange> {
    return {
      next: async (): Promise<IteratorResult<FileChange>> => {
        const event = this.queued.shift();
        if (event) return { done: false, value: event };
        if (this.terminalError) throw this.terminalError;
        if (this.closed) return { done: true, value: undefined };
        return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
      },
      return: async (): Promise<IteratorResult<FileChange>> => {
        await this.close();
        return { done: true, value: undefined };
      }
    };
  }
}

function entryType(stats: Awaited<ReturnType<typeof fs.lstat>>): FileEntryType {
  if (stats.isFile()) return 'file';
  if (stats.isDirectory()) return 'directory';
  if (stats.isSymbolicLink()) return 'symbolic-link';
  return 'other';
}

async function toEntry(targetPath: string): Promise<FileEntry> {
  const stats = await fs.lstat(targetPath);
  return {
    path: targetPath,
    name: path.basename(targetPath),
    type: entryType(stats),
    size: stats.size,
    createdAt: stats.birthtimeMs,
    modifiedAt: stats.mtimeMs
  };
}

async function ensureParentDirectory(targetPath: string): Promise<void> {
  const parentPath = path.dirname(targetPath);
  try {
    const stats = await fs.stat(parentPath);
    if (!stats.isDirectory()) throw new Error(`Parent path is not a directory: ${parentPath}`);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    await fs.mkdir(parentPath, { recursive: true });
  }
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

export async function writeFile(filePath: string, data: FileData, options: WriteFileOptions = {}): Promise<void> {
  const { createParents = true, atomic = true } = options;
  if (createParents) await ensureParentDirectory(filePath);
  if (!atomic) {
    await fs.writeFile(filePath, data);
    return;
  }

  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporaryPath, data, { flag: 'wx' });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function createFile(filePath: string, data: FileData = '', options: CreateFileOptions = {}): Promise<void> {
  if (options.createParents ?? true) await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, data, { flag: 'wx' });
}

export async function deleteFile(filePath: string, options: DeleteFileOptions = {}): Promise<void> {
  const stats = await fs.lstat(filePath);
  if (stats.isDirectory()) await fs.rm(filePath, { recursive: options.recursive ?? false, force: false });
  else await fs.unlink(filePath);
}

export async function moveFile(sourcePath: string, destinationPath: string, options: MoveFileOptions = {}): Promise<void> {
  const { overwrite = false, createParents = true } = options;
  if (!overwrite) {
    const destinationExists = await fs.access(destinationPath, constants.F_OK).then(() => true).catch(() => false);
    if (destinationExists) throw new Error(`Destination already exists: ${destinationPath}`);
  }
  if (createParents) await ensureParentDirectory(destinationPath);

  try {
    if (overwrite) await fs.rm(destinationPath, { recursive: true, force: true });
    await fs.rename(sourcePath, destinationPath);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EXDEV') throw error;
    await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: !overwrite, force: overwrite });
    await fs.rm(sourcePath, { recursive: true, force: false });
  }
}

export async function renameFile(filePath: string, newName: string, options: MoveFileOptions = {}): Promise<string> {
  if (!newName || newName === '.' || newName === '..' || path.basename(newName) !== newName) {
    throw new Error('A new file name must be a non-empty base name.');
  }
  const destinationPath = path.join(path.dirname(filePath), newName);
  await moveFile(filePath, destinationPath, options);
  return destinationPath;
}

export async function watchDirectory(directoryPath: string, options: WatchDirectoryOptions = {}): Promise<DirectoryWatcher> {
  const stats = await fs.stat(directoryPath);
  if (!stats.isDirectory()) throw new Error(`Cannot watch a non-directory path: ${directoryPath}`);

  const recursive = options.recursive ?? false;
  const persistent = options.persistent ?? true;
  const takeSnapshot = async (): Promise<Map<string, string>> => {
    const snapshot = new Map<string, string>();
    const visit = async (currentPath: string): Promise<void> => {
      for (const entry of await fs.readdir(currentPath, { withFileTypes: true })) {
        const entryPath = path.join(currentPath, entry.name);
        const entryStats = await fs.lstat(entryPath).catch(() => null);
        if (!entryStats) continue;
        snapshot.set(entryPath, `${entryStats.mtimeMs}:${entryStats.size}:${entryStats.mode}`);
        if (recursive && entry.isDirectory()) await visit(entryPath);
      }
    };
    await visit(directoryPath);
    return snapshot;
  };
  let previousSnapshot = await takeSnapshot();
  let adapter: NodeDirectoryWatcher; // eslint-disable-line prefer-const -- initialized after watchFs so its callback can close over the adapter
  let reconciliation = Promise.resolve();
  const reconcileSnapshot = (): Promise<void> => {
    const run = async (): Promise<void> => {
      const nextSnapshot = await takeSnapshot();
      for (const [entryPath, signature] of nextSnapshot) {
        if (!previousSnapshot.has(entryPath)) adapter.publish({ type: 'created', path: entryPath });
        else if (previousSnapshot.get(entryPath) !== signature) adapter.publish({ type: 'changed', path: entryPath });
      }
      for (const entryPath of previousSnapshot.keys()) {
        if (!nextSnapshot.has(entryPath)) adapter.publish({ type: 'deleted', path: entryPath });
      }
      previousSnapshot = nextSnapshot;
    };
    reconciliation = reconciliation.then(run, run);
    return reconciliation;
  };
  const watcher = watchFs(directoryPath, {
    recursive,
    persistent,
    encoding: 'utf8'
  }, async (eventType, fileName) => {
    if (!fileName || fileName === path.basename(directoryPath)) {
      await reconcileSnapshot();
      return;
    }
    const changedPath = path.resolve(directoryPath, fileName);
    if (changedPath === path.resolve(directoryPath)) {
      await reconcileSnapshot();
      return;
    }
    let type: FileChangeType = 'changed';
    if (eventType === 'rename') {
      const exists = await fs.access(changedPath, constants.F_OK).then(() => true).catch(() => false);
      type = exists ? 'created' : 'deleted';
    }
    adapter.publish({ type, path: changedPath });
    const changedStats = await fs.lstat(changedPath).catch(() => null);
    if (changedStats) previousSnapshot.set(changedPath, `${changedStats.mtimeMs}:${changedStats.size}:${changedStats.mode}`);
    else previousSnapshot.delete(changedPath);
  });
  adapter = new NodeDirectoryWatcher(watcher);
  // macOS can omit an fs.watch notification entirely. Keep a bounded snapshot
  // fallback beside native events so the workspace cannot remain stale.
  adapter.usePolling(reconcileSnapshot, persistent, false);
  watcher.on('error', (error) => {
    if ('code' in error && error.code === 'EMFILE') {
      watcher.close();
      return;
    }
    adapter.fail(error);
  });
  return adapter;
}

export async function listDirectory(directoryPath: string, options: ListDirectoryOptions = {}): Promise<FileEntry[]> {
  const recursive = options.recursive ?? false;
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  if (!Number.isInteger(maxDepth) && maxDepth !== Number.POSITIVE_INFINITY) throw new Error('maxDepth must be a non-negative integer.');
  if (maxDepth < 0) throw new Error('maxDepth must be a non-negative integer.');

  const entries: FileEntry[] = [];
  const visit = async (currentPath: string, depth: number): Promise<void> => {
    const children = await fs.readdir(currentPath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      if (!(options.includeHidden ?? true) && child.name.startsWith('.')) continue;
      const childPath = path.join(currentPath, child.name);
      entries.push(await toEntry(childPath));
      if (recursive && child.isDirectory() && depth < maxDepth) await visit(childPath, depth + 1);
    }
  };

  await visit(directoryPath, 0);
  return entries;
}

export class NodeFileSystem implements FileSystem {
  readFile(filePath: string): Promise<string> { return readFile(filePath); }
  writeFile(filePath: string, data: FileData, options?: WriteFileOptions): Promise<void> { return writeFile(filePath, data, options); }
  createFile(filePath: string, data?: FileData, options?: CreateFileOptions): Promise<void> { return createFile(filePath, data, options); }
  deleteFile(filePath: string, options?: DeleteFileOptions): Promise<void> { return deleteFile(filePath, options); }
  moveFile(sourcePath: string, destinationPath: string, options?: MoveFileOptions): Promise<void> { return moveFile(sourcePath, destinationPath, options); }
  renameFile(filePath: string, newName: string, options?: MoveFileOptions): Promise<string> { return renameFile(filePath, newName, options); }
  watchDirectory(directoryPath: string, options?: WatchDirectoryOptions): Promise<DirectoryWatcher> { return watchDirectory(directoryPath, options); }
  listDirectory(directoryPath: string, options?: ListDirectoryOptions): Promise<FileEntry[]> { return listDirectory(directoryPath, options); }
  ensureDirectory(directoryPath: string): Promise<void> { return fs.mkdir(directoryPath, { recursive: true }).then(() => undefined); }
  pathExists(targetPath: string): Promise<boolean> { return fs.access(targetPath, constants.F_OK).then(() => true).catch(() => false); }
  stat(targetPath: string): Promise<FileEntry> { return toEntry(targetPath); }
  realPath(targetPath: string): Promise<string> { return fs.realpath(targetPath); }
}
