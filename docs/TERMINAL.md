# Integrated Terminal

The FORGE terminal is a real macOS pseudo-terminal backed by `node-pty` and xterm.js. The PTY process, lifecycle state, recent output, working-directory checks, and process termination live in Electron main. The renderer owns only presentation and validated interaction requests.

## Use

Open a workspace, expand the bottom panel, and choose **Terminal**. **New** creates a session at the workspace root. The header shows the exact active working directory and running/exited state. Multiple sessions may be created and selected.

- **Clear visible** clears xterm.js only; it does not erase the process or audit records.
- **Copy output** copies the selection or the bounded recent output.
- **Cancel** terminates a running PTY.
- **Restart** starts a new shell in the same validated workspace directory.
- The exit code appears when a session exits.

User-entered terminal commands are labeled **USER TERMINAL**. Model-requested commands appear separately under **Agent Actions** as `shell.run`, show the exact executable/arguments and working directory, and always require Run once approval. The agent cannot type into a user terminal session.

Normal terminal working-directory selection is relative to the active workspace. Absolute paths and `..` escapes are rejected. A future outside-workspace flow would require a distinct Tier 2 policy and approval; it is not implemented in this preview.

Terminal output is retained only in a bounded in-memory session buffer. It may be copied or explicitly used as evidence, but is not automatically written to conversation context, the action log, or durable memory. Sensitive output should be cleared and the session terminated.

Packaging unpacks `node-pty` from `app.asar` so its native module and helper can execute. Electron Builder rebuilds both architectures and merges the app executable, `pty.node`, and `spawn-helper` into universal binaries.
