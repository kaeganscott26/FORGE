# FORGE — Next milestone (unreleased)

This milestone turns chat into workspace-owned intelligence while preserving FORGE's local-first architecture.

## Added

- Per-workspace, named conversation threads with automatic first-prompt titles
- New Chat, Rename, thread selection, and Clear Chat controls
- Hard workspace ownership checks preventing cross-project conversation access
- Drag-resizable Explorer, editor, workspace intelligence, AI chat, and Source Control regions
- Per-workspace layout and active-thread persistence in schema-versioned SQLite storage
- Automatic architecture-first system context for every prompt
- Bounded evidence assembly from documentation, goals/tasks, Git state/history, source snapshots, file inventory, and durable memory
- Context-source disclosure in the chat UI
- Provider model discovery and exact model validation from the Settings UI
- Vendor-neutral contracts for architectural memory, project timeline, diff review, context inspection, and intent navigation
- Working ESLint 9 flat configuration and lint validation in the macOS release workflow

## Changed

- The default OpenAI model for new configurations is `gpt-5.6-sol`; saved and environment model preferences remain unchanged.
- Model IDs are free-form and no longer require a FORGE source change.
- OpenAI Chat Completions uses `max_completion_tokens` with a legacy compatible-provider fallback.
- Clear Chat now has an explicit narrow data boundary: it removes messages only from the active thread.

## Validation target

- Typecheck, lint, automated tests, production Electron build, and macOS desktop packaging
- Live model discovery/completion remains user-key dependent and is not exercised by automated tests

---

# FORGE 1.0.0 (released August 5, 2026)

FORGE 1.0.0 is the first packaged macOS release of the local-first AI-native development workspace.

## Highlights

- Native universal macOS app for Apple Silicon and Intel Macs
- Custom FORGE icon representing code, project memory, and the forge/build metaphor
- Project explorer, Monaco editor, and sanitized Markdown preview
- Git status, diffs, staging, commits, pull, and push
- SQLite-backed goals, tasks, conversations, and project memories
- OpenAI-compatible API settings for key, base URL, and model
- Keychain-backed settings UI for AI and GitHub credentials
- GitHub Release update checks and manual release access inside the app
- `npm run install:mac` for no-uninstall local rebuilds and in-place updates

## Installation

Download `FORGE-1.0.0-universal.dmg`, open it, and drag FORGE into Applications.

This first release is unsigned because Developer ID credentials are not configured. macOS may require Control-click → **Open** or approval in **System Settings → Privacy & Security**. Automatic in-app installation will require consistently signed and notarized future releases; the **Releases** button remains available for manual updates.

## Historical 1.0.0 verification

- 12 test files and 21 tests pass
- TypeScript typecheck and production build pass
- Universal binary contains `x86_64` and `arm64`
- DMG checksum and ZIP integrity pass
- Production dependency audit reports zero vulnerabilities
