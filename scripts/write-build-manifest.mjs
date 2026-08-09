import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(repositoryRoot, 'dist_electron');
const expectedArchitectures = new Set((process.argv[2] ?? '').split(',').filter(Boolean));
const allowedArchitectures = new Set(['arm64', 'x64', 'universal']);
const appDirectoryFor = (architecture) => architecture === 'arm64' ? 'mac-arm64' : architecture === 'x64' ? 'mac' : 'mac-universal';

if (expectedArchitectures.size === 0 || [...expectedArchitectures].some((entry) => !allowedArchitectures.has(entry))) {
  throw new Error('Usage: node scripts/write-build-manifest.mjs arm64|x64|universal|arm64,universal');
}

const packageManifest = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const version = packageManifest.version;
const channel = version.includes('-') ? 'beta' : 'latest';
const compiledMain = await fs.readFile(path.join(repositoryRoot, 'apps/desktop/out/main/index.js'), 'utf8');
const commit = compiledMain.match(/commit:\s*"([0-9a-f]{40})"/)?.[1];
const buildDate = compiledMain.match(/buildDate:\s*"([^"]+)"/)?.[1];
if (!commit || !buildDate) throw new Error('Compiled build provenance was not found. Run npm run build first.');
const [{ stdout: currentCommit }, { stdout: workingTree }] = await Promise.all([
  execute('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot }),
  // `npm run build` rewrites this tracked generated runtime bundle with the
  // current build provenance. It is verified separately above; every other
  // source change must still make a release manifest ineligible for upload.
  execute('git', ['status', '--porcelain', '--', '.', ':(exclude)apps/desktop/out/main/index.js'], { cwd: repositoryRoot })
]);
if (commit !== currentCommit.trim()) throw new Error('Compiled build commit does not match the current Git HEAD.');

const sha256 = async (filePath) => createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
const fileRecord = async (kind, absolutePath, architectures) => {
  const stat = await fs.stat(absolutePath);
  return {
    kind,
    path: path.relative(repositoryRoot, absolutePath),
    size: stat.size,
    sha256: await sha256(absolutePath),
    architectures
  };
};

await Promise.all([
  fs.rm(path.join(outputDirectory, 'builder-debug.yml'), { force: true }),
  fs.rm(path.join(outputDirectory, 'builder-effective-config.yaml'), { force: true }),
  fs.rm(path.join(outputDirectory, '.icon-icns'), { recursive: true, force: true })
]);

const outputEntries = await fs.readdir(outputDirectory, { withFileTypes: true });
const staleFiles = outputEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name !== `${channel}-mac.yml` && !name.startsWith(`FORGE-${version}-`));
if (staleFiles.length > 0) throw new Error(`Packaging output contains stale or unexpected files: ${staleFiles.join(', ')}`);
const expectedAppDirectories = new Set([...expectedArchitectures].map(appDirectoryFor));
const staleDirectories = outputEntries.filter((entry) => entry.isDirectory() && !expectedAppDirectories.has(entry.name)).map((entry) => entry.name);
if (staleDirectories.length > 0) throw new Error(`Packaging output contains stale or unexpected directories: ${staleDirectories.join(', ')}`);

const artifacts = [];
for (const architecture of expectedArchitectures) {
  for (const extension of ['dmg', 'dmg.blockmap', 'zip', 'zip.blockmap']) {
    const absolutePath = path.join(outputDirectory, `FORGE-${version}-${architecture}.${extension}`);
    artifacts.push(await fileRecord(extension.includes('blockmap') ? 'blockmap' : extension, absolutePath, architecture === 'universal' ? ['x86_64', 'arm64'] : [architecture]));
  }
}
const metadataPath = path.join(outputDirectory, `${channel}-mac.yml`);
artifacts.push(await fileRecord('updater-metadata', metadataPath, expectedArchitectures.has('universal') ? ['x86_64', 'arm64'] : [...expectedArchitectures]));

const packagedApplications = [];
for (const architecture of expectedArchitectures) {
  const appPath = path.join(outputDirectory, appDirectoryFor(architecture), 'FORGE.app');
  const executablePath = path.join(appPath, 'Contents/MacOS/FORGE');
  const appAsarPath = path.join(appPath, 'Contents/Resources/app.asar');
  const { stdout } = await execute('lipo', ['-archs', executablePath]);
  const observedArchitectures = stdout.trim().split(/\s+/).sort();
  const required = architecture === 'universal' ? ['arm64', 'x86_64'] : [architecture];
  if (JSON.stringify(observedArchitectures) !== JSON.stringify(required.sort())) {
    throw new Error(`Unexpected executable architectures for ${appPath}: ${observedArchitectures.join(', ')}`);
  }
  packagedApplications.push({
    path: path.relative(repositoryRoot, appPath),
    architectures: observedArchitectures,
    executable: await fileRecord('executable', executablePath, observedArchitectures),
    appAsar: await fileRecord('app-asar', appAsarPath, observedArchitectures)
  });
}

const manifest = {
  schemaVersion: 1,
  product: 'FORGE',
  version,
  tag: `v${version}`,
  gitCommit: commit,
  sourceTreeClean: workingTree.trim().length === 0,
  buildDate,
  channel: channel === 'beta' ? 'beta' : 'stable',
  platform: 'darwin',
  architectures: [...new Set(packagedApplications.flatMap((entry) => entry.architectures))].sort(),
  artifacts,
  packagedApplications
};

await fs.writeFile(path.join(outputDirectory, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
console.log(`Wrote dist_electron/build-manifest.json for ${manifest.tag} at ${manifest.gitCommit}.`);
