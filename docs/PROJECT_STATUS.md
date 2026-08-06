# FORGE Project Status

**Updated:** August 6, 2026

**Version:** 1.0.0

**Platform:** macOS (Apple Silicon local packaging and universal release workflow)

## Release state

FORGE 1.0.0 is published. The next milestone is implemented on a feature branch and adds workspace-owned multi-conversation state, persistent resizable layout, automatic project-context assembly, model discovery/validation, and future workspace-intelligence contracts.

The v1.0.0 binaries are unsigned because no Apple Developer ID identity is installed or configured. The DMG can be installed manually, but unattended in-app automatic installation requires consistently signed and notarized builds.

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
| Local in-place rebuild/install | Implemented and validated for 1.0.0 |
| GitHub version-tag release workflow | Implemented; v1.0.0 remote run passed |
| Developer ID signing and notarization | Not configured |
| In-app update checks | Implemented; automatic installation requires signing |
| Plugin runtime and autonomous tools | Not implemented |

## Current verification

- TypeScript typecheck, ESLint, 30 automated tests, and Electron production build pass for the current milestone.
- Electron Builder produced the current ARM64 FORGE 1.0.0 DMG, ZIP, and blockmaps; signing was skipped because no Developer ID identity is configured.
- The Electron development runtime now resolves the renderer root correctly: the local URL returned the FORGE document, Vite connected, React mounted, and the welcome UI rendered. This was verified after correcting a reproduced blank-window 404.
- Package metadata contains the correct name, version, bundle ID, icon, and GitHub update feed.
- All 14 test files and 30 tests pass, including legacy migration, conversation isolation, clear-chat preservation, layout persistence, context framing/source selection, arbitrary model IDs, model validation, and unsupported-model errors.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities.
- The installed settings-enabled app launches successfully and initializes its Keychain-backed credential path without writing a project-local secret.

## Known risks

1. Electron renderer sandboxing remains disabled and should be hardened before plugins or autonomous execution.
2. Reindexing needs canonical path/content-hash upsert behavior to avoid duplicate memory entries.
3. Retrieval remains lexical; embedding-backed hybrid retrieval and a persisted search index are future work.
4. Context budgeting is character based and needs token-aware evaluation on larger repositories.
5. OAuth device flow is not implemented; GitHub integration accepts a user-created token.
6. Live model-list/completion validation requires user credentials and is not automated.
7. Automatic macOS updates cannot be trusted or applied until every release uses the same Developer ID signature.

## Repository authority

Current source, README, root user documentation, and `docs/ARCHITECTURE.md` are authoritative. Generated output under `apps/desktop/out` and `dist_electron` is ignored. There is no tracked repository `MEMORY.md`; durable runtime memory is stored in each workspace database. The local untracked `.obsidian/` settings are user state and are not part of the application or this milestone.
