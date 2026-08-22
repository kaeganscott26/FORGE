import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { HermesRuntimeDetector, discoverSkills, parseSkillMetadata, resolveAgentRuntime, skillRootsForWorkspace } from '../src/index';

describe('Hermes runtime integration boundary', () => {
  it('keeps native FORGE available when Hermes is absent', async () => {
    const status = await new HermesRuntimeDetector().status({ command: 'missing-hermes-forge-test', execute: async () => { throw new Error('not found'); } });
    expect(status.availability).toBe('unavailable');
    expect(resolveAgentRuntime('hermes', status)).toMatchObject({ requested: 'hermes', active: 'native' });
  });
  it('detects a headless Hermes CLI without treating it as workspace authority', async () => {
    let receivedArgs: string[] = [];
    const status = await new HermesRuntimeDetector().status({ command: 'hermes', execute: async (_command, args) => { receivedArgs = args; return { stdout: 'Hermes 1.2.3\n', stderr: '' }; } });
    expect(status).toMatchObject({ availability: 'available', version: 'Hermes 1.2.3' });
    expect(receivedArgs).toEqual(['--version']);
    expect(status.message).toContain('FORGE retains workspace state');
  });
  it('derives skill roots from a CLI-reported install location without hard-coded platform paths', async () => {
    const status = await new HermesRuntimeDetector().status({ command: 'hermes', execute: async () => ({ stdout: 'Hermes 1.2.3\nInstall directory: C:\\tools\\hermes-agent\n', stderr: '' }) });
    expect(status.installDirectory).toBe('C:\\tools\\hermes-agent');
  });
  it('discovers skill metadata progressively across workspace and global roots', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-skills-'));
    const workspaceSkill = path.join(root, '.forge', 'skills', 'release'); const globalSkill = path.join(root, 'hermes', 'skills', 'research');
    await mkdir(workspaceSkill, { recursive: true }); await mkdir(globalSkill, { recursive: true });
    await writeFile(path.join(workspaceSkill, 'SKILL.md'), '---\nname: forge-release\ndescription: Release a FORGE workspace safely.\nplatforms: [windows, linux]\n---\n# Forge release\n');
    await writeFile(path.join(globalSkill, 'SKILL.md'), '# Research\n');
    const skills = await discoverSkills([{ path: path.join(root, '.forge', 'skills'), scope: 'workspace' }, { path: path.join(root, 'hermes', 'skills'), scope: 'global' }]);
    expect(skills.map((skill) => [skill.name, skill.scope])).toEqual([['forge-release', 'workspace'], ['Research', 'global']]);
    expect(skillRootsForWorkspace(root, { hermesRoots: [path.join(root, 'hermes', 'skills')], platform: 'win32' }).map((entry) => entry.scope)).toEqual(['workspace', 'repository', 'global']);
  });
  it('reads compatible frontmatter without loading a skill body into model context', () => {
    expect(parseSkillMetadata('---\nname: test\ndescription: Tiny test.\n---\n# Ignored title\nlong body', '/tmp/test/SKILL.md', 'workspace')).toMatchObject({ name: 'test', description: 'Tiny test.' });
  });
});
