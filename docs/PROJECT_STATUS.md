# 📍 FORGE Project Status

**Updated:** August 9, 2026

**Working version:** `2.3.0-beta.1` — FORGE v2.3 Beta

**Release target:** `v2.3.0-beta.1` on `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## 🧭 Current state

FORGE v2.3 Beta is the current release target. It adds capability-aware provider tools, typed GitHub mutations, bounded file evidence, explicit network execution profiles, and workspace-data lifecycle controls to the protected-browser and durable-memory baseline.

The prior public baseline remains [FORGE beta 2.1](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2). [FORGE beta 2.2](https://github.com/kaeganscott26/FORGE/releases/tag/v2.2.0-beta.3) was published from the matching annotated tag and successful workflow; its metadata and all five public SHA-256 digests agree with the serial uploader evidence. A bandwidth-bound independent full-DMG mount remains a clearly uncompleted acceptance layer.

## ✅ Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Explorer and editor | Recursive workspace tree, safe file operations, UTF-8 editing, Monaco language mapping, responsive layout, and keyboard controls |
| Workspace intelligence | Bounded context packets from docs, source, Git, tasks, durable memory, and observations; context ownership stays with the workspace |
| Agent runtime | Provider-neutral tool routing, policy/approval/audit enforcement, progress-aware continuation, persistent tasks, and task handoffs |
| Browser | Native public-web BrowserView, Home, independent tabs, close/select controls, navigation, workspace-scoped bookmarks/history, and explicit agent page-read approval |
| Git and terminal | Workspace-contained Git service, user-controlled PTYs, visible action results, and durable audit history |
| Updates | Forward-only Stable/Beta discovery, strict SemVer eligibility, bounded GitHub release discovery, and updater metadata validation |

## 🧪 Current source validation

The current source has passed:

- `npm run typecheck`
- `npm run lint`
- focused storage, memory, and IPC tests — 16 tests
- `npm run build`
- `git diff --check`

Browser acceptance loaded and visibly rendered `https://www.north3rnlight3r.com/` through the native BrowserView path after the surface-height regression was repaired. The memory database passes SQLite `integrity_check`; the out-of-bounds hardening applies bounded projections before memory scoring and provider handoff.

## 📦 Release state

`v2.2.0-beta.3` is published as [FORGE beta 2.2](https://github.com/kaeganscott26/FORGE/releases/tag/v2.2.0-beta.3). Workflow [31313805327](https://github.com/kaeganscott26/FORGE/actions/runs/31313805327) validated the exact tagged SHA, packaged the universal DMG/ZIP, uploaded the two blockmaps and `beta-mac.yml` serially, and published after hash verification.

The beta is not Developer ID signed or notarized. Public artifact acceptance will be isolated to a temporary read-only mount and profile; it will not overwrite `/Applications/FORGE.app` during verification.

## 🚧 Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Browser access is public HTTP(S) only; pages, local networks, credential-bearing URLs, and implicit workspace disclosure are blocked.
4. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.

## 🛡️ Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
