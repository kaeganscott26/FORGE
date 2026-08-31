import { useCallback, useEffect, useRef, useState } from 'react';
import { onRuntimeEvent } from '../forge';

type Tone = 'tap' | 'success' | 'warning';

export function useInterfaceSounds(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('forge.interfaceSounds') !== 'false');
  const context = useRef<AudioContext | null>(null);

  const play = useCallback((tone: Tone): void => {
    if (!enabled) return;
    const audio = context.current ?? new AudioContext(); context.current = audio;
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    const now = audio.currentTime;
    const frequencies = tone === 'success' ? [520, 780] : tone === 'warning' ? [220, 165] : [320, 420];
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequencies[0], now); oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], now + 0.055);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(tone === 'tap' ? 0.018 : 0.026, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + (tone === 'tap' ? 0.07 : 0.14));
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + (tone === 'tap' ? 0.075 : 0.15));
  }, [enabled]);

  useEffect(() => {
    const tap = (event: PointerEvent): void => { if ((event.target as HTMLElement | null)?.closest('button')) play('tap'); };
    window.addEventListener('pointerdown', tap, { passive: true });
    const unsubscribe = onRuntimeEvent((event) => {
      if (event.type === 'agent.completed' || event.type === 'semantic.index.complete') play('success');
      if (event.type === 'agent.blocked' || event.type === 'semantic.index.error') play('warning');
    });
    return () => { window.removeEventListener('pointerdown', tap); unsubscribe(); };
  }, [play]);

  useEffect(() => { localStorage.setItem('forge.interfaceSounds', String(enabled)); }, [enabled]);
  useEffect(() => () => { void context.current?.close(); }, []);
  return { enabled, toggle: () => setEnabled((current) => !current) };
}
