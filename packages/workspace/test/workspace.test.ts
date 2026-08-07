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
});
