import { describe, expect, it } from 'vitest';
import { resolveEditorShortcut } from './editor-shortcuts';

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
});
