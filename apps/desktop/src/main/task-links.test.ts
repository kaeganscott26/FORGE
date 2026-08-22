import { describe, expect, it } from 'vitest';
import { taskEvidenceLink } from './task-links';

const linked = { taskId: 'task-1', stepId: 'inspect' };

describe('task tool links', () => {
  it('uses runtime-owned task linkage and ignores provider-authored metadata', () => {
    const request = { toolName: 'file.read', input: { path: 'README.md', taskContext: linked }, executionContext: { taskId: 'runtime-task', stepId: 'runtime-step' } };
    expect(taskEvidenceLink(request)).toEqual({ taskId: 'runtime-task', stepId: 'runtime-step' });
  });

  it('does not let task-shaped provider input create a task link', () => {
    const request = { toolName: 'task.checkpoint', input: { ...linked, name: 'Inspected', summary: 'Observed.', verified: true } };
    expect(taskEvidenceLink(request)).toBeNull();
  });

  it('links direct process starts to task evidence', () => {
    const request = { toolName: 'task.process.start', input: { command: 'npm', args: ['test'] }, executionContext: linked };
    expect(taskEvidenceLink(request)).toEqual(linked);
  });

});
