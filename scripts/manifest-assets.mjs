import { promises as fs } from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve(process.argv[2] ?? '');
const channel = process.argv[3];
const tag = process.argv[4];
if (!manifestPath || !['beta', 'latest'].includes(channel) || !tag) throw new Error('Usage: node scripts/manifest-assets.mjs <manifest> <beta|latest> <tag>');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.tag !== tag) throw new Error(`Manifest tag ${manifest.tag} does not match ${tag}.`);
if (manifest.sourceTreeClean !== true) throw new Error('Release upload requires a clean source tree recorded in the build manifest.');
const expectedChannel = channel === 'latest' ? 'stable' : channel;
if (manifest.channel !== expectedChannel) throw new Error(`Manifest channel ${manifest.channel} does not match ${expectedChannel}.`);

const releaseAssets = manifest.artifacts.filter((artifact) => {
  if (artifact.kind === 'updater-metadata') return path.basename(artifact.path) === `${channel}-mac.yml`;
  return artifact.architectures?.includes('x86_64') && artifact.architectures?.includes('arm64');
});
if (releaseAssets.length !== 5) throw new Error(`Expected five universal release assets; found ${releaseAssets.length}.`);
const order = (artifact) => {
  if (artifact.kind === 'dmg') return 0;
  if (artifact.kind === 'zip') return 1;
  if (artifact.path.endsWith('.dmg.blockmap')) return 2;
  if (artifact.path.endsWith('.zip.blockmap')) return 3;
  return 4;
};
for (const artifact of releaseAssets.sort((left, right) => order(left) - order(right))) console.log(artifact.path);
