export interface TaskLinkRequest {
  input: unknown;
  toolName?: string;
  executionContext?: { taskId?: string; stepId?: string };
}

export interface TaskStepLink {
  taskId: string;
  stepId: string;
}

function directTaskLink(input: unknown): TaskStepLink | null {
  const link = input as { taskId?: unknown; stepId?: unknown } | null;
  return typeof link?.taskId === 'string' && typeof link.stepId === 'string'
    ? { taskId: link.taskId, stepId: link.stepId }
    : null;
}

export function taskEvidenceLink(request: TaskLinkRequest): TaskStepLink | null {
  return directTaskLink(request.executionContext)
    ?? (request.toolName === 'task.process.start' ? directTaskLink(request.input) : null);
}
