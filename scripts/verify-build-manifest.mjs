import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { extractFile } from '@electron/asar';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execute = promisify(execFile);
const manifestPath = path.resolve(repositoryRoot, process.argv[2] ?? 'dist_electron/build-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const packageManifest = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));

if (manifest.schemaVersion !== 1 || manifest.product !== 'FORGE') throw new Error('Unsupported build manifest.');
if (manifest.version !== packageManifest.version || manifest.tag !== `v${packageManifest.version}`) throw new Error('Build manifest version does not match package.json.');
if (!Array.isArray(manifest.artifacts) || !Array.isArray(manifest.packagedApplications)) throw new Error('Build manifest is incomplete.');

const verify = async (record) => {
  if (!record || typeof record.path !== 'string' || !/^[0-9a-f]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.size)) throw new Error('Malformed manifest file record.');
  const absolutePath = path.resolve(repositoryRoot, record.path);
  if (absolutePath !== repositoryRoot && !absolutePath.startsWith(`${repositoryRoot}${path.sep}`)) throw new Error(`Manifest path escapes the repository: ${record.path}`);
  const data = await fs.readFile(absolutePath);
  const digest = createHash('sha256').update(data).digest('hex');
  if (data.byteLength !== record.size || digest !== record.sha256) throw new Error(`Build artifact verification failed: ${record.path}`);
};

for (const artifact of manifest.artifacts) await verify(artifact);
for (const app of manifest.packagedApplications) {
  await verify(app.executable);
  await verify(app.appAsar);
  const appRoot = path.resolve(repositoryRoot, app.path);
  const infoPlist = path.join(appRoot, 'Contents', 'Info.plist');
  const runtimeMetadataPath = path.join(appRoot, 'Contents', 'Resources', 'forge-runtime.json');
  const [{ stdout: bundleVersion }, metadataBytes] = await Promise.all([
    execute('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', infoPlist]),
    fs.readFile(runtimeMetadataPath)
  ]);
  if (bundleVersion.trim() !== packageManifest.version) throw new Error(`Packaged app version does not match package.json: ${app.path}`);
  let runtimeMetadata;
  try { runtimeMetadata = JSON.parse(metadataBytes.toString('utf8')); }
  catch { throw new Error(`Packaged runtime metadata is malformed: ${app.path}`); }
  if (!runtimeMetadata || runtimeMetadata.schemaVersion !== 1 || runtimeMetadata.product !== 'FORGE' || runtimeMetadata.platform !== 'darwin' || runtimeMetadata.version !== packageManifest.version || runtimeMetadata.gitCommit !== manifest.gitCommit || runtimeMetadata.buildDate !== manifest.buildDate) {
    throw new Error(`Packaged runtime metadata does not match the manifest: ${app.path}`);
  }
  const compiledMain = extractFile(path.resolve(repositoryRoot, app.appAsar.path), 'apps/desktop/out/main/index.js').toString('utf8');
  const embeddedCommit = compiledMain.match(/commit:\s*"([0-9a-f]{40})"/)?.[1];
  const embeddedBuildDate = compiledMain.match(/buildDate:\s*"([^"]+)"/)?.[1];
  if (embeddedCommit !== manifest.gitCommit || embeddedBuildDate !== manifest.buildDate) throw new Error(`Packaged UI provenance does not match the manifest: ${app.path}`);
}

console.log(`Verified ${manifest.artifacts.length} artifacts and ${manifest.packagedApplications.length} packaged applications for ${manifest.tag}.`);
