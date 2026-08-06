# FORGE 1.0.1 — Verifiable workspace intelligence

FORGE 1.0.1 is the patch release that makes the workspace-intelligence update numerically newer than 1.0.0 and makes the running build immediately identifiable.

## Workspace intelligence

- Workspace-owned named conversations with per-workspace active-thread persistence
- Conversation selector plus New Chat, Rename, and narrowly scoped Clear controls
- Conversation ownership validation at every storage and IPC operation to prevent cross-workspace history leakage
- Safe import of legacy unthreaded messages into an `Imported conversation`
- Per-workspace drag-resizable Explorer, editor, workspace-intelligence/chat, and Source Control regions
- Architecture-first system context assembled before every user message
- Bounded evidence from workspace identity, architecture and documentation, Git status/history, goals/tasks, durable memory, relevant source snapshots, file inventory, and active conversation history
- Context-source disclosure after AI turns
- Classified workspace knowledge grouped as Architecture, Documentation, Source Code, Memory, and Configuration
- Relevance scoring plus selection reasons in context disclosure, with zero-match memory records removed from retrieval results
- Machine-specific `.obsidian` state excluded from default knowledge indexing and retrieval unless Obsidian is explicitly requested
- Idempotent reindexing that updates derived records and removes duplicate indexed copies
- Explicit **Remove indexed copy** and **Forget memory** actions that state project source files are never deleted
- Free-form model IDs, provider model discovery, and exact model validation
- `gpt-5.6-sol` as the default for new configurations while preserving existing saved model values

## Update and build identity repairs

- Version increased to 1.0.1 in every workspace package and generated lockfile metadata
- Packaged update feed configured both by Electron Builder and explicitly at runtime
- Update UI continues polling through check, discovery, download, and ready-to-install states
- Packaged renderer loads the compiled `index.html` directly through `file://` from `app.asar`
- Settings now exposes and copies a non-secret build diagnostic containing version, exact build commit, build date, packaged/development runtime, renderer source mode, platform, and architecture

## Install or update

Download `FORGE-1.0.1-universal.dmg`, open it, and drag FORGE into `/Applications`, replacing the existing copy.

If macOS still opens an older-looking build, check both `/Applications/FORGE.app` and `~/Applications/FORGE.app`; duplicate bundles can coexist. Open **Settings → About this build** and confirm that the running app reports `FORGE v1.0.1` and `file:// packaged app.asar`.

This release remains unsigned because the repository has no Apple Developer ID or notarization credentials. Version detection and update download metadata work, but macOS cannot be relied on to apply an unattended in-place update without a consistently signed and notarized release chain. The in-app **Releases** control remains the supported manual fallback.

## Security and data boundaries

- API keys and GitHub tokens remain encrypted outside workspaces through Electron `safeStorage`
- Build diagnostics contain no secrets, private local paths, credentials, or workspace names
- New Chat and Clear Chat do not remove durable memory, indexed files, Git state, goals, tasks, settings, layouts, or other conversations
