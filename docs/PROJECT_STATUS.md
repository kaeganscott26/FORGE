# FORGE Project Status

**Updated:** August 6, 2026

**Working version:** 1.1.0-alpha.1

**Branch:** `main`

**Platform:** macOS; arm64 and universal package validation

## Release state

FORGE 1.1 tool runtime and terminal implementation was merged through PR #9 at `0c73ba8`. Release commit `6d9037f` was tagged as `v1.1.0-alpha.1`; the GitHub Pre-release workflow and assets passed, and the exact source was installed at `/Applications/FORGE.app`. The existing v1.0.1 tag/release remains GitHub Latest and is unchanged.

Installed-runtime verification then found that changing Electron Updater to the persisted Stable channel re-enabled downgrade checks and offered v1.0.1 to the alpha. The downloaded unsigned update failed signature validation and was not installed. Follow-up branch `agent/updater-downgrade-guard` now reapplies `allowDowngrade=false` after every channel selection; its packaged Stable-channel check correctly reports no update. The immutable alpha.1 tag and assets have not been rewritten, so a new preview version is required to ship this guard.

The preview remains unsigned/ad-hoc because no Apple Developer ID signing identity or notarization credentials are configured. Automatic update detection can be exercised, but trusted unattended installation requires a consistently signed and notarized chain.

## Capability matrix

| Area | State |
| --- | --- |
| Provider-neutral tool calls | Native OpenAI-compatible calls plus strict structured fallback; validated before policy |
| Tool policy | Tier 0 automatic reads, Tier 1 explicit/exact-session, Tier 2 always explicit |
| Filesystem tools | List/read/search/create/write/patch/rename/move/delete/directory create with containment, atomic writes, diffs, backups, dirty-editor protection |
| Git tools | Status/diff/log/branches/stage/unstage/commit/pull/push through existing Git service |
| Agent shell | Argument-array spawn, workspace cwd, filtered environment, timeout/output/cancellation/process-tree controls |
| External web | Search/fetch/open; disabled by default; HTTP(S), DNS, redirect, local-network, size, timeout, disclosure controls |
| Approval UI | Exact target/command, tier, reason, cwd, network, effect, predicted files, diff, run/reject/cancel/copy/history |
| Audit log | Schema v3 per-workspace SQLite log with filters and secret redaction |
| Integrated terminal | Main-process `node-pty`, xterm.js, multiple sessions, resize/input/output/terminate/restart/copy/clear/exit state |
| Renderer trust boundary | Context isolation, no Node integration, Electron sandbox, web security, fixed preload, navigation denial |
| Context integration | Bounded/redacted tool results returned to agent and labeled separately; terminal output not auto-indexed |
| Release channels | Development/Preview/Stable diagnostics, stable-default updater selection, explicit preview/latest publish channels |
| Packaging | arm64 and universal DMG/ZIP/blockmaps/YAML build locally; universal executable and PTY native files contain x86_64+arm64 |
| Signing/notarization | Not configured |

## Current verification

- Repository and GitHub inventory completed before edits: synchronized `main` at `1f0f0e9`, no open issues or PRs, v1.0.1 preserved.
- PR #9 merged to `main` as `0c73ba8`; the feature branch was removed remotely and local `main` matched `origin/main` before release validation.
- Feature-branch GitHub workflow runs `31098636313` and `31098848617` passed source validation, universal packaging, and artifact upload. The second run used Node 24-based `checkout@v7` and `upload-artifact@v7` without the prior deprecation annotation.
- `npm run typecheck`, `npm run lint`, and 19 Vitest files / 54 tests pass.
- Tests cover schemas, unknown/malformed calls, containment/traversal/symlinks, atomic patch/backup behavior, dirty editor paths, risk/approval/session expiry, redaction/isolation, provider fallback, context bounds, shell environment/timeout/cancellation/output, PTY lifecycle/cwd, web restrictions/default-off, release identity/channel selection, and storage migration.
- `npm run build` passes with main, sandbox-compatible CommonJS preload, and renderer output.
- `npm run dev` launches Electron after the root postinstall restores a missing Electron vendor app; the renderer helper runs with sandbox enabled.
- `npm run package:mac` produced arm64 DMG, ZIP, and blockmaps. The packaged app includes `app.asar`, an unpacked executable arm64 `node-pty` module/helper, version `1.1.0-alpha.1`, and ad-hoc/unsigned identity.
- `npm run package:mac:universal` produced universal DMG, ZIP, blockmaps, and updater YAML. `lipo` reports `x86_64 arm64` for the app executable, `pty.node`, and `spawn-helper`.
- CDP packaged-runtime probes verified `file://` from `app.asar`, working fixed preload bridge, `preview` diagnostics, workspace/Git metadata, Terminal and Agent Actions UI, PTY `pwd`/streaming, universal PTY execution, and rejection of file and terminal `..` escapes.
- A configured provider requested `file.read` through the packaged runtime; FORGE mapped the provider-safe alias back to the stable name, executed Tier 0, returned a bounded Tool Result, and recorded the action. A Tier 1 create remained absent until its visible diff received Run Once approval. A Tier 2 `/bin/pwd` request remained unexecuted, was rejected, and was retained in history with an audit record.
- Packaged launches against AIFRED, FORGE, and INTERVENTION showed separate conversation/action stores; FORGE verification IDs did not appear in the other workspace stores.
- The merged-main validation artifacts embed `0c73ba8`. Final release artifacts must be rebuilt after the release-metadata commit so diagnostics embed the exact annotated tag target.

## Remaining delivery gates

1. Merge the verified updater downgrade guard without rewriting `v1.1.0-alpha.1`.
2. Choose and publish a new immutable preview version for the guard, then rerun the exact release-commit, feed, asset, and installed-runtime gates.
3. Keep v1.0.1 as GitHub Latest; do not expose a preview to Stable-channel v1.0.1 users.

## Known risks and debt

1. The release is unsigned and unnotarized; trusted unattended install/update is unavailable.
2. Web search uses a bounded public HTML endpoint rather than a contracted API.
3. File rollback backups are local recovery aids, not transactional storage.
4. Tool-result continuation is bounded and redacted but remains character-based rather than tokenizer-aware.
5. Retrieval remains lexical; concept graph, embeddings, and persisted hybrid search are future work.
6. OAuth device flow is not implemented; GitHub uses a user-created encrypted token.
7. Live provider-native tool calling requires user credentials; one packaged configured-provider path was verified manually, while provider-safe name adaptation, normalization, and policy paths are also unit-tested.
8. Published alpha.1 can offer a stable-version downgrade after channel selection. The verified guard exists only after the alpha.1 tag and requires a new preview release; the public tag is intentionally immutable.

## Repository authority

Current source, root documentation, `docs/`, package configuration, and workflow files are authoritative. Generated `apps/desktop/out` and `dist_electron` output is ignored and used only as verification evidence. Machine-local `.obsidian/` state is not part of this milestone and must not be modified or committed.
