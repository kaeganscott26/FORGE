# FORGE 1.0.0

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

## Verification

- 12 test files and 21 tests pass
- TypeScript typecheck and production build pass
- Universal binary contains `x86_64` and `arm64`
- DMG checksum and ZIP integrity pass
- Production dependency audit reports zero vulnerabilities
