# 🛡️ FORGE Agent Architecture

## 🧠 Intelligence and agent-runtime boundary

FORGE Intelligence is provider-neutral, persistent, and workspace-owned. It compiles bounded context packets from source, documentation, Git, tasks, memory, terminal observations, and audit evidence without requiring a chat completion. Native chat is one optional Agent Runtime consumer; it does not own project state or define workspace intelligence.

Agent execution follows inspect, plan, act, observe, and verify. It may perform long, meaningful sequences when workspace state changes. Exact normalized requests against an unchanged observed workspace state are redundant and may be suppressed; a small fixed number of calls or continuation rounds is not a valid stopping condition.

Runtime events are durable-operation notifications, not hidden reasoning. They may report workspace, file, Git, task, memory, tool, terminal, and agent lifecycle changes to the renderer. They must include workspace identity and must not contain secrets or provider chain-of-thought.

## 🧭 Purpose and authority

The AI is not the owner of the workspace and is not the primary application interface.

The AI is one subsystem inside the FORGE operating environment. Its role is to reason over bounded project context, explain the workspace, propose changes, and request explicitly granted tools.

The project folder remains the source of truth. Files, Git history, documentation, conversations, goals, tasks, and durable memory belong to the workspace, not to the model.

The model may change. The workspace intelligence layer must remain stable.

FORGE gives an agent only the active conversation, a bounded selection of workspace documentation and source, Git evidence, project metadata, persistent-task summaries, retrieved durable memory, and explicit tool results. Conversation messages, persistent tasks, and durable memory are stored in the active workspace's `.forge/metadata.sqlite`; starting, clearing, switching, or deleting a conversation never silently deletes files, Git state, indexed knowledge, persistent tasks, or durable memory. Provider adapters translate between provider-native formats and FORGE's internal messages and tool calls. Changing a provider does not change policy enforcement or workspace ownership.

## ✅ Persistent task authority

A task belongs to the workspace, not to the current agent.

Before resuming a task, reconcile its persisted state with the current workspace, Git repository, known local processes, and relevant configured external services. Locate the last verified checkpoint and continue from the first genuinely unfinished dependency-ready step.

Do not repeat completed or externally verified work. Do not mark a task step complete based only on another model's claim. Use observed evidence and persistent checkpoints. Task checkpoints are distinct from chat memory, and deleting a conversation must not delete its tasks.

A persisted task never grants permanent execution permission. Each executable step returns through the existing tool registry, policy, approval, executor, and audit log. Background operations may survive agent turnover only where technically safe; a missing process without verified completion evidence is blocked, not silently restarted or marked complete.

## 🛠️ Tool use

The AI may request tools, but it does not execute them directly.

Every tool call passes through the FORGE tool router, policy engine, approval system, executor, and audit log. A provider-native tool call or validated structured-response fallback is only a request. Unknown names, malformed arguments, and malformed provider output are rejected before authorization. The model cannot construct IPC channels or receive raw Node.js, filesystem, Git, shell, credential, or network APIs.

The execution rule is permanent:

> The model requests an action. FORGE validates, authorizes, executes, logs, and returns the result.

The model must never claim an action succeeded until FORGE returns a successful result. It must report failures, timeouts, cancellation, truncation, warnings, affected paths, exit codes, and rollback information accurately.

## 🔐 Approval contract

- Tier 0 read-only workspace and Git inspection may run automatically when tools are enabled.
- Tier 1 reversible changes require Run once approval unless an exact workspace/tool/scope session permission is active. Session permissions expire within one hour and are cleared when the workspace changes.
- Tier 2 destructive, executable, remote, credential, or irreversible actions always require a new explicit approval. There is no global allow-everything permission.

The agent must never silently create, modify, move, rename, overwrite, delete, stage, unstage, commit, pull, push, run a command, install software, contact an external service, alter credentials, or publish a release. It must provide a truthful reason and expected effect. FORGE shows the exact command, target, working directory, branch or files, network use, external-data disclosure, and generated diff when applicable.

## 🗂️ Files, shell, Git, and web boundaries

Workspace paths are relative to the active workspace. FORGE rejects absolute paths through normal tools, traversal, and symlink escapes. File writes are atomic, prefer targeted patches, refuse paths with unsaved editor content, and create rollback data when replacing or deleting existing content.

Agent shell requests use an executable plus argument array, a workspace-contained working directory, a small environment allowlist, output and time limits, cancellation, and process-tree termination. User-entered integrated-terminal input is visually separate from agent-requested `shell.run` actions. Terminal output is not automatically indexed as memory.

Git tools use the existing Git service. Tokens are never embedded in URLs or output. Commits operate on the exact staged set; pull warns or stops on a dirty tree; force push is not implemented.

Web tools are disabled until configured. They display the exact query or URL, block file and local-network URLs, validate redirects and DNS destinations, bound responses, preserve source URLs, and never upload workspace files automatically. Sending private source, documentation, diffs, or terminal output outside the configured AI context requires explicit disclosure and approval.

## 🧾 Secrets, logging, and reporting

API keys and GitHub tokens remain encrypted with Electron `safeStorage` and macOS Keychain. The agent must not request credential values unless the operation explicitly requires them, must not echo secrets, and must not place them in files, Git URLs, shell output, web requests, conversations, or logs.

Every tool decision is recorded per workspace with timestamp, conversation, model, tool, sanitized input, risk tier, approval decision, duration, outcome, affected paths, exit code, and rollback metadata where applicable. API keys, tokens, authorization headers, credential values, and decrypted Keychain data are redacted and must never be logged.

Tool-derived evidence is bounded before it re-enters model context and is labeled separately from Workspace Documentation, Source Code, Git, Durable Memory, Terminal, External Web, and Model Inference. The agent must distinguish verified evidence from inference and identify what remains unverified.

## 📦 Release and updater authority

The model does not select, download, install, tag, or publish application updates. Stable and Beta are logical user choices enforced by FORGE. Stable accepts only strictly newer normal semantic versions. Beta accepts only strictly newer `beta`, `rc`, or normal semantic versions; legacy stored Preview preferences migrate to Beta. Drafts, malformed versions, unsupported prerelease identifiers, equal versions, and downgrades are rejected before Electron Updater receives a feed.

FORGE discovers published GitHub Releases through a bounded, validated request and maps the selected artifact to provider-specific update metadata internally. Provider channel identifiers are not user authority and must never be exposed as a compatibility requirement. Publishing a duplicate tag or compatibility release is not an acceptable way to bypass updater policy. Release publication, asset replacement, and installation remain explicit human-authorized operations with independently verified tag provenance and artifact hashes.
