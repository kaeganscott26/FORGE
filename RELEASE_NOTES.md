# ✨ FORGE beta 2.1

FORGE beta 2.1 resets the application to the `8350aab` baseline and repairs the core workspace experience before publication as `v2.1.0-beta.2`.

## 🗂️ Workspace explorer and editor

- Recursively displays the project tree and lets folders expand and collapse independently.
- Adds explorer actions for new files, new folders, rename, delete, copy, and paste.
- Supports Command/Ctrl+C and Command/Ctrl+V for selected explorer entries, Command/Ctrl+N for a file, Command/Ctrl+Shift+N for a folder, F2 for rename, and Delete/Backspace for the selected entry.
- Copies use collision-safe `copy`, `copy 2`, and later names without overwriting existing files.
- Opens any UTF-8 text file regardless of extension and rejects binary files with a clear message.
- Adds Monaco language mapping for major JavaScript/TypeScript, Python, C/C++, Java, Rust, Go, Swift, Kotlin, C#, PHP, Ruby, shell, markup, data, SQL, and configuration files.
- Keeps Command/Ctrl+S, Command/Ctrl+O, undo, and redo behavior scoped correctly so focused editor and form controls retain native editing shortcuts.

## 🧠 UI and AI repairs

- Constrains persisted panel dimensions and adds responsive fallbacks so the editor and intelligence surfaces retain readable minimum widths.
- Forces an editor model refresh when switching files and enables Monaco automatic layout and word wrap.
- Surfaces failed IPC, Git, terminal, tool, clipboard, and release actions in the visible error notice instead of silently discarding the result.
- Automatically loads provider models when a saved remote key or loopback Ollama-compatible endpoint is available, while retaining manual refresh and model validation.
- Accepts OpenAI-compatible model catalogs returned as either `data` or Ollama-style `models`.

## 🧪 Verification

The reset baseline and this repair pass passed:

- `npm run typecheck`
- `npm run lint`
- `npm test` — 25 test files / 100 tests
- `npm run build`
- `git diff --check`

The release is a GitHub Pre-release on the Beta channel. macOS Developer ID signing and notarization are not configured, so unattended replacement is not claimed as trusted. Public workflow, asset hashes, and packaged runtime are checked against the final release commit; installation acceptance is performed from a mounted DMG in an isolated temporary location rather than over an existing app.
