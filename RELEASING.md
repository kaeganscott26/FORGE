# Releasing FORGE

This guide describes the current cross-platform `2.5.0-beta` release system. The annotated `v2.5.0-beta` tag resolves to `430796e2b4de543f5e9c6b8a8195e407353c9f68`. Never move that tag or replace same-version public assets; post-tag fixes require a new semantic version.

## Release invariants

- Release from a clean, reviewed `main` that equals `origin/main`.
- Update the root and every workspace package version together.
- Update current release notes and documentation before tagging.
- Use an annotated `v<version>` tag whose peeled commit is the reviewed release commit.
- Build each native platform on its matching runner.
- Treat the build manifest, runtime metadata, asset hashes, tag provenance, public release, and installed runtime as separate evidence.
- Publish updater metadata only after its referenced payloads exist and have been verified.
- Never bypass forward-only update policy with a duplicate tag, moved tag, asset replacement, or compatibility release.

## Version and source gate

For a new version:

```sh
npm version <version> --workspaces --include-workspace-root --no-git-tag-version
npm install --package-lock-only --ignore-scripts
npm run verify:release-version
npm ci
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Before running the gate, update the version-specific trigger, `release_tag`, and release title in `.github/workflows/release.yml`. The current workflow is intentionally pinned to the `v2.5.0-beta` line; `npm run verify:release-version` must reject stale workflow/release documentation after a version bump.

Review the exact diff, commit it, push `main`, and prove local/remote equality before creating the annotated tag.

```sh
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git tag -a v<version> -m "FORGE <version>"
git cat-file -t v<version>
git rev-parse v<version>^{}
git push origin v<version>
```

## Coordinated workflow

`.github/workflows/release.yml` runs the source gate on Ubuntu, macOS, and Windows, then builds:

- Linux x64 AppImage, DEB, blockmaps/updater metadata, runtime metadata, and manifest;
- universal macOS DMG and ZIP with blockmaps/updater metadata, runtime metadata, and manifest;
- Windows x64 NSIS with blockmap/updater metadata, runtime metadata, native `node-pty` resources, and manifest.

Each package job verifies its native manifest before upload. The publish job downloads the three platform outputs, rejects duplicate basenames, excludes internal per-platform manifests/checksum files, requires exactly 11 public runtime/updater assets, creates `SHA256SUMS.all`, verifies the annotated tag through GitHub CLI, and publishes the 12-file set as a prerelease.

## Local packaging and installed-runtime checks

Run native commands only on their target OS:

```sh
# macOS
npm run update:mac
```

```powershell
# Windows
npm run update:win
```

```sh
# Linux package verification
./scripts/package-linux.sh
```

macOS and Windows update scripts require trusted origin/main and refuse dirty source outside `.obsidian`. They stage embedded `forge-runtime.json`, generate and verify `dist_electron/build-manifest.json`, install the manifest-selected artifact, and verify installed version, commit, build date, executable, and `app.asar` provenance. Windows installation also verifies required `node-pty`/ConPTY resources and requires FORGE to be closed.

Do not substitute a manually selected wildcard installer for the manifest-selected artifact. A responsive process alone does not prove provenance; a hash match alone does not prove startup.

## Public verification

After the workflow completes, verify:

1. the release tag is annotated and peels to the expected commit;
2. workflow jobs checked out that same tag commit;
3. the GitHub release is not a draft and its prerelease flag matches the semantic channel;
4. every expected platform asset exists exactly once;
5. GitHub-reported digests and downloaded hashes match `SHA256SUMS.all` and the platform manifests retained in CI evidence;
6. updater YAML names, sizes, and hashes match their payloads;
7. installed runtime metadata and `app.asar` embed the release commit;
8. the installed app opens, loads the packaged renderer, opens a workspace, and remains responsive;
9. signing/notarization status is reported independently from integrity.

The GitHub `v2.5.0-beta` release is public, non-draft, and reported as a prerelease. Its annotated tag and remote asset digests remain part of the provenance chain; signing/notarization status remains a separate assertion.

## Update-policy validation

Test Stable and Beta separately:

- Stable accepts only a strictly newer stable version.
- Beta accepts only a strictly newer beta, rc, or stable version.
- Alpha, equal, older, malformed, draft, unsafe, or incomplete releases are rejected.
- The downloader result is revalidated before installation and downgrade permission remains disabled.

## Publication checklist

- [ ] clean `main` equals `origin/main`
- [ ] all workspace versions and current docs agree
- [ ] typecheck, lint, tests, build, release-version check, and diff check pass
- [ ] annotated tag peels to the reviewed commit
- [ ] Linux, macOS, and Windows manifests verify
- [ ] public asset names and hashes match the manifests and `SHA256SUMS.all`
- [ ] release flag/channel are correct
- [ ] installed runtime provenance and workspace-open smoke pass on supported platforms
- [ ] signing/notarization are stated accurately
- [ ] no same-version tag or asset was moved/replaced

Historical release evidence is retained under [`docs/archive/releases`](docs/archive/releases).
