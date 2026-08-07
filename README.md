# ⚒️ FORGE

> A local-first workspace runtime for AI-assisted programming.

FORGE is not another AI IDE that asks you to commit to one model. It is the durable workspace your agents share: the real project files, documentation, Git evidence, task history, durable memory, and terminal all stay with the project while the AI remains replaceable.

**Current build:** [`v2.1.0-beta.2`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2) · macOS universal beta · Electron + React + TypeScript

## 🧭 Choose the right agent, keep the same workspace

The question is not “Which AI IDE should I use?” It is “Which agent is best for this task?”

| Need | Choose the agent that fits | What FORGE keeps stable |
| --- | --- | --- |
| A broad refactor | OpenAI Codex or another capable coding agent | Files, Git state, docs, task evidence, and workspace context |
| Offline or private work | Ollama or another local model | The same project tree and project-owned history |
| A specialist workflow | Claude Code, OpenCode, or a future CLI agent | The terminal, working directory, and durable workspace record |
| A quick terminal task | Your normal shell tools | The real repository—never a synthetic copy |

FORGE does not try to replace those tools. It gives them a home base. Install a new agent tomorrow; the workspace remains the same.

## 💡 Why FORGE exists

AI-assisted programming gets fast when the model has useful context, but it gets fragile when that context lives only inside one vendor’s chat history. A conversation can disappear, a provider can change, and a new agent can start with no knowledge of the decisions already made.

FORGE treats the project itself as the authority. The workspace holds the evidence an agent needs to work well:

- the files and documentation that define the system;
- Git history and the current change set;
- structured tasks and verified checkpoints that survive chat resets;
- bounded project memory and retrieved context;
- a user-owned terminal where any installed CLI can work in the same project.

The result is a better foundation for “vibe-coding”: less repetitive briefing, fewer context resets, clearer review points, and the freedom to switch models without switching projects.

Read the deeper [workspace philosophy](docs/PHILOSOPHY.md).

## 🖥️ The terminal is the point of connection

Inside FORGE, open a terminal at the active workspace and launch the tools you already trust:

```sh
codex
claude
ollama
opencode
```

Those commands are examples, not a closed integration list. Any CLI agent that runs on your machine can work against the same project folder. FORGE keeps the terminal user-controlled and separate from model-requested shell tools, so an agent never receives terminal authority just because it can suggest a command.

See [the terminal guide](docs/TERMINAL.md) for the boundary, workflow, and troubleshooting details.

## ⚡ Start with FORGE

### Install the current beta

1. Open the [`FORGE beta 2.1` release](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2).
2. Download `FORGE-2.1.0-beta.2-universal.dmg`.
3. Open the DMG and drag **FORGE** into **Applications**.
4. Launch FORGE and choose **Open workspace**.

The current beta is unsigned and not notarized. macOS may require Control-click → **Open** or approval in **System Settings → Privacy & Security**. Do not rely on unattended automatic replacement until Developer ID signing and notarization are configured.

### Open a project

FORGE opens the project folder in place. It does not import, clone, or relocate your source. Workspace-owned state is stored under `<workspace>/.forge/metadata.sqlite`; project files and Git history remain where they already are.

Use the Explorer to browse, create, rename, delete, copy, and paste files. The editor opens any UTF-8 text file, maps major programming languages to Monaco, and rejects binary data clearly. Expand **Terminal** when a task is best served by a CLI agent or normal shell command.

## 🏗️ How the workspace is built

```text
Project folder + Git + documentation
              │
              ▼
      workspace-owned SQLite state
   tasks · checkpoints · conversations · memory · audit
              │
              ▼
 Electron main-process services and policy boundary
              │
              ▼
 Explorer · editor · terminal · task view · AI conversations
              │
              ▼
     your chosen provider or CLI agent
```

The model requests work; FORGE validates, authorizes, executes, logs, and returns bounded results. The renderer has no direct Node.js access, and the project folder remains the source of truth. See [Architecture](docs/ARCHITECTURE.md) for the system map and [Agent Tools](docs/AGENT_TOOLS.md) for the policy boundary.

## 👩‍💻 Build FORGE

### Requirements

- macOS 12+ for the packaged desktop app
- Node.js 22 LTS (see `.nvmrc`)
- npm and Git

### Run locally

```sh
nvm use
npm ci
npm run dev
```

The renderer-only development server is also available with `npm run start-renderer`, but it is not the desktop product and cannot exercise all Electron IPC paths.

### Verify a change

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

For packages and releases, follow [Contributing](docs/CONTRIBUTING.md) and [Releasing FORGE](RELEASING.md). Generated artifacts live in `dist_electron/` and are selected through `build-manifest.json`, never by wildcard guessing.

## 🗺️ Find your way around

| If you want to… | Start here |
| --- | --- |
| Understand the product direction | [Workspace Philosophy](docs/PHILOSOPHY.md) |
| Contribute a feature or fix | [Contributing](docs/CONTRIBUTING.md) |
| Understand runtime ownership and boundaries | [Architecture](docs/ARCHITECTURE.md) |
| Use the application day to day | [User Manual](UserManual.md) |
| Configure models, Git, and releases | [User Configuration](UserConfig.md) |
| Work with persistent tasks | [Persistent Tasks](docs/PERSISTENT_TASKS.md) |
| Understand the terminal and CLI agents | [Integrated Terminal](docs/TERMINAL.md) |
| Review current release evidence | [Project Status](docs/PROJECT_STATUS.md) |
| Browse all documentation and historical records | [Documentation Index](docs/README.md) |

## 🛡️ Trust boundary

FORGE is deliberately opinionated about authority:

- the workspace owns files, task state, memory, and evidence;
- a model proposes actions but never silently gains filesystem, shell, Git, credential, web, or release authority;
- user terminal input is separate from agent-requested commands;
- credentials are encrypted outside the repository, while project state remains project-owned.

Read [Tool Security](docs/TOOL_SECURITY.md) before extending privileged behavior.

## 🚧 Beta status

FORGE beta 2.1 is a public, universal macOS pre-release. The explorer, text editor, model discovery, responsive layout, persistent tasks, tool policy, and integrated terminal are implemented. Semantic retrieval, unattended orchestration, trusted automatic macOS replacement, and a durable process supervisor remain planned rather than claimed.

See [current status](docs/PROJECT_STATUS.md), [release notes](RELEASE_NOTES.md), and the [changelog](CHANGELOG.md) for evidence and history.
