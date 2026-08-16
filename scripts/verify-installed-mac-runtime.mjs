import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { extractFile } from '@electron/asar';

const execute = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repositoryRoot, 'dist_electron', 'build-manifest.json');
const requestedAppPath = process.argv[2];

if (!requestedAppPath) throw new Error('Usage: node scripts/verify-installed-mac-runtime.mjs <FORGE.app path>');

const appPath = path.resolve(requestedAppPath);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const [{ stdout: currentCommit }, { stdout: bundleVersion }] = await Promise.all([
  execute('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot }),
  execute('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', path.join(appPath, 'Contents', 'Info.plist')])
]);
const packagedApp = manifest.packagedApplications?.find((entry) =>
  Array.isArray(entry.architectures) && entry.architectures.includes('arm64') && entry.architectures.includes('x86_64')
);

if (!packagedApp || manifest.platform !== 'darwin' || !/^[0-9a-f]{40}$/.test(manifest.gitCommit ?? '')) {
  throw new Error('The build manifest does not describe a universal macOS runtime.');
}
if (manifest.gitCommit !== currentCommit.trim()) throw new Error('The build manifest does not match the current Git commit.');
if (bundleVersion.trim() !== manifest.version) throw new Error(`Installed bundle version does not match the manifest: ${appPath}`);

const sha256 = async (filePath) => createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
const verifyRecord = async (record, targetPath) => {
  const stat = await fs.stat(targetPath);
  if (!stat.isFile() || stat.size !== record.size || await sha256(targetPath) !== record.sha256) {
    throw new Error(`Installed runtime hash does not match the manifest: ${targetPath}`);
  }
};

const executablePath = path.join(appPath, 'Contents', 'MacOS', 'FORGE');
const appAsarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');
const metadataPath = path.join(appPath, 'Contents', 'Resources', 'forge-runtime.json');
await verifyRecord(packagedApp.executable, executablePath);
await verifyRecord(packagedApp.appAsar, appAsarPath);
const { stdout: architectures } = await execute('lipo', ['-archs', executablePath]);
if (architectures.trim().split(/\s+/).sort().join(',') !== 'arm64,x86_64') {
  throw new Error(`Installed executable is not universal: ${architectures.trim()}`);
}

let metadata;
try { metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')); }
catch { throw new Error(`Installed runtime metadata is malformed: ${metadataPath}`); }
if (metadata?.schemaVersion !== 1 || metadata.product !== 'FORGE' || metadata.platform !== 'darwin' || metadata.version !== manifest.version || metadata.gitCommit !== manifest.gitCommit || metadata.buildDate !== manifest.buildDate) {
  throw new Error(`Installed runtime metadata does not match the manifest: ${metadataPath}`);
}

const compiledMain = extractFile(appAsarPath, 'apps/desktop/out/main/index.js').toString('utf8');
const embeddedCommit = compiledMain.match(/commit:\s*"([0-9a-f]{40})"/)?.[1];
const embeddedBuildDate = compiledMain.match(/buildDate:\s*"([^"]+)"/)?.[1];
if (embeddedCommit !== manifest.gitCommit || embeddedBuildDate !== manifest.buildDate) {
  throw new Error(`Installed UI provenance does not match the manifest: ${appAsarPath}`);
}

console.log(`Verified installed universal FORGE ${manifest.version} at ${manifest.gitCommit}: ${appPath}`);
