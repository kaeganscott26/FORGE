# FORGE

FORGE is a local-first macOS development workspace that brings project files, Markdown notes, source editing, Git operations, project metadata, persistent tasks, AI conversations, and durable project memory into one desktop application.

The project folder remains the source of truth. FORGE helps you inspect and change that folder without uploading the whole workspace to a hosted editor or reducing the project to a chatbot transcript.

## Purpose

FORGE is designed for developers who want one place to:

- navigate and edit a real project;
- preview Markdown documentation;
- review, stage, commit, pull, and push Git changes;
- track structured, resumable project tasks independently of an AI conversation;
- keep multiple project-specific conversation threads without mixing workspaces;
- ask an AI assistant questions using automatically assembled workspace context.

Privileged file, Git, storage, and AI work runs in Electron's main process. The React renderer uses an allowlisted preload bridge rather than direct Node.js access.

## Main features

- Native Electron application for macOS
- Recursive project explorer and Monaco code editor
- Markdown preview
- Git status, diff, staging, commit, pull, and push controls
- Resizable Explorer, editor, workspace-intelligence, AI chat, and source-control regions with per-workspace layout persistence
- SQLite-backed goals, structured task steps/checkpoints/events, conversation threads, active-thread state, layout, and memories per workspace
- Dedicated Tasks view with dependency-aware resume, process/output tracking, audit evidence, retry/cancel semantics, and Markdown handoffs
- New Chat and Clear Chat controls that reset conversation state without deleting project intelligence
- Classified workspace-knowledge indexing, confidence-filtered lexical retrieval, and architecture-first prompt assembly from documentation, Git, metadata, source snapshots, and durable memory
- Context disclosure grouped by evidence class with relevance scores and selection reasons
- In-app AI settings for an encrypted API key, compatible base URL, free-form model ID, provider model discovery, and availability validation
- In-app GitHub settings for an encrypted personal access token used by HTTPS pull/push
- GitHub Release update checks in packaged builds
- Policy-controlled provider-neutral agent tools with risk tiers, approvals, cancellation, structured results, and a per-workspace audit log
- Workspace-contained integrated macOS PTY terminal with multiple sessions, resize, restart, cancellation, exit codes, copy, and bounded output
- Permissioned external web research with URL/DNS/network disclosure controls; disabled by default
- Copyable Settings build diagnostic with version, release channel, source commit, build date, runtime mode, renderer source, platform, and architecture
- One-command local rebuild and in-place app refresh

## Install FORGE on macOS

1. Open the [`v1.1.0-beta.1` FORGE Pre-release](https://github.com/kaeganscott26/FORGE/releases/tag/v1.1.0-beta.1).
2. Download `FORGE-1.1.0-beta.1-universal.dmg`.
3. Open the DMG and drag **FORGE** into **Applications**.
4. Launch FORGE and choose **Open workspace**.

The beta is distributed without an Apple Developer ID unless the release workflow reports configured signing credentials. On first launch, macOS may require Control-clicking the app and choosing **Open**, or approving it in **System Settings → Privacy & Security**. Signing and notarization are required before macOS can apply unattended automatic updates.

## Update an installed app from local source

After creating a verified universal package, run:

```sh
npm run package:mac:universal
npm run install:mac
```

`install:mac` verifies `dist_electron/build-manifest.json`, selects the universal bundle recorded there, refuses duplicate alternate installations, moves an existing `/Applications/FORGE.app` to a timestamped Trash backup, installs exactly `/Applications/FORGE.app`, and launches that path. It never falls back to `~/Applications` or wildcard-first-match selection.

## Update from GitHub Releases

The packaged app includes **Check for updates** and **Releases** controls. Stable is the default. Beta accepts strictly newer beta, release-candidate, or stable versions after explicit selection; a legacy Preview preference migrates to Beta. Until Developer ID signing is configured, use the verified DMG for manual replacement.

Open **Settings** to copy the build diagnostic whenever the UI does not match the expected release. The beta reports `FORGE v1.1.0-beta.1`, `Channel: beta`, the exact commit, and `file:// packaged app.asar`. Diagnostics omit credentials, workspace names, and private local paths.

## Development

Requirements:

- macOS 12 or newer for the packaged app
- Node.js 22 LTS (see `.nvmrc`)
- npm and Git

Install dependencies and start the native desktop runtime:

```sh
nvm use
npm install
npm run dev
```

The renderer-only Vite server remains available for UI development:

```sh
npm run start-renderer
```

It is not the distributed application and cannot provide all Electron IPC features. Packaged releases load the compiled renderer from inside `FORGE.app` through `file://`; users do not run a localhost server.

## Build and package

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run package:mac
npm run package:mac:universal
npm run package:mac:all
```

Useful packaging commands:

| Command | Result |
| --- | --- |
| `npm run clean:dist` | Remove packaging output only |
| `npm run package:mac` | Clean, then create ARM64 DMG/ZIP/blockmaps and a manifest |
| `npm run package:mac:universal` | Clean, then create universal DMG/ZIP/blockmaps and a manifest |
| `npm run package:mac:all` | Clean once, then create both beta build families and one manifest |
| `npm run install:mac` | Verify the manifest and install its universal app at `/Applications/FORGE.app` |
| `npm run clean` | Remove generated build and package output |

Generated packages are written to `dist_electron/`, excluded from Git and memory indexing, and represented by `build-manifest.json`. Read the [Build Artifact Policy](docs/BUILD_ARTIFACT_POLICY.md).

## Release automation

Pushing annotated tag `v1.1.0-beta.1` runs `.github/workflows/package-mac.yml`, validates source, creates or reconciles a draft, packages a universal app, selects assets from the manifest, uploads and hash-verifies them serially, publishes `beta-mac.yml` last, then publishes a GitHub Pre-release. A manual workflow run creates a downloadable Actions artifact without publishing. Read [Releasing FORGE](RELEASING.md), [Release Channels](docs/RELEASE_CHANNELS.md), and [Beta Verification](docs/V1.1.0_BETA_VERIFICATION.md).

For trusted distribution and working in-app automatic installation, configure these GitHub Actions secrets:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

Without them, the workflow intentionally creates an unsigned release and the user installs updates from the DMG.

## Configuration and local data

Open **Settings** to configure the AI provider and **GitHub** to jump directly to repository credentials. Secret values are encrypted through Electron `safeStorage`, backed by macOS Keychain, and stored outside the project. Read [UserConfig.md](UserConfig.md) for credential scopes, development environment fallbacks, and signing configuration.

FORGE stores workspace-specific application data at:

```text
<workspace>/.forge/metadata.sqlite
```

This directory is ignored by Git. It contains workspace-owned goals, persistent tasks, steps, checkpoints, events, conversation threads, active conversation selection, panel layout, audit records, and indexed memories. Switching folders opens a different database, so task/chat state cannot leak between workspaces. `.forge/handoffs/` contains human-readable task projections; SQLite remains authoritative. Back it up before deleting it.

## Workspace intelligence

Every AI turn receives an automatically generated system context before the conversation and user prompt. The context establishes FORGE's local-first philosophy and selects bounded evidence from architecture and project documents, current Git state and history, goals and tasks, relevant source snapshots, file inventory, and retrieved durable memories. Asking “What should I build next?” therefore produces an architecture-grounded answer instead of a generic IDE feature list.

Conversations, persistent tasks, and durable intelligence have separate lifecycles. **New chat** creates another thread in the current workspace. **Clear** removes messages only from the active thread. Neither action deletes tasks, checkpoints, indexed files, memories, embeddings or future indexes, project metadata, layout, or Git state.

## Persistent tasks

The **TASKS** bottom-panel view stores workflows in the workspace rather than the active model session. Resume first reconciles Git and known process IDs, preserves verified completed steps, and selects the first dependency-ready unfinished step. Executable steps still require the normal tool approval; persisted task state never becomes permanent authority. Background starts can continue without an active AI turn and retain PID/output evidence, but unattended orchestration and scheduled GitHub watchers are not implemented. See [Persistent Tasks](docs/PERSISTENT_TASKS.md) and [Task Recovery](docs/TASK_RECOVERY.md).

## Agent tools and terminal

A model tool call is a request, never permission. FORGE validates the schema, applies the permanent risk tier, checks workspace/session policy, displays approval when required, executes in main, records a sanitized audit event, bounds the result, and only then returns it to the agent and user.

Tier 0 read-only tools may run automatically. Tier 1 reversible changes require Run once or a narrow exact-scope session permission. Tier 2 delete, shell, remote Git, web, credential, and release actions always require Run once. There is no allow-everything mode. The integrated terminal is user-controlled and visually separate from agent `shell.run`; PTYs default to the workspace and terminal output is not automatically indexed.

## Documentation

- [User Manual](UserManual.md)
- [User Configuration](UserConfig.md)
- [Developer Log](Dev_log.md)
- [Current Release Notes](RELEASE_NOTES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Core Architecture](docs/Architecture/Core.md)
- [Current Project Status](docs/PROJECT_STATUS.md)
- [Agent Tools](docs/AGENT_TOOLS.md)
- [Tool Security](docs/TOOL_SECURITY.md)
- [Integrated Terminal](docs/TERMINAL.md)
- [Release Channels](docs/RELEASE_CHANNELS.md)
- [Releasing FORGE](RELEASING.md)
- [Persistent Tasks](docs/PERSISTENT_TASKS.md)
- [Task Recovery](docs/TASK_RECOVERY.md)
- [Build Artifact Policy](docs/BUILD_ARTIFACT_POLICY.md)
- [1.1.0 Beta Verification](docs/V1.1.0_BETA_VERIFICATION.md)

## Security notes

- Never commit API keys, GitHub tokens, Apple certificates, or `.env` files.
- Review the exact Git diff before committing or pushing from FORGE.
- Markdown preview output is sanitized; the renderer uses context isolation, no Node integration, Electron sandboxing, fixed preload channels, and blocked unexpected navigation.
- Agent tools do not bypass policy. Web research is off by default, shell execution is always approval-gated, and normal tool paths cannot leave the workspace.
- Automatic macOS updates require a consistently signed application; an unsigned release cannot provide that guarantee.
