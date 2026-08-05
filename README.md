# Forge

Forge is a local-first AI-native development workspace. Phase 1 is a runnable Electron desktop app with a project explorer, Monaco editor, Markdown preview, Git panel, and SQLite-backed goals/tasks.

## Requirements

Node.js 20 or newer and Git must be installed.

## Run

```sh
npm install
npm run dev
```

## Validate

```sh
npm run typecheck
npm test
npm run build
```

All privileged operations run in Electron's main process. The renderer only uses the typed, allowlisted `window.forge` bridge.

