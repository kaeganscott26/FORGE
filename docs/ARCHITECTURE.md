# 🏗️ FORGE Architecture

## 🧭 System intent

FORGE is a local-first development workspace that keeps project understanding attached to the project instead of to one model. The project folder is the source of truth. Source code, Markdown, architecture records, Git history, tasks, conversations, terminal evidence, and durable memory form the long-lived workspace record.

The central architectural split is now explicit:

- **FORGE workspace intelligence** collects, ranks, filters, and packages project context.
- **Replaceable agents** such as Codex, Ollama, hosted OpenAI-compatible models, or other CLIs perform reasoning and execution.
- **FORGE capabilities** expose filesystem, Git, shell, task, and web operations behind one workspace-owned boundary.

The model is a worker. The workspace is the durable system.

## ⚡ Runtime map

```text
Project folder
├── source + documentation
├── Git repository
├── terminal/process evidence
└── .forge/metadata.sqlite
    ├── tasks + checkpoints
    ├── conversations
    ├── durable memory
    └── action history
             │
             ▼
FORGE workspace intelligence
├── evidence collection
├── relevance selection
├── context budgeting
├── project chronology
└── stale-context filtering
             │
             ▼
Agent adapter boundary
├── built-in hosted-provider client
├── Codex / CLI adapters
├── Ollama / local-model adapters
└── future provider runtimes
             │
             ▼
FORGE capability runtime
├── filesystem
├── Git
├── shell / terminal
├── persistent tasks
└── web research
             │
             ▼
verified results feed back into workspace state
```

Electron main process owns privileged project operations. The renderer remains a constrained interface with no direct Node.js access.

## 📦 Runtime identity across platforms

FORGE's UI and workspace runtime are shared source, while packaged executables remain native to macOS, Linux, and Windows. Runtime parity therefore means the embedded source commit and behavior/UI match; it never means that a universal macOS Mach-O executable must hash-identically to Linux or Windows binaries. Each package records and verifies its own executable and `app.asar` hashes. FORGE-OS additionally records the FORGE source commit and payload hashes in its content-addressed runtime record; macOS carries the same commit in `forge-runtime.json` beside the canonical `/Applications/FORGE.app` bundle and exposes it through `/usr/local/bin/forge-session --runtime-info`.

## 🧩 Package responsibilities

| Package | Responsibility |
| --- | --- |
| `@forge/workspace` | Open a project and perform root-confined file operations |
| `@forge/git` | Repository status, history, diffs, staging, commits, pull, and push |
| `@forge/storage` | Workspace-owned SQLite state, conversations, layout, memory persistence, and audit records |
| `@forge/tasks` | Persistent task state, dependencies, checkpoints, background processes, and handoffs |
| `@forge/memory` | Durable project memory and retrieval |
| `@forge/intelligence` | Provider-neutral contracts for compiled workspace context and replaceable agent adapters |
| `@forge/ai` | Current provider/client compatibility layer; no longer the intended owner of workspace intelligence |
| `@forge/ipc` | Shared renderer/main request and response contracts |
| `@forge/agent-tools` | Tool definitions, normalization, execution adapters, audit redaction, and structured results |
| `@forge/tool-policy` | Existing approval/policy implementation pending simplification into user-controlled capability permissions |
| `@forge/shell` | Process execution, cancellation, environment filtering, and PTY sessions |
| `@forge/web` | External HTTP research controls |
| `@forge/updater` | Release discovery and update lifecycle |

## 🧠 Intelligence boundary

`@forge/intelligence` defines the stable boundary between project understanding and model execution.

Its job is to represent workspace artifacts and compile context that can be consumed by any agent runtime. That includes architecture, documentation, source snapshots, Git evidence, task metadata, memory, conversations, and terminal observations.

The intelligence layer should answer questions such as:

- What project evidence matters for this task?
- Which prior decisions are still authoritative?
- Which context is stale or contradicted by current Git/filesystem state?
- What happened previously that the next agent should not repeat?
- What is the smallest useful context package for this model?

It should not own the coding-agent loop itself.

## 🤖 Agent boundary

An agent adapter consumes FORGE context and translates it into the format expected by a specific runtime.

The adapter may target:

- a hosted provider API;
- Codex or another coding CLI;
- Ollama or another local model runtime;
- a future provider that supports function/tool calling differently.

The agent owns reasoning and task execution. FORGE owns the project evidence and capabilities it receives.

This makes local-vs-hosted a model-quality decision rather than a workspace-capability decision. A local model may be weaker, but it should not receive a weaker filesystem/Git/task interface merely because it is local.

## 🛠️ Tool architecture direction

The current tool runtime includes useful protections but mixes authorization with orchestration. The intended direction is to separate them.

### Authorization

The user controls capability authority through a simple model such as:

- Allow once
- Allow for this session
- Always allow
- Deny

Risk-tier classification is not the intended long-term control plane. Tool authority should be explicit user preference attached to capabilities/workspaces, not an internal severity taxonomy that prevents legitimate agent workflows.

### Orchestration

Agent execution should not be limited by arbitrary tool-count or continuation-round ceilings. Independent operations may execute in parallel; dependent mutations remain ordered by their data dependencies.

Runaway protection should detect lack of progress or repeated identical calls rather than assuming that tool call number six is unsafe.

The design principle is:

> **Bound resources, not agency.**

File-size limits, context budgets, terminal-output limits, timeouts, cancellation, path containment, and audit history remain valid resource/safety boundaries.

## 🗂️ Workspace boundary and persistence

Opening a folder initializes the project in place. FORGE does not import or relocate source.

```text
directory selection
  → WorkspaceService root
  → GitService repository context
  → <workspace>/.forge/metadata.sqlite
  → renderer and intelligence services load project-owned state
```

Workspace-owned state includes goals, tasks, checkpoints, conversations, memories, layout, action history, and Browser bookmarks/history. App-global credentials remain outside the repository.

## 💬 Conversation lifecycle

Conversation threads are project records, not the definition of project memory. Starting or clearing a chat does not erase durable memory, task state, Git state, architecture, or indexed project evidence.

The built-in conversation path remains useful as one client of the intelligence layer. It is not intended to be the only or privileged agent runtime.

## ✅ Persistent tasks

Persistent tasks survive provider changes and conversation resets. Verified checkpoints and tool evidence belong to the workspace, allowing another model—or a human engineer—to resume from observed project state rather than from a previous model's unverified claim.

## 🧠 Context compilation

Context assembly remains provider-neutral. FORGE gathers relevant workspace evidence, applies priority/resource budgets, and produces a context envelope for the active agent.

Current evidence includes:

- architecture and project documentation;
- project goals/tasks metadata;
- current Git status and recent commits;
- relevant or changed source files;
- `package.json` and workspace inventory;
- durable project memories.

Terminal/process evidence is part of the architectural model and should increasingly participate in context compilation as session observation matures.

## 🔌 Provider and local-model direction

Provider-specific model transport belongs behind adapters. FORGE's tool names, project context, permissions, and workspace memory should remain stable.

A future Ollama adapter, for example, should be able to prepare the same FORGE context/tool contract for a local model that the hosted-provider path consumes. The local model's reasoning quality may differ; its project environment should not.

Likewise, a Codex session launched inside the FORGE terminal should be able to inherit workspace context and feed execution evidence back into FORGE without making Codex itself the owner of long-term memory.

## 🛡️ Trust boundary

FORGE separates authority from agency:

- the workspace owns project state and long-term evidence;
- the human decides which capabilities an agent may exercise;
- the selected agent decides how to complete the requested task within that authority;
- FORGE validates project boundaries, records outcomes, and preserves evidence for future sessions.

Renderer sandboxing, workspace path confinement, validation, cancellation, bounded external data transfer, backups, and audit records remain core protections.

## 🔭 Migration state

The existing `@forge/ai` provider/Agent path is still present for compatibility with the current beta UI. The new `@forge/intelligence` package establishes the explicit provider-neutral boundary without pretending the migration is complete.

Next implementation work should move context compilation behind this boundary, add concrete agent adapters, simplify capability permissions, and replace the current bounded sequential agent loop with dependency-aware parallel orchestration.

## 📌 Source authority

1. Source under `apps/` and `packages/`.
2. Current root and `docs/` documentation.
3. Package/build configuration and CI workflows.
4. Generated output only as validation evidence, never architecture authority.
# FORGE Runtime Architecture

FORGE is organized around project-owned intelligence, not a chat transcript:

workspace + Git + tasks + memory + terminal + audit
→ FORGE Intelligence
→ provider-neutral workspace context and provenance
→ native chat, CLI agents, and future adapters
→ typed tools, observations, runtime events, and SQLite updates.

The intelligence package assembles provider-neutral workspace evidence independently of a completion. It selects fresh architecture, documentation, source, Git, metadata, and durable-memory artifacts under a bounded context policy. Conversations consume workspace evidence; they never own it.

The native-agent-runtime module is the native-chat execution adapter. It runs inspect, tool, observe, and continue cycles against shared intelligence and tool services. It has no small fixed round or call limit. A progress-aware guard suppresses only an identical normalized call against an unchanged workspace revision; elapsed runtime remains bounded by FORGE_AGENT_MAX_RUNTIME_MS.

The main process publishes typed runtime events after durable workspace, file, Git, task, memory, tool, terminal, and agent operations. Renderer panels consume these events for task and tool activity rather than relying solely on polling.

The embedded Browser surface is a separate sandboxed WebContentsView. It accepts public HTTP(S) pages only, uses the same URL/DNS safety validation as web research, blocks unexpected windows, and never receives Node integration.
