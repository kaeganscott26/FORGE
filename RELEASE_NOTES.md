# FORGE 1.1.0-beta.1

FORGE 1.1.0-beta.1 makes long-running work belong to the workspace rather than an AI conversation. It also repairs editor creation/shortcuts, terminal CLI execution, workspace discovery recovery, GPT-5.6 tool routing, and keyless local-model tools. This release is a beta and will initially be published as a GitHub Pre-release.

## Editor workflow repairs

- Opens every newly created blank file immediately in Monaco instead of leaving the editor closed.
- Uses the packaged local Monaco runtime rather than depending on an external loader.
- Replaces raw duplicate-path errors with an offer to open the existing file or choose another name.
- Saves new-file edits through the normal workspace write path.
- Adds Command/Ctrl+S save, Command/Ctrl+O workspace open, Command/Ctrl+Z undo, and platform redo shortcuts without stealing undo from focused form fields.

## Workspace-owned persistent tasks

- Adds strongly typed tasks, steps, dependencies, checkpoints, artifacts, external references, approvals, and events to each workspace's SQLite database.
- Adds a dedicated **TASKS** view with structured progress, current/next step, blockers, evidence, active process information, audit history, retry, pause, cancel, resume, and handoff actions.
- Reconciles persisted state with current Git, known process IDs, and supplied external observations before resume.
- Preserves completed verified work and resumes at the first genuinely unfinished dependency-ready step.
- Keeps task lifetime independent from provider, model, conversation, renderer, application process, and network connection.
- Generates Markdown handoffs under `.forge/handoffs/`; SQLite remains authoritative.
- Includes a reusable, approval-aware FORGE release task template.

Persistent state never grants permanent approval. Tier 1 and Tier 2 execution remains governed by the existing tool router, policy engine, approval manager, and audit log.

## Agent and workspace recovery repairs

- Begins discovery at the workspace root instead of assuming a root-level `src` directory.
- Returns structured missing-path results with root-level recovery suggestions so an agent can continue searching after `ENOENT`.
- Routes GPT-5.6 tool-capable turns through OpenAI's Responses API while retaining provider-neutral internal messages and policy-controlled tool execution.
- Keeps direct non-tool provider requests supported.

## Terminal repairs

- Binds PTY sessions to the active workspace and rejects input for another workspace.
- Preserves the active xterm input callback instead of allowing renderer lifecycle changes to drop keyboard events.
- Rejects input after exit and creates a new writable PTY on Restart.
- Reconciles canonical macOS `/tmp` and `/private/tmp` workspace paths during restart.
- Supplies a bounded non-secret login environment with user identity and common Homebrew/user-local CLI paths.
- Documents scoped Gatekeeper handling for separately installed signed CLIs instead of disabling macOS security.

## Local-model tools

- Allows keyless loopback OpenAI-compatible providers such as Ollama while continuing to require keys for remote hosts.
- Lists and validates local models, sends a focused policy-controlled file-tool catalog, and accepts compatible Chat Completions tool calls.
- Retries older compatible endpoints with `max_tokens` when they reject `max_completion_tokens`.

## Beta release and packaging policy

- Sets the authoritative identity to `1.1.0-beta.1`, tag `v1.1.0-beta.1`, and logical Beta channel.
- Migrates stored Preview preferences to Beta. Beta accepts only strictly newer `beta`, `rc`, or stable semantic versions; Stable accepts only strictly newer stable versions.
- Cleans `dist_electron` before standalone packaging and produces a hash-bearing `build-manifest.json`.
- Selects installation and upload artifacts from the manifest instead of wildcard-first-match logic.
- Uploads the universal DMG, ZIP, both blockmaps, and `beta-mac.yml` serially, with updater metadata last.

## Release status and limitations

Source implementation and pre-beta regression validation are complete. Exact merged-commit packaging, local installed acceptance, tag/workflow provenance, public asset hash comparison, and public-artifact reinstallation are required before the beta is declared verified. Historical releases and tags must not be removed until those gates pass.

No Apple Developer ID or notarization credentials are currently configured. Unless the release workflow proves otherwise, the beta is ad-hoc signed/unsigned and cannot provide a trusted unattended macOS replacement chain.
