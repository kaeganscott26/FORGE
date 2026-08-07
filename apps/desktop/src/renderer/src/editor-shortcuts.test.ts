import { describe, expect, it, vi } from 'vitest';
import { isEditableShortcutTarget, resolveEditorShortcut } from './editor-shortcuts';

const event = (code: string, overrides: Partial<KeyboardEvent> = {}) => ({
  altKey: false, code, ctrlKey: false, metaKey: true, shiftKey: false, ...overrides
}) as KeyboardEvent;

describe('editor shortcuts', () => {
  it('maps platform save and open commands', () => {
    expect(resolveEditorShortcut(event('KeyS'))).toBe('save');
    expect(resolveEditorShortcut(event('KeyO', { ctrlKey: true, metaKey: false }))).toBe('open');
  });

  it('maps undo and both common redo commands', () => {
    expect(resolveEditorShortcut(event('KeyZ'))).toBe('undo');
    expect(resolveEditorShortcut(event('KeyZ', { shiftKey: true }))).toBe('redo');
    expect(resolveEditorShortcut(event('KeyY', { ctrlKey: true, metaKey: false }))).toBe('redo');
  });

  it('ignores modified and unrelated combinations', () => {
    expect(resolveEditorShortcut(event('KeyS', { altKey: true }))).toBeNull();
    expect(resolveEditorShortcut(event('KeyP'))).toBeNull();
  });

  it('leaves Monaco-native and form editing history with the focused control', () => {
    class FakeHTMLElement {
      isContentEditable = false;
      constructor(public tagName: string, private readonly inMonaco = false) {}
      closest(selector: string): object | null { return selector === '.monaco-editor' && this.inMonaco ? {} : null; }
    }
    vi.stubGlobal('HTMLElement', FakeHTMLElement);
    try {
      expect(isEditableShortcutTarget(new FakeHTMLElement('DIV', true) as unknown as EventTarget)).toBe(true);
      expect(isEditableShortcutTarget(new FakeHTMLElement('TEXTAREA') as unknown as EventTarget)).toBe(true);
      expect(isEditableShortcutTarget(new FakeHTMLElement('BUTTON') as unknown as EventTarget)).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
