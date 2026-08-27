# FORGE

> A local-first workspace runtime for AI-assisted programming.

FORGE keeps project files, documentation, Git evidence, persistent tasks, conversations, and durable memory attached to the workspace while models and agent runtimes remain replaceable.

Current source version: `2.4.0-beta` · Electron 43 · React 19 · TypeScript · Windows x64, universal macOS, and Linux x64 packages.

The published [`v2.4.0-beta`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.4.0-beta) artifacts were built from tag commit `ff798b9`. `main` contains later fixes in the same source version, including workspace/database recovery, context corrections, runtime/packaging parity, and workspace-open response recovery. Those post-tag commits are not part of the published assets and require a new semantic version and tag before public distribution.

## Why FORGE exists

Most AI tools understand the current prompt better than the life of a project. FORGE makes the project folder the durable authority:

| Replaceable | Workspace-owned |
| --- | --- |
| Model or provider | Source and architecture |
| Chat session | Decisions and durable memory |
| CLI process | Task checkpoints and terminal evidence |
| Agent runtime | Git chronology and audited actions |

```text
files + docs + Git + tasks + memory + observations
                         │
                         ▼
              FORGE Intelligence
        bounded, authority-ordered context
                         │
                         ▼
          Native FORGE / runtime adapter
                         │
                         ▼
               FORGE ToolRouter
      files · Git · shell · tasks · web
```

Explicit tool results, current source, Git, and task/runtime evidence outrank historical memory. Optional semantic embeddings are off on a fresh install and act only as a discovery aid. A failed or unavailable embedding provider does not disable normal workspace intelligence or tool execution.

Native FORGE is the active execution path. Hermes detection, endpoint checks, and skill metadata discovery are implemented, but Hermes remains a requested/fallback profile until a tested structured bridge routes every Hermes tool request through FORGE's ToolRouter.

## Install

Download the package for your platform from the [v2.4.0-beta release](https://github.com/kaeganscott26/FORGE/releases/tag/v2.4.0-beta):

- macOS: `FORGE-2.4.0-beta-universal.dmg`
- Windows x64: `FORGE-2.4.0-beta-x64.exe`
- Linux x64: `FORGE-2.4.0-beta-x86_64.AppImage` or `FORGE-2.4.0-beta-amd64.deb`

The current packages are not backed by Apple Developer ID notarization or Windows publisher signing. Verify the published `SHA256SUMS` and release asset digests before installation. The GitHub release currently reports `isPrerelease: false` despite its beta SemVer identity; FORGE still treats it according to semantic-version/channel policy.

### Install or update from source

Run the native entry point on the operating system that will run the package:

```sh
# macOS: trusted main, package, verify, install, and open
npm run update:mac
```

```powershell
# Windows: trusted main, package, verify, install, and smoke-check
npm run update:win
```

```sh
# Linux: build and verify AppImage, DEB, metadata, and manifest
./scripts/package-linux.sh
```

The macOS and Windows updaters require `main`, the trusted GitHub origin, forward-only history, and no source changes outside `.obsidian`. Windows installation requires FORGE to be closed. FORGE-OS owns its integrated Linux installation through its sibling repository.

## Open and use a workspace

Choose **Open workspace** for a project folder or **Home** for your platform home directory. FORGE opens files in place; it does not import or relocate source. Workspace-owned application state lives at `<workspace>/.forge/metadata.sqlite`.

The desktop includes:

- a lazy Explorer and Monaco text editor;
- Git status, diff, stage, commit, pull, and push;
- workspace conversations and persistent tasks;
- a user terminal plus separately audited agent shell/process execution;
- a sandboxed public-web Browser with workspace bookmarks/history;
- FORGE Live loopback preview for static web workspaces;
- optional semantic context and runtime diagnostics.

The current autonomous tool runtime has no FORGE approval queue or session-grant layer. Registered, available calls with valid semantic arguments execute directly. Safety still comes from workspace containment, semantic schemas, exact argument handling, OS permissions, URL/network validation, timeouts, cancellation, atomic writes and rollback data, output bounds, secret redaction, loop-progress detection, and durable action records. Enable external web access or configure remote credentials only when you want those capabilities available.

## Develop

Requirements: Node.js 22 LTS (see `.nvmrc`), npm, Git, and a supported target OS.

```sh
nvm use
npm ci
npm run dev
```

Validate changes with:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Documentation

| Topic | Document |
| --- | --- |
| Daily use | [User Manual](UserManual.md) |
| Models, credentials, runtimes, and channels | [User Configuration](UserConfig.md) |
| Architecture and ownership | [Architecture](docs/ARCHITECTURE.md) |
| Current implementation | [Project Status](docs/PROJECT_STATUS.md) |
| Agent capabilities | [Agent Tools](docs/AGENT_TOOLS.md) |
| Persistent tasks | [Persistent Tasks](docs/PERSISTENT_TASKS.md) |
| Packaging and installation | [Packaging](docs/PACKAGING.md) |
| Release procedure | [Releasing FORGE](RELEASING.md) |
| Complete index | [Documentation](docs/README.md) |

Historical audits, plans, implementation logs, and release verification records live under [`docs/archive`](docs/archive/README.md) and are evidence, not current behavior.
