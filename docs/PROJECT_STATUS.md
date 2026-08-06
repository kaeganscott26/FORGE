# FORGE Project Status

**Updated:** August 6, 2026

**Working version:** 1.1.0-alpha.3

**Release source branch:** `main` after validated feature-branch merge

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## Release state

FORGE 1.1's policy-controlled agent tools and integrated terminal were introduced in alpha.1. Alpha.1 and alpha.2 are immutable GitHub Pre-releases, and v1.0.1 remains GitHub Latest stable. No duplicate compatibility release is used.

Alpha.1 and alpha.2 stored the logical Preview selection as an Electron Updater provider channel. That mapping cannot discover conventional GitHub tags whose SemVer identifiers are `alpha`, `beta`, or `rc`. Alpha.2 therefore requires a one-time manual alpha.3 installation; alpha.2-to-alpha.3 is not an automatic-update success. This migration defect does not invalidate the earlier packaged applications, assets, annotated tags, or forward-only semantic-version gate.

Alpha.3 adds bounded GitHub Release discovery. Stable filters to strictly newer stable versions. Preview filters to strictly newer alpha, beta, rc, or stable versions. Drafts, unpublished entries, malformed versions, incompatible prerelease flags, unsupported identifiers, unsafe metadata URLs, and downgrades fail closed before Electron Updater is configured.

The preview remains ad-hoc signed/unsigned because no Apple Developer ID or notarization credentials are configured. Discovery and download are testable, but trusted unattended replacement is unavailable.

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
| Update discovery | Fixed GitHub endpoint, bounded validated response, logical Stable/Preview filtering, strict forward SemVer, safe selected feed |
| Packaging | ARM64 and universal DMG/ZIP/blockmaps/YAML; app and PTY native binaries inspected per architecture |
| Signing/notarization | Not configured; ad-hoc signature and no TeamIdentifier |

## Current validation

- `npm ci` audited 532 packages with zero vulnerabilities. Typecheck, lint, all 20 test files / 61 tests, and production build pass.
- Tests cover the required stable, alpha, beta, rc, downgrade, malformed, draft, unpublished, prerelease-mismatch, unsafe-feed, response-bound, timeout, and cancellation cases.
- The macOS watcher now supplements native events with a serialized snapshot fallback; its focused file passed 20 consecutive runs before the full suite passed.
- ARM64 and universal packaging pass. The ARM app/PTY binaries are arm64; the universal app, `pty.node`, and `spawn-helper` contain x86_64 and arm64. Universal ZIP and DMG integrity pass.
- The pre-commit packaged app loads from `file://` in app.asar and reports alpha.3/Preview/packaged/darwin arm64. Workspace open/read, allowlisted IPC, PTY `pwd`, cwd escape rejection, tool approval/rejection, audit retention, and FORGE/AIFRED/INTERVENTION isolation pass.
- Live packaged Stable and Preview checks against the public set reject older alpha.2 and v1.0.1 and report alpha.3 up to date.
- Pre-commit diagnostics correctly embed baseline main `4a0207a0d0e721c031a4687f10ce4aa12d43277e`. Publication remains blocked until the exact merged release commit repeats every gate, is tagged, hash-matched, manually installed, and visibly verified.

## Known limitations and debt

1. Apple Developer ID signing and notarization are unavailable; automatic installation cannot be called trusted.
2. Alpha.1 and alpha.2 cannot discover normal prerelease tags and require a one-time manual alpha.3 upgrade.
3. Public unauthenticated GitHub release discovery is limited by GitHub's rate limit; failure is reported and never bypasses policy.
4. Web search uses a bounded public HTML endpoint rather than a contracted API.
5. File rollback backups are recovery aids rather than transactional storage.
6. Tool-result context bounds are character-based rather than tokenizer-aware.
7. Retrieval remains lexical; concept graph, embeddings, and persisted hybrid search remain future work.
8. OAuth device flow is not implemented; GitHub uses a user-created Keychain-backed encrypted token.

## Repository authority

Current source, root documentation, `docs/`, package configuration, and workflow files are authoritative. Generated `apps/desktop/out` and `dist_electron` output is ignored verification evidence. Machine-local `.obsidian/` state is excluded from release commits.
