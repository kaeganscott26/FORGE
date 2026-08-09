import { useCallback, useEffect, useState, type JSX } from 'react';
import type { ActionLogView, ToolRequestView } from '@forge/ipc';
import { forgeInvoke, onRuntimeEvent } from '../forge';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => {
  const result = await promise;
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

export default function ToolPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const [requests, setRequests] = useState<ToolRequestView[]>([]);
  const [actions, setActions] = useState<ActionLogView[]>([]);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const [tool, setTool] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const refresh = useCallback(async () => {
    try {
      const filters: { conversationId?: string; toolName?: string; success?: boolean; from?: number; to?: number } = {};
      if (outcome) filters.success = outcome === 'success';
      if (tool) filters.toolName = tool;
      if (conversationId) filters.conversationId = conversationId;
      if (fromDate) filters.from = new Date(`${fromDate}T00:00:00`).getTime();
      if (toDate) filters.to = new Date(`${toDate}T23:59:59.999`).getTime();
      const [nextRequests, nextActions] = await Promise.all([
        data<ToolRequestView[]>(forgeInvoke('tool.requests.list', undefined)),
        data<ActionLogView[]>(forgeInvoke('tool.actions.list', filters))
      ]);
      setRequests(nextRequests);
      setActions(nextActions);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, [outcome, tool, conversationId, fromDate, toDate]);
  useEffect(() => {
    void refresh();
    return onRuntimeEvent((event) => {
      if (['tool.requested', 'tool.completed', 'agent.completed', 'context.invalidated'].includes(event.type)) void refresh();
    });
  }, [workspaceKey, refresh]);
  const cancel = async (requestId: string): Promise<void> => {
    try { await data<boolean>(forgeInvoke('tool.request.cancel', { requestId })); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const approve = async (requestId: string, choice: 'run-once' | 'session'): Promise<void> => {
    try { await data(forgeInvoke('tool.request.approve', { requestId, choice })); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const reject = async (requestId: string): Promise<void> => {
    try { await data(forgeInvoke('tool.request.reject', { requestId })); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const copy = async (value: unknown): Promise<void> => {
    try { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return <div className="tool-panel"><div className="tool-filters"><strong>AGENT TOOL ACTIVITY</strong><input value={conversationId} onChange={(event) => setConversationId(event.target.value)} placeholder="Conversation ID" /><input value={tool} onChange={(event) => setTool(event.target.value)} placeholder="Tool" /><select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="">All outcomes</option><option value="success">Success</option><option value="failure">Failure</option></select><input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>{error && <div className="terminal-error">{error}</div>}
    <div className="tool-columns"><section><h3>Requests</h3>{requests.length ? requests.map((request) => <article className="tool-request" key={request.id}><header><b>{request.toolName}</b><em>{request.state}</em></header><dl><dt>Reason</dt><dd>{request.reason}</dd><dt>Target</dt><dd>{request.target}</dd><dt>Working directory</dt><dd>{request.workingDirectory ?? 'Active workspace'}</dd><dt>Network</dt><dd>{request.networkAccess ? `Yes · ${request.externalDataDescription ?? 'request metadata only'}` : 'No'}</dd><dt>Expected effect</dt><dd>{request.expectedEffect}</dd></dl>{request.diff && <pre>{request.diff}</pre>}{request.state === 'pending' && <div className="tool-request-actions"><button onClick={() => void approve(request.id, 'run-once')}>Run once</button>{request.sessionApprovalAvailable && <button onClick={() => void approve(request.id, 'session')}>Allow exact scope this session</button>}<button onClick={() => void reject(request.id)}>Reject</button></div>}{request.state === 'running' && <button onClick={() => void cancel(request.id)}>Cancel running</button>}<button onClick={() => void copy(request)}>Copy request</button></article>) : <p className="muted">No agent tool requests in this runtime.</p>}</section>
    <section><h3>Persistent action log</h3>{actions.length ? actions.map((action) => <article className="action-row" key={action.id}><header><b>{action.toolName}</b><em>{action.success ? 'success' : 'failure'}</em></header><p>{action.resultSummary}</p><small>{new Date(action.timestamp).toLocaleString()} · {action.approvalDecision} · {action.executionDurationMs} ms</small><button onClick={() => void copy(action)}>Copy</button></article>) : <p className="muted">No matching audited actions.</p>}</section></div>
  </div>;
}
