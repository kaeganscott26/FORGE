# Releasing FORGE

## Release philosophy

Release integrity matters because an updater connects source code, a Git tag, a CI runner, downloadable binaries, an installed application, and future update behavior. A green CI check proves only that a job reported success. It does not prove which source produced the installed binary or that every public asset matches the artifacts that were validated.

A verified FORGE release proves:

- the authoritative source commit;
- the annotated tag and the commit it resolves to;
- the workflow run that built the artifacts;
- the published DMG, ZIP, blockmaps, and updater metadata;
- local and remote SHA-256 equality for validated artifacts;
- the installed bundle's version, commit, renderer source, architecture, and runtime mode;
- logical Stable/Preview updater behavior.

The workspace-owned release task is the durable record. Conversation text is not authoritative.

## Channels and semantic versions

- Development is an unpackaged `-dev` identity and is never published.
- Preview accepts only strictly newer normal SemVer or prereleases whose first identifier is `alpha`, `beta`, or `rc`.
- Stable accepts only strictly newer normal SemVer.
- Drafts, malformed versions, unsupported prerelease identifiers, equal versions, and downgrades are rejected.
- Tags use `v<package-version>`, for example `v1.1.0-alpha.4`. Never move or republish a tag to different source.

Preview is FORGE's logical channel name, not a required provider prerelease identifier. See [Release Channels](docs/RELEASE_CHANNELS.md).

## Branch, pull request, and version strategy

1. Start from synchronized `main` on a named feature or release-preparation branch.
2. Preserve and review the existing worktree before editing.
3. Make the version bump and release notes on the branch. `package.json` and `package-lock.json` must agree.
4. Validate the exact diff and commit in logical units.
5. Push the branch and open a pull request to `main`.
6. Merge only after required checks and review pass.
7. Synchronize local `main`; prove local `main`, `origin/main`, and the intended release commit are identical.
8. Create an annotated tag at that exact commit and verify both the tag object and dereferenced commit.

Useful read-only checks include:

```sh
git status --short --branch
git diff --check
git rev-parse HEAD
git rev-parse origin/main
git rev-parse v1.1.0-alpha.4^{}
git cat-file -t v1.1.0-alpha.4
```

Creating commits, pushing, merging, and tagging are Tier 2 actions and require explicit approval.

## Local validation before the tag

From the authoritative source commit, run:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run package:mac
npm run package:mac:universal
```

Record command results, test totals, artifact paths, architectures, signing state, and hashes as task checkpoints. Generated `dist_electron/`, app bundles, `.forge/`, and `.obsidian/` content must not enter the source commit.

The ARM64 package verifies the native host architecture. The universal package verifies both `arm64` and `x86_64`, including `pty.node` and `spawn-helper`. Verify DMG mountability and ZIP integrity before upload.

## Workflow and authoritative provenance

Pushing an annotated `v*` tag triggers `.github/workflows/package-mac.yml`. The workflow checks out the tag, installs with Node 22, runs typecheck/lint/tests, creates or reuses a draft GitHub Release, packages a universal app, uploads assets serially, verifies retry collisions by SHA-256, and publishes only after uploads succeed.

If signing secrets are present, the workflow enables hardened runtime and uses the configured Apple certificate/notarization credentials. Without them it explicitly disables identity auto-discovery and produces an unsigned/ad-hoc preview. Never describe the latter as trusted unattended installation.

Record the workflow run ID, URL, checked-out SHA, conclusion, and release URL. A queued runner is waiting, not failure. A rerun must use the same immutable tag and must reconcile the existing draft/assets before doing work.

## Assets and serial upload policy

Artifacts are named `FORGE-<version>-<arch>.<ext>`. Their roles are:

- DMG: human installation and mounted-bundle inspection;
- ZIP: Electron Updater payload on macOS;
- DMG/ZIP blockmaps: differential-update data paired with their artifact;
- `preview-mac.yml`: Preview updater metadata;
- `latest-mac.yml`: Stable updater metadata.

`scripts/upload-release-assets.sh` uploads one DMG, then one ZIP, then blockmaps, then updater YAML. Publishing metadata last prevents an updater from seeing a payload before its assets are present. On retry, an existing byte-identical asset is downloaded, hash-verified, and skipped. An existing same-name asset with a different hash stops the workflow; the script never uses `--clobber`.

Do not upload DMG and ZIP concurrently. Do not replace a public asset merely to make a retry pass. Do not publish a duplicate compatibility tag.

## Hash and provenance verification

Compute local SHA-256 values after packaging and before installation:

```sh
shasum -a 256 dist_electron/FORGE-*.dmg
shasum -a 256 dist_electron/FORGE-*.zip
shasum -a 256 dist_electron/*.blockmap
shasum -a 256 dist_electron/*-mac.yml
```

After upload, obtain each remote asset independently and compare its SHA-256 with the recorded local value. Verify updater YAML URLs, sizes, and hashes point to the same version/tag. Verify source/tag/binary provenance as a chain, not isolated facts:

```text
merged source SHA
  = annotated tag dereference
  = workflow checkout SHA
  → locally validated artifact hashes
  = remote release asset hashes
  → installed diagnostic commit/version
```

A release with a missing ZIP, wrong blockmap, stale YAML, wrong remote hash, or tag/source mismatch is not verified even if CI succeeded.

## Installation and packaged runtime

Before installation, check both `/Applications/FORGE.app` and `~/Applications/FORGE.app` plus any renamed copies. Same-version replacement and duplicate bundles can leave a stale app running.

Mount the verified DMG or use the explicit local install script. Record the chosen bundle path. Inspect executable architecture and signing/notarization state. Launch that exact bundle against a safe workspace and verify:

- diagnostics show the expected version, channel, source commit, packaged runtime, and `file://` renderer;
- workspace open/read and SQLite state work;
- terminal accepts manually typed `pwd` and returns the workspace path;
- PTY exit rejects input and Restart creates a writable session;
- GPT-5.6 tool calls use `/v1/responses` while other compatible models retain provider-neutral routing;
- root-first file discovery and structured missing-path recovery work;
- a persistent task survives renderer reload, conversation switch/deletion, and application restart;
- completed steps are not repeated and task/audit references remain connected.

The safe persistence task is:

```text
Persistent Task Verification
✓ Inspect workspace
✓ Read README
✓ Run typecheck
□ Generate handoff
```

Restart the packaged app between steps, then resume from the first unfinished step.

## Updater verification

Select Stable and Preview independently. Record discovery result and candidate version. Stable must ignore prereleases; Preview may select a strictly newer supported prerelease or stable version. Both must reject equal versions and downgrades. Verify that the downloaded candidate matches the validated public release and that installation behavior is not confused by duplicate bundles or stale caches.

Unsigned/ad-hoc builds cannot establish a trusted unattended macOS replacement chain. Discovery and checksum gates may pass while installation still requires explicit human handling.

## Recovery

### Network interruption

Do not restart the release. Inspect the existing workflow, draft release, and remote assets. The serial uploader skips identical completed assets. Resume at the first missing asset. A wrong hash is a failed integrity condition, not permission to overwrite.

### AI or application interruption

Resume the workspace-owned release task. Reconcile Git, tag, workflow, PIDs, draft/published state, asset hashes, installed bundles, and updater behavior. Do not reconstruct state from chat and do not repeat verified build, tag, PR, upload, or publication steps.

### Rollback

Before publication, leave the release draft and correct the source on a new commit/tag if required. After publication, never move the tag or silently replace assets. Mark a bad release appropriately, preserve evidence, prepare a strictly newer corrective version, and document the defect. Installation rollback is manual while releases are unsigned; verify which bundle is launched and never permit an updater downgrade to bypass policy.

## Final release checklist

- [ ] Version and channel are valid.
- [ ] Feature/release PR is reviewed and merged.
- [ ] Local `main` equals `origin/main`.
- [ ] Clean source tree and authoritative SHA are recorded.
- [ ] `npm ci`, typecheck, lint, tests, build, ARM64 package, and universal package pass.
- [ ] DMG/ZIP/blockmaps/YAML exist and local hashes are recorded.
- [ ] Annotated tag resolves to the authoritative SHA.
- [ ] Workflow run checks out that SHA and succeeds.
- [ ] Remote assets exist and match local hashes.
- [ ] Release state and channel are correct.
- [ ] Duplicate app installations are resolved deliberately.
- [ ] Installed diagnostics match version/tag/source/runtime.
- [ ] Manual terminal input and PTY restart pass.
- [ ] GPT-5.6 tool route and filesystem recovery pass.
- [ ] Persistent task survives application/conversation turnover without repeating work.
- [ ] Stable and Preview updater behavior is verified.
- [ ] Signing/notarization status is stated accurately.
- [ ] Final handoff is generated from SQLite task state.
