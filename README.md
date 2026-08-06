# FORGE

**FORGE** is a local-first AI-native development workspace. It treats files, notes, source code, Git history, project metadata, conversations, and durable memory as parts of one project system rather than as context pasted into a chatbot.

## Current Repository State

FORGE is an early functional desktop prototype. The current application includes:

- Electron desktop runtime
- React renderer
- Monaco editor
- Markdown preview
- Workspace explorer
- Git status, staging, commits, pull, push, and diff display
- SQLite-backed project metadata
- Persistent conversations
- Persistent project memories
- Workspace reindexing
- OpenAI provider wiring
- Project-aware agent context
- Memory and chat panels
- macOS packaging work in active development

The repository is no longer only an architecture sketch. The core desktop workspace and first AI-memory loop are implemented, but the project is not production-ready yet.

---

## START HERE

Recommended first path:

1. [Read the User Guide](docs/USER_GUIDE.md)
2. [Read the Current Status](docs/PROJECT_STATUS.md)
3. [Open the Architecture Map](docs/ARCHITECTURE.md)
4. [Review the Repository Map](#repository-map)
5. [Run FORGE locally](#development)

---

## Product Principle

FORGE is not designed as a chatbot with an editor attached.

The AI belongs inside the application’s operating model. New features should assume that project files, documentation, conversations, source code, architecture decisions, goals, tasks, and Git history can become durable project context.

The workspace remains the primary interface. AI should help the engineer understand and operate the workspace without replacing it.

---

## Repository Map

| Path | Role |
| --- | --- |
| `apps/desktop/` | Electron main process, preload bridge, React renderer, and desktop configuration |
| `packages/ai/` | Provider abstraction, context builder, and Agent API |
| `packages/git/` | Git status, branches, log, diff, staging, commit, pull, and push services |
| `packages/ipc/` | Typed IPC channels and request/response contracts |
| `packages/markdown/` | Markdown parsing support |
| `packages/memory/` | Persistent memory service, retrieval, and workspace indexing |
| `packages/meta/` | Project metadata abstractions |
| `packages/search/` | Search-layer foundation |
| `packages/storage/` | SQLite persistence for projects, goals, tasks, conversations, and memories |
| `packages/workspace/` | Workspace opening, file operations, parsing, and file-tree access |
| `docs/` | Current user, architecture, and status documentation |
| `.github/workflows/` | CI and packaging workflows |
| `.obsidian/` | Optional local documentation-vault presentation settings |

Generated output, dependencies, workspace databases, and machine-local state are not repository authority.

---

## Current Runtime Flow

```text
RENDERER
  ↓
PRELOAD BRIDGE
  ↓
TYPED IPC
  ↓
WORKSPACE / GIT / STORAGE
  ↓
MEMORY RETRIEVAL
  ↓
CONTEXT BUILDER
  ↓
AGENT
  ↓
MODEL PROVIDER
```

The renderer does not directly access Node.js APIs. Privileged operations are routed through Electron’s main process using the allowlisted IPC bridge.

---

## Development

### Requirements

- Node.js 22 LTS recommended
- npm
- Git
- macOS, Windows, or Linux for development

### Install

```sh
npm install
```

### Run the desktop app

```sh
npm run dev
```

### Run only the renderer

```sh
npm run start-renderer
```

The renderer-only command is useful for layout work, but Electron-only IPC features require the desktop runtime or a browser fallback.

### Validate

```sh
npm run typecheck
npm test
npm run build
```

### Clean generated output

```sh
npm run clean
```

---

## Electron Installation Note

Electron’s package metadata and its native application bundle are separate. If the package exists but the native binary is missing, verify:

```sh
npm ls electron
ls node_modules/electron/dist
```

A valid macOS ARM64 installation should contain:

```text
node_modules/electron/dist/Electron.app
```

Do not commit `node_modules/`, extracted Electron binaries, `path.txt`, or other machine-specific repairs.

---

## AI Configuration

The current OpenAI provider reads:

```sh
OPENAI_API_KEY
```

ChatGPT subscriptions and OpenAI API access are separate products. Running FORGE’s current provider requires an API key available to the Electron process.

The provider layer is intended to support additional local and hosted providers later.

---

## Data and Privacy

FORGE stores workspace metadata in:

```text
<workspace>/.forge/metadata.sqlite
```

That database can contain:

- project metadata
- goals
- tasks
- conversations
- indexed memories

The `.forge/` directory is local workspace state and should remain excluded from Git unless a future export format is explicitly designed for sharing.

---

## Current Limitations

- Relevant memories are retrieved, but the Agent prompt path still needs stronger verified use of memory content.
- Workspace reindexing needs idempotent update behavior to prevent duplicate memories.
- Existing databases need a formal migration path.
- Deep relevant-file retrieval is not complete.
- Local-model providers are not implemented in the pushed code.
- Packaging, signing, notarization, and auto-update remain active work.
- Markdown preview sanitization and production sandbox hardening still need review.

See [Current Status](docs/PROJECT_STATUS.md) for the detailed milestone report.

---

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [Project Status](docs/PROJECT_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)

---

## Repository Rule

Prefer current source and current documentation over generated output or historical reports.

When removing files, verify that they are not referenced by build scripts, package manifests, CI workflows, documentation links, or runtime imports before deletion.
