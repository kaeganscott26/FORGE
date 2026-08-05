import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';

export default function MemoryPanel(): JSX.Element {
  const [memories, setMemories] = useState<Array<{ id: string; title?: string | null; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await import('../forge').then((m) => m.forgeInvoke('agent.memories.list', undefined));
      if (res && res.success) setMemories(res.data as any);
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
    const del = useCallback(async (id: string) => { if (!confirm('Delete memory?')) return; await import('../forge').then((m) => m.forgeInvoke('agent.memories.delete', { id })); void refresh(); }, [refresh]);
  const reindex = useCallback(async () => { setLoading(true); try { await import('../forge').then((m) => m.forgeInvoke('agent.memories.reindex', undefined)); await refresh(); } finally { setLoading(false); } }, [refresh]);
  return (
    <div className="memory-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Memories</strong>
        <div><button onClick={() => void refresh()} disabled={loading}>Refresh</button> <button onClick={() => void reindex()} disabled={loading}>Reindex workspace</button></div>
      </div>
      <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
        {memories.length === 0 ? <div className="muted">No memories indexed yet.</div> : memories.map((m) => (
          <div key={m.id} style={{ padding: 6, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{m.title ?? '(untitled)'}</strong><div style={{ fontSize: 12, opacity: 0.85 }}>{m.content.slice(0, 160)}{m.content.length > 160 ? '…' : ''}</div></div><div><button onClick={() => void del(m.id)}>Delete</button></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
