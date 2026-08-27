import type { AgentMessage } from '@forge/ai';
import type { ToolRequestOutcome } from '@forge/agent-tools';
import { boundedToolEvidence, parseStructuredToolFallback } from '@forge/agent-tools';
import { ProgressAwareLoopGuard } from './agent-continuation';
import { taskEvidenceLink, type TaskStepLink } from './task-links';

export interface NativeAgentRuntime {
  runAgentTurn(conversationId: string | undefined, prompt: string): Promise<any>;
  runTaskStep(taskId: string): Promise<any>;
}

export function requiredDirectEvidence(prompt: string, observedTools: readonly string[]): string[] {
  const normalized = prompt.toLowerCase(); const observed = new Set(observedTools); const required = new Set<string>();
  if (/\bfile\.search\b/.test(normalized)) required.add('file.search');
  if (/\bfile\.read\b|\bread (?:this|the|that|a) file\b|\bread\s+(?:`[^`]+`|[\w./-]+\.[a-z0-9]{1,12})\b/.test(normalized)) required.add('file.read');
  if (/\bgit\.log\b|\bgit (?:history|log)\b/.test(normalized)) required.add('git.log');
  if (/\bgit\.diff\b|\b(?:current|git|staged) diff\b/.test(normalized)) required.add('git.diff');
  if (/\bgit\.status\b|\bgit status\b/.test(normalized)) required.add('git.status');
  if (/\b(?:use|using) (?:agent |workspace )?tools? to inspect (?:the )?(?:workspace|repository|source)|\binspect (?:the )?(?:workspace|repository) with (?:agent |workspace )?tools?\b/.test(normalized)) required.add('file.search');
  const investigation = /\b(?:diagnos\w*|debug\w*|investigat\w*|regression|bug|crash|failure|root cause)\b/.test(normalized);
  if (investigation) required.add('file.search');
  if (investigation && observed.has('file.search')) required.add('file.read');
  if (/\b(?:regression|introduced|when (?:did|was)|git boundary)\b/.test(normalized)) required.add('git.log');
  return [...required].filter((toolName) => !observed.has(toolName));
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
  const guidance = [`Runtime tool catalog: ${catalog || '(none)'}.`, `The failed ${toolName} invocation does not mean the tool is unavailable; distinguish argument, policy, and execution failures from capability absence.`];
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
  const { storage, workspace, agent, toolRouter, taskRuntime, settings, aiProvider, git, emitRuntimeEvent, resolveReasoningRuntime } = dependencies;
  const maxRuntimeMs = Math.min(Math.max(Number(process.env.FORGE_AGENT_MAX_RUNTIME_MS) || 15 * 60_000, 60_000), 60 * 60_000);
  const historyFor = async (conversationId: string): Promise<AgentMessage[]> => (await storage.listConversationMessages(conversationId)).map((entry: any) => ({ role: entry.role, content: entry.content }));
  const recordTaskOutcome = async (request: any, result: any): Promise<string | null> => {
    const link = taskEvidenceLink(request);
    if (!link) return null;
    try { await taskRuntime.recordToolOutcome(link.taskId, link.stepId, request.id, result); return null; }
    catch (error) { return `Task checkpoint link failed: ${error instanceof Error ? error.message : String(error)}`; }
  };
  const runAgentTurn = async (conversationId: string | undefined, prompt: string, executionTask?: TaskStepLink) => {
    await emitRuntimeEvent?.('agent.started', { conversationId });
    try {
    const selectedRuntime = resolveReasoningRuntime ? await resolveReasoningRuntime() : { agent, provider: aiProvider, kind: 'native' };
    const activeAgent = selectedRuntime.agent; const activeProvider = selectedRuntime.provider;
    const state = await storage.conversationState(conversationId);
    const history = await historyFor(state.activeConversationId);
    await storage.appendConversation(state.activeConversationId, 'user', prompt);
    const project = await storage.dashboard();
    const info = workspace.info();
    if (!project || !info) throw new Error('Open a workspace before requesting agent tools.');
    const definitions = toolRouter.providerDefinitions();
    const availableTools = new Set<string>(definitions.map((definition: any) => definition.name));
    const capabilityCatalog = [...availableTools].sort().join(', ');
    let turn = await activeAgent.askWithTools(prompt, history, definitions);
    const outcomes: ToolRequestOutcome[] = [];
    const runtimeFailures: string[] = [];
    const semanticRecordIds = new Set<string>();
    const rememberSemanticContext = (context: any): void => {
      for (const artifact of context?.artifacts ?? []) if (typeof artifact.metadata?.semanticRecordId === 'string') semanticRecordIds.add(artifact.metadata.semanticRecordId);
    };
    rememberSemanticContext(turn.context);
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
    let evidenceNudges = 0;
    while (true) {
      if (Date.now() - startedAt > maxRuntimeMs) throw new Error(`Agent execution exceeded the configured ${Math.round(maxRuntimeMs / 60_000)} minute runtime budget. Progress and tool evidence were preserved for task resumption.`);
      const calls = [...turn.toolCalls];
      const fallback = calls.length ? null : parseStructuredToolFallback(activeProvider.id, turn.content);
      if (fallback) calls.push(fallback);
      if (!calls.length) {
        const missingEvidence = requiredDirectEvidence(prompt, outcomes.filter((outcome) => outcome.result?.success).map((outcome) => outcome.request.toolName));
        if (missingEvidence.length && evidenceNudges < 3) {
          evidenceNudges += 1;
          continuationHistory.push({ role: 'assistant', content: turn.content || 'I have not yet gathered the explicitly requested workspace evidence.' });
          turn = await activeAgent.askWithTools(`The original request explicitly requires direct current evidence. Request these missing read-only FORGE tools now: ${missingEvidence.join(', ')}. Do not answer from semantic context or memory. For an investigation, file.search is discovery only: follow it with file.read of the relevant implementation, then trace callers, tests, and Git evidence as needed.`, continuationHistory, definitions);
          rememberSemanticContext(turn.context);
          continue;
        }
        if (missingEvidence.length) throw new Error(`The active reasoning provider did not request required direct evidence after ${evidenceNudges} recovery attempts: ${missingEvidence.join(', ')}.`);
        modelContent = turn.content; break;
      }
      const revision = await workspaceRevision();
      const fresh = calls.filter((call) => loopGuard.shouldRun(call, revision));
      if (!fresh.length) {
        const missingEvidence = requiredDirectEvidence(prompt, outcomes.filter((outcome) => outcome.result?.success).map((outcome) => outcome.request.toolName));
        if (missingEvidence.length && evidenceNudges < 3) {
          evidenceNudges += 1;
          const evidence = loopGuard.observedResults().join('\n\n');
          continuationHistory.push({ role: 'assistant', content: turn.content || 'I repeated a tool call without satisfying the requested evidence.' });
          turn = await activeAgent.askWithTools(`The repeated tool call did not satisfy the original request. Request a different, valid call for these missing read-only FORGE tools: ${missingEvidence.join(', ')}. A tool only counts as evidence after it succeeds. Do not answer from semantic context or memory.\n\nObserved results:\n${evidence}`, continuationHistory, definitions);
          rememberSemanticContext(turn.context);
          continue;
        }
        if (missingEvidence.length) throw new Error(`The active reasoning provider did not produce successful required evidence after ${evidenceNudges} recovery attempts: ${missingEvidence.join(', ')}.`);
        const evidence = loopGuard.observedResults().join('\n\n');
        modelContent = (await activeAgent.askWithContext(`Every requested tool call would repeat the same normalized arguments against the same workspace state. Do not request another tool. Complete the response from these observed results. A failed invocation is not evidence that the tool itself is unavailable. Available runtime tools: ${capabilityCatalog}.\n\n${evidence}`, continuationHistory)).content;
        break;
      }
      const round: ToolRequestOutcome[] = [];
      const validationEvidence: string[] = [];
      for (const call of fresh) {
        await emitRuntimeEvent?.('tool.requested', { toolName: call.name, conversationId: state.activeConversationId });
        try {
          const outcome = await toolRouter.request(call, { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: state.activeConversationId, modelId: turn.modelId ?? settings.publicSettings().apiModel, userRequest: prompt, task: executionTask });
          assertToolIdentity(outcome.request, outcome.result, state.activeConversationId);
          round.push(outcome); outcomes.push(outcome);
          loopGuard.record(call, await workspaceRevision(), { success: outcome.result?.success, affectedPaths: outcome.result?.affectedPaths, exitCode: outcome.result?.exitCode, error: outcome.result?.error, output: outcome.result?.output });
          await emitRuntimeEvent?.('tool.completed', { toolName: call.name, requestId: outcome.request.id, success: outcome.result?.success ?? false, conversationId: state.activeConversationId });
          if (outcome.result) await recordTaskOutcome(outcome.request, outcome.result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const guidance = runtimeToolRecoveryGuidance(call.name, message, availableTools);
          validationEvidence.push(JSON.stringify({ toolName: call.name, success: false, error: { code: 'TOOL_ROUTING_FAILED', message }, recovery: guidance }, null, 2));
          runtimeFailures.push(`Tool ${call.name} routing failed: ${message}`);
          loopGuard.record(call, await workspaceRevision(), { success: false, error: { code: 'TOOL_ROUTING_FAILED', message }, output: { recovery: guidance } });
          await emitRuntimeEvent?.('tool.completed', { toolName: call.name, requestId: call.id, success: false, conversationId: state.activeConversationId });
        }
      }
      const resultEvidence = round.filter((outcome) => outcome.result).map((outcome) => {
        const result = outcome.result!;
        const bounded = boundedToolEvidence(result);
        return result.success ? bounded : `${bounded}\nRecovery guidance: ${runtimeToolRecoveryGuidance(result.toolName, result.error?.message ?? 'Tool execution failed.', availableTools)}`;
      });
      const evidence = [...resultEvidence, ...validationEvidence].join('\n\n');
      continuationHistory.push({ role: 'assistant', content: turn.content || 'I requested FORGE tools.' });
      turn = await activeAgent.askWithTools(`Continue the original request using these bounded Tool Result records. Do not repeat completed tool calls. Do not claim a tool is missing when it appears in the runtime catalog. A failed file path is a scope or input failure, not proof that other tools are absent. file.* tools must stay workspace-relative; system paths require an appropriate advertised tool instead of ../ traversal. Runtime tool catalog for this turn: ${capabilityCatalog}. FORGE supplies execution identity and audit context internally.\n\n${evidence}`, continuationHistory, definitions);
      rememberSemanticContext(turn.context);
    }
    const summary = [...outcomes.map(({ request, result }) => `Tool ${request.toolName} ${result?.success ? 'succeeded' : 'failed'}${result?.error ? `: ${result.error.message}` : ''}.`), ...runtimeFailures].join('\n');
    const content = [modelContent, summary].filter(Boolean).join('\n\n') || 'FORGE received no response from the model.';
    await storage.appendConversation(state.activeConversationId, 'assistant', content);
    await storage.markSemanticRecordsUsed([...semanticRecordIds], outcomes.length === 0 || outcomes.every((outcome) => outcome.result?.success));
    await emitRuntimeEvent?.('agent.completed', { conversationId: state.activeConversationId, toolCount: outcomes.length, routingFailureCount: runtimeFailures.length, runtime: selectedRuntime.kind });
    return { content, contextUsed: turn.context.artifacts.length > 0, conversationId: state.activeConversationId, memories: turn.memories.map((memory: any) => ({ id: memory.id, title: memory.title })), contextSources: turn.context.artifacts.map((artifact: any) => ({ id: artifact.id, kind: artifact.kind, title: artifact.title, path: artifact.path, relevance: artifact.metadata?.relevance, reason: artifact.metadata?.reason })), contextHealth: turn.context.metrics };
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
    await runAgentTurn(conversationId, `Start the dependency-ready task step now. Use the required tool without supplying runtime IDs or audit metadata. Do not only describe the plan. Task: ${task.title}. Step: ${step.name}. Purpose: ${step.purpose}. Expected input: ${JSON.stringify(step.expectedInput ?? {})}. Verification: ${step.verificationCriteria.join('; ')}. When the observed evidence satisfies every criterion, request task.checkpoint using only its semantic fields; FORGE attaches the active task, step, and audit identities.`, { taskId: task.id, stepId: step.id });
    const updated = await taskRuntime.get(taskId);
    // A verified checkpoint may have made the next dependency-ready step
    // executable in the same durable operation. Continue it automatically;
    // Failed tools and reconciliation states stop here.
    if (updated.status === 'ready' && updated.currentStepId && updated.currentStepId !== step.id) return runTaskStep(taskId);
    return updated;
  };

  return { runAgentTurn, runTaskStep };
}
