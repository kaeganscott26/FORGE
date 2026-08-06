import * as path from 'node:path';
import type { FileSystem } from '../filesystem/index.js';

export const WORKSPACE_DIRECTORIES = [
  '.workspace',
  '.vault',
  '.notes',
  '.projects',
  '.cache',
  '.settings'
] as const;

export type WorkspaceDirectory = typeof WORKSPACE_DIRECTORIES[number];

export interface Workspace {
  rootPath: string;
  name: string;
  openedAt: number;
  createdAt: number;
  directories: Readonly<Record<WorkspaceDirectory, string>>;
}

export interface WorkspaceValidation {
  path: string;
  valid: boolean;
  missingDirectories: WorkspaceDirectory[];
  invalidEntries: WorkspaceDirectory[];
  errors: string[];
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface RecentWorkspaceStore {
  load(): Promise<RecentWorkspace[]>;
  save(workspaces: readonly RecentWorkspace[]): Promise<void>;
}

export interface Clock {
  now(): number;
}

export interface WorkspaceManagerDependencies {
  fileSystem: FileSystem;
  recentWorkspaceStore: RecentWorkspaceStore;
  clock?: Clock;
  recentWorkspaceLimit?: number;
}

const systemClock: Clock = { now: () => Date.now() };

function workspaceDirectories(rootPath: string): Record<WorkspaceDirectory, string> {
  return Object.fromEntries(
    WORKSPACE_DIRECTORIES.map((directory) => [directory, path.join(rootPath, directory)])
  ) as Record<WorkspaceDirectory, string>;
}

function assertRecentWorkspace(value: unknown): value is RecentWorkspace {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecentWorkspace>;
  return typeof candidate.path === 'string'
    && path.isAbsolute(candidate.path)
    && typeof candidate.name === 'string'
    && typeof candidate.lastOpenedAt === 'number'
    && Number.isFinite(candidate.lastOpenedAt);
}

export class JsonRecentWorkspaceStore implements RecentWorkspaceStore {
  constructor(
    private readonly fileSystem: FileSystem,
    private readonly storagePath: string
  ) {
    if (!path.isAbsolute(storagePath)) throw new Error('Recent workspace storage path must be absolute.');
  }

  async load(): Promise<RecentWorkspace[]> {
    if (!await this.fileSystem.pathExists(this.storagePath)) return [];
    const content = await this.fileSystem.readFile(this.storagePath);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Recent workspace data is not valid JSON: ${this.storagePath}`, { cause: error });
    }
    if (!Array.isArray(parsed) || !parsed.every(assertRecentWorkspace)) {
      throw new Error(`Recent workspace data has an invalid structure: ${this.storagePath}`);
    }
    return parsed.map((workspace) => ({ ...workspace }));
  }

  async save(workspaces: readonly RecentWorkspace[]): Promise<void> {
    if (!workspaces.every(assertRecentWorkspace)) throw new Error('Cannot save invalid recent workspace data.');
    await this.fileSystem.writeFile(this.storagePath, `${JSON.stringify(workspaces, null, 2)}\n`);
  }
}

export class InMemoryRecentWorkspaceStore implements RecentWorkspaceStore {
  private workspaces: RecentWorkspace[];

  constructor(initialWorkspaces: readonly RecentWorkspace[] = []) {
    if (!initialWorkspaces.every(assertRecentWorkspace)) throw new Error('Initial recent workspace data is invalid.');
    this.workspaces = initialWorkspaces.map((workspace) => ({ ...workspace }));
  }

  async load(): Promise<RecentWorkspace[]> {
    return this.workspaces.map((workspace) => ({ ...workspace }));
  }

  async save(workspaces: readonly RecentWorkspace[]): Promise<void> {
    if (!workspaces.every(assertRecentWorkspace)) throw new Error('Cannot save invalid recent workspace data.');
    this.workspaces = workspaces.map((workspace) => ({ ...workspace }));
  }
}

export class WorkspaceManager {
  private readonly fileSystem: FileSystem;
  private readonly recentWorkspaceStore: RecentWorkspaceStore;
  private readonly clock: Clock;
  private readonly recentWorkspaceLimit: number;
  private activeWorkspace: Workspace | null = null;

  constructor(dependencies: WorkspaceManagerDependencies) {
    this.fileSystem = dependencies.fileSystem;
    this.recentWorkspaceStore = dependencies.recentWorkspaceStore;
    this.clock = dependencies.clock ?? systemClock;
    this.recentWorkspaceLimit = dependencies.recentWorkspaceLimit ?? 10;
    if (!Number.isInteger(this.recentWorkspaceLimit) || this.recentWorkspaceLimit < 1) {
      throw new Error('recentWorkspaceLimit must be a positive integer.');
    }
  }

  async openWorkspace(workspacePath: string): Promise<Workspace> {
    if (!workspacePath.trim()) throw new Error('Workspace path is required.');
    const absolutePath = path.resolve(workspacePath);
    const resolvedPath = await this.fileSystem.realPath(absolutePath).catch((error: unknown) => {
      throw new Error(`Workspace does not exist: ${absolutePath}`, { cause: error });
    });
    const root = await this.fileSystem.stat(resolvedPath);
    if (root.type !== 'directory') throw new Error(`Workspace must be a directory: ${resolvedPath}`);

    const directories = workspaceDirectories(resolvedPath);
    await Promise.all(WORKSPACE_DIRECTORIES.map((directory) => this.fileSystem.ensureDirectory(directories[directory])));
    const validation = await this.validateWorkspace(resolvedPath);
    if (!validation.valid) {
      throw new Error(`Workspace structure is invalid: ${validation.errors.join('; ')}`);
    }

    const openedAt = this.clock.now();
    const workspace: Workspace = {
      rootPath: resolvedPath,
      name: path.basename(resolvedPath),
      openedAt,
      createdAt: root.createdAt,
      directories
    };
    await this.rememberWorkspace(workspace);
    this.activeWorkspace = workspace;
    return this.copyWorkspace(workspace);
  }

  async closeWorkspace(): Promise<void> {
    this.activeWorkspace = null;
  }

  currentWorkspace(): Workspace | null {
    return this.activeWorkspace ? this.copyWorkspace(this.activeWorkspace) : null;
  }

  async listRecentWorkspaces(): Promise<RecentWorkspace[]> {
    const workspaces = await this.recentWorkspaceStore.load();
    return workspaces
      .slice()
      .sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
      .map((workspace) => ({ ...workspace }));
  }

  async validateWorkspace(workspacePath?: string): Promise<WorkspaceValidation> {
    const candidatePath = workspacePath ?? this.activeWorkspace?.rootPath;
    if (!candidatePath) throw new Error('A workspace path is required when no workspace is open.');
    const absolutePath = path.resolve(candidatePath);
    const missingDirectories: WorkspaceDirectory[] = [];
    const invalidEntries: WorkspaceDirectory[] = [];
    const errors: string[] = [];

    if (!await this.fileSystem.pathExists(absolutePath)) {
      return { path: absolutePath, valid: false, missingDirectories, invalidEntries, errors: [`Workspace does not exist: ${absolutePath}`] };
    }
    const root = await this.fileSystem.stat(absolutePath);
    if (root.type !== 'directory') {
      return { path: absolutePath, valid: false, missingDirectories, invalidEntries, errors: [`Workspace is not a directory: ${absolutePath}`] };
    }

    for (const directory of WORKSPACE_DIRECTORIES) {
      const directoryPath = path.join(absolutePath, directory);
      if (!await this.fileSystem.pathExists(directoryPath)) {
        missingDirectories.push(directory);
        errors.push(`Missing required directory: ${directory}`);
        continue;
      }
      if ((await this.fileSystem.stat(directoryPath)).type !== 'directory') {
        invalidEntries.push(directory);
        errors.push(`Required workspace entry is not a directory: ${directory}`);
      }
    }

    return {
      path: absolutePath,
      valid: errors.length === 0,
      missingDirectories,
      invalidEntries,
      errors
    };
  }

  private async rememberWorkspace(workspace: Workspace): Promise<void> {
    const recent = await this.recentWorkspaceStore.load();
    const updated: RecentWorkspace[] = [
      { path: workspace.rootPath, name: workspace.name, lastOpenedAt: workspace.openedAt },
      ...recent.filter((entry) => entry.path !== workspace.rootPath)
    ].slice(0, this.recentWorkspaceLimit);
    await this.recentWorkspaceStore.save(updated);
  }

  private copyWorkspace(workspace: Workspace): Workspace {
    return { ...workspace, directories: { ...workspace.directories } };
  }
}
