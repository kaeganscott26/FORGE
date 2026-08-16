# 🚀 Releasing FORGE

## 🧭 Release philosophy

Release integrity matters because an updater connects source, a tag, a CI runner, public binaries, an installed application, and future update behavior. CI success alone does not prove which source produced a binary or whether the public artifact is the one that was validated.

A verified release proves:

- which source commit created the binary;
- which annotated tag resolves to that commit;
- which workflow built it;
- which assets were published and whether their remote hashes match validated local artifacts;
- whether the installed app embeds the same commit and version;
- whether packaged runtime diagnostics, terminal behavior, task persistence, AI tool routing, and updater behavior are correct.

The workspace-owned release task and its observed checkpoints are authoritative. Conversation claims are not.

## 🔢 Channels and semantic versions

- Development uses an unpackaged `-dev` identity and is never published.
- Beta accepts only strictly newer normal SemVer or prereleases whose first identifier is `beta` or `rc`.
- Stable accepts only strictly newer normal SemVer.
- A legacy stored `preview` preference migrates to Beta.
- Drafts, malformed versions, unsupported identifiers, equal versions, and downgrades are rejected.
- Tags use `v<package-version>`; the current beta release is `v2.3.0-beta.1` and its public name is `FORGE v2.3 Beta`.

Never move or republish a tag to different source. See [Release Channels](docs/RELEASE_CHANNELS.md).

## 🌿 Branch and pull request strategy

1. Start from synchronized `main` on a named feature or release-preparation branch.
2. Preserve and inspect the existing worktree before editing.
3. Update root/workspace manifests, lockfile, diagnostics, workflow, release notes, and documentation together.
4. Validate the exact diff and commit logical units.
5. Push the feature branch and open a pull request to `main`.
6. Merge only after checks pass.
7. Synchronize local `main` and prove it equals `origin/main`.
8. Build and accept the exact final main commit.
9. Create one annotated tag at that commit and verify its object and dereferenced target.

Commit, push, merge, tag, upload, publication, installation, and remote cleanup remain explicit Tier 2 operations.

## 📌 Version bump and authoritative source

Use normal SemVer syntax. For this release every workspace manifest and `package-lock.json` reports `2.3.0-beta.1`. The public tag is `v2.3.0-beta.1`, and diagnostics report the Beta channel. Run `npm run verify:release-version` before packaging to check the root manifest, every workspace manifest, the lockfile, and current release documents together.

Read-only provenance checks include:

```sh
git status --short --branch
git diff --check
git rev-parse HEAD
git rev-parse origin/main
git cat-file -t v2.3.0-beta.1
git rev-parse v2.3.0-beta.1^{}
```

## 🧪 Local source and package validation

From the intended source commit run:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run package:mac
npm run package:mac:universal
```

For one clean directory containing both families, use `npm run package:mac:all`. Standalone package commands run `clean:dist` first. `dist_electron/build-manifest.json` records the version, commit, build date, channel, architectures, exact paths, sizes, and hashes. Installation and upload scripts select from it instead of choosing the first wildcard match.

The ARM64 package verifies the native host. The universal package must contain both `arm64` and `x86_64` in the application executable and relevant PTY binaries. Verify ZIP integrity and DMG mountability.

Generated binaries, `.forge/`, `.obsidian/`, updater caches, local databases, and temporary logs never enter a source commit.

## ⚙️ GitHub Actions workflow

Pushing an annotated release tag triggers `.github/workflows/package-mac.yml`. The v2.3.0-beta.1 run is [31323231310](https://github.com/kaeganscott26/FORGE/actions/runs/31323231310), which completed successfully for commit `302ff52b87e415d357c6fe5039869c742d5ecb24`. The workflow checks out the tag, installs Node 22 dependencies, runs typecheck/lint/tests, creates or reconciles a draft, packages a universal app, uploads assets serially, and publishes only after upload verification.

A queued runner is waiting, not failed. A GitHub 502 or network interruption is reconciled against the existing workflow, release, and assets; it is not permission to retag or restart the release blindly.

Record the workflow run ID, URL, head SHA, conclusion, and release URL.

## 📦 Assets, blockmaps, and updater YAML

- DMG: manual installation and mounted-bundle inspection.
- ZIP: Electron Updater payload for macOS.
- DMG blockmap: differential data paired with the DMG.
- ZIP blockmap: differential data paired with the ZIP.
- `beta-mac.yml`: Beta updater metadata.
- `latest-mac.yml`: Stable updater metadata.

For `v2.3.0-beta.1`, the verified asset sequence is the universal DMG, universal ZIP, both blockmaps, then `beta-mac.yml`. Uploads are serial. Metadata is last so no updater can discover an incomplete payload set.

On retry, `scripts/upload-release-assets.sh` downloads an existing same-name asset, compares SHA-256, and skips it only when byte-identical. A wrong hash is a failed integrity condition; never use `--clobber` to hide it.

## 🔐 Local and remote hash verification

Verify the generated manifest first:

```sh
node scripts/verify-build-manifest.mjs
shasum -a 256 dist_electron/FORGE-2.3.0-beta.1-*.dmg
shasum -a 256 dist_electron/FORGE-2.3.0-beta.1-*.zip
shasum -a 256 dist_electron/FORGE-2.3.0-beta.1-*.blockmap
shasum -a 256 dist_electron/beta-mac.yml
```

After publication, independently download every public asset and compare size and SHA-256 with the validated manifest. Inspect updater YAML filenames, URLs, sizes, and hashes. Provenance is a connected chain:

```text
main SHA
  = annotated tag target
  = workflow head SHA
  = embedded binary commit
  → local artifact hashes
  = remote artifact hashes
  → installed diagnostic commit/version
```

A missing ZIP, wrong blockmap, stale YAML, remote mismatch, or tag/source mismatch means the release is not verified.

## 🖥️ Installation and duplicate detection

Audit `/Applications`, `~/Applications`, the repository, mounted volumes, running executables, and reasonable indexed locations. Classify build artifacts separately from installed apps. Quit all FORGE processes and eject mounted FORGE DMGs before replacement.

Move stale installed bundles to Trash; do not permanently delete them before acceptance. For a local package, use `npm run install:mac`: it validates the manifest, stages and revalidates the universal bundle, activates exactly `/Applications/FORGE.app` with a rollback path, and refreshes `/usr/local/bin/forge-session`. Run `forge-session --runtime-info` and verify the executable originates from `/Applications/FORGE.app/Contents/MacOS/FORGE`. Never keep a duplicate under `~/Applications`.

Cross-platform parity is the embedded FORGE source commit and matching UI/runtime behavior, not byte-identical executables. macOS, Linux, and Windows must each retain their own native executable and payload hashes; FORGE-OS records the shared source commit in `/opt/forge/current/.forge-runtime.env`.

Diagnostics must report `FORGE v2.3.0-beta.1`, `Channel: beta`, the exact source commit, packaged runtime, `file:// packaged app.asar`, platform, architecture, and build date.

## ✅ Packaged runtime acceptance

Verify all of the following against the installed beta:

- manually focus the terminal, type `pwd`, and observe the command plus active workspace path;
- type `printf "forge-terminal-ok\\n"` and observe the output;
- exit, confirm input rejection, restart, and type successfully again;
- confirm GPT-5.6 tool requests use `/v1/responses` and a direct non-tool response succeeds;
- confirm Tier 0 execution, Tier 1 approval, Tier 2 explicit approval, rejection without execution, and audit records;
- confirm root-first workspace discovery and structured missing-path recovery;
- create `Persistent Task Verification`, complete steps, restart the app, switch/delete the originating conversation, and resume without repeating verified work;
- verify task isolation across FORGE, AIFRED, and INTERVENTION;
- inspect packaged `app.asar`, architecture, version, commit, and absence of a localhost renderer dependency.

The safe task shape is:

```text
Persistent Task Verification
✓ Inspect workspace
✓ Read README
✓ Run typecheck
□ Generate handoff
```

## 🔄 Updater verification

Test Stable and Beta independently. Stable ignores prereleases. Beta permits only newer beta, rc, or stable versions and rejects alphas. Both reject equal/older versions. Verify the selected public release, metadata feed, downloaded payload, and installed result are the same release.

An ad-hoc/unsigned build cannot establish trusted unattended replacement. Discovery and hashes may pass while installation still requires explicit manual handling.

## 🧯 Recovery and rollback

After a network or AI interruption, load the persistent release task and audit current Git, process, workflow, release, asset, installation, and hash state. Continue from the first genuinely unfinished step. Never rebuild, retag, reupload, recreate a pull request, or republish because a conversation ended.

If an upload process disappeared but the remote asset exists and matches, reconcile it to completed. If the hash differs, mark failure and preserve both pieces of evidence. If a release exists without a ZIP, upload only the missing verified asset and metadata in order.

Before publication, leave a failed release draft and correct source with a new commit/tag when required. After publication, never move the tag or silently replace assets. Prepare a strictly newer corrective release. Installation rollback is manual while unsigned; updater downgrades remain forbidden.

## 🗃️ Historical release cleanup policy

Git history preserves source development. GitHub Releases contain only currently supported public binaries. Local packaging output contains only the newest validated build.

Delete old GitHub Releases and their exact audited release tags only after the public beta has been downloaded, hash-verified, installed, and smoke-tested. Do not delete branches, source commits, early non-release development tags, Actions history, pull requests, issues, or repository history. Deleting a Release and tag removes convenient public access to its historical binary even though the source commit remains recoverable in Git.

## 🏁 Final checklist

- [ ] Version, tag, Beta channel, manifests, lockfile, workflow, and docs agree.
- [ ] Feature PR is merged; local `main` equals `origin/main`.
- [ ] Dependency install, typecheck, lint, tests, build, ARM64, and universal packages pass.
- [ ] Build manifest, ZIP, DMG, architectures, signing, and local hashes pass.
- [ ] DMG is mounted read-only and tested in an isolated temporary location; no source install or in-place overwrite occurs.
- [ ] Exactly one installed app exists at `/Applications/FORGE.app` only after explicit replacement acceptance.
- [ ] Installed diagnostics and critical runtime acceptance pass if installation is explicitly requested.
- [ ] Persistent task survives application and conversation turnover without repeated work.
- [ ] Annotated tag resolves to final main and the workflow builds that SHA.
- [ ] Public DMG, ZIP, blockmaps, and beta YAML match local hashes.
- [ ] Public artifact reinstall and critical smoke tests pass.
- [ ] Stable/Beta updater behavior is verified.
- [ ] Old Releases/tags are removed only after public acceptance.
- [x] GitHub exposes `FORGE v2.3 Beta` at `v2.3.0-beta.1`; release asset hashes are recorded in [the v2.3 verification record](docs/V2.3.0_BETA1_VERIFICATION.md). Independent mounted-DMG and installed-app acceptance remain separate checks.
- [ ] Signing/notarization status and all unresolved limitations are reported.
- [ ] Final handoff is generated from authoritative task state.
