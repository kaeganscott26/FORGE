import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { BrowserStateView } from '@forge/ipc';
import { forgeInvoke } from '../forge';

const data = async <T,>(request: ReturnType<typeof forgeInvoke>): Promise<T> => {
  const result = await request;
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

const normalizedUrl = (value: string): string => /^[a-z][a-z0-9+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

export default function BrowserPanel(): JSX.Element {
  const surface = useRef<HTMLDivElement | null>(null);
  const [address, setAddress] = useState('');
  const [state, setState] = useState<BrowserStateView>({ url: '', title: '', canGoBack: false, canGoForward: false });
  const [error, setError] = useState('');
  const layout = useCallback(() => {
    const bounds = surface.current?.getBoundingClientRect();
    if (!bounds) return;
    void forgeInvoke('browser.layout', { visible: true, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
  }, []);
  useEffect(() => {
    layout();
    const observer = new ResizeObserver(layout);
    if (surface.current) observer.observe(surface.current);
    window.addEventListener('resize', layout);
    return () => { observer.disconnect(); window.removeEventListener('resize', layout); void forgeInvoke('browser.layout', { visible: false }); };
  }, [layout]);
  const navigate = async (): Promise<void> => {
    try {
      const next = await data<BrowserStateView>(forgeInvoke('browser.navigate', { url: normalizedUrl(address) }));
      setState(next); setAddress(next.url); setError(''); layout();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const control = async (channel: 'browser.back' | 'browser.forward' | 'browser.reload'): Promise<void> => {
    try { const next = await data<BrowserStateView>(forgeInvoke(channel, undefined)); setState(next); setAddress(next.url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return <div className="browser-panel">
    <div className="browser-toolbar"><button disabled={!state.canGoBack} onClick={() => void control('browser.back')} aria-label="Back">←</button><button disabled={!state.canGoForward} onClick={() => void control('browser.forward')} aria-label="Forward">→</button><button onClick={() => void control('browser.reload')} aria-label="Reload">↻</button><form onSubmit={(event) => { event.preventDefault(); void navigate(); }}><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Enter a public website" aria-label="Browser address" /><button className="accent" type="submit">Go</button></form></div>
    {error && <div className="terminal-error">{error}</div>}
    <div ref={surface} className="browser-surface"><div className="browser-placeholder"><strong>{state.title || 'FORGE Browser'}</strong><span>{state.url || 'Enter an HTTP(S) address to browse the public web inside this workspace.'}</span></div></div>
  </div>;
}
