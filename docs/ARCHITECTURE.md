# FORGE Architecture

## System intent

FORGE is a local-first development workspace whose AI lives alongside a project rather than replacing it. The project folder is the source of truth. Markdown, source code, architecture, Git, project metadata, durable memory, and workspace-owned conversations are treated as evidence in one evolving knowledge graph.

Features are accepted when they strengthen that relationship. Generic IDE parity is not an architectural goal.

## Runtime map

```text
Electron main process
├── WorkspaceService        safe project-folder operations
├── GitService              repository state and changes
├── StorageService          workspace-owned SQLite state
├── MemoryService           durable project memories
├── MemoryRetriever         lexical memory relevance
├── MemoryIndexer           project-file memory ingestion
├── ContextBuilderImpl      automatic evidence selection and framing
├── Agent                   conversation history + current prompt assembly
├── OpenAIProvider          model discovery, validation, and chat
├── SettingsService         app-global encrypted credentials and preference
└── UpdaterService          GitHub Release update lifecycle
          │
          ▼
Typed, allowlisted Electron IPC
          │
          ▼
React renderer
├── resizable Explorer
├── Monaco editor / Markdown preview
├── resizable workspace-intelligence and memory context
├── workspace-owned multi-conversation chat
└── resizable source control
```

The renderer has no direct Node.js access. `contextIsolation` is enabled and `nodeIntegration` is disabled. Runtime validation and workspace-ownership checks remain main-process responsibilities because TypeScript alone does not validate IPC messages.

## Package responsibilities

| Package | Responsibility |
| --- | --- |
| `@forge/workspace` | Open a project and perform root-confined file operations |
| `@forge/git` | Status, history, diffs, staging, commits, pull, and push |
| `@forge/storage` | Project metadata, schema migration, conversations, active thread, layout, and memory persistence |
| `@forge/memory` | Create, retrieve, delete, and index durable project memory |
| `@forge/ai` | Provider adapter, evidence budgeting, system context, prompt assembly, and future intelligence contracts |
| `@forge/ipc` | Shared renderer/main request and response contracts |
| `@forge/core` | Runtime-independent filesystem, Markdown, project, workspace, and search primitives |

## Workspace boundary and persistence

Opening a folder initializes services in this order:

```text
directory selection
  → WorkspaceService root
  → GitService repository context
  → <workspace>/.forge/metadata.sqlite
  → renderer loads that workspace's files, layout, metadata, memories, and active conversation
```

`metadata.sqlite` schema version 2 contains:

- `projects`, `goals`, and `tasks`;
- `conversation_threads`;
- `conversations`, linked to a thread;
- `memories`;
- `workspace_state`, containing active conversation and layout JSON.

Legacy unthreaded conversation rows are migrated into an **Imported conversation** without deleting content. Saved model preferences such as `gpt-4o` remain valid; the new default applies only when no saved or environment preference exists.

App-global API/GitHub credentials are deliberately not stored in the project. `SettingsService` encrypts them through Electron `safeStorage` outside the workspace. The preferred provider URL and model are also app-global, while conversations and layout are project-owned.

## Conversation lifecycle

Each workspace can contain multiple named threads. The active thread ID is stored in that workspace's `workspace_state` row.

- Switching workspace closes one SQLite database and opens another. A conversation ID is accepted only if it belongs to the active project.
- **New chat** creates and selects a blank thread. The first user prompt supplies its automatic title.
- Selecting a thread changes only active conversation state.
- **Clear chat** deletes message rows for only the selected thread.
- Memory, indexed project content, metadata, layout, Git state, and other threads are not touched by New or Clear.

The storage and IPC APIs keep conversations separate from memory by design so later embedding/search backends cannot be accidentally erased by a chat-control action.

## Prompt and context assembly

Every user turn follows this pipeline:

```text
user prompt + active conversation ID
  → validate thread belongs to active workspace
  → load bounded prior messages (last 24, character limited)
  → retrieve relevant durable memories
  → collect workspace evidence
  → priority/budget policy selects and truncates artifacts
  → FORGE philosophy system prompt + evidence + history + user prompt
  → provider request
  → persist user and assistant messages in the active thread
```

Current evidence sources are:

- architecture, README, project-status, roadmap, developer-log, release-note, goal, and memory documents;
- project goals/tasks metadata;
- current Git status and recent Git history;
- relevant or currently changed source snapshots;
- `package.json` and a bounded file inventory;
- retrieved durable memories.

The stable system frame tells the model to treat the project folder as authority, distinguish evidence from inference, and recommend architectural evolution. It explicitly rejects generic plugin/collaboration/onboarding/theme/template suggestions unless repository evidence connects them to FORGE's architecture. The context budget is provider-independent and selected through `ContextBudgetPolicy`, not through model-specific assumptions.

## Provider and model selection

`OpenAIProvider` uses a free-form model ID. `gpt-5.6-sol` is the default only when a user has not saved a preference. The Settings UI can query the provider's `/models` endpoint and validate an exact ID, but saving is not constrained to a compiled allowlist; this supports future model IDs and OpenAI-compatible endpoints.

Unsupported models produce an actionable error and do not overwrite the preference automatically. Chat Completions uses `max_completion_tokens`, with a compatibility retry using `max_tokens` for older OpenAI-compatible providers.

## Layout architecture

The renderer exposes drag handles between Explorer/editor, editor/intelligence, workspace-context/chat, and main workspace/source control. Changes are clamped in storage and debounced to the active workspace's `workspace_state.layout_json`. This contract provides slots for future context and memory panels without coupling persistence to current React components.

## Future intelligence contracts

`packages/ai/src/intelligence.ts` defines vendor-neutral boundaries without pretending the features are implemented:

- `ContextSourceProvider` and `ContextBudgetPolicy` for automatic context assembly;
- `ArchitecturalMemoryStore` for durable decisions and relationships;
- `ProjectTimelineService` for chronology across Git, docs, goals, and conversations;
- `DiffReviewService` for evidence-grounded AI change review;
- `ContextInspector` for showing why evidence was selected;
- `IntentNavigator` for moving from user intent to related workspace artifacts;
- `WorkspaceIntelligence` as a composition boundary.

These are extension points, not a plugin roadmap. Implementations should remain local-first, auditable, and project-folder grounded.

## Trust and known debt

- Renderer sandboxing is still disabled and must be hardened before untrusted plugin or autonomous execution.
- Memory indexing is lexical and can create duplicates; canonical path/content-hash upsert is pending.
- Embedding-backed hybrid retrieval and a persisted search index are not yet implemented. Clear/New semantics already reserve them as durable workspace intelligence.
- Context selection is bounded and test-covered but will need token-aware budgeting and evaluation against real repositories.
- A live model-list or completion check requires a user-supplied provider key and is not part of automated tests.
- Signed, notarized releases are required for trusted unattended macOS updates.

## Source authority

1. Source under `apps/` and `packages/`.
2. Current root and `docs/` documentation.
3. Package/build configuration and CI workflows.
4. Generated output only as validation evidence, never architecture authority.

See [Core Architecture](Architecture/Core.md) for the runtime-independent `@forge/core` layer. The desktop currently composes `@forge/workspace`, `@forge/storage`, and other service packages directly; the core contracts remain a separate reusable boundary.
