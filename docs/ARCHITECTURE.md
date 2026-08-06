# FORGE Architecture

## System Intent

FORGE is a development workspace whose AI layer operates on durable project context. The application should be designed around project files, documentation, Git history, metadata, conversations, and memory—not around a standalone chat transcript.

---

## Runtime Map

```text
ELECTRON DESKTOP APP
  |
  |-- Main Process
  |     |-- WorkspaceService
  |     |-- GitService
  |     |-- StorageService
  |     |-- MemoryService
  |     |-- MemoryRetriever
  |     |-- MemoryIndexer
  |     |-- ContextBuilder
  |     |-- Agent
  |     `-- AI Provider
  |
  |-- Preload Bridge
  |     `-- allowlisted typed IPC
  |
  `-- React Renderer
        |-- Explorer
        |-- Monaco Editor
        |-- Markdown Preview
        |-- Project Dashboard
        |-- Source Control
        |-- Memory Panel
        `-- Chat Panel
```

---

## Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `@forge/workspace` | Open and inspect workspaces; perform safe file operations |
| `@forge/git` | Git status, branches, logs, diffs, staging, commits, pull, and push |
| `@forge/storage` | Persist project metadata, goals, tasks, conversations, and memories |
| `@forge/memory` | Create, list, retrieve, delete, and index project memory |
| `@forge/ai` | Provider interface, context assembly, and Agent behavior |
| `@forge/ipc` | Shared renderer/main contracts and channel definitions |
| `@forge/core` | Runtime-independent filesystem, Markdown, workspace, project, and keyword-search services |
| `@forge/search` | Search package boundary for future hybrid retrieval |
| `@forge/plugin-sdk` | Plugin contracts; a runtime host is not implemented |

---

## Data Flow

### Opening a workspace

```text
USER SELECTS DIRECTORY
  ↓
workspace.open
  ↓
WorkspaceService initializes root
  ↓
GitService initializes repository context
  ↓
StorageService opens or creates .forge/metadata.sqlite
  ↓
Renderer refreshes files, Git state, and dashboard
```

### Asking the Agent

```text
USER PROMPT
  ↓
agent.ask IPC
  ↓
MemoryRetriever searches stored memories
  ↓
ContextBuilder reads project context
  ↓
Agent assembles model messages
  ↓
Provider sends request
  ↓
Response returns to renderer
  ↓
Conversation is persisted
```

---

## Trust Boundaries

The renderer is not trusted with direct Node.js access.

Current BrowserWindow protections include:

- `contextIsolation: true`
- `nodeIntegration: false`

The preload bridge should expose only named, validated IPC actions. Request validation belongs in the main process even when TypeScript types exist, because runtime messages are not automatically type-safe.

Markdown preview output is sanitized in the renderer. The production security review should still revisit the current disabled Electron sandbox.

---

## Persistence Model

Workspace-specific state is stored at:

```text
<workspace>/.forge/metadata.sqlite
```

Current tables represent:

- projects
- goals
- tasks
- conversations
- memories

The persistence layer needs explicit schema migrations before the format can be considered stable.

---

## Memory Model

Current memory retrieval uses lightweight lexical scoring with:

- token frequency,
- inverse document frequency,
- title boosts,
- metadata-tag boosts,
- recency weighting.

This is a useful prototype, but not the final retrieval architecture.

Target direction:

```text
FILE WATCHER / CONVERSATIONS / DECISIONS
  ↓
NORMALIZATION
  ↓
CHUNKING + METADATA
  ↓
KEYWORD INDEX + EMBEDDINGS
  ↓
HYBRID RETRIEVAL
  ↓
RERANKING
  ↓
CONTEXT BUDGETING
  ↓
AGENT PROMPT
```

Reindexing should become idempotent through canonical file paths and content hashes.

---

## Provider Model

The current concrete provider is OpenAI. Provider interfaces should remain narrow enough to support:

- OpenAI
- Ollama
- LM Studio
- Anthropic
- other OpenAI-compatible endpoints

Provider selection, credentials, model names, request limits, and availability should eventually be project- or user-configurable rather than hard-coded.

---

## Source of Truth

Current authority order:

1. source under `apps/` and `packages/`,
2. current documentation under `docs/`,
3. root package and build configuration,
4. CI workflows,
5. generated build output only as evidence—not authority.

Generated build output and local workspace databases are evidence or user state, not application architecture.

---

## Next Architectural Milestones

1. Formal database migrations.
2. Idempotent memory indexing.
3. Verified memory-content injection into model prompts.
4. Relevant source-file retrieval and context budgeting.
5. Provider configuration UI and local-provider support.
6. Agent tools with explicit permissions and verification loops.
7. Production Electron sandboxing and Markdown sanitization.
8. Developer ID signing, notarization, and end-to-end signed update validation.
