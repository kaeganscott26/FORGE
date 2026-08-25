import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFile } from '@electron/asar';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installedRoot = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || path.parse(installedRoot).root === installedRoot) {
  throw new Error('Usage: node scripts/verify-installed-windows-runtime.mjs <installed-app-directory>');
}

const manifestPath = path.join(repositoryRoot, 'dist_electron', 'build-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.product !== 'FORGE' || manifest.platform !== 'win32') {
  throw new Error('The build manifest is not a supported Windows FORGE manifest.');
}
const packagedApp = manifest.packagedApplications?.find((entry) => entry.architectures?.includes('x64'));
if (!packagedApp) throw new Error('The build manifest does not contain an x64 Windows application.');

const sha256 = async (filePath) => createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
const installedExecutable = path.join(installedRoot, 'FORGE.exe');
const installedAsar = path.join(installedRoot, 'resources', 'app.asar');
const installedMetadata = path.join(installedRoot, 'resources', 'forge-runtime.json');

const [executableHash, asarHash, metadataBytes] = await Promise.all([
  sha256(installedExecutable),
  sha256(installedAsar),
  fs.readFile(installedMetadata)
]);
if (executableHash !== packagedApp.executable.sha256) throw new Error('The installed FORGE.exe does not match the verified package.');
if (asarHash !== packagedApp.appAsar.sha256) throw new Error('The installed app.asar does not match the verified package.');

let runtimeMetadata;
try { runtimeMetadata = JSON.parse(metadataBytes.toString('utf8')); }
catch { throw new Error(`Installed runtime metadata is malformed: ${installedMetadata}`); }
if (!runtimeMetadata || runtimeMetadata.schemaVersion !== 1 || runtimeMetadata.product !== 'FORGE' || runtimeMetadata.platform !== 'win32' || runtimeMetadata.version !== manifest.version || runtimeMetadata.gitCommit !== manifest.gitCommit || runtimeMetadata.buildDate !== manifest.buildDate) {
  throw new Error(`Installed runtime metadata does not match the manifest: ${installedMetadata}`);
}

const installedPackage = JSON.parse(extractFile(installedAsar, 'package.json').toString('utf8'));
if (installedPackage.version !== manifest.version) throw new Error('The installed FORGE version does not match the build manifest.');
const compiledMain = extractFile(installedAsar, path.join('apps', 'desktop', 'out', 'main', 'index.js')).toString('utf8');
const embeddedCommit = compiledMain.match(/commit:\s*"([0-9a-f]{40})"/)?.[1];
const embeddedBuildDate = compiledMain.match(/buildDate:\s*"([^"]+)"/)?.[1];
if (embeddedCommit !== manifest.gitCommit || embeddedBuildDate !== manifest.buildDate) {
  throw new Error('The installed FORGE UI provenance does not match the build manifest.');
}

console.log(`Verified installed FORGE ${manifest.version} for Windows x64 at ${manifest.gitCommit}: ${installedRoot}`);
