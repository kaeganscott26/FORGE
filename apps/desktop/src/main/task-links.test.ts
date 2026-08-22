import { describe, expect, it } from 'vitest';
import { taskApprovalLink, taskEvidenceLink } from './task-links';

const linked = { taskId: 'task-1', stepId: 'inspect' };

describe('task tool links', () => {
  it('links task-context tools to both approvals and evidence', () => {
    const request = { toolName: 'file.read', input: { path: 'README.md', taskContext: linked } };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toEqual(linked);
  });

  it('prefers runtime-owned task linkage over provider-authored metadata', () => {
    const request = { toolName: 'file.read', input: { path: 'README.md', taskContext: linked }, executionContext: { taskId: 'runtime-task', stepId: 'runtime-step' } };
    expect(taskApprovalLink(request)).toEqual({ taskId: 'runtime-task', stepId: 'runtime-step' });
    expect(taskEvidenceLink(request)).toEqual({ taskId: 'runtime-task', stepId: 'runtime-step' });
  });

  it('projects direct checkpoint approval without treating its result as step evidence', () => {
    const request = { toolName: 'task.checkpoint', input: { ...linked, name: 'Inspected', summary: 'Observed.', verified: true } };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toBeNull();
  });

  it('links direct process starts to both approvals and evidence', () => {
    const request = { toolName: 'task.process.start', input: { command: 'npm', args: ['test'] }, executionContext: linked };
    expect(taskApprovalLink(request)).toEqual(linked);
    expect(taskEvidenceLink(request)).toEqual(linked);
  });

});
