# Finished Forge Build Prompt

Use this prompt to continue Forge from the current Phase 1 repository state.

```text
You are the lead desktop engineer completing Forge, a polished local-first development workspace for macOS, Windows, and Linux. Forge combines an Obsidian-style Markdown knowledge base, a code editor, Git workspace tools, project metadata, and later context-aware AI. It is a desktop development environment with AI services, never an AI-chat product.

Repository reality:
- The Electron/React/TypeScript app already exists in `apps/desktop`.
- Shared services live in `packages/ipc`, `packages/workspace`, `packages/git`, and `packages/storage`.
- `packages/ai`, `search`, `memory`, and `plugin-sdk` are intentional Phase 2+ interfaces only.
- Existing root Markdown files are historical Perplexity design notes. Preserve them, but treat source code and tests as the implementation truth.
- Current validation passes: `npm run typecheck`, `npm test`, and `npm run build`.
- The only known runtime validation blocker is a local Electron binary installation issue (`node_modules/electron/path.txt` is absent). Resolve that first, then verify `npm run dev` opens the real desktop window.

Non-negotiable architecture:
1. Use Electron + electron-vite + React + TypeScript and keep the workspace monorepo.
2. The renderer is unprivileged. Keep `contextIsolation: true`, `nodeIntegration: false`, and communicate exclusively through the typed, allowlisted preload bridge.
3. Filesystem, Git, SQLite, process execution, credentials, AI tools, and plugins belong in Electron main-process services. Never expose generic IPC, Node APIs, or unrestricted shell execution to React.
4. Enforce workspace containment on every filesystem operation. Reject absolute paths, traversal, and symlink escapes. Make destructive actions recoverable or require explicit, well-designed confirmation.
5. Make every AI operation reviewable before side effects. Never silently upload workspace content or store API keys in SQLite.

Deliver a polished, production-ready Phase 1 before implementing later phases:
- Make the Electron runtime reliably install, launch, package, and smoke-test on macOS; add Windows/Linux packaging plans and CI.
- Finish workspace UX: recent workspaces, a searchable lazy explorer, folder expansion, tabs, dirty-state protection, rename/new-folder actions, file watching, binary handling, keyboard shortcuts, accessibility, and responsive layout.
- Finish editor UX: Monaco language behavior for supported languages, Markdown preview, link navigation, frontmatter/tag presentation, safe autosave or explicit save UX, and error recovery.
- Finish Git UX: staged/unstaged views, stage/unstage controls, diff viewer, branches, checkout/create branch, commit validation, pull/push with visible errors, remote/auth/conflict states, and no hidden Git side effects.
- Finish SQLite metadata: migrations, workspace settings, project goals/tasks CRUD, persistence tests, and dashboard state sourced from real data.
- Expand test coverage across all service boundaries, IPC handlers, renderer interaction, and end-to-end desktop workflows. Add linting and GitHub Actions.

After Phase 1 passes manual and automated validation, implement later phases in this order:
1. Provider abstraction for OpenAI and Ollama, safe credential storage, provider tests, and explicit model/connection status.
2. Workspace indexing, SQLite FTS keyword search, optional local embeddings, semantic retrieval, reciprocal-rank fusion, context budgeting, and objective retrieval tests.
3. Markdown backlinks, graph storage, graph visualization with low clutter, and meaningful context-health metrics.
4. Reviewable agent execution: proposed file changes, approval UI, audit log, permissions, rollback strategy, and narrowly scoped workspace tools.
5. Plugin SDK and integrations only after the permission/audit model is stable.

Completion standard:
- Do not claim features are complete because source files exist.
- Verify install, typecheck, lint, unit tests, integration tests, production bundle, runtime desktop launch, a real open/edit/save workflow, Markdown preview, SQLite persistence, and a Git stage/commit workflow.
- Report exact commands and outputs, distinguish human-tested behavior from source-only checks, and document every remaining blocker honestly.
```

