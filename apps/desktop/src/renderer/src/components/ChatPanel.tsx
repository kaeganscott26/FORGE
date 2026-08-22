import { useCallback, useEffect, useState, type JSX } from 'react';
import type { AgentResponse, ConversationState } from '@forge/ipc';
import { forgeInvoke } from '../forge';
import TextInputDialog from './TextInputDialog';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => {
  const result = await promise;
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

export default function ChatPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextSources, setContextSources] = useState<AgentResponse['contextSources']>([]);
  const [renaming, setRenaming] = useState(false);

  const loadState = useCallback(async (conversationId?: string): Promise<void> => {
    setError(null);
    try { setConversation(await data<ConversationState>(forgeInvoke('agent.conversations.state', conversationId ? { conversationId } : undefined))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, []);

  useEffect(() => {
    setConversation(null);
    setInput('');
    setContextSources([]);
    void loadState();
  }, [workspaceKey, loadState]);
  useEffect(() => { const refresh = (): void => { void loadState(); }; window.addEventListener('forge:conversation-updated', refresh); return () => window.removeEventListener('forge:conversation-updated', refresh); }, [loadState]);

  const createConversation = async (): Promise<void> => {
    try { setConversation(await data<ConversationState>(forgeInvoke('agent.conversation.create', {}))); setContextSources([]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const selectConversation = async (conversationId: string): Promise<void> => {
    if (conversationId === conversation?.activeConversationId) return;
    try { setConversation(await data<ConversationState>(forgeInvoke('agent.conversation.select', { conversationId }))); setContextSources([]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const renameConversation = async (title: string): Promise<void> => {
    if (!conversation) return;
    try { setConversation(await data<ConversationState>(forgeInvoke('agent.conversation.rename', { conversationId: conversation.activeConversationId, title }))); setRenaming(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const clearConversation = async (): Promise<void> => {
    if (!conversation || !window.confirm('Clear messages in this conversation? Workspace memory, indexed files, metadata, and Git state will remain intact.')) return;
    try {
      setConversation(await data<ConversationState>(forgeInvoke('agent.conversation.clear', { conversationId: conversation.activeConversationId })));
      setContextSources([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || loading || !conversation) return;
    const conversationId = conversation.activeConversationId;
    setError(null);
    setInput('');
    setLoading(true);
    setConversation((current) => current ? { ...current, messages: [...current.messages, { id: `pending-${Date.now()}`, conversationId, role: 'user', content: prompt, createdAt: Date.now() }] } : current);
    try {
      const response = await data<AgentResponse>(forgeInvoke('agent.ask', { prompt, conversationId }));
      setContextSources(response.contextSources ?? []);
      await loadState(response.conversationId);
    } catch (cause) {
      await loadState(conversationId);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  }, [conversation, input, loadState, loading]);

  const activeThread = conversation?.threads.find((thread) => thread.id === conversation.activeConversationId);
  const sourceGroups = (contextSources ?? []).reduce<Array<{ kind: string; sources: NonNullable<AgentResponse['contextSources']> }>>((groups, source) => {
    const kind = ({ architecture: 'Workspace Documentation', documentation: 'Workspace Documentation', source: 'Source Code', configuration: 'Workspace Documentation', git: 'Git', metadata: 'Goals & Tasks', memory: 'Durable Memory', conversation: 'Conversation', terminal: 'Terminal', tool: 'Tool Result', web: 'External Web', inference: 'Model Inference' } as Record<string, string>)[source.kind] ?? 'Other Evidence';
    const group = groups.find((entry) => entry.kind === kind);
    if (group) group.sources.push(source); else groups.push({ kind, sources: [source] });
    return groups;
  }, []);
  return <section className="chat-panel" aria-label="Workspace conversations">
    <div className="chat-header">
      <div><strong>Workspace AI</strong><small>{activeThread?.title ?? 'Loading conversation…'}</small></div>
      <div><button onClick={() => setRenaming(true)} disabled={!conversation}>Rename</button><button onClick={clearConversation} disabled={!conversation?.messages.length}>Clear</button><button className="accent" onClick={createConversation}>New chat</button></div>
    </div>
    <label className="conversation-picker">Conversation
      <select value={conversation?.activeConversationId ?? ''} onChange={(event) => void selectConversation(event.target.value)} disabled={!conversation}>
        {conversation?.threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.title} ({thread.messageCount})</option>)}
      </select>
    </label>
    <div className="chat-messages">
      {!conversation?.messages.length ? <div className="chat-empty"><strong>Begin a workspace-grounded conversation.</strong><span>FORGE will assemble architecture, project memory, Git history, documentation, goals, and current implementation context automatically.</span></div> : conversation.messages.map((message) => <article key={message.id} className={`chat-msg ${message.role}`}><b>{message.role === 'user' ? 'You' : 'FORGE'}</b><p>{message.content}</p></article>)}
      {loading && <div className="chat-thinking">Assembling workspace context…</div>}
    </div>
    {contextSources?.length ? <details className="context-sources"><summary>Relevant context ({contextSources.length})</summary>{sourceGroups.map((group) => <section key={group.kind}><strong>{group.kind}</strong>{group.sources.map((source) => <span key={source.id}><b>{source.title}</b>{source.relevance ? <em>{source.relevance}% relevance</em> : null}{source.reason ? <small>{source.reason}</small> : null}</span>)}</section>)}</details> : null}
    {error && <div className="chat-error">{error}</div>}
    <div className="chat-input"><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this workspace…" rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} /><button disabled={loading || !input.trim() || !conversation} onClick={() => void send()}>{loading ? 'Thinking…' : 'Send'}</button></div>
    {renaming && conversation && <TextInputDialog title="Rename conversation" label="Conversation title" confirmLabel="Rename" initialValue={activeThread?.title ?? ''} onCancel={() => setRenaming(false)} onSubmit={renameConversation} />}
  </section>;
}
