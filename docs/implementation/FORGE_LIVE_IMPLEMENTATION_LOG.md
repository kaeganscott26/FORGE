# FORGE Live implementation log

## Discovery — 2026-08-24

- Electron main entrypoint: `apps/desktop/src/main/index.ts`; preload bridge: `apps/desktop/src/preload/index.ts`.
- Renderer: React in `apps/desktop/src/renderer/src`, with the workspace toolbar in `App.tsx` and the native `BrowserView` surface controlled by `BrowserPanel.tsx`.
- IPC: `packages/ipc/src/index.ts` defines the channel/request/response contract; preload exposes only the allowlisted `ForgeAPI`.
- Workspace/filesystem: `packages/workspace/src/index.ts` owns workspace roots, canonicalization, symlink containment, and an existing cross-platform watcher.
- Process/runtime: `packages/shell/src/index.ts` owns argument-array spawning, filtered environment construction, and platform-aware process-tree termination. FORGE Live's P0 static mode does not need a child process; future project-dev-server mode must reuse this boundary.
- Browser/security: `packages/web/src/index.ts` validates external URLs and intentionally rejects loopback/private addresses. The main-process browser navigation policy also rejects local addresses. FORGE Live therefore requires a separate exact loopback allow policy, while external web research remains unchanged.
- Electron security: `contextIsolation`, `sandbox`, `nodeIntegration: false`, and `webSecurity: true` are enabled for both the renderer and native browser views. CSP is in `apps/desktop/src/renderer/index.html`.
- Packaging: root `package.json` uses npm workspaces and electron-builder targets Windows NSIS, macOS DMG/ZIP, and Linux AppImage/DEB. A workspace package with no runtime dependency is bundled by the existing `node_modules/**/*` rule.
- FORGE-OS: no second FORGE-OS Git checkout was present under the workspace/home search scope. The repository's canonical integration is `packages/os-integration` plus `ForgeOsShell`; FORGE Live will use the same native BrowserView and dynamic URL path, with no Chromium flags or hardcoded port.
- Existing status/footer: the compact app header and bottom panel are the established action surfaces; no separate status-bar component exists.
- Existing tests: Vitest tests cover IPC, workspace containment, shell behavior, browser/UI routing, and runtime contracts. New deterministic Forge Live tests will live beside the new package.

## Design

`@forge/forge-live` owns one loopback static server per canonical workspace root. It allocates ports 5500–5599 without killing existing listeners, serves only contained regular files, injects an in-memory SSE reload client into HTML, and debounces watcher events. The desktop main process owns its lifecycle and forwards state through typed IPC. `Open Preview` calls the existing native browser navigation with an exact `localhost`, `127.0.0.1`, or `::1` policy. No external web policy, Electron security setting, source file, or runtime database is weakened or mutated.
