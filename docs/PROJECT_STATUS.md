# 📍 FORGE Project Status

**Updated:** August 7, 2026

**Working version:** `2.1.0-beta.2` — FORGE beta 2.1

**Baseline:** reset to commit `8350aab`, then repaired on `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## 🧭 Current state

The repository was deliberately reset from the broken post-`8350aab` release line. The current source adds a full interactive project explorer, text-first file editing, readable responsive panel sizing, provider model discovery, and visible action failures.

The two superseded GitHub releases (`v1.1.0-beta.1` and `v1.1.0-beta.2`) were deleted with their exact release tags. The superseded `v2.1.0-beta.1` release was also removed so patched artifacts are published only as the annotated `v2.1.0-beta.2` Pre-release named **FORGE beta 2.1**.

## ✅ Implemented capability matrix

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

## 🧪 Validation evidence

The current tree passed:

- `npm run typecheck`
- `npm run lint`
- `npm test` — 25 test files / 100 tests
- `npm run build`
- `git diff --check`

The workspace file tests cover recursive listing, arbitrary UTF-8 extension reads, writes, and copy without overwrite. Editor tests cover normalized paths, parent/child path handling, and copy-name collision behavior.

## 📦 Release state

Version and package manifests report `2.1.0-beta.2`. The final source commit is `c5d9268ebabca8bc9ad0a4c36859ca74a617a553`; `main`, `origin/main`, and annotated tag `v2.1.0-beta.2` all resolve to it. GitHub Actions run [31193206048](https://github.com/kaeganscott26/FORGE/actions/runs/31193206048) passed source validation, packaging, serial asset upload/hash verification, and publication. The public release is [FORGE beta 2.1](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2) with five assets.

The public DMG was downloaded independently, matched GitHub's SHA-256 `b1e7780fd49188867ec4b88d2c87a4ef02f8390b94431219a4dd9791e9592b79`, mounted read-only, and launched from its temporary mounted path with a temporary user-data directory. It reported `2.1.0-beta.2`, loaded `file://.../app.asar`, exposed the repaired `file.copy` path, and produced no runtime error. `/Applications/FORGE.app` and `~/Applications/FORGE.app` were not overwritten or used for this acceptance test. Developer ID signing and notarization are not configured; trusted unattended macOS replacement is not claimed.

Public asset digests reported by GitHub:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `FORGE-2.1.0-beta.2-universal.dmg` | 251638068 | `b1e7780fd49188867ec4b88d2c87a4ef02f8390b94431219a4dd9791e9592b79` |
| `FORGE-2.1.0-beta.2-universal.dmg.blockmap` | 257978 | `c107c4969b5a876d388f06f3480b5fc8c1bbf7fd4c17e5417a9d27961d2e16f6` |
| `FORGE-2.1.0-beta.2-universal.zip` | 247544239 | `29b7684a5d1de8d24890ab40054fb72096d940d9fc68eae2ba7b347596efabd7` |
| `FORGE-2.1.0-beta.2-universal.zip.blockmap` | 258850 | `14741feb38914aa77d5552714a8e323d69961ec2eb085f6971ee2c3ef38d2ee2` |
| `beta-mac.yml` | 531 | `315b39152cba85e2a4a368419bd4268b6af570ffe75d33b8a945fde5ef3f25b3` |

## 🚧 Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
4. File rollback backups are recovery aids rather than transactional storage.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.

## 🛡️ Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
