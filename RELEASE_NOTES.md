# FORGE 1.1.0-alpha.1

This preview makes the AI an authorized tool-using subsystem inside FORGE. A model tool call is now only a request: FORGE validates, authorizes, executes, audits, bounds, and returns the result.

## Agent tools and approval

- Adds provider-neutral tool calls with native structured-provider support and a strict validated fallback.
- Adds allowlisted filesystem, Git, shell, and external-web tools with stable schemas and fail-closed unknown/malformed rejection.
- Implements permanent Tier 0/1/2 risk policy, one-time decisions, narrowly scoped expiring Tier 1 session permissions, and no allow-everything mode.
- Adds Agent Actions UI for exact scope, command/path, working directory, network disclosure, expected effect, file diff, approval, rejection, cancellation, copy, results, and history.
- Adds a schema-v3 per-workspace SQLite action log with conversation/model/tool/risk/outcome/duration/path/exit/rollback metadata and secret redaction.
- Returns bounded, redacted tool results to the agent and labels Tool Result, External Web, Terminal, workspace evidence, and inference separately.

## Filesystem, Git, shell, and web security

- Enforces relative workspace paths, traversal rejection, realpath/symlink containment, atomic text writes, UTF-8 BOM preservation, generated diffs, rollback backups, and unsaved-editor protection.
- Reuses the existing protected Git service; read operations are Tier 0, stage/unstage Tier 1, and commit/pull/push Tier 2. Pull stops on a dirty tree and force push is absent.
- Runs agent commands as executable + argument array with workspace cwd, filtered environment, timeout/output caps, cancellation, and process-tree termination. Every shell execution is Tier 2.
- Keeps external web research disabled by default and blocks credential/file/local/private-network URLs, unsafe redirects/DNS results, unsupported content, oversized responses, and ambient workspace upload.

## Integrated terminal

- Adds a real main-process `node-pty` terminal rendered by xterm.js.
- Supports multiple sessions, workspace cwd display, resize, input/output streaming, terminate, restart, clear visible, copy output, running/exited state, and exit codes.
- Visually separates user terminal input from agent `shell.run` requests and never automatically indexes terminal output.
- Packages rebuilt universal `pty.node` and `spawn-helper` outside `app.asar`.

## Release channels and diagnostics

- Version: `1.1.0-alpha.1`.
- Development diagnostics: `1.1.0-alpha.1-dev / development`.
- Preview package diagnostics: `1.1.0-alpha.1 / preview`.
- Stable remains the default updater channel; prereleases require explicit Preview opt-in.
- Diagnostics include exact commit, build date, runtime, renderer source, platform, and architecture.
- Adds `release:preview` and `release:stable`; prerelease tags publish GitHub Pre-releases instead of Latest.

## Verification and limitations

Typecheck, lint, 54 tests, production build, arm64 packaging, universal packaging, architecture inspection, and packaged runtime PTY/preload/workspace/file-URL probes pass on the feature branch. Packaged provider-native Tier 0 execution, Tier 1 diff/approval, Tier 2 rejection, audit retention, and three-workspace isolation also pass. Final merged-main rebuild, GitHub workflow, tag, Pre-release assets, local install, and installed-app diagnostics remain release gates.

This preview is unsigned and not notarized. It cannot claim a trusted unattended installation or automatic-update chain. Do not treat the alpha as stable v1.1.0.
