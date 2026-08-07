import { useEffect, useMemo, useState, type JSX } from 'react';
import type { ConversationState, Task, TaskDraft, TaskHandoff } from '@forge/ipc';
import { forgeInvoke } from '../forge';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error.message); return result.data as T; };
const stepSymbol = (status: Task['steps'][number]['status']): string => status === 'completed' || status === 'skipped' ? '✓' : status === 'running' || status === 'waiting' ? '⏳' : status === 'blocked' || status === 'failed' ? '!' : '□';

export default function TaskPanel({ workspaceKey, onOpenAudit }: { workspaceKey: string; onOpenAudit: () => void }): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]); const [selectedId, setSelectedId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? tasks[0], [selectedId, tasks]);
  const refresh = async (preferredId?: string): Promise<void> => { const values = await data<Task[]>(forgeInvoke('tasks.list', undefined)); setTasks(values); const nextId = preferredId ?? selectedId; if (nextId && values.some((task) => task.id === nextId)) setSelectedId(nextId); else setSelectedId(values[0]?.id ?? ''); };
  const act = async (operation: () => Promise<Task>): Promise<void> => { try { setBusy(true); setError(''); const task = await operation(); await refresh(task.id); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); } };
  const refreshFromButton = async (): Promise<void> => { try { setError(''); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  useEffect(() => { setTasks([]); setSelectedId(''); setError(''); void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); }, [workspaceKey]);
  const create = async (): Promise<void> => {
    const title = window.prompt('Persistent task title:'); if (!title?.trim()) return;
    await act(async () => {
      const conversation = await data<ConversationState>(forgeInvoke('agent.conversations.state', undefined));
      const draft: TaskDraft = { title, taskType: 'general', originatingConversationId: conversation.activeConversationId, progressSummary: 'Draft created by the user.', resumeInstructions: 'Audit current workspace, Git, process, and external state before defining or advancing steps.', steps: [] };
      return data<Task>(forgeInvoke('tasks.create', draft));
    });
  };
  const createRelease = async (): Promise<void> => {
    const version = window.prompt('Release semantic version (without v):'); if (!version?.trim()) return;
    await act(async () => {
      const conversation = await data<ConversationState>(forgeInvoke('agent.conversations.state', undefined));
      return data<Task>(forgeInvoke('tasks.create.release', { version: version.trim(), originatingConversationId: conversation.activeConversationId }));
    });
  };
  const pause = async (): Promise<void> => { if (!selected) return; const reason = window.prompt('Why is this task being paused?'); if (!reason?.trim()) return; await act(() => data<Task>(forgeInvoke('tasks.pause', { taskId: selected.id, reason })) ); };
  const cancel = async (): Promise<void> => { if (!selected || !window.confirm('Cancel FORGE task tracking? This does not kill unknown local processes, cancel GitHub workflows, remove remote assets, or roll back releases.')) return; await act(() => data<Task>(forgeInvoke('tasks.cancel', { taskId: selected.id, reason: 'Cancelled by user from the Tasks view.', trackingOnly: true }))); };
  const handoff = async (): Promise<void> => { if (!selected) return; try { setBusy(true); const result = await data<TaskHandoff>(forgeInvoke('tasks.handoff', { taskId: selected.id })); await navigator.clipboard.writeText(result.markdown); await refresh(selected.id); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); } };
  const openConversation = async (): Promise<void> => { const conversationId = selected?.lastActiveConversationId ?? selected?.originatingConversationId; if (!conversationId) return; try { await data<ConversationState>(forgeInvoke('agent.conversation.select', { conversationId })); window.dispatchEvent(new Event('forge:conversation-updated')); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const completedCount = selected?.steps.filter((step) => step.status === 'completed' || step.status === 'skipped').length ?? 0;
  const current = selected?.steps.find((step) => step.id === selected.currentStepId);
  const checkpoint = selected?.checkpoints.at(-1);
  return <div className="task-panel">
    <div className="task-toolbar"><strong>WORKSPACE TASKS</strong><button onClick={() => void create()} disabled={busy}>New task</button><button onClick={() => void createRelease()} disabled={busy}>Release workflow</button><button onClick={() => void refreshFromButton()} disabled={busy}>Refresh</button></div>
    <aside className="task-list">{tasks.length ? tasks.map((task) => { const complete = task.steps.filter((step) => step.status === 'completed' || step.status === 'skipped').length; return <button key={task.id} className={task.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(task.id)}><b>{task.title}</b><span>{task.status} · {complete}/{task.steps.length}</span><small>{task.progressSummary}</small></button>; }) : <p className="muted">No persistent tasks. A task remains in this workspace even when chat, model, provider, or application sessions change.</p>}</aside>
    <section className="task-detail">{selected ? <>
      <header><div><h3>{selected.title}</h3><p>{selected.description ?? selected.taskType}</p></div><em className={`task-status ${selected.status}`}>{selected.status}</em></header>
      <div className="task-facts"><span><b>Progress</b>{completedCount}/{selected.steps.length}</span><span><b>Current</b>{current?.name ?? 'Not started'}</span><span><b>Last checkpoint</b>{checkpoint?.name ?? 'None'}</span><span><b>Updated</b>{new Date(selected.updatedAt).toLocaleString()}</span><span><b>Branch</b>{selected.associatedBranch ?? 'Unrecorded'}</span><span><b>Workflow/release</b>{selected.associatedWorkflowRun ?? selected.associatedReleaseTag ?? 'Unrecorded'}</span><span><b>Active process</b>{selected.processIds.join(', ') || 'None'}</span><span><b>Next action</b>{selected.resumeInstructions}</span></div>
      {selected.interruptionReason && <div className="task-blocker">{selected.interruptionReason}</div>}
      <div className="task-actions"><button disabled={busy || ['completed', 'cancelled'].includes(selected.status)} onClick={() => void act(() => data<Task>(forgeInvoke('tasks.resume', { taskId: selected.id })))}>Reconcile & resume</button><button disabled={busy || ['paused', 'completed', 'cancelled'].includes(selected.status)} onClick={() => void pause()}>Pause</button><button disabled={busy || ['completed', 'cancelled'].includes(selected.status)} onClick={() => void cancel()}>Cancel tracking</button><button disabled={busy || !(selected.originatingConversationId || selected.lastActiveConversationId)} onClick={() => void openConversation()}>Open conversation</button><button onClick={onOpenAudit}>Open audit history</button><button disabled={busy} onClick={() => void handoff()}>Copy handoff</button></div>
      <ol className="task-steps">{selected.steps.map((step) => <li key={step.id} className={step.status}><span>{stepSymbol(step.status)}</span><div><b>{step.name}</b><small>{step.purpose}</small><small>Tier {step.riskTier} · {step.requiredTool ?? 'manual verification'} · attempts {step.attempts}/{step.retryPolicy.maxAttempts}</small>{step.lastError && <em>{step.lastError.message}</em>}<details><summary>Verification evidence</summary><pre>{JSON.stringify({ criteria: step.verificationCriteria, processId: step.externalProcessId, outputPath: step.outputPath, artifacts: step.artifactPaths, auditReferences: step.auditReferences, checkpoints: selected.checkpoints.filter((entry) => entry.stepId === step.id) }, null, 2)}</pre></details></div>{['failed', 'blocked'].includes(step.status) && <button disabled={busy} onClick={() => void act(() => data<Task>(forgeInvoke('tasks.retry.step', { taskId: selected.id, stepId: step.id })))}>Retry</button>}</li>)}</ol>
      <details className="task-events"><summary>Task history ({selected.events.length})</summary>{selected.events.slice().reverse().map((event) => <p key={event.id}><time>{new Date(event.createdAt).toLocaleString()}</time><b>{event.type}</b>{event.summary}</p>)}</details>
    </> : null}{error && <div className="terminal-error">{error}</div>}</section>
  </div>;
}
