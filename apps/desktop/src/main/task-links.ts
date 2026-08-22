export interface TaskLinkRequest {
  input: unknown;
  toolName?: string;
  executionContext?: { taskId?: string; stepId?: string };
}

export interface TaskStepLink {
  taskId: string;
  stepId: string;
}

function nestedTaskLink(input: unknown): TaskStepLink | null {
  const link = (input as { taskContext?: unknown } | null)?.taskContext as { taskId?: unknown; stepId?: unknown } | undefined;
  return typeof link?.taskId === 'string' && typeof link.stepId === 'string'
    ? { taskId: link.taskId, stepId: link.stepId }
    : null;
}

function directTaskLink(input: unknown): TaskStepLink | null {
  const link = input as { taskId?: unknown; stepId?: unknown } | null;
  return typeof link?.taskId === 'string' && typeof link.stepId === 'string'
    ? { taskId: link.taskId, stepId: link.stepId }
    : null;
}

export function taskEvidenceLink(request: TaskLinkRequest): TaskStepLink | null {
  return directTaskLink(request.executionContext)
    ?? nestedTaskLink(request.input)
    ?? (request.toolName === 'task.process.start' ? directTaskLink(request.input) : null);
}

export function taskApprovalLink(request: TaskLinkRequest): TaskStepLink | null {
  return taskEvidenceLink(request)
    ?? (request.toolName === 'task.checkpoint' ? directTaskLink(request.input) : null);
}
