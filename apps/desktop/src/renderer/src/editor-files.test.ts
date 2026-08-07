import { describe, expect, it } from 'vitest';
import type { FileNode } from '@forge/ipc';
import { fileNodeForPath, findFileNode, normalizeEditorPath } from './editor-files';

const tree: FileNode[] = [{ path: '/workspace/notes', name: 'notes', relativePath: 'notes', type: 'directory', children: [{ path: '/workspace/notes/draft.txt', name: 'draft.txt', relativePath: 'notes/draft.txt', type: 'file', extension: 'txt' }] }];

describe('editor file paths', () => {
  it('normalizes user-entered relative paths', () => {
    expect(normalizeEditorPath(' ./notes\\draft.txt ')).toBe('notes/draft.txt');
  });

  it('finds nested collisions by workspace-relative path', () => {
    expect(findFileNode(tree, './notes/draft.txt')?.name).toBe('draft.txt');
    expect(findFileNode(tree, 'draft.txt')).toBeNull();
  });

  it('builds a text file node for a collision not yet present in the explorer snapshot', () => {
    expect(fileNodeForPath('notes/DRAFT.TXT', '/workspace')).toEqual({ path: '/workspace/notes/DRAFT.TXT', name: 'DRAFT.TXT', relativePath: 'notes/DRAFT.TXT', type: 'file', extension: 'txt' });
  });
});
