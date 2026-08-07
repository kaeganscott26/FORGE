import type { FileNode } from '@forge/ipc';

export function normalizeEditorPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

export function parentEditorPath(value: string): string {
  const normalized = normalizeEditorPath(value);
  const separator = normalized.lastIndexOf('/');
  return separator === -1 ? '' : normalized.slice(0, separator);
}

export function childEditorPath(parent: string, child: string): string {
  const normalizedChild = normalizeEditorPath(child).replace(/^\/+|\/+$/g, '');
  return [normalizeEditorPath(parent), normalizedChild].filter(Boolean).join('/');
}

export function copiedEditorName(name: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames.map((value) => value.toLowerCase()));
  const extensionIndex = name.lastIndexOf('.');
  const stem = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex > 0 ? name.slice(extensionIndex) : '';
  let candidate = `${stem} copy${extension}`;
  let index = 2;
  while (taken.has(candidate.toLowerCase())) candidate = `${stem} copy ${index++}${extension}`;
  return candidate;
}

export function findFileNode(nodes: readonly FileNode[], requestedPath: string): FileNode | null {
  const normalized = normalizeEditorPath(requestedPath);
  for (const node of nodes) {
    if (node.relativePath === normalized) return node;
    const child = node.children ? findFileNode(node.children, normalized) : null;
    if (child) return child;
  }
  return null;
}

export function fileNodeForPath(requestedPath: string, workspaceRoot: string): FileNode {
  const relativePath = normalizeEditorPath(requestedPath);
  const name = relativePath.split('/').at(-1) ?? relativePath;
  const extension = name.includes('.') ? name.split('.').at(-1)?.toLowerCase() : undefined;
  const separator = workspaceRoot.includes('\\') ? '\\' : '/';
  const root = workspaceRoot.replace(/[\\/]+$/, '');
  return { path: `${root}${separator}${relativePath.replace(/\//g, separator)}`, name, relativePath, type: 'file', extension };
}
