# FORGE Project Status

**Updated:** August 6, 2026

**Working version:** 1.1.0-alpha.1

**Branch:** `agent/tool-runtime-terminal`

**Platform:** macOS; arm64 and universal package validation

## Release state

FORGE 1.1 tool runtime and terminal implementation is complete on the feature branch and is undergoing delivery gates. It has not yet been merged, tagged, published, or installed as the released preview. The existing v1.0.1 tag/release is unchanged.

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
- `npm run typecheck`, `npm run lint`, and 19 Vitest files / 54 tests pass.
- Tests cover schemas, unknown/malformed calls, containment/traversal/symlinks, atomic patch/backup behavior, dirty editor paths, risk/approval/session expiry, redaction/isolation, provider fallback, context bounds, shell environment/timeout/cancellation/output, PTY lifecycle/cwd, web restrictions/default-off, release identity/channel selection, and storage migration.
- `npm run build` passes with main, sandbox-compatible CommonJS preload, and renderer output.
- `npm run dev` launches Electron after the root postinstall restores a missing Electron vendor app; the renderer helper runs with sandbox enabled.
- `npm run package:mac` produced arm64 DMG, ZIP, and blockmaps. The packaged app includes `app.asar`, an unpacked executable arm64 `node-pty` module/helper, version `1.1.0-alpha.1`, and ad-hoc/unsigned identity.
- `npm run package:mac:universal` produced universal DMG, ZIP, blockmaps, and updater YAML. `lipo` reports `x86_64 arm64` for the app executable, `pty.node`, and `spawn-helper`.
- CDP packaged-runtime probes verified `file://` from `app.asar`, working fixed preload bridge, `preview` diagnostics, workspace/Git metadata, Terminal and Agent Actions UI, PTY `pwd`/streaming, universal PTY execution, and rejection of file and terminal `..` escapes.
- A configured provider requested `file.read` through the packaged runtime; FORGE mapped the provider-safe alias back to the stable name, executed Tier 0, returned a bounded Tool Result, and recorded the action. A Tier 1 create remained absent until its visible diff received Run Once approval. A Tier 2 `/bin/pwd` request remained unexecuted, was rejected, and was retained in history with an audit record.
- Packaged launches against AIFRED, FORGE, and INTERVENTION showed separate conversation/action stores; FORGE verification IDs did not appear in the other workspace stores.
- The current local artifacts embed feature-build-time `HEAD` `1f0f0e9`; final merged release artifacts must be rebuilt so diagnostics embed the exact release commit.

## Remaining delivery gates

1. Run clean `npm ci` and the full suite again.
2. Review the exact diff, security posture, workflow syntax, ignored output, and `.obsidian/` exclusion.
3. Commit/push the feature branch, open a PR, verify GitHub checks, merge only if green, and synchronize `main`.
4. Rebuild/reverify merged `main`, create annotated `v1.1.0-alpha.1`, publish the GitHub Pre-release and universal assets, and verify stable users are not offered it.
5. Run `npm run install:mac` from exact merged source, identify duplicates without deleting them, and verify the launched installed diagnostics.

## Known risks and debt

1. The release is unsigned and unnotarized; trusted unattended install/update is unavailable.
2. Web search uses a bounded public HTML endpoint rather than a contracted API.
3. File rollback backups are local recovery aids, not transactional storage.
4. Tool-result continuation is bounded and redacted but remains character-based rather than tokenizer-aware.
5. Retrieval remains lexical; concept graph, embeddings, and persisted hybrid search are future work.
6. OAuth device flow is not implemented; GitHub uses a user-created encrypted token.
7. Live provider-native tool calling requires user credentials; one packaged configured-provider path was verified manually, while provider-safe name adaptation, normalization, and policy paths are also unit-tested.

## Repository authority

Current source, root documentation, `docs/`, package configuration, and workflow files are authoritative. Generated `apps/desktop/out` and `dist_electron` output is ignored and used only as verification evidence. Machine-local `.obsidian/` state is not part of this milestone and must not be modified or committed.
