# 📍 FORGE Project Status

**Updated:** August 21, 2026

**Working version:** `2.3.0-beta.1` — FORGE v2.3 Beta

**Published release:** [`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) on `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## 🧭 Current state

FORGE v2.3 Beta is the current published beta. It adds capability-aware provider tools, typed GitHub mutations, bounded file evidence, explicit network execution profiles, and workspace-data lifecycle controls to the protected-browser and durable-memory baseline.

Current unreleased `main` also restores the complete Ollama tool catalog and stable aliases, reconciles fabricated task UUID metadata, removes the numeric context-health display, adds platform-aware updater metadata, replaces renderer-native text prompts with routed in-app creation dialogs, and makes home-directory workspaces resilient to protected/container-backed subtrees. These changes are source behavior, not a new tagged release.

The prior public baselines remain [FORGE beta 2.1](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2) and [FORGE beta 2.2](https://github.com/kaeganscott26/FORGE/releases/tag/v2.2.0-beta.3). They are historical releases, not the supported product identity.

## ✅ Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Explorer and editor | Recursive permission-tolerant workspace tree, routed create/rename dialogs, safe file operations, UTF-8 editing, Monaco language mapping, responsive layout, and keyboard controls |
| Workspace intelligence | Bounded context packets from docs, source, Git, tasks, durable memory, and observations; context ownership stays with the workspace |
| Agent runtime | Provider-neutral tool routing, policy/approval/audit enforcement, progress-aware continuation, persistent tasks, and task handoffs |
| Browser | Native public-web BrowserView, Home, independent tabs, close/select controls, navigation, workspace-scoped bookmarks/history, and explicit agent page-read approval |
| Git and terminal | Workspace-contained Git service, user-controlled PTYs, visible action results, and durable audit history |
| Updates | Forward-only Stable/Beta discovery, strict SemVer eligibility, bounded GitHub release discovery, and updater metadata validation |

## 🧪 Current source validation

The current source has passed:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify:release-version`
- `git diff --check`

Prior Browser acceptance loaded and visibly rendered `https://www.north3rnlight3r.com/` through the native BrowserView path after the surface-height regression was repaired. The current routing suite statically verifies every renderer button has a click or form-submit path, and focused tests cover creation IPC plus protected home-directory traversal. The production renderer was also exercised under Electron on macOS: Home exposed 44 top-level entries, New File created and activated a disposable file in Monaco, and the goal, metadata-task, and persistent-task controls opened their routed dialogs. The disposable file was removed. Platform-native packaged acceptance remains separate.

## 📦 Release state

[`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) is published as **FORGE v2.3 Beta**. Its annotated tag resolves to `302ff52b87e415d357c6fe5039869c742d5ecb24`; workflow [31323231310](https://github.com/kaeganscott26/FORGE/actions/runs/31323231310) completed successfully for that SHA, packaged the universal DMG/ZIP, uploaded the two blockmaps and `beta-mac.yml` serially, and published after upload verification. [The release record](V2.3.0_BETA1_VERIFICATION.md) preserves the observed public asset digests.

The beta is not Developer ID signed or notarized. Independent public download-hash comparison and mounted-DMG/app acceptance have not been recorded for this release. The public release is not currently flagged as a GitHub prerelease even though it uses a beta SemVer tag and FORGE Beta update channel; release verification must check that flag before treating a future publication as complete.

## 🚧 Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Browser access is public HTTP(S) only; pages, local networks, credential-bearing URLs, and implicit workspace disclosure are blocked.
4. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.
6. Workspace memory reindexing remains an explicit user action; automatic filesystem-watch reindexing is not wired.
7. Explorer edits normal UTF-8 files but does not yet provide the package/executable inspection and launch modes described in older FORGE-OS planning notes.

The local macOS installer now stages and verifies a universal replacement bundle before activation. Its source and packaging gates must be rerun before that behavior can become release evidence.

## 🛡️ Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
