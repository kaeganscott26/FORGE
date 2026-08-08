import * as path from 'node:path';
import type { FileSystem } from '../filesystem/index.js';
import type { Clock, Workspace } from '../workspace/index.js';

export const PROJECT_SCHEMA_VERSION = 1 as const;
export const PROJECT_FILE_NAME = 'project.json' as const;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ProjectStatus = 'active' | 'archived';

export interface ForgeProject {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, JsonValue>;
}

export interface NewProject {
  id: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  tags?: readonly string[];
  metadata?: Readonly<Record<string, JsonValue>>;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  tags?: readonly string[];
  metadata?: Readonly<Record<string, JsonValue>>;
}

export interface WorkspaceProvider {
  currentWorkspace(): Workspace | null;
}

export interface ProjectManagerDependencies {
  fileSystem: FileSystem;
  workspaceProvider: WorkspaceProvider;
  clock?: Clock;
}

const systemClock: Clock = { now: () => Date.now() };
const PROJECT_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,126}[A-Za-z0-9])?$/;

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

function validateProjectId(id: string): void {
  if (!PROJECT_ID_PATTERN.test(id)) {
    throw new Error('Project id must be 1-128 characters and use only letters, numbers, dots, underscores, or hyphens.');
  }
}

function normalizedName(name: string): string {
  const result = name.trim();
  if (!result) throw new Error('Project name is required.');
  if (result.length > 200) throw new Error('Project name cannot exceed 200 characters.');
  return result;
}

function normalizedTags(tags: readonly string[]): string[] {
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (normalized.some((tag) => tag.length > 80)) throw new Error('Project tags cannot exceed 80 characters.');
  return normalized;
}

function copyMetadata(metadata: Readonly<Record<string, JsonValue>>): Record<string, JsonValue> {
  return structuredClone(metadata) as Record<string, JsonValue>;
}

function copyProject(project: ForgeProject): ForgeProject {
  return { ...project, tags: [...project.tags], metadata: copyMetadata(project.metadata) };
}

function parseProject(content: string, sourcePath: string): ForgeProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Project metadata is not valid JSON: ${sourcePath}`, { cause: error });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Project metadata must be a JSON object: ${sourcePath}`);
  }

  const value = parsed as Partial<ForgeProject>;
  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) throw new Error(`Unsupported project schema version in ${sourcePath}`);
  if (typeof value.id !== 'string') throw new Error(`Project id is missing from ${sourcePath}`);
  validateProjectId(value.id);
  if (typeof value.name !== 'string') throw new Error(`Project name is missing from ${sourcePath}`);
  const name = normalizedName(value.name);
  if (value.description !== undefined && typeof value.description !== 'string') throw new Error(`Project description is invalid in ${sourcePath}`);
  if (value.status !== 'active' && value.status !== 'archived') throw new Error(`Project status is invalid in ${sourcePath}`);
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string')) throw new Error(`Project tags are invalid in ${sourcePath}`);
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) throw new Error(`Project createdAt is invalid in ${sourcePath}`);
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) throw new Error(`Project updatedAt is invalid in ${sourcePath}`);
  if (!value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata) || !isJsonValue(value.metadata)) {
    throw new Error(`Project metadata field is invalid in ${sourcePath}`);
  }

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: value.id,
    name,
    description: value.description,
    status: value.status,
    tags: normalizedTags(value.tags),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    metadata: copyMetadata(value.metadata)
  };
}

export class ProjectManager {
  private fileSystem: FileSystem;
  private workspaceProvider: WorkspaceProvider;
  private readonly clock: Clock;

  constructor(dependencies: ProjectManagerDependencies) {
    this.fileSystem = dependencies.fileSystem;
    this.workspaceProvider = dependencies.workspaceProvider;
    this.clock = dependencies.clock ?? systemClock;
  }

  async loadProject(projectId: string): Promise<ForgeProject> {
    validateProjectId(projectId);
    const projectPath = this.projectPath(projectId);
    if (!await this.fileSystem.pathExists(projectPath)) throw new Error(`Project does not exist: ${projectId}`);
    const project = parseProject(await this.fileSystem.readFile(projectPath), projectPath);
    if (project.id !== projectId) throw new Error(`Project id does not match its directory: ${projectPath}`);
    return copyProject(project);
  }

  async saveProject(input: NewProject): Promise<ForgeProject> {
    validateProjectId(input.id);
    if (input.description !== undefined && typeof input.description !== 'string') throw new Error('Project description must be a string.');
    if (input.status !== undefined && input.status !== 'active' && input.status !== 'archived') throw new Error('Project status is invalid.');
    if (input.metadata && !isJsonValue(input.metadata)) throw new Error('Project metadata must contain only JSON values.');
    const projectPath = this.projectPath(input.id);
    const existing = await this.fileSystem.pathExists(projectPath) ? await this.loadProject(input.id) : null;
    const now = this.clock.now();
    const project: ForgeProject = {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: input.id,
      name: normalizedName(input.name),
      description: input.description?.trim() || undefined,
      status: input.status ?? existing?.status ?? 'active',
      tags: normalizedTags(input.tags ?? existing?.tags ?? []),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: copyMetadata(input.metadata ?? existing?.metadata ?? {})
    };
    await this.fileSystem.ensureDirectory(path.dirname(projectPath));
    await this.fileSystem.writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`);
    return copyProject(project);
  }

  async updateProject(projectId: string, update: ProjectUpdate): Promise<ForgeProject> {
    const existing = await this.loadProject(projectId);
    if (update.name !== undefined) existing.name = normalizedName(update.name);
    if (update.description !== undefined) existing.description = update.description?.trim() || undefined;
    if (update.status !== undefined) {
      if (update.status !== 'active' && update.status !== 'archived') throw new Error('Project status is invalid.');
      existing.status = update.status;
    }
    if (update.tags !== undefined) existing.tags = normalizedTags(update.tags);
    if (update.metadata !== undefined) {
      if (!isJsonValue(update.metadata)) throw new Error('Project metadata must contain only JSON values.');
      existing.metadata = copyMetadata(update.metadata);
    }
    existing.updatedAt = this.clock.now();
    const projectPath = this.projectPath(projectId);
    await this.fileSystem.writeFile(projectPath, `${JSON.stringify(existing, null, 2)}\n`);
    return copyProject(existing);
  }

  async listProjects(): Promise<ForgeProject[]> {
    const projectsDirectory = this.projectsDirectory();
    await this.fileSystem.ensureDirectory(projectsDirectory);
    const entries = await this.fileSystem.listDirectory(projectsDirectory);
    const projects: ForgeProject[] = [];
    for (const entry of entries) {
      if (entry.type !== 'directory') continue;
      const projectFile = path.join(entry.path, PROJECT_FILE_NAME);
      if (!await this.fileSystem.pathExists(projectFile)) continue;
      projects.push(await this.loadProject(entry.name));
    }
    return projects.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  }

  private projectsDirectory(): string {
    const workspace = this.workspaceProvider.currentWorkspace();
    if (!workspace) throw new Error('A workspace must be open before accessing projects.');
    return workspace.directories['.projects'];
  }

  private projectPath(projectId: string): string {
    validateProjectId(projectId);
    return path.join(this.projectsDirectory(), projectId, PROJECT_FILE_NAME);
  }
}
