import { describe, expect, it } from 'vitest';
import { reconcileTaskContext, taskApprovalLink, taskEvidenceLink } from './task-links';

const linked = { taskId: 'task-1', stepId: 'inspect' };

describe('task tool links', () => {
  it('links task-context tools to both approvals and evidence', () => {
    const request = { toolName: 'file.read', input: { path: 'README.md', taskContext: linked } };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toEqual(linked);
  });

  it('projects direct checkpoint approval without treating its result as step evidence', () => {
    const request = { toolName: 'task.checkpoint', input: { ...linked, name: 'Inspected', summary: 'Observed.', verified: true } };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toBeNull();
  });

  it('links direct process starts to both approvals and evidence', () => {
    const request = { toolName: 'task.process.start', input: linked };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toEqual(linked);
  });

  it('preserves only task context that resolves inside the active workspace', async () => {
    const valid = { name: 'file.read', arguments: { path: 'README.md', taskContext: linked } };
    const lookup = async (taskId: string) => ({ workspaceId: taskId === 'task-1' ? 'workspace-1' : 'workspace-2', steps: [{ id: 'inspect' }] });
    await expect(reconcileTaskContext(valid, 'workspace-1', lookup)).resolves.toBe(valid);
    await expect(reconcileTaskContext({ ...valid, arguments: { ...valid.arguments, taskContext: { taskId: 'foreign', stepId: 'inspect' } } }, 'workspace-1', lookup))
      .resolves.toEqual({ name: 'file.read', arguments: { path: 'README.md' } });
    await expect(reconcileTaskContext({ ...valid, arguments: { ...valid.arguments, taskContext: { taskId: 'task-1', stepId: 'missing' } } }, 'workspace-1', lookup))
      .resolves.toEqual({ name: 'file.read', arguments: { path: 'README.md' } });
  });

  it('strips malformed or unresolvable optional task context without changing tool arguments', async () => {
    const lookup = async (): Promise<never> => { throw new Error('missing'); };
    await expect(reconcileTaskContext({ name: 'git.status', arguments: { taskContext: { taskId: 'current', stepId: '1' } } }, 'workspace-1', lookup))
      .resolves.toEqual({ name: 'git.status', arguments: {} });
    await expect(reconcileTaskContext({ name: 'terminal.read', arguments: { maxCharacters: 500, taskContext: 'invalid' } }, 'workspace-1', lookup))
      .resolves.toEqual({ name: 'terminal.read', arguments: { maxCharacters: 500 } });
  });
});
