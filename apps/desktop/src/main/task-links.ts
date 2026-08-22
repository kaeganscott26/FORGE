export interface TaskLinkRequest {
  input: unknown;
  toolName?: string;
}

export interface TaskStepLink {
  taskId: string;
  stepId: string;
}

export interface TaskLinkCall {
  arguments: unknown;
}

export interface TaskLinkTarget {
  workspaceId: string;
  steps: Array<{ id: string }>;
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
  return nestedTaskLink(request.input)
    ?? (request.toolName === 'task.process.start' ? directTaskLink(request.input) : null);
}

export function taskApprovalLink(request: TaskLinkRequest): TaskStepLink | null {
  return taskEvidenceLink(request)
    ?? (request.toolName === 'task.checkpoint' ? directTaskLink(request.input) : null);
}

/**
 * Provider-authored task links are hints, not authority. Preserve a link only
 * when it resolves to a real task and step in the active workspace; otherwise
 * remove the optional metadata before the tool schema is validated.
 */
export async function reconcileTaskContext<T extends TaskLinkCall>(
  call: T,
  workspaceId: string,
  getTask: (taskId: string) => Promise<TaskLinkTarget>
): Promise<T> {
  const input = call.arguments;
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.prototype.hasOwnProperty.call(input, 'taskContext')) return call;
  const record = input as Record<string, unknown>;
  const link = nestedTaskLink(record);
  if (link) {
    try {
      const task = await getTask(link.taskId);
      if (task.workspaceId === workspaceId && task.steps.some((step) => step.id === link.stepId)) return call;
    } catch { /* A stale, foreign, or invented task link is discarded below. */ }
  }
  const { taskContext: _discarded, ...argumentsWithoutTaskContext } = record;
  return { ...call, arguments: argumentsWithoutTaskContext };
}
