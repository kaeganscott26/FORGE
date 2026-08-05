# Forge Project Status

Last updated: 2026-08-04

## Summary

Forge has moved from an Obsidian vault containing an architecture proposal and incomplete TypeScript snippets to a real Electron + React + TypeScript workspace application. The committed application is a Phase 1 foundation: it is designed to open a local repository, edit supported text files, preview Markdown, inspect and commit Git changes, and persist project goals/tasks in a local SQLite database.

The original Perplexity notes remain in place as historical design references. They are not used as executable source.

## Implemented

- npm-workspace project with Electron, electron-vite, React, TypeScript, Monaco, `simple-git`, `sql.js`, Vitest, and a root README.
- Electron main process with `contextIsolation` enabled and `nodeIntegration` disabled.
- Typed, allowlisted `window.forge.invoke()` preload bridge. Renderer code does not import Node APIs.
- Workspace service that opens a directory, lists files, reads/writes/creates/renames/deletes files, parses Markdown, and blocks absolute paths, `..` traversal, and symlink escapes beyond the workspace root.
- Markdown support for simple YAML frontmatter, wiki-links, tags outside fenced code blocks, and heading extraction.
- Git service for status, branches, logs, diff parsing, stage/unstage, commit, pull, and push.
- Per-workspace SQLite metadata file at `.forge/metadata.sqlite`, containing the active project, goals, and tasks.
- React desktop UI: welcome screen, workspace picker, file explorer, Monaco editor, Markdown preview, save/create/delete controls, Git panel, diff display, commit control, and dashboard metrics/goals/tasks/recent commits.
- Phase 2+ AI, search, memory, and plugin SDK packages are explicit interfaces only; they do not pretend to be implemented services.
- Unit tests for Markdown parsing and Git diff parsing.

## Validation completed

```text
npm run typecheck  PASS
npm test           PASS (2 tests)
npm run build      PASS
```

`electron-vite` produced main, preload, and renderer bundles in `apps/desktop/out/`.

## Runtime status

The Electron development server successfully starts and builds the main/preload bundles. A full desktop-window smoke test is **not yet confirmed** because this environment's Electron package lacks `node_modules/electron/path.txt` and therefore its macOS Electron binary. Running Electron's vendor installer returned without creating that file; the next developer should resolve that machine/npm-cache issue and rerun `npm run dev`.

This is an environment/install blocker, not a TypeScript or production-bundle failure. Visual/manual interaction testing has not been performed.

## Still to implement

### Phase 1 hardening

- Add tests for workspace containment and symlink handling, SQLite persistence, Git operations, main-process IPC, and renderer interactions.
- Add editor tabs, unsaved-change confirmation, file rename UI, folder expand/lazy loading, binary-file presentation, search/filtering, and resilient file-watch UI refresh.
- Move deletes to a recoverable trash flow or add a stronger main-process confirmation policy.
- Improve Git UX: staged versus unstaged groups, an unstage UI, branch checkout/create, commit error affordances, merge/auth/conflict handling, and complete diff rendering.
- Add workspace recents, settings, database migrations, error telemetry/log files, accessibility review, and user-facing keyboard shortcuts.
- Add lint rules, CI, release packaging, macOS signing/notarization, Windows/Linux packaging, and an end-to-end desktop smoke test.

### Planned later phases

- AI provider configuration for OpenAI and Ollama, key storage using Electron safe storage, context assembly, and reviewable tool execution.
- Keyword and semantic retrieval, indexer/file watcher, embeddings, and retrieval evaluation.
- Knowledge graph, backlinks, graph UI, project-memory lifecycle, and context health based on real indexed data.
- Plugin host, permission model, audit log, first-party integrations, and build/run tool support.

## Important technical choices

- SQLite uses `sql.js` rather than `better-sqlite3`, avoiding native-module ABI rebuilds in the baseline. It is still an SQLite database persisted inside each workspace.
- AI is intentionally absent from Phase 1. The app does not send files, prompts, or credentials anywhere.
- The renderer includes a browser confirmation before delete, while the main process remains responsible for rejecting paths outside the selected workspace.

