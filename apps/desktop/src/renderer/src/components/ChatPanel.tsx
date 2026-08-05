import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatPanel(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await (window as any).forge.agent.conversations.list();
        if (res && res.success && mounted) {
          const entries = res.data as Array<{ role: 'user' | 'assistant'; content: string }>;
          setMessages(entries.map((e) => ({ role: e.role, content: e.content })));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    setInput('');
    setLoading(true);
    try {
      const result = await window.forge.invoke('agent.ask', { prompt } as any) as any;
      if (!result.success) throw new Error(result.error?.message ?? 'Agent request failed');
      const resp = result.data as any;
      const assistantText = String(resp.content ?? '');
      setMessages((m) => [...m, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  return (
    <div className="chat-panel">
      <div className="chat-header"><strong>AI Assistant</strong></div>
      <div className="chat-messages" style={{ minHeight: 120, maxHeight: 220, overflow: 'auto', padding: 8, background: '#111', color: '#fff' }}>
        {messages.length === 0 ? <div className="muted">No messages yet. Ask something about the project.</div> : messages.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}><b>{m.role === 'user' ? 'You' : 'Assistant'}:</b> <span>{m.content}</span></div>)}
      </div>
      {error && <div className="chat-error" style={{ color: 'salmon' }}>{error}</div>}
      <div className="chat-input" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the agent..." style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') void send(); }} />
        <button disabled={loading || !input.trim()} onClick={() => void send()}>{loading ? 'Thinking…' : 'Send'}</button>
      </div>
    </div>
  );
}
