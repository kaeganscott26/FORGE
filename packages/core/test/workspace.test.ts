import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeFileSystem } from '../filesystem/index.js';
import {
  InMemoryRecentWorkspaceStore,
  WORKSPACE_DIRECTORIES,
  WorkspaceManager
} from '../workspace/index.js';

describe('WorkspaceManager', () => {
  let rootPath: string;
  let now: number;
  let manager: WorkspaceManager;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(tmpdir(), 'forge-core-workspace-'));
    now = 1_000;
    manager = new WorkspaceManager({
      fileSystem: new NodeFileSystem(),
      recentWorkspaceStore: new InMemoryRecentWorkspaceStore(),
      clock: { now: () => now }
    });
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('opens a workspace, creates its structure, and tracks recent workspaces', async () => {
    const workspace = await manager.openWorkspace(rootPath);
    expect(workspace.rootPath).toBe(await fs.realpath(rootPath));
    expect(workspace.openedAt).toBe(1_000);
    for (const directory of WORKSPACE_DIRECTORIES) {
      await expect(fs.stat(path.join(rootPath, directory))).resolves.toMatchObject({});
    }
    await expect(manager.validateWorkspace()).resolves.toMatchObject({ valid: true, errors: [] });
    await expect(manager.listRecentWorkspaces()).resolves.toEqual([
      { path: workspace.rootPath, name: path.basename(rootPath), lastOpenedAt: 1_000 }
    ]);

    now = 2_000;
    await manager.openWorkspace(rootPath);
    expect(await manager.listRecentWorkspaces()).toHaveLength(1);
    expect((await manager.listRecentWorkspaces())[0].lastOpenedAt).toBe(2_000);

    await manager.closeWorkspace();
    expect(manager.currentWorkspace()).toBeNull();
  });

  it('reports missing and invalid workspace entries', async () => {
    await fs.mkdir(path.join(rootPath, '.notes'));
    await fs.writeFile(path.join(rootPath, '.projects'), 'not a directory');
    const validation = await manager.validateWorkspace(rootPath);
    expect(validation.valid).toBe(false);
    expect(validation.invalidEntries).toContain('.projects');
    expect(validation.missingDirectories).toContain('.workspace');
  });
});
