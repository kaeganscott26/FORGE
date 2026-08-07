import { describe, expect, it } from 'vitest';
import type { FileNode } from '@forge/ipc';
import { childEditorPath, copiedEditorName, fileNodeForPath, findFileNode, normalizeEditorPath, parentEditorPath } from './editor-files';

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

  it('builds safe parent and child paths for explorer operations', () => {
    expect(parentEditorPath('notes/draft.txt')).toBe('notes');
    expect(parentEditorPath('README.md')).toBe('');
    expect(childEditorPath('notes', ' ideas.md ')).toBe('notes/ideas.md');
  });

  it('chooses an Obsidian-style copy name without overwriting', () => {
    expect(copiedEditorName('draft.md', ['draft.md', 'draft copy.md', 'draft copy 2.md'])).toBe('draft copy 3.md');
    expect(copiedEditorName('assets', ['assets'])).toBe('assets copy');
  });
});
