export type EditorShortcut = 'open' | 'redo' | 'save' | 'undo';

export function resolveEditorShortcut(event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): EditorShortcut | null {
  if (event.altKey || (!event.metaKey && !event.ctrlKey)) return null;
  if (event.code === 'KeyS' && !event.shiftKey) return 'save';
  if (event.code === 'KeyO' && !event.shiftKey) return 'open';
  if (event.code === 'KeyZ') return event.shiftKey ? 'redo' : 'undo';
  if (event.code === 'KeyY' && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo';
  return null;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || Boolean(target.closest('.monaco-editor'));
}
