import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';

export interface TextInputDialogProps {
  title: string;
  label: string;
  confirmLabel: string;
  initialValue?: string;
  placeholder?: string;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

export default function TextInputDialog({ title, label, confirmLabel, initialValue = '', placeholder, busy = false, onCancel, onSubmit }: TextInputDialogProps): JSX.Element {
  const [value, setValue] = useState(initialValue);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(initialValue);
    window.requestAnimationFrame(() => input.current?.focus());
  }, [initialValue, title]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const normalized = value.trim();
    if (!normalized || busy) return;
    void onSubmit(normalized);
  };

  return <div className="text-input-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <form className="text-input-dialog" role="dialog" aria-modal="true" aria-labelledby="text-input-dialog-title" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) onCancel(); }}>
      <h2 id="text-input-dialog-title">{title}</h2>
      <label>{label}<input ref={input} value={value} placeholder={placeholder} disabled={busy} onChange={(event) => setValue(event.target.value)} /></label>
      <footer><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="accent" type="submit" disabled={busy || !value.trim()}>{busy ? 'Working…' : confirmLabel}</button></footer>
    </form>
  </div>;
}
