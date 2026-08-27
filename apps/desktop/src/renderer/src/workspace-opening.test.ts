import { describe, expect, it, vi } from 'vitest';
import type { IPCResult, WorkspaceInfo } from '@forge/ipc';
import { openWorkspaceFrom } from './workspace-opening';

const workspace: WorkspaceInfo = {
  rootPath: 'C:\\projects\\forge',
  name: 'forge',
  gitRoot: 'C:\\projects\\forge\\.git',
  createdAt: 123
};

describe('openWorkspaceFrom', () => {
  it('uses workspace metadata returned by the open request', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: true, data: workspace });

    await expect(openWorkspaceFrom('workspace.open', invoke)).resolves.toEqual(workspace);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, { success: true, data: null }])('recovers a dropped open payload from canonical workspace state', async (dropped) => {
    const invoke = vi.fn()
      .mockResolvedValueOnce(dropped)
      .mockResolvedValueOnce({ success: true, data: workspace });

    await expect(openWorkspaceFrom('workspace.open', invoke)).resolves.toEqual(workspace);
    expect(invoke).toHaveBeenNthCalledWith(2, 'workspace.info', undefined);
  });

  it('preserves workspace selection cancellation without falling back to the previous workspace', async () => {
    const cancelled: IPCResult<WorkspaceInfo | null> = { success: false, error: { message: 'Workspace selection was cancelled.' } };
    const invoke = vi.fn().mockResolvedValue(cancelled);

    await expect(openWorkspaceFrom('workspace.open', invoke)).rejects.toThrow('Workspace selection was cancelled.');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('reports a missing canonical workspace instead of returning null', async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ success: true, data: null })
      .mockResolvedValueOnce({ success: true, data: null });

    await expect(openWorkspaceFrom('workspace.open.home', invoke)).rejects.toThrow('did not return workspace information');
  });
});
