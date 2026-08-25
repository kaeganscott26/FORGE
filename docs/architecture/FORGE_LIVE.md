# FORGE Live

FORGE Live is the native local preview service for web workspaces. It serves a workspace on loopback, injects an in-memory reload client into HTML responses, and opens the assigned URL in FORGE's existing sandboxed BrowserView.

## Usage

Open a workspace containing `index.html`, select **Go Live**, and select **Open Preview**. The preferred address is `http://127.0.0.1:5500`; if occupied, FORGE selects the first available port through 5599. **Stop** ends the server and watcher. Source files are never rewritten.

The initial release's guaranteed mode is plain HTML/CSS/JavaScript and static assets. `detectProject` recognizes an explicit `dev`/`start` script and package-manager lockfiles for the follow-up project-dev-server integration; it does not silently execute package scripts.

## Architecture and security

`@forge/forge-live` owns the server, port allocator, request containment, watcher debounce, SSE reload channel, and lifecycle state. The Electron main process owns one service for the active workspace and exposes only typed `forge-live.*` IPC channels through the existing preload allowlist. The renderer cannot provide commands or arbitrary paths.

Servers bind to `127.0.0.1` only. Requests are URL-decoded, normalized, and checked against the canonical workspace root; ignored/generated directories are not served. Directory requests use `index.html`, and missing root entry files return an explanatory page. Browser localhost access uses exact parsed hostname matching for `localhost`, `127.0.0.1`, and `::1`; deceptive suffix hosts remain blocked. External research URL validation is unchanged.

The existing Electron `contextIsolation`, `sandbox`, `nodeIntegration: false`, and `webSecurity: true` settings remain enabled. FORGE-OS uses the same dynamic BrowserView URL path and does not require unsafe Chromium flags.

## Lifecycle

The main process stops FORGE Live before replacing a workspace, closing the last window, or quitting. Duplicate starts return the existing running state. Port allocation probes listeners and never terminates an unrelated process. Runtime PIDs are not persisted because static FORGE Live has no child process.
