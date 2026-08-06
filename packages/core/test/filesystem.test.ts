import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeFileSystem } from '../filesystem/index.js';

describe('NodeFileSystem', () => {
  let rootPath: string;
  const fileSystem = new NodeFileSystem();

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(tmpdir(), 'forge-core-fs-'));
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('supports the complete file lifecycle and recursive listing', async () => {
    const originalPath = path.join(rootPath, 'nested', 'original.md');
    await fileSystem.createFile(originalPath, 'first');
    await expect(fileSystem.readFile(originalPath)).resolves.toBe('first');
    await expect(fileSystem.createFile(originalPath, 'duplicate')).rejects.toMatchObject({ code: 'EEXIST' });

    await fileSystem.writeFile(originalPath, 'second');
    const movedPath = path.join(rootPath, 'other', 'moved.md');
    await fileSystem.moveFile(originalPath, movedPath);
    const renamedPath = await fileSystem.renameFile(movedPath, 'renamed.md');
    expect(renamedPath).toBe(path.join(rootPath, 'other', 'renamed.md'));
    await expect(fileSystem.readFile(renamedPath)).resolves.toBe('second');

    const entries = await fileSystem.listDirectory(rootPath, { recursive: true });
    expect(entries.map((entry) => path.relative(rootPath, entry.path))).toContain(path.join('other', 'renamed.md'));
    expect(entries.find((entry) => entry.path === renamedPath)?.type).toBe('file');

    await fileSystem.deleteFile(renamedPath);
    await expect(fileSystem.pathExists(renamedPath)).resolves.toBe(false);
  });

  it('emits directory changes through the async watcher API', async () => {
    const watcher = await fileSystem.watchDirectory(rootPath, { persistent: false });
    const eventPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for filesystem event.')), 2_000);
      const unsubscribe = watcher.onEvent((event) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(path.basename(event.path));
      });
    });

    await fileSystem.createFile(path.join(rootPath, 'watched.txt'), 'content');
    await expect(eventPromise).resolves.toBe('watched.txt');
    await watcher.close();
  });
});
