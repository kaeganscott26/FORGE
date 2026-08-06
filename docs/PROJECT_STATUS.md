# FORGE Project Status

**Updated:** August 6, 2026

**Version:** 1.0.1

**Platform:** macOS (Apple Silicon local packaging and universal release workflow)

## Release state

PR #7 is merged into `main`, and Issues #5 and #6 were closed by that merge. FORGE 1.0.1 packages the merged workspace-intelligence source as a real patch release and adds runtime build diagnostics so the installed binary can be tied to an exact source commit.

The v1.0.1 binaries remain unsigned because no Apple Developer ID identity or GitHub signing/notarization secrets are installed or configured. The app and update feed can recognize 1.0.1 as newer than 1.0.0, but unattended in-app installation still requires a consistently signed and notarized release chain.

## Capability matrix

| Area | State |
| --- | --- |
| Electron + React desktop app | Implemented |
| Workspace open/list/read/write/create/delete/rename | Implemented |
| Monaco editing and Markdown preview | Implemented; preview HTML is sanitized |
| Git status/diff/stage/commit/pull/push | Implemented |
| SQLite goals and tasks | Implemented |
| Workspace-isolated multiple conversations | Implemented with per-thread select/new/rename/clear |
| Persistent resizable layout | Implemented per workspace |
| Persistent project memories | Implemented |
| Memory retrieval and workspace indexing | Prototype; indexing deduplication pending |
| Automatic AI system context | Implemented with bounded docs, metadata, Git, source, inventory, and memory evidence |
| OpenAI-compatible provider | Implemented with Keychain settings, free-form IDs, model listing/validation, and environment fallback |
| GitHub credential settings | Implemented for encrypted HTTPS token-based pull/push |
| Packaged macOS DMG and ZIP | Validated on Apple Silicon |
| Local in-place rebuild/install | Implemented; v1.0.1 validation is part of release verification |
| GitHub version-tag release workflow | Implemented; v1.0.1 tag run is the release gate |
| Developer ID signing and notarization | Not configured |
| In-app update checks | Implemented; automatic installation requires signing |
| Runtime build diagnostics | Implemented in Settings with safe copy action |
| Plugin runtime and autonomous tools | Not implemented |

## Current verification

- PR #7 is merged at `ad610fa`, with all three original feature commits represented by its reviewable squash merge; the remote feature branch was deleted after merge.
- The uploaded v1.0.0 DMG exactly matches the refreshed local universal artifact, but the immutable v1.0.0 tag still points to pre-PR source. Version 1.0.1 restores an exact tag/source/artifact relationship.
- `/Applications/FORGE.app` contains the refreshed v1.0.0 `app.asar`, while `~/Applications/FORGE.app` is an older duplicate with no packaged updater configuration. This duplicate explains how macOS could launch the old UI despite replacing another app copy.
- The Electron development runtime now resolves the renderer root correctly: the local URL returned the FORGE document, Vite connected, React mounted, and the welcome UI rendered. This was verified after correcting a reproduced blank-window 404.
- v1.0.1 TypeScript typecheck, ESLint, all 14 test files/33 tests, production Electron build, diff checks, and production dependency audit pass; the audit reports zero vulnerabilities.
- Final universal packaging, packaged runtime, artifact, updater-metadata, installed-app, and GitHub release results are recorded at release completion.

## Known risks

1. Electron renderer sandboxing remains disabled and should be hardened before plugins or autonomous execution.
2. Reindexing needs canonical path/content-hash upsert behavior to avoid duplicate memory entries.
3. Retrieval remains lexical; embedding-backed hybrid retrieval and a persisted search index are future work.
4. Context budgeting is character based and needs token-aware evaluation on larger repositories.
5. OAuth device flow is not implemented; GitHub integration accepts a user-created token.
6. Live model-list/completion validation requires user credentials and is not automated.
7. Automatic macOS updates cannot be trusted or applied until every release uses the same Developer ID signature.
8. A stale duplicate under `~/Applications` can still be opened explicitly; use the build diagnostic to confirm the running copy and remove the duplicate manually only after preserving anything intentionally stored there.

## Repository authority

Current source, README, root user documentation, and `docs/ARCHITECTURE.md` are authoritative. Generated output under `apps/desktop/out` and `dist_electron` is ignored. There is no tracked repository `MEMORY.md`; durable runtime memory is stored in each workspace database. The local untracked `.obsidian/` settings are user state and are not part of the application or this milestone.
