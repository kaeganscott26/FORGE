import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeFileSystem } from '../filesystem/index.js';
import { ProjectManager } from '../project/index.js';
import { InMemoryRecentWorkspaceStore, WorkspaceManager } from '../workspace/index.js';

describe('ProjectManager', () => {
  let rootPath: string;
  let projects: ProjectManager;
  let now: number;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(tmpdir(), 'forge-core-project-'));
    const fileSystem = new NodeFileSystem();
    const workspace = new WorkspaceManager({
      fileSystem,
      recentWorkspaceStore: new InMemoryRecentWorkspaceStore()
    });
    await workspace.openWorkspace(rootPath);
    now = 100;
    projects = new ProjectManager({ fileSystem, workspaceProvider: workspace, clock: { now: () => now } });
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('saves, loads, updates, and lists project.json metadata', async () => {
    const saved = await projects.saveProject({
      id: 'forge-core',
      name: 'FORGE Core',
      description: 'Core infrastructure',
      tags: ['core', 'core'],
      metadata: { phase: 1, production: true }
    });
    expect(saved).toMatchObject({
      schemaVersion: 1,
      id: 'forge-core',
      status: 'active',
      tags: ['core'],
      createdAt: 100,
      updatedAt: 100
    });

    const projectPath = path.join(rootPath, '.projects', 'forge-core', 'project.json');
    await expect(fs.readFile(projectPath, 'utf8')).resolves.toContain('"schemaVersion": 1');
    await expect(projects.loadProject('forge-core')).resolves.toEqual(saved);

    now = 200;
    const updated = await projects.updateProject('forge-core', { name: 'FORGE Core API', status: 'archived' });
    expect(updated).toMatchObject({ name: 'FORGE Core API', status: 'archived', createdAt: 100, updatedAt: 200 });
    await expect(projects.listProjects()).resolves.toEqual([updated]);
  });

  it('rejects project identifiers that can escape the projects directory', async () => {
    await expect(projects.loadProject('../outside')).rejects.toThrow('Project id');
  });
});
