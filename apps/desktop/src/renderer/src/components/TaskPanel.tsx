import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { ConversationState, Task, TaskDraft, TaskHandoff } from '@forge/ipc';
import { forgeInvoke, onRuntimeEvent } from '../forge';
import TextInputDialog from './TextInputDialog';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error.message); return result.data as T; };
const stepSymbol = (status: Task['steps'][number]['status']): string => status === 'completed' || status === 'skipped' ? '✓' : status === 'running' || status === 'waiting' ? '⏳' : status === 'blocked' || status === 'failed' ? '!' : '□';

export default function TaskPanel({ workspaceKey, onOpenAudit }: { workspaceKey: string; onOpenAudit: () => void }): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]); const [selectedId, setSelectedId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [textPrompt, setTextPrompt] = useState<'task' | 'release' | 'pause' | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? tasks[0], [selectedId, tasks]);
  const refresh = (preferredId?: string): Promise<void> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const operation = (async (): Promise<void> => {
      const values = await data<Task[]>(forgeInvoke('tasks.list', undefined)); setTasks(values);
      const nextId = preferredId ?? selectedId;
      if (nextId && values.some((task) => task.id === nextId)) setSelectedId(nextId); else setSelectedId(values[0]?.id ?? '');
    })();
    refreshInFlight.current = operation;
    void operation.then(
      () => { refreshInFlight.current = null; },
      () => { refreshInFlight.current = null; }
    );
    return operation;
  };
  const act = async (operation: () => Promise<Task>): Promise<void> => {
    try {
      setBusy(true); setError(''); const task = await operation();
      try { await refresh(task.id); }
      catch (cause) { setError(`The task was saved, but its list could not refresh: ${cause instanceof Error ? cause.message : String(cause)}`); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const refreshFromButton = async (): Promise<void> => { try { setError(''); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  useEffect(() => {
    setTasks([]); setSelectedId(''); setError('');
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    return onRuntimeEvent((event) => {
      if (event.type === 'task.changed') void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    });
  }, [workspaceKey]);
  const create = async (title: string): Promise<void> => {
    await act(async () => {
      const conversation = await data<ConversationState>(forgeInvoke('agent.conversations.state', undefined));
      const draft: TaskDraft = { title, taskType: 'general', originatingConversationId: conversation.activeConversationId, progressSummary: 'Draft created by the user.', resumeInstructions: 'Audit current workspace, Git, process, and external state before defining or advancing steps.', steps: [] };
      return data<Task>(forgeInvoke('tasks.create', draft));
    });
  };
  const createRelease = async (version: string): Promise<void> => {
    await act(async () => {
      const conversation = await data<ConversationState>(forgeInvoke('agent.conversations.state', undefined));
      return data<Task>(forgeInvoke('tasks.create.release', { version: version.trim(), originatingConversationId: conversation.activeConversationId }));
    });
  };
  const pause = async (reason: string): Promise<void> => { if (!selected) return; await act(() => data<Task>(forgeInvoke('tasks.pause', { taskId: selected.id, reason })) ); };
  const submitTextPrompt = async (value: string): Promise<void> => {
    const prompt = textPrompt;
    if (!prompt) return;
    if (prompt === 'task') await create(value);
    else if (prompt === 'release') await createRelease(value);
    else await pause(value);
    setTextPrompt(null);
  };
  const cancel = async (): Promise<void> => { if (!selected || !window.confirm('Cancel FORGE task tracking? This does not kill unknown local processes, cancel GitHub workflows, remove remote assets, or roll back releases.')) return; await act(() => data<Task>(forgeInvoke('tasks.cancel', { taskId: selected.id, reason: 'Cancelled by user from the Tasks view.', trackingOnly: true }))); };
  const remove = async (): Promise<void> => {
    if (!selected || !window.confirm(`Permanently remove task “${selected.title}” and its checkpoints, events, approvals, and references? This does not stop external processes or roll back completed work.`)) return;
    try { setBusy(true); setError(''); await data<void>(forgeInvoke('tasks.delete', { taskId: selected.id })); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const handoff = async (): Promise<void> => { if (!selected) return; try { setBusy(true); const result = await data<TaskHandoff>(forgeInvoke('tasks.handoff', { taskId: selected.id })); await navigator.clipboard.writeText(result.markdown); await refresh(selected.id); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); } };
  const openConversation = async (): Promise<void> => { const conversationId = selected?.lastActiveConversationId ?? selected?.originatingConversationId; if (!conversationId) return; try { await data<ConversationState>(forgeInvoke('agent.conversation.select', { conversationId })); window.dispatchEvent(new Event('forge:conversation-updated')); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const completedCount = selected?.steps.filter((step) => step.status === 'completed' || step.status === 'skipped').length ?? 0;
  const current = selected?.steps.find((step) => step.id === selected.currentStepId);
  const checkpoint = selected?.checkpoints.at(-1);
  return <div className="task-panel">
    <div className="task-toolbar"><strong>WORKSPACE TASKS</strong><button onClick={() => setTextPrompt('task')} disabled={busy}>New task</button><button onClick={() => setTextPrompt('release')} disabled={busy}>Release workflow</button><button onClick={() => void refreshFromButton()} disabled={busy}>Refresh</button></div>
    <aside className="task-list">{tasks.length ? tasks.map((task) => { const complete = task.steps.filter((step) => step.status === 'completed' || step.status === 'skipped').length; return <button key={task.id} className={task.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(task.id)}><b>{task.title}</b><span>{task.status} · {complete}/{task.steps.length}</span><small>{task.progressSummary}</small></button>; }) : <p className="muted">No persistent tasks. A task remains in this workspace even when chat, model, provider, or application sessions change.</p>}</aside>
    <section className="task-detail">{selected ? <>
      <header><div><h3>{selected.title}</h3><p>{selected.description ?? selected.taskType}</p></div><em className={`task-status ${selected.status}`}>{selected.status}</em></header>
      <div className="task-facts"><span><b>Progress</b>{completedCount}/{selected.steps.length}</span><span><b>Current</b>{current?.name ?? 'Not started'}</span><span><b>Last checkpoint</b>{checkpoint?.name ?? 'None'}</span><span><b>Updated</b>{new Date(selected.updatedAt).toLocaleString()}</span><span><b>Branch</b>{selected.associatedBranch ?? 'Unrecorded'}</span><span><b>Workflow/release</b>{selected.associatedWorkflowRun ?? selected.associatedReleaseTag ?? 'Unrecorded'}</span><span><b>Active process</b>{selected.processIds.join(', ') || 'None'}</span><span><b>Next action</b>{selected.resumeInstructions}</span></div>
      {selected.interruptionReason && <div className="task-blocker">{selected.interruptionReason}</div>}
      <div className="task-actions"><button className="accent" disabled={busy || ['completed', 'cancelled'].includes(selected.status)} onClick={() => void act(() => data<Task>(forgeInvoke('tasks.resume', { taskId: selected.id })))}>Run next step</button><button disabled={busy || ['paused', 'completed', 'cancelled'].includes(selected.status)} onClick={() => setTextPrompt('pause')}>Pause</button><button disabled={busy || ['completed', 'cancelled'].includes(selected.status)} onClick={() => void cancel()}>Cancel tracking</button><button disabled={busy || !(selected.originatingConversationId || selected.lastActiveConversationId)} onClick={() => void openConversation()}>Open conversation</button><button onClick={onOpenAudit}>Open audit history</button><button disabled={busy} onClick={() => void handoff()}>Copy handoff</button><button className="danger" disabled={busy} onClick={() => void remove()}>Delete task</button></div>
      <ol className="task-steps">{selected.steps.map((step) => <li key={step.id} className={step.status}><span>{stepSymbol(step.status)}</span><div><b>{step.name}</b><small>{step.purpose}</small><small>Tier {step.riskTier} · {step.requiredTool ?? 'manual verification'} · attempts {step.attempts}/{step.retryPolicy.maxAttempts}</small>{step.lastError && <em>{step.lastError.message}</em>}<details><summary>Verification evidence</summary><pre>{JSON.stringify({ criteria: step.verificationCriteria, processId: step.externalProcessId, outputPath: step.outputPath, artifacts: step.artifactPaths, auditReferences: step.auditReferences, checkpoints: selected.checkpoints.filter((entry) => entry.stepId === step.id) }, null, 2)}</pre></details></div>{['failed', 'blocked'].includes(step.status) && <button disabled={busy} onClick={() => void act(() => data<Task>(forgeInvoke('tasks.retry.step', { taskId: selected.id, stepId: step.id })))}>Retry</button>}</li>)}</ol>
      <details className="task-events"><summary>Task history ({selected.events.length})</summary>{selected.events.slice().reverse().map((event) => <p key={event.id}><time>{new Date(event.createdAt).toLocaleString()}</time><b>{event.type}</b>{event.summary}</p>)}</details>
    </> : null}{error && <div className="terminal-error">{error}</div>}</section>
    {textPrompt && <TextInputDialog
      title={textPrompt === 'task' ? 'New persistent task' : textPrompt === 'release' ? 'New release workflow' : 'Pause task'}
      label={textPrompt === 'release' ? 'Semantic version without v' : textPrompt === 'pause' ? 'Reason for pausing' : 'Task title'}
      confirmLabel={textPrompt === 'pause' ? 'Pause' : 'Create'}
      busy={busy}
      onCancel={() => setTextPrompt(null)}
      onSubmit={submitTextPrompt}
    />}
  </div>;
}
