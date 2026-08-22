import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(repositoryRoot, relativePath), 'utf8'));
const rootManifest = await readJson('package.json');
const version = rootManifest.version;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Root package version is not valid SemVer: ${version}`);

const workspaceRoots = ['apps', 'packages'];
const workspaceManifests = [];
for (const directory of workspaceRoots) {
  for (const entry of await fs.readdir(path.join(repositoryRoot, directory), { withFileTypes: true })) {
    if (entry.isDirectory()) workspaceManifests.push(`${directory}/${entry.name}/package.json`);
  }
}

const workspacePackages = await Promise.all(workspaceManifests.map(async (manifestPath) => ({ manifestPath, manifest: await readJson(manifestPath) })));
for (const { manifestPath, manifest } of workspacePackages) {
  if (manifest.name.startsWith('@forge/') && manifest.version !== version) throw new Error(`${manifestPath} has ${manifest.version}; expected ${version}.`);
}

const lockfile = await readJson('package-lock.json');
if (lockfile.version !== version || lockfile.packages?.['']?.version !== version) throw new Error('package-lock.json root version does not match package.json.');
for (const { manifestPath, manifest } of workspacePackages) {
  const lockVersion = lockfile.packages?.[manifestPath.slice(0, -'/package.json'.length)]?.version;
  if (lockVersion !== manifest.version) throw new Error(`package-lock.json entry for ${manifestPath} has ${lockVersion ?? 'no version'}; expected ${manifest.version}.`);
}

const currentReleaseDocuments = [
  'README.md',
  'RELEASE_NOTES.md',
  'RELEASING.md',
  'UserManual.md',
  'UserConfig.md',
  'docs/README.md',
  'docs/PROJECT_STATUS.md',
  'docs/RELEASE_CHANNELS.md',
  'docs/TOOLING_GUIDE.md'
];
for (const documentPath of currentReleaseDocuments) {
  const text = await fs.readFile(path.join(repositoryRoot, documentPath), 'utf8');
  if (!text.includes(version)) throw new Error(`${documentPath} does not name the current release version ${version}.`);
}

console.log(`Verified ${version} in the root manifest, ${workspaceManifests.length} workspace manifests, package lockfile, and ${currentReleaseDocuments.length} current-release documents.`);
