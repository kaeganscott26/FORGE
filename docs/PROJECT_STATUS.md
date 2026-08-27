# FORGE Project Status

Last audited: 2026-08-27 · source version `2.4.0-beta`.

## Current source

`main` implements the local-first Electron desktop, provider-neutral workspace intelligence, Native FORGE agent execution, the autonomous ToolRouter, persistent tasks, optional semantic context, a sandboxed Browser, FORGE Live, and coordinated Linux/macOS/Windows packaging.

Current source is ahead of the published `v2.4.0-beta` tag while retaining the same package version. The published tag resolves to `ff798b91a1a027a4891214c4da6549fc3336d210`; later source fixes are not in those public assets and must use a new version/tag before publication.

## Implemented

| Area | Current behavior |
| --- | --- |
| Workspace | Open project/Home in place, root confinement, lazy Explorer, text/media/binary classification, workspace-open null-payload recovery |
| Editor | Monaco text editing, Markdown preview, save/undo/redo, create/rename/copy/delete, dirty-path protection |
| Git | Status, log, branches, diff, stage/unstage, exact-staged commit, pull, and push |
| Storage | Schema v10 workspace SQLite, atomic persistence, verified backup recovery, conversations, tasks, memory, layout, Browser state, observations, semantic records, action history |
| Intelligence | Provider-neutral bounded context, authority/freshness metrics, explicit-evidence priority, optional semantic retrieval/fallback |
| Agent runtime | Native inspect/tool/observe/continue loop with runtime deadline and unchanged-state repeated-call suppression |
| Tool runtime | Stable semantic schemas, FORGE-owned execution context, direct execution, cancellation, bounds, rollback metadata, redaction, and execution-state audits |
| Tasks | Durable definitions, dependencies, checkpoints, events, process reconciliation, retries, pause/cancel/delete, and handoffs |
| Terminal | Cross-platform PTY, filtered non-secret environment, resize/restart/cancel, Windows ConPTY support |
| Browser/web | Sandboxed public HTTP(S) Browser, tabs/bookmarks/history, bounded page reads/finds, URL/DNS/redirect validation |
| FORGE Live | Contained loopback static server, ports 5500–5599, in-memory reload client, Browser preview |
| Runtime profiles | Native active; Hermes command/endpoint detection, reachability, skill metadata, and safe fallback |
| Packaging | Linux AppImage/DEB, universal macOS DMG/ZIP, Windows x64 NSIS, runtime metadata, manifests, hashes, updater YAML, installed-runtime verifiers |

## Execution-security state

The retired policy/approval subsystem is not part of the current runtime. There are no approval queues, grants, risk tiers, session permissions, or approval IPC channels. Valid calls to registered and available tools execute directly.

Enforced boundaries remain: semantic schema validation, workspace/symlink containment, exact shell arguments, filtered environments, OS permissions, URL/network controls, timeouts, cancellation, process-tree termination, atomic writes and backup/rollback metadata, dirty-editor checks, output limits, redaction, progress-aware loop protection, and durable execution records.

## Published release

[`v2.4.0-beta`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.4.0-beta) was published on 2026-08-26 with Linux x64, universal macOS, and Windows x64 packages plus updater metadata, blockmaps, `SHA256SUMS`, and a build manifest. GitHub currently reports it as a normal release (`isPrerelease: false`) despite its beta SemVer and workflow intent.

The published macOS package is not claimed as Developer ID notarized, and the Windows package is not claimed as publisher signed. Integrity/provenance and platform signing are separate assertions.

## Known limitations

1. Hermes cannot become the authoritative executor until a tested structured bridge exposes FORGE's ToolRouter as its only tool surface.
2. Semantic discovery requires a separately available OpenAI-compatible embedding provider and is disabled on fresh installs.
3. Persistent tasks reconcile observed processes and artifacts but do not provide a general cross-restart supervisor for every external operation.
4. Public packages lack established Apple notarization and Windows publisher signing.
5. Current `main` and published `v2.4.0-beta` share a version but differ in source; the next public release must increment the version.
6. The existing beta release's GitHub prerelease flag is incorrect and must be verified explicitly in the next release.

Validation claims belong in the commit/release evidence that produced them. Historical records are in [`docs/archive`](archive/README.md).
