import { useCallback, useEffect, useState, type JSX } from 'react';
import type { ConversationState, Task, WorkspaceKnowledgeRecord, WorkspaceMemoryStats } from '@forge/ipc';
import { forgeInvoke } from '../forge';

const data = async <T,>(channel: Parameters<typeof forgeInvoke>[0], request?: unknown): Promise<T> => {
  const result = await forgeInvoke(channel as any, request);
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

const formatChars = (value: number): string => value.toLocaleString();

export default function WorkspaceDataPanel(): JSX.Element {
  const [memories, setMemories] = useState<WorkspaceKnowledgeRecord[]>([]);
  const [stats, setStats] = useState<WorkspaceMemoryStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<ConversationState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setBusy(true); setError(null);
    try {
      const [nextMemories, nextStats, nextTasks, nextConversations] = await Promise.all([
        data<WorkspaceKnowledgeRecord[]>('agent.memories.list'),
        data<WorkspaceMemoryStats>('agent.memories.stats'),
        data<Task[]>('tasks.list'),
        data<ConversationState>('agent.conversations.state')
      ]);
      setMemories(nextMemories); setStats(nextStats); setTasks(nextTasks); setConversations(nextConversations);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (operation: () => Promise<void>, success: string): Promise<void> => {
    setBusy(true); setError(null); setMessage(null);
    try { await operation(); await refresh(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setBusy(false); }
  };

  const removeMemory = async (record: WorkspaceKnowledgeRecord): Promise<void> => {
    if (!window.confirm(`Remove ${record.title ?? 'this memory record'}? This removes FORGE's stored workspace memory only; it never deletes a source file.`)) return;
    await act(() => data<void>('agent.memories.delete', { id: record.id }), 'Memory record removed.');
  };

  const clearMemories = async (): Promise<void> => {
    if (!stats || !window.confirm(`Remove all ${stats.recordCount} workspace memory records? This cannot be undone. Source files, Git history, tasks, and conversations are not deleted.`)) return;
    await act(async () => { const result = await data<{ deleted: number }>('agent.memories.clear'); setMessage(`${result.deleted} memory records removed.`); }, 'Workspace memory cleared.');
  };

  const reindex = async (): Promise<void> => {
    await act(() => data<void>('agent.memories.reindex'), 'Workspace files reindexed with bounded memory copies.');
  };

  const deleteTask = async (task: Task): Promise<void> => {
    if (!window.confirm(`Permanently remove task “${task.title}” and its checkpoints, task events, approvals, and task references? This does not stop external processes or roll back completed work.`)) return;
    await act(() => data<void>('tasks.delete', { taskId: task.id }), 'Task permanently removed.');
  };

  const deleteConversation = async (conversationId: string, title: string): Promise<void> => {
    if (!window.confirm(`Permanently delete the conversation “${title}” and its messages? Durable workspace memory and tasks remain.`)) return;
    await act(async () => { await data<ConversationState>('agent.conversation.delete', { conversationId }); window.dispatchEvent(new Event('forge:conversation-updated')); }, 'Conversation permanently removed.');
  };

  const clearConversations = async (): Promise<void> => {
    if (!conversations || !window.confirm(`Permanently remove all ${conversations.threads.length} conversations and their messages? Durable workspace memory and persistent tasks remain.`)) return;
    await act(async () => { await data<ConversationState>('agent.conversations.clearAll'); window.dispatchEvent(new Event('forge:conversation-updated')); }, 'Conversation history cleared.');
  };

  return <section className="settings-section workspace-data-panel">
    <div className="settings-section-title"><div><span>WORKSPACE DATA</span><h3>Memory, tasks, and conversation history</h3></div><em className={stats && stats.largestContentChars <= 200_000 ? 'configured' : ''}>{stats ? `${stats.recordCount} records` : 'Loading'}</em></div>
    <p className="settings-help">FORGE keeps this data in the active workspace’s <code>.forge/metadata.sqlite</code>. Memory previews are bounded before they reach the interface or agent runtime.</p>
    <div className="workspace-data-facts">
      <span><b>Memory</b>{stats ? `${stats.recordCount} records · ${formatChars(stats.totalContentChars)} chars` : 'Loading…'}</span>
      <span><b>Largest record</b>{stats ? `${formatChars(stats.largestContentChars)} chars` : 'Loading…'}</span>
      <span><b>Persistent tasks</b>{tasks.length}</span>
      <span><b>Conversations</b>{conversations?.threads.length ?? '…'}</span>
    </div>
    {stats && stats.largestContentChars > 200_000 && <p className="settings-warning">A legacy memory record exceeds the current 200,000-character write limit. It is now read through a bounded preview; remove it below if it is no longer needed.</p>}
    <div className="workspace-data-actions"><button onClick={() => void refresh()} disabled={busy}>Refresh</button><button onClick={() => void reindex()} disabled={busy}>Reindex workspace files</button><button className="danger" onClick={() => void clearMemories()} disabled={busy || !stats?.recordCount}>Clear all memory</button></div>
    <div className="workspace-data-list">
      <strong>Memory records</strong>
      {!memories.length ? <p className="muted">No workspace memory records.</p> : memories.slice(0, 12).map((record) => <article key={record.id}><div><b>{record.title ?? 'Untitled memory'}</b><small>{record.type} · {formatChars(record.contentLength ?? record.content.length)} chars</small><p>{record.content.slice(0, 180)}{(record.contentLength ?? record.content.length) > 180 ? '…' : ''}</p></div><button className="danger" disabled={busy} onClick={() => void removeMemory(record)}>Remove</button></article>)}
      {memories.length > 12 && <p className="muted">Showing the newest 12 of {memories.length} loaded records. Use Refresh after removing records.</p>}
    </div>
    <div className="workspace-data-list">
      <strong>Persistent tasks</strong>
      {!tasks.length ? <p className="muted">No persistent tasks.</p> : tasks.slice(0, 12).map((task) => <article key={task.id}><div><b>{task.title}</b><small>{task.status} · updated {new Date(task.updatedAt).toLocaleString()}</small><p>{task.progressSummary}</p></div><button className="danger" disabled={busy} onClick={() => void deleteTask(task)}>Delete task</button></article>)}
    </div>
    <div className="workspace-data-list">
      <div className="workspace-data-list-heading"><strong>Conversation history</strong><button className="danger" disabled={busy || !conversations?.threads.length} onClick={() => void clearConversations()}>Clear all conversations</button></div>
      {!conversations?.threads.length ? <p className="muted">No conversations.</p> : conversations.threads.slice(0, 12).map((thread) => <article key={thread.id}><div><b>{thread.title}</b><small>{thread.messageCount} messages · updated {new Date(thread.updatedAt).toLocaleString()}</small></div><button className="danger" disabled={busy} onClick={() => void deleteConversation(thread.id, thread.title)}>Delete</button></article>)}
    </div>
    {message && <div className="settings-message success">{message}</div>}
    {error && <div className="settings-message error">{error}</div>}
  </section>;
}
