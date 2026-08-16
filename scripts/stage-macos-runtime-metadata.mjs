import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const compiledMain = await fs.readFile(path.join(repositoryRoot, 'apps/desktop/out/main/index.js'), 'utf8');
const commit = compiledMain.match(/commit:\s*"([0-9a-f]{40})"/)?.[1];
const buildDate = compiledMain.match(/buildDate:\s*"([^"]+)"/)?.[1];

if (!commit || !buildDate) throw new Error('Compiled build provenance was not found. Run npm run build first.');

const metadata = {
  schemaVersion: 1,
  product: 'FORGE',
  platform: 'darwin',
  version: packageManifest.version,
  gitCommit: commit,
  buildDate
};
const target = path.join(repositoryRoot, 'build', 'forge-runtime.json');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o644 });
console.log(`Staged macOS runtime metadata for FORGE ${metadata.version} at ${metadata.gitCommit}.`);
