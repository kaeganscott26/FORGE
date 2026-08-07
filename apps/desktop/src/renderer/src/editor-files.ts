import type { FileNode } from '@forge/ipc';

export function normalizeEditorPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
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
