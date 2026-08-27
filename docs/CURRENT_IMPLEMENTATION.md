# FORGE Current Implementation

Last reconciled with `main`: **2026-08-25**.

This is the canonical current-state document for implemented FORGE behavior. Historical audits, reviews, release verification files, and development-arc notes remain point-in-time records and should not be read as the current runtime contract.

## Product identity

FORGE is a local-first intelligent workspace environment. The workspace owns project state, durable memory, task history, tool audit history, browser history/bookmarks, and Git evidence. Models and agent runtimes are replaceable clients of that workspace state rather than owners of it.

Current source line: **2.4.0-beta**.

## Desktop runtime

- Electron main process owns privileged filesystem, Git, terminal, browser, update, runtime, and persistence operations.
- React/TypeScript renderer communicates through typed IPC and has no direct Node.js authority.
- Workspace state persists in `<workspace>/.forge/metadata.sqlite`.
- Home (`~`) can be selected as a workspace on supported desktop platforms; workspace-relative tools remain bounded to the selected root.
- Explorer uses lazy directory loading and skips protected/transient subtrees that return `EACCES`/`EPERM` rather than failing the entire workspace.
- Text, image, audio, and video handling use explicit file classification instead of treating arbitrary files as source text.

## Agent and tool architecture

- Optional Semantic Context provides lazy, capped discovery after deterministic routing. Explicit tools/current source/Git/task evidence outrank it; stale or failed records inject nothing, vectors use compact Float32 storage, and local Ollama unloads after each semantic operation. Embeddings are not the inference model; Native FORGE and Hermes work without them.

- FORGE ToolRouter remains the authority for tool validation, execution, audit, cancellation, rollback metadata, and workspace containment.
- Tool schemas are provider-neutral and capability-aware.
- Resource bounds exist for safety and predictability; the runtime does not impose arbitrary step-count limits on legitimate agent work.
- Filesystem, Git, shell, tasks, browser research, and runtime operations are exposed through typed tool contracts.
- Network-capable shell execution uses explicit network profiles rather than implicit unrestricted behavior.
- Persistent tasks include steps, checkpoints, artifacts, external references, retries, resumability state, handoff generation, and reconciliation with observed processes/Git state.

## Hermes integration

Hermes is an optional agent runtime, not a replacement control plane.

- Settings can select native or Hermes runtime behavior.
- FORGE detects Hermes CLI/runtime availability and reports its version, endpoint reachability, installation directory, and discovered skill roots.
- Hermes ACP/MCP/CLI integration is expected to pass tool execution through FORGE authority rather than bypassing the ToolRouter.
- Runtime events map planning, tool request/start/completion/failure, step completion, task completion/cancellation, and provider/model changes back into FORGE-owned task and audit state.

## Workspace knowledge and Obsidian

- Repository/workspace documentation, Git chronology, durable memory, task state, and bounded file evidence are compiled into model context.
- `.forge/metadata.sqlite` is runtime state and is ignored by Git.
- Obsidian workspace assets/plugins may coexist in the repository while FORGE remains the canonical runtime/state authority.
- Local AI and OpenAI-compatible integrations are being normalized around shared endpoint contracts rather than bespoke per-feature APIs.

## Integrated terminal

- FORGE provides user-controlled PTY sessions rooted in the active workspace.
- External agents such as Codex, Hermes, Ollama-backed clients, Claude Code, or OpenCode can be launched in the same source tree without relocating the project.
- Terminal sessions and relevant execution evidence can feed task/runtime state while preserving the distinction between user shell activity and agent tool execution.

## FORGE Browser

- Browser tabs, navigation, bookmarks, and history are workspace-scoped.
- Public HTTP(S) research is isolated from direct filesystem, shell, and credential access.
- `browser.read` and `browser.find` expose bounded visible-page text when Web Research is enabled.
- The Browser Home **Newest updates** card no longer contains a hardcoded feature/release description. It renders the updater's current installed/available version state, so the card follows runtime update status instead of stale UI copy. The explicit **Check for updates** action performs GitHub release discovery; opening Browser Home itself does not silently start a download.

## FORGE Live

FORGE Live provides a cross-platform localhost preview workflow for web projects.

- Preview service is implemented as a FORGE workspace package/service rather than a third-party browser extension dependency.
- It binds a bounded local port range, serves the selected workspace root, supports index discovery/fallback behavior, and blocks encoded traversal attempts.
- The implementation is covered by package tests and is intended to be launched from FORGE's workspace UI/runtime.

## Updates and release policy

- GitHub Releases are the update discovery source.
- Stable and beta channels use forward-only semantic-version eligibility.
- Prerelease policy accepts supported beta/rc identifiers only when the beta channel is selected.
- Packaged builds can discover and download a newer compatible release through `electron-updater`; development builds report that packaged update checks are unavailable.
- macOS/Windows source update scripts verify trusted origin/main state and protect local `.obsidian` state.

## Current verification baseline

For implementation changes, the expected repository verification sequence is:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Feature-specific tests should also be run for changed packages (for example FORGE Live/updater tests).

## Documentation authority

Use this precedence when documents disagree:

1. Current source and tests on `main`.
2. This document and `docs/PROJECT_STATUS.md`.
3. Active architecture/tool/security/user documentation.
4. Release notes/changelog for historical change chronology.
5. `docs/archive/**`, verification snapshots, reviews, and development-arc files as historical evidence only.
