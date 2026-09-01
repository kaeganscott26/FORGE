import { useCallback, useEffect, useRef, useState } from 'react';
import { onRuntimeEvent } from '../forge';

type Tone = 'tap' | 'success' | 'warning';

export function useInterfaceSounds(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('forge.interfaceSounds') !== 'false');
  const context = useRef<AudioContext | null>(null);

  const prepare = useCallback(async (): Promise<AudioContext | null> => {
    try {
      const audio = context.current ?? new AudioContext({ latencyHint: 'interactive' }); context.current = audio;
      if (audio.state === 'suspended') await audio.resume();
      return audio.state === 'running' ? audio : null;
    } catch { return null; }
  }, []);

  const play = useCallback((tone: Tone): void => {
    if (!enabled) return;
    void (async () => {
      const audio = await prepare();
      if (!audio) return;
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      const now = audio.currentTime + 0.004;
      const frequencies = tone === 'success' ? [520, 780] : tone === 'warning' ? [220, 165] : [320, 420];
      oscillator.type = tone === 'tap' ? 'sine' : 'triangle'; oscillator.frequency.setValueAtTime(frequencies[0], now); oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], now + 0.055);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(tone === 'tap' ? 0.04 : 0.06, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + (tone === 'tap' ? 0.07 : 0.14));
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + (tone === 'tap' ? 0.075 : 0.15));
    })().catch(() => undefined);
  }, [enabled, prepare]);

  useEffect(() => {
    const unlock = (): void => { if (enabled) void prepare(); };
    const tap = (event: PointerEvent): void => { if ((event.target as HTMLElement | null)?.closest('button')) play('tap'); };
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener('pointerdown', tap, { passive: true });
    const unsubscribe = onRuntimeEvent((event) => {
      if (event.type === 'agent.completed' || event.type === 'semantic.index.complete') play('success');
      if (event.type === 'agent.blocked' || event.type === 'semantic.index.error') play('warning');
    });
    return () => { window.removeEventListener('pointerdown', unlock, { capture: true }); window.removeEventListener('keydown', unlock, { capture: true }); window.removeEventListener('pointerdown', tap); unsubscribe(); };
  }, [enabled, play, prepare]);

  useEffect(() => { localStorage.setItem('forge.interfaceSounds', String(enabled)); }, [enabled]);
  useEffect(() => () => { void context.current?.close(); }, []);
  return { enabled, toggle: () => setEnabled((current) => !current) };
}
