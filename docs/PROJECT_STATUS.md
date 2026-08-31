# 📍 FORGE Project Status

**Updated:** August 31, 2026

**Working version:** `2.5.0-beta` — FORGE living intelligence beta

**Release target:** published `v2.5.0-beta` Beta channel with coordinated native packages

**Platform:** shared macOS, Windows, Linux, and FORGE-OS renderer with native packaging per platform

## 🧭 Current state

FORGE v2.5.0-beta is the current coordinated Beta line. It adds the living intelligence visual system, complete artifact-packet telemetry, reliable activity indicators and sounds, and carries forward the repaired semantic-memory lifecycle.

The tagged source includes the new mark and typography, low-overhead Three.js aurora rendering, animated Explorer/Browser/Intelligence surfaces, system sounds, read-only runtime telemetry, a 32 MB pre-allocation file-read guard, and actionable permission failures.

The prior public baselines remain [FORGE beta 2.1](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2) and [FORGE beta 2.2](https://github.com/kaeganscott26/FORGE/releases/tag/v2.2.0-beta.3). They are historical releases, not the supported product identity.

## ✅ Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Explorer and editor | Recursive permission-tolerant workspace tree, routed create/rename dialogs, safe bounded file operations, UTF-8 editing, Monaco language mapping, responsive animated layout, and keyboard controls |
| Workspace intelligence | Tool-first deterministic context plus optional lazy semantic discovery, current-file validation, strict result/token caps, Float32 persistence, changed-path indexing, and graceful no-injection fallback |
| Agent runtime | Provider-neutral tool routing, direct-evidence enforcement, progress-aware continuation, persistent tasks, task handoffs, Native FORGE, and optional Hermes selection |
| Browser | Native public-web BrowserView, Home, independent tabs, close/select controls, navigation, workspace-scoped bookmarks/history, and explicit agent page-read approval |
| Git and terminal | Workspace-contained Git service, user-controlled PTYs, visible action results, and durable audit history |
| Updates | Forward-only Stable/Beta discovery, strict SemVer eligibility, bounded GitHub release discovery, and updater metadata validation |
| Living UI | Shared v2.5 identity, adaptive Three.js aurora, glass surfaces, reduced-motion support, system sounds, and real context/memory/process telemetry |

## 🧪 Current source validation

The current source has passed:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify:release-version`
- `git diff --check`

The v2.5 source pass records 33 test files, 203 passed tests, 2 intentional skips, a clean typecheck/lint run, a successful production build, and a zero-vulnerability production dependency audit. Native installer execution and physical-platform UX acceptance remain platform-specific evidence.

Prior Browser acceptance loaded and visibly rendered `https://www.north3rnlight3r.com/` through the native BrowserView path after the surface-height regression was repaired. The current routing suite statically verifies every renderer button has a click or form-submit path, and focused tests cover creation IPC plus protected home-directory traversal. The production renderer was also exercised under Electron on macOS: Home exposed 44 top-level entries, New File created and activated a disposable file in Monaco, and the goal, metadata-task, and persistent-task controls opened their routed dialogs. The disposable file was removed. Platform-native packaged acceptance remains separate.

## 📦 Release state

[`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) is published as **FORGE v2.3 Beta**. Its annotated tag resolves to `302ff52b87e415d357c6fe5039869c742d5ecb24`; workflow [31323231310](https://github.com/kaeganscott26/FORGE/actions/runs/31323231310) completed successfully for that SHA, packaged the universal DMG/ZIP, uploaded the two blockmaps and `beta-mac.yml` serially, and published after upload verification. [The release record](V2.3.0_BETA1_VERIFICATION.md) preserves the observed public asset digests.

The beta is not Developer ID signed or notarized. Independent public download-hash comparison and mounted-DMG/app acceptance have not been recorded for this release. The public release is not currently flagged as a GitHub prerelease even though it uses a beta SemVer tag and FORGE Beta update channel; release verification must check that flag before treating a future publication as complete.

## 🚧 Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Browser access is public HTTP(S) only; pages, local networks, credential-bearing URLs, and implicit workspace disclosure are blocked.
4. Optional semantic discovery requires a separately installed/configured embedding provider; it is off on fresh installs and is not required for normal operation.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.
6. Workspace memory reindexing remains an explicit user action; automatic filesystem-watch reindexing is not wired.
7. Explorer edits normal UTF-8 files but does not yet provide the package/executable inspection and launch modes described in older FORGE-OS planning notes.

The local macOS installer now stages and verifies a universal replacement bundle before activation. Its source and packaging gates must be rerun before that behavior can become release evidence.

## 🛡️ Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
