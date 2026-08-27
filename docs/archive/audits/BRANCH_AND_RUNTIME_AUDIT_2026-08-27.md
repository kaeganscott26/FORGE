# FORGE branch and runtime audit — 2026-08-27

## Starting state

- Repository: `C:\Users\North\Documents\Projects\FORGE`
- Starting `main`: `514bd6b3dd36641879e785af652243df141cef49`
- `main...origin/main`: `0 0`; tracked and untracked source state was clean.
- A fetch with pruning removed the stale remote-tracking ref `origin/chatgpt/windows-recovery-2026-08-14`, which was already absent from the remote server.

## Branch decisions

| Branch | Tip | Compared with starting `origin/main` | Decision |
| --- | --- | --- | --- |
| `origin/fix/cross-platform-tooling-recovery-20260818` | `32c8a1ca5399922436b47b5db509bd060def8f26` | 44 behind, 4 unique commits | Merged into `main` as the second parent of `601f24a2eaac13f4a4a9c52d0a0d04c48bf9c723`, then deleted remotely. |
| `backup/windows-merge-resolved` | `70d5792087c28f4c7375d6809acbce3031ab3d07` | 137 behind, 4 commits not reachable by ancestry | Deleted locally without merging. Its upload-script change was patch-equivalent on `main`; its only remaining unique patch was a stale FORGE 1.1.0 beta publication note that would overwrite current 2.4.0 status and release documentation. |

The merged branch conflicted with newer `main` work in the native agent runtime, its tests, and workspace traversal. Resolution retained the newer provider-neutral runtime selection, direct-evidence enforcement, semantic-memory accounting, autonomous durable-task linkage, bounded traversal, hidden-file controls, and normalized public paths. It incorporated the compatible branch safeguards: tool request/result identity checks, bounded recovery evidence for validation and execution failures, and a test that every IPC channel is unique, preload-allowlisted, and registered in the desktop main process. The older workspace traversal patch was already present in a more complete form and was not reintroduced.

## Cross-platform runtime audit

- macOS, Linux, and Windows use the same locked Electron `43.3.0`, Electron Builder `26.15.3`, Electron Updater `6.8.9`, and `node-pty` `1.1.0` dependency graph.
- Updater discovery maps logical Stable/Beta policy to platform-native metadata: `latest-mac.yml`/`beta-mac.yml`, `latest.yml`/`beta.yml`, and `latest-linux.yml`/`beta-linux.yml`.
- FORGE-OS session behavior remains gated to Linux; Windows keeps `cmd.exe`/ConPTY behavior and no Unix login argument; macOS retains its application lifecycle and universal runtime packaging.
- Linux now writes and verifies the same authoritative build-manifest provenance used by macOS and Windows, including x64 ELF identity, AppImage/DEB/updater metadata hashes, packaged executable and `app.asar`, version, embedded commit/build date, and `forge-runtime.json`.
- Coordinated release artifact downloads remain platform-isolated until publication. Duplicate public asset names now fail rather than overwrite evidence, and the workflow publishes the 11 unique platform runtime/updater assets plus a newly generated cross-platform `SHA256SUMS.all`.
- Windows absolute executable paths containing spaces are accepted with `shell: false`, while collapsed relative executable/argument strings remain rejected. Cross-platform shell tests use `process.execPath` and bounded cancellation polling instead of depending on a Unix Bash path or a fixed 80 ms startup delay.

## Validation before the native Windows update

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Focused merge/runtime tests: 3 files, 24 tests passed.
- Full `npm test`: 33 files passed; 205 tests passed; 2 intentional platform skips.
- `release.yml` parsed successfully as YAML.
- `scripts/package-linux.sh` passed `bash -n` with Git Bash; both manifest scripts passed `node --check`.
- Docker Desktop's Linux engine was not running, so a native Linux artifact build was not claimed from the Windows host. The release workflow retains native Ubuntu, macOS, and Windows package jobs using Node 22.

## Branch cleanup checkpoint

After pushing the merge and deleting the audited branches, both `git branch` and `git ls-remote --heads origin` showed only `main`. At that checkpoint local and remote `main` were synchronized at `601f24a2eaac13f4a4a9c52d0a0d04c48bf9c723`; this audit-log commit is the direct follow-up on `main`.
