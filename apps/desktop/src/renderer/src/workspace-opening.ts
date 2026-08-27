import type { IPCResult, WorkspaceInfo } from '@forge/ipc';

type WorkspaceChannel = 'workspace.open' | 'workspace.open.home' | 'workspace.info';
type WorkspaceInvoker = (channel: WorkspaceChannel, request?: undefined) => Promise<IPCResult<WorkspaceInfo | null> | null | undefined>;

function isWorkspaceInfo(value: unknown): value is WorkspaceInfo {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkspaceInfo>;
  return typeof candidate.rootPath === 'string'
    && candidate.rootPath.length > 0
    && typeof candidate.name === 'string'
    && (candidate.gitRoot === null || typeof candidate.gitRoot === 'string')
    && typeof candidate.createdAt === 'number';
}

function errorMessage(result: IPCResult<WorkspaceInfo | null> | null | undefined): string | null {
  return result && !result.success ? result.error.message : null;
}

export async function openWorkspaceFrom(
  channel: Exclude<WorkspaceChannel, 'workspace.info'>,
  invoke: WorkspaceInvoker
): Promise<WorkspaceInfo> {
  const opened = await invoke(channel, undefined);
  const failure = errorMessage(opened);
  if (failure) throw new Error(failure);
  if (opened?.success && isWorkspaceInfo(opened.data)) return opened.data;

  // The main process may already have committed the workspace transition even
  // when an IPC bridge drops the response payload. Re-read canonical state
  // instead of storing a null workspace in the renderer.
  const current = await invoke('workspace.info', undefined);
  const currentFailure = errorMessage(current);
  if (currentFailure) throw new Error(currentFailure);
  if (current?.success && isWorkspaceInfo(current.data)) return current.data;
  throw new Error('Forge opened the folder but did not return workspace information.');
}
