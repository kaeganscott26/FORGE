# ✨ FORGE v2.3 Beta

FORGE v2.3 Beta (`v2.3.0-beta.1`) turns the review's agent-runtime and workspace-data recommendations into concrete beta behavior: more precise tool capability disclosure, bounded evidence retrieval, explicit execution policy, and lifecycle-safe workspace data controls.

## 🧭 Predictable agent execution

- Advertises only tools that are available and enabled in the active FORGE runtime. Disabled web research, unavailable Browser, GitHub, terminal, task, and memory dependencies are no longer offered to a provider only to fail at execution time.
- Makes every registered tool declare an explicit side effect and approval policy. Git commits are now `repository-write` operations requiring a fresh explicit approval.
- Separates public network reads from network writes: enabled public web search/fetch are automatic and never transmit workspace content, while GitHub mutations and Git remote operations remain explicitly approved.
- Replaces the unstructured GitHub mutation payload with typed operation schemas for issues, comments, branches, files, pull requests, workflows, and releases.
- Requires an explicit shell network profile for known network-capable commands and reflects that profile in the approval/audit request. The profile is an accurate policy disclosure and command guard, not an OS-level network sandbox.

## 📚 Bounded workspace intelligence

- Adds cursor-style pagination to `file.list`, with stable ordering and a continuation offset.
- Adds bounded `file.read` ranges by line or character offset, including total size, returned range, truncation, and continuation metadata.
- Limits workspace-memory previews and writes, exposes record statistics, warns about oversized legacy records, and makes memory, conversation, and persistent-task deletion explicit about what is—and is not—removed.

## 🧪 Verification

The source gate covers typecheck, lint, storage persistence, memory retrieval, typed IPC, tool-policy runtime tests, shell policy tests, and production bundling. The tag workflow additionally validates the tagged source, universal package, updater metadata, serial asset upload, and public artifact hashes.

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
