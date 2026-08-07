# FORGE Project Status

**Updated:** August 7, 2026

**Working version:** `2.1.0-beta.2` — FORGE beta 2.1

**Baseline:** reset to commit `8350aab`, then repaired on `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## Current state

The repository was deliberately reset from the broken post-`8350aab` release line. The current source adds a full interactive project explorer, text-first file editing, readable responsive panel sizing, provider model discovery, and visible action failures.

The two superseded GitHub releases (`v1.1.0-beta.1` and `v1.1.0-beta.2`) were deleted with their exact release tags. The superseded `v2.1.0-beta.1` release was also removed so patched artifacts are published only as the annotated `v2.1.0-beta.2` Pre-release named **FORGE beta 2.1**.

## Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Explorer | Recursive tree, independent folder expand/collapse, selection, right-click action menu, refresh |
| File management | New file/folder, rename, delete, recursive copy/paste, collision-safe copy names, workspace containment |
| Editor | Any UTF-8 text file, binary rejection, Monaco model reset per path, word wrap, automatic layout, major-language mapping |
| Keyboard | Command/Ctrl+S save, Command/Ctrl+O workspace open, Command/Ctrl+Z undo, platform redo, Command/Ctrl+C/V explorer copy/paste, Command/Ctrl+N new file, Command/Ctrl+Shift+N new folder, F2 rename, Delete/Backspace delete |
| Responsive UI | Clamped persisted dimensions, resize-time correction, minimum readable editor/intelligence widths, narrow-window panel fallbacks |
| AI models | Automatic catalog loading for saved remote credentials and loopback Ollama-compatible providers, manual refresh, validation, `data`/`models` catalog compatibility |
| Action reporting | Visible error notices for renderer IPC, Git, terminal, tool approval, clipboard, model, and release failures |
| Security boundary | Context isolation, no Node integration, sandbox, allowlisted preload, workspace path and symlink containment |

## Validation evidence

The current tree passed:

- `npm run typecheck`
- `npm run lint`
- `npm test` — 25 test files / 100 tests
- `npm run build`
- `git diff --check`

The workspace file tests cover recursive listing, arbitrary UTF-8 extension reads, writes, and copy without overwrite. Editor tests cover normalized paths, parent/child path handling, and copy-name collision behavior.

## Release state

Version and package manifests report `2.1.0-beta.2`. The intended tag is `v2.1.0-beta.2`, Beta channel, `beta-mac.yml`, and the public release name **FORGE beta 2.1**.

Local source validation is complete. Final release verification still requires the exact pushed commit, annotated tag target, GitHub Actions result, universal assets, public hashes, packaged `file://` runtime, installed-app smoke tests, and updater checks. Developer ID signing and notarization are not configured; trusted unattended macOS replacement is not claimed.

## Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
4. File rollback backups are recovery aids rather than transactional storage.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.

## Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
