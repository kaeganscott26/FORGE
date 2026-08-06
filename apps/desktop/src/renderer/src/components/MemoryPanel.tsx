import { useCallback, useEffect, useState, type JSX } from 'react';
import { forgeInvoke } from '../forge';

type Memory = { id: string; title?: string | null; content: string };

export default function MemoryPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await forgeInvoke('agent.memories.list', undefined);
      if (!result.success) throw new Error(result.error.message);
      setMemories(result.data as Memory[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { setMemories([]); void refresh(); }, [workspaceKey, refresh]);
  const remove = async (id: string): Promise<void> => { if (!window.confirm('Delete this durable workspace memory?')) return; await forgeInvoke('agent.memories.delete', { id }); await refresh(); };
  const reindex = async (): Promise<void> => { setLoading(true); try { const result = await forgeInvoke('agent.memories.reindex', undefined); if (!result.success) throw new Error(result.error.message); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setLoading(false); } };
  return <section className="memory-panel">
    <div className="memory-heading"><div><strong>Durable memory</strong><small>{memories.length} workspace entries</small></div><div><button onClick={() => void refresh()} disabled={loading}>Refresh</button><button onClick={() => void reindex()} disabled={loading}>Reindex</button></div></div>
    {error && <p className="inline-error">{error}</p>}
    <div className="memory-list">{memories.length === 0 ? <p className="muted">No memories indexed for this workspace.</p> : memories.map((memory) => <article key={memory.id}><div><strong>{memory.title ?? 'Untitled memory'}</strong><p>{memory.content.slice(0, 180)}{memory.content.length > 180 ? '…' : ''}</p></div><button onClick={() => void remove(memory.id)}>Delete</button></article>)}</div>
  </section>;
}
