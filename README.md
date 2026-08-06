# FORGE

FORGE is a local-first macOS development workspace that brings project files, Markdown notes, source editing, Git operations, project metadata, AI conversations, and durable project memory into one desktop application.

The project folder remains the source of truth. FORGE helps you inspect and change that folder without uploading the whole workspace to a hosted editor or reducing the project to a chatbot transcript.

## Purpose

FORGE is designed for developers who want one place to:

- navigate and edit a real project;
- preview Markdown documentation;
- review, stage, commit, pull, and push Git changes;
- track project goals and tasks;
- keep project-specific conversations and memories;
- ask an AI assistant questions using workspace context.

Privileged file, Git, storage, and AI work runs in Electron's main process. The React renderer uses an allowlisted preload bridge rather than direct Node.js access.

## Main features

- Native Electron application for macOS
- Recursive project explorer and Monaco code editor
- Markdown preview
- Git status, diff, staging, commit, pull, and push controls
- SQLite-backed goals, tasks, conversations, and memories per workspace
- Workspace indexing and lexical memory retrieval
- In-app AI settings for an encrypted API key, compatible base URL, and model
- In-app GitHub settings for an encrypted personal access token used by HTTPS pull/push
- GitHub Release update checks in packaged builds
- One-command local rebuild and in-place app refresh

## Install FORGE on macOS

1. Open the [latest FORGE release](https://github.com/kaeganscott26/FORGE/releases/latest).
2. Download the macOS `.dmg` asset.
3. Open the DMG and drag **FORGE** into **Applications**.
4. Launch FORGE and choose **Open workspace**.

Version 1.0.0 is distributed without an Apple Developer ID because this repository does not yet have Apple signing credentials. On first launch, macOS may require Control-clicking the app and choosing **Open**, or approving it in **System Settings → Privacy & Security**. Signing and notarization are required before macOS can apply unattended automatic updates.

## Update an installed app from local source

After changing the local code, run:

```sh
npm install
npm run install:mac
```

`install:mac` builds the current architecture, finds an existing `/Applications/FORGE.app`, `/Applications/Forge.app`, or user Applications install, updates that bundle in place, and reopens it. You do not need to uninstall the previous version.

If `/Applications` is not writable by your account, move the app to `~/Applications` once and rerun the command.

## Update from GitHub Releases

The packaged app includes **Check for updates** and **Releases** controls. Signed future releases can download and apply through the app. Until Developer ID signing is configured, use **Releases** to download the newest DMG and drag FORGE over the existing application; macOS replaces the app without a separate uninstall.

Every release must use a version greater than the previous release. The update feed is produced from the ZIP asset and `latest-mac.yml`.

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

The renderer-only Vite server remains available for UI work:

```sh
npm run start-renderer
```

It is not the distributed application and cannot provide all Electron IPC features.

## Build and package

```sh
npm run typecheck
npm test
npm run build
npm run package:mac
```

Useful packaging commands:

| Command | Result |
| --- | --- |
| `npm run package:mac` | DMG and ZIP for the current Mac architecture |
| `npm run package:mac:universal` | Universal Intel + Apple Silicon DMG and ZIP |
| `npm run install:mac` | Build and refresh the installed local app in place |
| `npm run release:mac` | Publish a universal build through the configured GitHub provider |
| `npm run clean` | Remove generated build and package output |

Generated packages are written to `dist_electron/` and are intentionally excluded from Git. Release binaries belong on GitHub Releases.

## Release automation

Pushing a version tag such as `v1.0.1` runs `.github/workflows/package-mac.yml`, validates the source, creates a universal package, and publishes the release assets. A manual workflow run creates a downloadable Actions artifact without publishing a release.

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

This directory is ignored by Git. It can contain goals, tasks, conversations, and indexed memories. Back it up before deleting it.

## Documentation

- [User Manual](UserManual.md)
- [User Configuration](UserConfig.md)
- [Developer Log](Dev_log.md)
- [Current Release Notes](RELEASE_NOTES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Core Architecture](docs/Architecture/Core.md)
- [Current Project Status](docs/PROJECT_STATUS.md)

## Security notes

- Never commit API keys, GitHub tokens, Apple certificates, or `.env` files.
- Review the exact Git diff before committing or pushing from FORGE.
- Markdown preview output is sanitized; Electron sandbox settings still require hardening before opening untrusted workspaces.
- Automatic macOS updates require a consistently signed application; an unsigned release cannot provide that guarantee.
