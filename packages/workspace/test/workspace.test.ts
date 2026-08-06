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
});
