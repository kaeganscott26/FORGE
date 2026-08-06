# FORGE Project Status

**Updated:** August 6, 2026

**Working version:** 1.1.0-alpha.2

**Branch:** `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## Release state

FORGE 1.1's policy-controlled agent tools and integrated terminal were merged through PR #9. Release commit `6d9037f` is preserved by annotated `v1.1.0-alpha.1`, and its GitHub Pre-release assets remain untouched. v1.0.1 remains the immutable GitHub Latest stable release.

Alpha.1 installed-runtime verification exposed an Electron Updater downgrade defect: setting its persisted Stable channel re-enabled downgrade checks and offered v1.0.1. The unsigned download failed signature validation and was never installed. PR #10 merged the post-channel `allowDowngrade=false` guard into `main` at `00ea8383`. The alpha.2 candidate adds a second independent SemVer/channel gate and keeps automatic download off until a candidate passes it.

The preview remains ad-hoc signed/unsigned because no Apple Developer ID or notarization credentials are configured. Update detection and download are testable, but trusted unattended replacement is not available.

## Capability matrix

| Area | Verified implementation |
| --- | --- |
| Provider-neutral tool calls | Native structured calls plus strictly validated structured fallback before policy |
| Tool policy | Tier 0 automatic reads, Tier 1 one-time or exact expiring session approval, Tier 2 always explicit |
| Filesystem | Workspace-relative list/read/search/create/write/patch/rename/move/delete/directory create with realpath containment, atomic writes, diffs, backups, and dirty-editor protection |
| Git | Status/diff/log/branches/stage/unstage/commit/pull/push through the protected Git service; no automatic force push |
| Agent shell | Argument-array spawn, workspace cwd, filtered environment, timeout/output/cancellation/process-tree controls |
| External web | Search/fetch/open; disabled by default; URL, DNS, redirect, local-network, size, timeout, and disclosure controls |
| Approval and audit | Retained request/result/history UI plus schema-v3 per-workspace SQLite log with filtering and secret redaction |
| Integrated terminal | Main-process `node-pty`, renderer xterm.js, multiple sessions, resize/input/output/terminate/restart/copy/clear/exit state |
| Renderer boundary | Context isolation, no Node integration, sandbox, web security, fixed allowlisted preload, navigation denial |
| Update channels | Stable default, explicit Preview, post-channel downgrade reset, strict SemVer forward-only download gate |
| Packaging | ARM64 and universal DMG/ZIP/blockmaps/YAML; app and PTY native binaries inspected per architecture |
| Signing/notarization | Not configured; ad-hoc signature and no TeamIdentifier |

## Current validation

- The clean dependency install reports zero npm audit findings.
- Typecheck, lint, all 19 Vitest files / 55 tests, and the production build pass.
- Tests cover schemas, unknown/malformed calls, path/symlink containment, atomic writes/patches/backups, dirty editor paths, policy/session expiry, redaction/isolation, provider fallback, context bounds, shell timeout/cancellation/output/environment, PTY lifecycle/cwd, web restrictions, migrations, build diagnostics, and update ordering/channel eligibility.
- ARM64 packaging passes with arm64 app/PTY binaries.
- Universal packaging passes with x86_64 and arm64 slices in the app executable, `pty.node`, and `spawn-helper`; ZIP and DMG integrity checks pass.
- The candidate universal app loads a nonblank renderer from `file://` inside `app.asar`, exposes only the allowlisted preload bridge, reports `1.1.0-alpha.2 / preview / packaged / darwin arm64`, opens the workspace, reads `AGENTS.md`, streams PTY `pwd`, and rejects unknown IPC plus workspace escape.
- Clean committed candidate `7ad23e6` repeated the complete source and packaging suite and embedded its exact full commit SHA in packaged diagnostics.
- In that packaged runtime, provider-requested Tier 0 `file.read` succeeded automatically with Tool Result evidence and a sanitized action record. Tier 1 file creation stayed absent until its displayed diff received Run Once approval. Tier 2 `shell.run` stayed unexecuted, was rejected, and produced a zero-duration rejected audit entry.
- AIFRED and INTERVENTION stores contained none of the alpha.2 FORGE conversation/action IDs.
- An explicit Stable-channel check from packaged alpha.2 identified v1.0.1 as older and returned `not-available` without download.
- A final-suite filesystem watcher timeout traced to macOS directory-level events being discarded. The watcher now reconciles its snapshot for that signal; the focused two-test file passed ten consecutive runs after the repair.
- The release is incomplete until the final documentation commit is rebuilt, retested, tagged, published, hash-matched, updater-tested from alpha.1, installed, launched, and visibly verified.

## Known limitations and debt

1. Apple Developer ID signing and notarization are unavailable; automatic installation cannot be called trusted.
2. Web search uses a bounded public HTML endpoint rather than a contracted API.
3. File rollback backups are recovery aids rather than transactional storage.
4. Tool-result context bounds are character-based rather than tokenizer-aware.
5. Retrieval remains lexical; concept graph, embeddings, and persisted hybrid search remain future work.
6. OAuth device flow is not implemented; GitHub uses a user-created Keychain-backed encrypted token.
7. Alpha.1 contains the downgrade-offer defect. Its immutable release is not rewritten; alpha.2 must pass the packaged updater transition and post-update no-downgrade checks before release completion.

## Repository authority

Current source, root documentation, `docs/`, package configuration, and workflow files are authoritative. Generated `apps/desktop/out` and `dist_electron` output is ignored verification evidence. Machine-local `.obsidian/` state is excluded from release commits.
