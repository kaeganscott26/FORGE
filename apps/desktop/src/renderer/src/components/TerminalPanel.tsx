import { useEffect, useRef, useState, type JSX } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { TerminalSessionView } from '@forge/ipc';
import { forgeInvoke, onTerminalEvent } from '../forge';

const data = async <T,>(promise: ReturnType<typeof forgeInvoke>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error.message); return result.data as T; };

export default function TerminalPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const host = useRef<HTMLDivElement>(null); const terminal = useRef<Terminal | undefined>(undefined);
  const activeIdRef = useRef('');
  const [sessions, setSessions] = useState<TerminalSessionView[]>([]); const [activeId, setActiveId] = useState(''); const [error, setError] = useState('');
  const active = sessions.find((session) => session.id === activeId);
  const selectSession = (id: string): void => { activeIdRef.current = id; setActiveId(id); };
  const refresh = async (): Promise<void> => { const list = await data<TerminalSessionView[]>(forgeInvoke('terminal.list', undefined)); setSessions(list); if (!activeIdRef.current && list[0]) selectSession(list[0].id); };
  const create = async (): Promise<void> => { try { setError(''); const session = await data<TerminalSessionView>(forgeInvoke('terminal.create', { workingDirectory: '.', columns: terminal.current?.cols ?? 100, rows: terminal.current?.rows ?? 30 })); setSessions((current) => [...current, session]); selectSession(session.id); window.requestAnimationFrame(() => terminal.current?.focus()); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const terminate = async (): Promise<void> => { if (!active) return; try { await data<void>(forgeInvoke('terminal.terminate', { sessionId: active.id })); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const restart = async (): Promise<void> => { if (!active) return; try { const session = await data<TerminalSessionView>(forgeInvoke('terminal.restart', { sessionId: active.id })); terminal.current?.reset(); setSessions((current) => current.map((entry) => entry.id === session.id ? session : entry)); selectSession(session.id); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const copyOutput = async (): Promise<void> => { try { await navigator.clipboard.writeText(terminal.current?.getSelection() || active?.recentOutput || ''); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  useEffect(() => { setSessions([]); selectSession(''); setError(''); void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); }, [workspaceKey]);
  useEffect(() => {
    if (!host.current) return undefined;
    const instance = new Terminal({
      cursorBlink: true,
      fontFamily: '"Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono", monospace',
      fontSize: 13,
      letterSpacing: 0,
      lineHeight: 1.15,
      rescaleOverlappingGlyphs: true,
      scrollOnUserInput: true,
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
    const addon = new FitAddon(); instance.loadAddon(addon); instance.open(host.current); terminal.current = instance;
    const report = async (promise: ReturnType<typeof forgeInvoke>): Promise<void> => { const result = await promise; if (!result.success) setError(result.error.message); };
    let disposed = false; let fitFrame = 0; let lastColumns = 0; let lastRows = 0;
    const fitTerminal = (): void => {
      if (!host.current || host.current.clientWidth < 20 || host.current.clientHeight < 20) return;
      addon.fit(); const sessionId = activeIdRef.current;
      if (sessionId && (instance.cols !== lastColumns || instance.rows !== lastRows)) {
        lastColumns = instance.cols; lastRows = instance.rows;
        void report(forgeInvoke('terminal.resize', { sessionId, columns: instance.cols, rows: instance.rows }));
      }
    };
    const scheduleFit = (): void => { if (disposed) return; window.cancelAnimationFrame(fitFrame); fitFrame = window.requestAnimationFrame(fitTerminal); };
    const input = instance.onData((value) => { const sessionId = activeIdRef.current; if (sessionId) void report(forgeInvoke('terminal.input', { sessionId, data: value })); });
    const resize = new ResizeObserver(scheduleFit); resize.observe(host.current); window.addEventListener('resize', scheduleFit); scheduleFit();
    void document.fonts?.ready.then(scheduleFit);
    return () => { disposed = true; input.dispose(); resize.disconnect(); window.removeEventListener('resize', scheduleFit); window.cancelAnimationFrame(fitFrame); instance.dispose(); terminal.current = undefined; };
  }, []);
  useEffect(() => {
    terminal.current?.reset(); if (active?.recentOutput) terminal.current?.write(active.recentOutput);
    if (activeId && terminal.current) void forgeInvoke('terminal.resize', { sessionId: activeId, columns: terminal.current.cols, rows: terminal.current.rows }).then((result) => { if (!result.success) setError(result.error.message); });
    return onTerminalEvent((event) => { if (event.sessionId !== activeId) return; if (event.type === 'output' && event.data) terminal.current?.write(event.data); if (event.type === 'exit') { terminal.current?.write(`\r\n\x1b[33m[process exited ${event.exitCode ?? ''}]\x1b[0m\r\n`); void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); } });
    // Rehydrate only when the selected session changes. Refreshing session
    // metadata must not clear and replay an active ANSI/TUI parser stream.
  }, [activeId]);
  return <div className="terminal-panel">
    <div className="terminal-toolbar"><strong>USER TERMINAL</strong><select value={activeId} onChange={(event) => selectSession(event.target.value)}><option value="">No session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {session.state}</option>)}</select><span>{active?.cwd ?? 'Workspace terminal not started'}{active?.exitCode !== null && active?.exitCode !== undefined ? ` · exit ${active.exitCode}` : ''}</span><button onClick={create}>New</button><button disabled={!active} onClick={() => terminal.current?.clear()}>Clear visible</button><button disabled={!active} onClick={() => void copyOutput()}>Copy output</button><button disabled={!active || active.state !== 'running'} onClick={() => void terminate()}>Cancel</button><button disabled={!active} onClick={() => void restart()}>Restart</button></div>
    {error && <div className="terminal-error">{error}</div>}<div className="terminal-host" ref={host} />
  </div>;
}
