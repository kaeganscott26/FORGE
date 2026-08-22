import type { AgentMessage } from '@forge/ai';
import type { ToolRequestOutcome } from '@forge/agent-tools';
import { boundedToolEvidence, parseStructuredToolFallback } from '@forge/agent-tools';
import { ProgressAwareLoopGuard } from './agent-continuation';
import { taskApprovalLink, taskEvidenceLink, type TaskStepLink } from './task-links';

export interface NativeAgentRuntime {
  runAgentTurn(conversationId: string | undefined, prompt: string): Promise<any>;
  runTaskStep(taskId: string): Promise<any>;
  continueAfterApproval(request: any, result: any): Promise<void>;
  recordTaskApproval(request: any, decision: 'pending' | 'run-once' | 'session' | 'rejected'): Promise<void>;
}

/** Native chat is one optional consumer of FORGE workspace intelligence and tool runtime. */
export function createNativeAgentRuntime(dependencies: any): NativeAgentRuntime {
  const { storage, workspace, agent, toolRouter, taskRuntime, settings, aiProvider, git, emitRuntimeEvent } = dependencies;
  const maxRuntimeMs = Math.min(Math.max(Number(process.env.FORGE_AGENT_MAX_RUNTIME_MS) || 15 * 60_000, 60_000), 60 * 60_000);
  const historyFor = async (conversationId: string): Promise<AgentMessage[]> => (await storage.listConversationMessages(conversationId)).map((entry: any) => ({ role: entry.role, content: entry.content }));
  const recordTaskOutcome = async (request: any, result: any): Promise<string | null> => {
    const link = taskEvidenceLink(request);
    if (!link) return null;
    try { await taskRuntime.recordToolOutcome(link.taskId, link.stepId, request.id, result); return null; }
    catch (error) { return `Task checkpoint link failed: ${error instanceof Error ? error.message : String(error)}`; }
  };
  const recordTaskApproval = async (request: any, decision: 'pending' | 'run-once' | 'session' | 'rejected'): Promise<void> => {
    const link = taskApprovalLink(request);
    if (!link) return;
    try { await taskRuntime.recordApproval(link.taskId, link.stepId, request.id, request.toolName, decision); }
    catch { /* Approval projection must not turn stale task metadata into execution authority or abort a valid tool lifecycle. */ }
  };
  const runAgentTurn = async (conversationId: string | undefined, prompt: string, executionTask?: TaskStepLink) => {
    await emitRuntimeEvent?.('agent.started', { conversationId });
    try {
    const state = await storage.conversationState(conversationId);
    const history = await historyFor(state.activeConversationId);
    await storage.appendConversation(state.activeConversationId, 'user', prompt);
    const project = await storage.dashboard();
    const info = workspace.info();
    if (!project || !info) throw new Error('Open a workspace before requesting agent tools.');
    const definitions = toolRouter.providerDefinitions();
    let turn = await agent.askWithTools(prompt, history, definitions);
    const outcomes: ToolRequestOutcome[] = [];
    const continuationHistory: AgentMessage[] = [...history, { role: 'user', content: prompt }];
    const loopGuard = new ProgressAwareLoopGuard();
    const workspaceRevision = async (): Promise<string> => {
      try {
        const status = await git.status();
        return JSON.stringify({ head: status.head?.hash ?? null, branch: status.branch, files: status.files.map((file: any) => [file.path, file.indexStatus, file.workingStatus]) });
      } catch { return 'workspace-state-unavailable'; }
    };
    const startedAt = Date.now();
    let modelContent = '';
    while (true) {
      if (Date.now() - startedAt > maxRuntimeMs) throw new Error(`Agent execution exceeded the configured ${Math.round(maxRuntimeMs / 60_000)} minute runtime budget. Progress and tool evidence were preserved for task resumption.`);
      const calls = [...turn.toolCalls];
      const fallback = calls.length ? null : parseStructuredToolFallback(aiProvider.id, turn.content);
      if (fallback) calls.push(fallback);
      if (!calls.length) { modelContent = turn.content; break; }
      const revision = await workspaceRevision();
      const fresh = calls.filter((call) => loopGuard.shouldRun(call, revision));
      if (!fresh.length) {
        const evidence = loopGuard.observedResults().join('\n\n');
        modelContent = (await agent.askWithContext(`Every requested tool call would repeat the same normalized arguments against the same workspace state. Do not request another tool. Complete the response from these observed results:\n\n${evidence}`, continuationHistory)).content;
        break;
      }
      const round: ToolRequestOutcome[] = [];
      for (const call of fresh) {
        await emitRuntimeEvent?.('tool.requested', { toolName: call.name, conversationId: state.activeConversationId });
        const outcome = await toolRouter.request(call, { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: state.activeConversationId, modelId: turn.modelId ?? settings.publicSettings().apiModel, userRequest: prompt, task: executionTask });
        round.push(outcome); outcomes.push(outcome);
        loopGuard.record(call, await workspaceRevision(), { success: outcome.result?.success, affectedPaths: outcome.result?.affectedPaths, exitCode: outcome.result?.exitCode, error: outcome.result?.error, output: outcome.result?.output });
        await emitRuntimeEvent?.('tool.completed', { toolName: call.name, success: outcome.result?.success ?? false, conversationId: state.activeConversationId });
        if (outcome.result) await recordTaskOutcome(outcome.request, outcome.result);
        else await recordTaskApproval(outcome.request, 'pending');
      }
      const pending = round.find((outcome) => !outcome.result);
      if (pending) {
        modelContent = `FORGE is waiting for approval to ${pending.request.expectedEffect} (${pending.request.toolName}). The project state and this request remain persisted; approving the exact request will resume the agent from its observed result.`;
        await emitRuntimeEvent?.('agent.progress', { conversationId: state.activeConversationId, state: 'waiting-for-approval', requestId: pending.request.id });
        break;
      }
      const evidence = round.filter((outcome) => outcome.result).map((outcome) => boundedToolEvidence(outcome.result!)).join('\n\n');
      continuationHistory.push({ role: 'assistant', content: turn.content || 'I requested FORGE tools.' });
      turn = await agent.askWithTools(`Continue the original request using these bounded Tool Result records. Do not repeat completed tool calls. FORGE supplies execution identity and audit context internally.\n\n${evidence}`, continuationHistory, definitions);
    }
    const summary = outcomes.map(({ request, result }) => `Tool ${request.toolName} ${result?.success ? 'succeeded' : 'failed'}${result?.error ? `: ${result.error.message}` : ''}.`).join('\n');
    const content = [modelContent, summary].filter(Boolean).join('\n\n') || 'FORGE received no response from the model.';
    await storage.appendConversation(state.activeConversationId, 'assistant', content);
    await emitRuntimeEvent?.('agent.completed', { conversationId: state.activeConversationId, toolCount: outcomes.length });
    return { content, contextUsed: turn.context.artifacts.length > 0, conversationId: state.activeConversationId, memories: turn.memories.map((memory: any) => ({ id: memory.id, title: memory.title })), contextSources: turn.context.artifacts.map((artifact: any) => ({ id: artifact.id, kind: artifact.kind, title: artifact.title, path: artifact.path })) };
    } catch (error) {
      await emitRuntimeEvent?.('agent.blocked', { conversationId, message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  const runTaskStep = async (taskId: string): Promise<any> => {
    const task = await taskRuntime.resume(taskId);
    const step = task.steps.find((candidate: any) => candidate.id === task.currentStepId);
    if (!step || task.status !== 'ready') return task;
    const conversationId = task.lastActiveConversationId ?? task.originatingConversationId;
    await runAgentTurn(conversationId, `Start the dependency-ready task step now. Use the required tool without supplying runtime IDs or audit metadata. Do not only describe the plan. Task: ${task.title}. Step: ${step.name}. Purpose: ${step.purpose}. Expected input: ${JSON.stringify(step.expectedInput ?? {})}. Verification: ${step.verificationCriteria.join('; ')}.`, { taskId: task.id, stepId: step.id });
    return taskRuntime.get(taskId);
  };

  const continueAfterApproval = async (request: any, result: any): Promise<void> => {
    const checkpointWarning = await recordTaskOutcome(request, result);
    const evidence = boundedToolEvidence(result);
    await runAgentTurn(request.conversationId, `An explicitly approved FORGE tool request has completed. Continue the original work from the persisted workspace and task state. Do not repeat this call unless the workspace has changed.\n\n${evidence}${checkpointWarning ? `\n\n${checkpointWarning}` : ''}`);
  };

  return { runAgentTurn, runTaskStep, continueAfterApproval, recordTaskApproval };
}
