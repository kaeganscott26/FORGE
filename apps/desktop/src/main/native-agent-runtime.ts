import type { AgentMessage } from '@forge/ai';
import type { ToolRequestOutcome } from '@forge/agent-tools';
import { boundedToolEvidence, parseStructuredToolFallback } from '@forge/agent-tools';
import { ProgressAwareLoopGuard } from './agent-continuation';
import { taskEvidenceLink } from './task-links';

export interface NativeAgentRuntime {
  runAgentTurn(conversationId: string | undefined, prompt: string): Promise<any>;
  runTaskStep(taskId: string): Promise<any>;
  continueAfterApproval(request: any, result: any): Promise<void>;
}

export function assertToolIdentity(request: any, result: any, conversationId: string): void {
  if (!request?.id || !request?.toolName) throw new Error('FORGE tool routing returned an incomplete request identity.');
  if (request.conversationId !== conversationId) throw new Error(`FORGE tool request conversation mismatch: expected ${conversationId}, received ${String(request.conversationId)}.`);
  if (!result) return;
  if (result.requestId !== request.id) throw new Error(`FORGE tool result request mismatch: expected ${request.id}, received ${String(result.requestId)}.`);
  if (result.toolName !== request.toolName) throw new Error(`FORGE tool result name mismatch: expected ${request.toolName}, received ${String(result.toolName)}.`);
}

export function runtimeToolRecoveryGuidance(toolName: string, errorMessage: string, availableTools: ReadonlySet<string>): string {
  const message = errorMessage.toLowerCase();
  const catalog = [...availableTools].sort().join(', ');
  const guidance = [`Runtime tool catalog: ${catalog || '(none)'}.`, `The failed ${toolName} invocation does not mean the tool is unavailable; distinguish argument/policy failures from capability absence.`];
  if (/workspace-relative|traverse upward|escapes? (?:the )?(?:active )?workspace|absolute paths? require/i.test(errorMessage)) {
    guidance.push('FORGE file tools are intentionally workspace-scoped. Do not retry them with absolute paths, ~, or .. traversal. Restart discovery at file.list path "." and use only observed workspace-relative paths.');
    if (availableTools.has('shell.run')) guidance.push('If the user explicitly needs OS-level inspection outside the workspace, shell.run is available. Keep its workingDirectory inside the workspace and pass the external path only as a command argument.');
  }
  if (/eacces|eperm|permission denied|scandir/.test(message)) guidance.push('Treat unreadable filesystem paths as skippable evidence. Do not chmod/chown container, cache, or system-owned paths merely to satisfy indexing.');
  if (toolName.startsWith('browser.') && availableTools.has('browser.read')) guidance.push('browser.read/browser.find operate on the currently visible FORGE Browser page; do not infer that browser context is absent merely because a filesystem lookup failed.');
  if (toolName.startsWith('terminal.') && availableTools.has('terminal.read')) guidance.push('terminal.read reads existing FORGE terminal sessions and is separate from workspace file traversal.');
  return guidance.join(' ');
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
  const runAgentTurn = async (conversationId: string | undefined, prompt: string) => {
    await emitRuntimeEvent?.('agent.started', { conversationId });
    try {
    const state = await storage.conversationState(conversationId);
    const history = await historyFor(state.activeConversationId);
    await storage.appendConversation(state.activeConversationId, 'user', prompt);
    const project = await storage.dashboard();
    const info = workspace.info();
    if (!project || !info) throw new Error('Open a workspace before requesting agent tools.');
    const definitions = toolRouter.providerDefinitions();
    const availableTools = new Set<string>(definitions.map((definition: any) => definition.name));
    const capabilityCatalog = [...availableTools].sort().join(', ');
    let turn = await agent.askWithTools(prompt, history, definitions);
    const outcomes: ToolRequestOutcome[] = [];
    const runtimeFailures: string[] = [];
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
        modelContent = (await agent.askWithContext(`Every requested tool call would repeat the same normalized arguments against the same workspace state. Do not request another tool. Complete the response from these observed results. A failed invocation is not evidence that the tool itself is unavailable. Available runtime tools: ${capabilityCatalog}.\n\n${evidence}`, continuationHistory)).content;
        break;
      }
      const round: ToolRequestOutcome[] = [];
      const validationEvidence: string[] = [];
      for (const call of fresh) {
        await emitRuntimeEvent?.('tool.requested', { toolName: call.name, conversationId: state.activeConversationId });
        try {
          const outcome = await toolRouter.request(call, { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: state.activeConversationId, modelId: turn.modelId ?? settings.publicSettings().apiModel });
          assertToolIdentity(outcome.request, outcome.result, state.activeConversationId);
          round.push(outcome); outcomes.push(outcome);
          loopGuard.record(call, await workspaceRevision(), { success: outcome.result?.success, affectedPaths: outcome.result?.affectedPaths, exitCode: outcome.result?.exitCode, error: outcome.result?.error, output: outcome.result?.output });
          await emitRuntimeEvent?.('tool.completed', { toolName: call.name, requestId: outcome.request.id, success: outcome.result?.success ?? false, conversationId: state.activeConversationId });
          if (outcome.result) await recordTaskOutcome(outcome.request, outcome.result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const guidance = runtimeToolRecoveryGuidance(call.name, message, availableTools);
          const evidence = JSON.stringify({ toolName: call.name, success: false, error: { code: 'TOOL_ROUTING_FAILED', message }, recovery: guidance }, null, 2);
          validationEvidence.push(evidence);
          runtimeFailures.push(`Tool ${call.name} routing failed: ${message}`);
          loopGuard.record(call, await workspaceRevision(), { success: false, error: { code: 'TOOL_ROUTING_FAILED', message }, output: { recovery: guidance } });
          await emitRuntimeEvent?.('tool.completed', { toolName: call.name, requestId: call.id, success: false, conversationId: state.activeConversationId });
        }
      }
      const pending = round.find((outcome) => !outcome.result);
      if (pending) {
        modelContent = `FORGE is waiting for approval to ${pending.request.expectedEffect} (${pending.request.toolName}). The project state and this request remain persisted; approving the exact request will resume the agent from its observed result.`;
        await emitRuntimeEvent?.('agent.progress', { conversationId: state.activeConversationId, state: 'waiting-for-approval', requestId: pending.request.id });
        break;
      }
      const resultEvidence = round.filter((outcome) => outcome.result).map((outcome) => {
        const result = outcome.result!;
        const base = boundedToolEvidence(result);
        return result.success ? base : `${base}\nRecovery guidance: ${runtimeToolRecoveryGuidance(result.toolName, result.error?.message ?? 'Tool execution failed.', availableTools)}`;
      });
      const evidence = [...resultEvidence, ...validationEvidence].join('\n\n');
      continuationHistory.push({ role: 'assistant', content: turn.content || 'I requested FORGE tools.' });
      turn = await agent.askWithTools(`Continue the original request using these bounded Tool Result records. Do not repeat completed tool calls. Do not claim a tool is missing when it appears in the runtime catalog. A failed file path is a scope/input failure, not proof that shell, terminal, browser, or other tools are absent. file.* tools must stay workspace-relative; system paths require an appropriate advertised tool instead of ../ traversal. Runtime tool catalog for this turn: ${capabilityCatalog}. If a task was just created or resumed, execute its next dependency-ready step with its exact taskContext and preserve task/request identities unchanged.\n\n${evidence}`, continuationHistory, definitions);
    }
    const summary = [...outcomes.map(({ request, result }) => `Tool ${request.toolName} ${result?.success ? 'succeeded' : 'failed'}${result?.error ? `: ${result.error.message}` : ''}.`), ...runtimeFailures].join('\n');
    const content = [modelContent, summary].filter(Boolean).join('\n\n') || 'FORGE received no response from the model.';
    await storage.appendConversation(state.activeConversationId, 'assistant', content);
    await emitRuntimeEvent?.('agent.completed', { conversationId: state.activeConversationId, toolCount: outcomes.length, routingFailureCount: runtimeFailures.length });
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
    await runAgentTurn(conversationId, `Start the dependency-ready task step now. Use the required tool with taskContext { taskId: "${task.id}", stepId: "${step.id}" }. Do not only describe the plan. Task: ${task.title}. Step: ${step.name}. Purpose: ${step.purpose}. Expected input: ${JSON.stringify(step.expectedInput ?? {})}. Verification: ${step.verificationCriteria.join('; ')}.`);
    return taskRuntime.get(taskId);
  };

  const continueAfterApproval = async (request: any, result: any): Promise<void> => {
    assertToolIdentity(request, result, request.conversationId);
    const checkpointWarning = await recordTaskOutcome(request, result);
    const evidence = boundedToolEvidence(result);
    await runAgentTurn(request.conversationId, `An explicitly approved FORGE tool request has completed. Continue the original work from the persisted workspace and task state. Preserve request/task identities exactly and do not repeat this call unless the workspace has changed.\n\n${evidence}${checkpointWarning ? `\n\n${checkpointWarning}` : ''}`);
  };

  return { runAgentTurn, runTaskStep, continueAfterApproval };
}
