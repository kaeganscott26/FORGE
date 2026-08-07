import { useEffect, useRef, useState, type JSX } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { TerminalSessionView } from '@forge/ipc';
import { forgeInvoke, onTerminalEvent } from '../forge';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error.message); return result.data as T; };

export default function TerminalPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const host = useRef<HTMLDivElement>(null); const terminal = useRef<Terminal | undefined>(undefined); const fit = useRef<FitAddon | undefined>(undefined);
  const activeIdRef = useRef('');
  const [sessions, setSessions] = useState<TerminalSessionView[]>([]); const [activeId, setActiveId] = useState(''); const [error, setError] = useState('');
  const active = sessions.find((session) => session.id === activeId);
  const selectSession = (id: string): void => { activeIdRef.current = id; setActiveId(id); };
  const refresh = async (): Promise<void> => { const list = await data<TerminalSessionView[]>(forgeInvoke('terminal.list', undefined)); setSessions(list); if (!activeIdRef.current && list[0]) selectSession(list[0].id); };
  const create = async (): Promise<void> => { try { setError(''); const session = await data<TerminalSessionView>(forgeInvoke('terminal.create', { workingDirectory: '.', columns: terminal.current?.cols ?? 100, rows: terminal.current?.rows ?? 30 })); setSessions((current) => [...current, session]); selectSession(session.id); window.requestAnimationFrame(() => terminal.current?.focus()); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const terminate = async (): Promise<void> => { if (!active) return; try { await data<void>(forgeInvoke('terminal.terminate', { sessionId: active.id })); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const restart = async (): Promise<void> => { if (!active) return; try { const session = await data<TerminalSessionView>(forgeInvoke('terminal.restart', { sessionId: active.id })); setSessions((current) => current.map((entry) => entry.id === session.id ? session : entry)); selectSession(session.id); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const copyOutput = async (): Promise<void> => { try { await navigator.clipboard.writeText(terminal.current?.getSelection() || active?.recentOutput || ''); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  useEffect(() => { setSessions([]); selectSession(''); setError(''); void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); }, [workspaceKey]);
  useEffect(() => {
    if (!host.current) return undefined;
    const instance = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 12,
      theme: {
        background: '#090d11',
        foreground: '#d9e2ea',
        cursor: '#b8ff4d',
        selectionBackground: '#28445c',
        selectionInactiveBackground: '#111820',
        selectionForeground: '#f4f8fb'
      },
      scrollback: 5_000
    });
    const addon = new FitAddon(); instance.loadAddon(addon); instance.open(host.current); addon.fit(); terminal.current = instance; fit.current = addon;
    const report = async (promise: ReturnType<typeof forgeInvoke>): Promise<void> => { const result = await promise; if (!result.success) setError(result.error.message); };
    const input = instance.onData((value) => { const sessionId = activeIdRef.current; if (sessionId) void report(forgeInvoke('terminal.input', { sessionId, data: value })); });
    const resize = new ResizeObserver(() => { addon.fit(); const sessionId = activeIdRef.current; if (sessionId) void report(forgeInvoke('terminal.resize', { sessionId, columns: instance.cols, rows: instance.rows })); }); resize.observe(host.current);
    return () => { input.dispose(); resize.disconnect(); instance.dispose(); terminal.current = undefined; };
  }, []);
  useEffect(() => {
    terminal.current?.clear(); if (active?.recentOutput) terminal.current?.write(active.recentOutput);
    return onTerminalEvent((event) => { if (event.sessionId !== activeId) return; if (event.type === 'output' && event.data) terminal.current?.write(event.data); if (event.type === 'exit') { terminal.current?.write(`\r\n\x1b[33m[process exited ${event.exitCode ?? ''}]\x1b[0m\r\n`); void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); } });
  }, [activeId, active?.recentOutput]);
  return <div className="terminal-panel">
    <div className="terminal-toolbar"><strong>USER TERMINAL</strong><select value={activeId} onChange={(event) => selectSession(event.target.value)}><option value="">No session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {session.state}</option>)}</select><span>{active?.cwd ?? 'Workspace terminal not started'}{active?.exitCode !== null && active?.exitCode !== undefined ? ` · exit ${active.exitCode}` : ''}</span><button onClick={create}>New</button><button disabled={!active} onClick={() => terminal.current?.clear()}>Clear visible</button><button disabled={!active} onClick={() => void copyOutput()}>Copy output</button><button disabled={!active || active.state !== 'running'} onClick={() => void terminate()}>Cancel</button><button disabled={!active} onClick={() => void restart()}>Restart</button></div>
    {error && <div className="terminal-error">{error}</div>}<div className="terminal-host" ref={host} />
  </div>;
}
