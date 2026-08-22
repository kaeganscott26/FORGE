import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorkspaceService } from '../src';

describe('WorkspaceService state', () => {
  it('preserves opened Git and creation metadata in subsequent info reads', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'forge-workspace-info-'));
    try {
      await fs.mkdir(join(root, '.git'));
      const service = new WorkspaceService();
      const opened = await service.open(root);
      expect(service.info()).toEqual(opened);
      expect(service.info()?.gitRoot).toBe(join(root, '.git'));
      await service.close();
      expect(service.info()).toBeNull();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('recursively lists and edits any UTF-8 text file, then copies it without overwrite', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'forge-workspace-files-'));
    try {
      const service = new WorkspaceService();
      await service.open(root);
      await service.create('src/nested', 'directory');
      await service.writeFile('src/nested/module.toml', 'title = "FORGE"\n');
      const tree = await service.list();
      expect(tree[0]?.children?.[0]?.children?.[0]?.relativePath).toBe('src/nested/module.toml');
      expect((await service.readFile('src/nested/module.toml')).content).toContain('FORGE');
      await service.copy('src/nested/module.toml', 'src/nested/module copy.toml');
      expect((await service.readFile('src/nested/module copy.toml')).content).toContain('FORGE');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('keeps a home-sized workspace usable when protected and container-backed paths are present', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'forge-workspace-home-'));
    const protectedDirectory = join(root, 'protected');
    try {
      await fs.writeFile(join(root, 'visible.txt'), 'visible');
      await fs.mkdir(join(root, '.local', 'share', 'containers', 'storage', 'overlay'), { recursive: true });
      await fs.writeFile(join(root, '.local', 'share', 'containers', 'storage', 'overlay', 'container.txt'), 'skip');
      await fs.mkdir(protectedDirectory);
      if (process.platform !== 'win32') await fs.chmod(protectedDirectory, 0o000);
      const service = new WorkspaceService();
      await service.open(root);
      const tree = await service.list();
      expect(tree.some((entry) => entry.name === 'visible.txt')).toBe(true);
      expect(JSON.stringify(tree)).not.toContain('container.txt');
      if (process.platform !== 'win32') expect(tree.find((entry) => entry.name === 'protected')?.children).toEqual([]);
    } finally {
      if (process.platform !== 'win32') await fs.chmod(protectedDirectory, 0o700).catch(() => undefined);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('supports bounded shallow listing for a lazy home explorer', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'forge-workspace-lazy-'));
    try {
      await fs.mkdir(join(root, 'parent', 'child'), { recursive: true });
      await fs.writeFile(join(root, 'parent', 'child', 'deep.txt'), 'deep');
      const service = new WorkspaceService();
      await service.open(root);
      const rootEntries = await service.list('', { recursive: false });
      expect(rootEntries.find((entry) => entry.name === 'parent')?.children).toBeUndefined();
      const parentEntries = await service.list('parent', { recursive: false });
      expect(parentEntries.map((entry) => entry.name)).toEqual(['child']);
      const bounded = await service.list('', { maxEntries: 1 });
      expect(JSON.stringify(bounded)).not.toContain('deep.txt');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
