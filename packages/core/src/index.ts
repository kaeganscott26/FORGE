import type { FileSystem } from '../filesystem/index.js';
import { NodeFileSystem } from '../filesystem/index.js';
import { ProjectManager } from '../project/index.js';
import { KeywordSearchEngine, type Tokenizer } from '../search/index.js';
import {
  JsonRecentWorkspaceStore,
  WorkspaceManager,
  type Clock,
  type RecentWorkspaceStore
} from '../workspace/index.js';

export * from '../filesystem/index.js';
export * from '../markdown/index.js';
export * from '../project/index.js';
export * from '../search/index.js';
export * from '../workspace/index.js';

export interface ForgeCore {
  fileSystem: FileSystem;
  workspace: WorkspaceManager;
  projects: ProjectManager;
  keywordSearch: KeywordSearchEngine;
}

export interface ForgeCoreDependencies {
  fileSystem?: FileSystem;
  recentWorkspaceStore?: RecentWorkspaceStore;
  recentWorkspacesFile?: string;
  clock?: Clock;
  tokenizer?: Tokenizer;
}

export function createForgeCore(dependencies: ForgeCoreDependencies): ForgeCore {
  const fileSystem = dependencies.fileSystem ?? new NodeFileSystem();
  const recentWorkspaceStore = dependencies.recentWorkspaceStore
    ?? (dependencies.recentWorkspacesFile
      ? new JsonRecentWorkspaceStore(fileSystem, dependencies.recentWorkspacesFile)
      : null);
  if (!recentWorkspaceStore) {
    throw new Error('Provide either recentWorkspaceStore or recentWorkspacesFile when creating FORGE core.');
  }

  const workspace = new WorkspaceManager({
    fileSystem,
    recentWorkspaceStore,
    clock: dependencies.clock
  });
  return {
    fileSystem,
    workspace,
    projects: new ProjectManager({ fileSystem, workspaceProvider: workspace, clock: dependencies.clock }),
    keywordSearch: new KeywordSearchEngine(fileSystem, dependencies.tokenizer)
  };
}
