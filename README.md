# Forge

Forge is a local-first AI-native development workspace. Phase 1 is a runnable Electron desktop app with a project explorer, Monaco editor, Markdown preview, Git panel, and SQLite-backed goals/tasks.

## Requirements

Node.js 20 or newer and Git must be installed.

## Run

```sh
npm install
npm run dev
```

If you encounter missing native Electron binaries during `npm install` in CI or restricted environments, run the following locally to force-install the correct Electron build for your platform:

```sh
# Install deps
npm ci
# Force electron for macOS (adjust version as needed)
npm install --save-dev electron@34.5.8 --allow-scripts
# Then start dev
npm run dev
```

## Validate

```sh
npm run typecheck
npm test
npm run build
```

All privileged operations run in Electron's main process. The renderer only uses the typed, allowlisted `window.forge` bridge.

