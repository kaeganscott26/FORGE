# ✨ FORGE beta 2.2

FORGE beta 2.2 advances the workspace runtime to `v2.2.0-beta.3` with a dependable protected Browser, durable workspace browsing records, safer bounded agent context, and a corrected release provenance gate.

## 🌐 FORGE Browser

- Adds a dedicated FORGE Browser home screen whenever no website tab is selected, including update status and a direct link to the FORGE GitHub repository.
- Adds tab selection, new-tab/home behavior, closing tabs, navigation controls, and page titles without giving renderer content access to Node.js or workspace files.
- Stores bookmarks and recency/visit-count history in the active workspace's `.forge/metadata.sqlite`; changing workspace does not mix browsing records.
- Keeps public HTTP(S)-only navigation, blocks credential-bearing, local, and private-network destinations, and preserves the native BrowserView compositor path that prevents blank page surfaces.
- Lets the agent open, read, find, and save bounded page context only through the existing visible-browser tools and explicit approval boundary.

## 🧠 Runtime resilience

- Bounds durable-memory content before relevance scoring and before it is returned to an agent, so exceptionally large imported notes cannot exhaust local WASM memory or provider request capacity during a repository audit.
- Preserves progress-aware tool continuation: meaningful sequential work continues while workspace state changes; redundant exact calls against unchanged observed state are suppressed.
- Records a clean source tree before upload while excluding only the verified generated desktop runtime bundle that the package step necessarily regenerates.

## 🧪 Verification

The source gate covers typecheck, lint, storage persistence, memory retrieval, typed IPC, and production bundling. The release workflow additionally validates the tagged source, universal package, updater metadata, serial asset upload, and public artifact hashes.

The beta is unsigned and not notarized. macOS Developer ID signing and trusted unattended replacement are not claimed.

---

# 🗃️ FORGE beta 2.1 historical notes

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
