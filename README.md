# ⚒️ FORGE

> A local-first workspace runtime for AI-assisted programming.

FORGE is not another AI IDE that asks you to commit to one model. It is the durable layer your agents share: the real project files, documentation, Git evidence, task history, terminal activity, and long-term project memory stay attached to the workspace while the model remains replaceable.

**Current build:** [`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) · FORGE v2.3 Beta · macOS universal beta · Electron + React + TypeScript

## 🧭 The missing layer between your project and the model

Most AI coding tools are excellent at the current task and weak at the life of the project. Change models, open a new terminal, clear a conversation, or return a month later and somebody has to reconstruct what happened.

FORGE moves that responsibility into the workspace itself.

The model does not own project memory. The workspace does.

That means Codex, Ollama, Claude Code, OpenAI-compatible models, normal shell tools, and future agents can work against the same durable project record instead of each starting from a different version of the truth.

| Agent changes | FORGE keeps |
| --- | --- |
| Provider or model | Project files and architecture |
| Chat session | Decisions and durable memory |
| CLI process | Terminal evidence and task state |
| Coding agent | Git chronology and verification history |

## 🧠 Workspace intelligence, agent execution

FORGE deliberately separates **understanding the project** from **acting on the project**.

```text
project files · docs · Git · tasks · memory · terminal evidence
                              │
                              ▼
                  FORGE workspace intelligence
            relevance · chronology · context · stale filtering
                              │
                              ▼
                     agent adapter / model
             Codex · Ollama · hosted LLM · future CLI
                              │
                              ▼
                     FORGE tool runtime
             filesystem · Git · shell · tasks · web
```

FORGE compiles the state of the workspace into useful context. The selected agent does the reasoning and execution. Tool capability belongs to FORGE, so changing the model should not require changing the project or inventing a new filesystem/Git/task API for every provider.

The current built-in OpenAI conversation path remains available during this transition, but it is a client of the workspace architecture—not the architectural center of FORGE.

## 🔌 Choose the agent that fits the task

The question is not “Which AI IDE should I use?” It is “Which agent is best for this task?”

- Use Codex for a broad repository refactor.
- Launch Ollama when you want a local model working against the same project.
- Use Claude Code, OpenCode, or another CLI when its workflow fits better.
- Use the built-in provider path when a hosted model is convenient.

Inside FORGE, the project stays where it is. The terminal opens at the active workspace, so installed CLI agents operate on the same source tree, Git state, and project-owned history.

```sh
codex
claude
ollama
opencode
```

Those commands are examples, not a closed integration list.

## 💡 Why this matters for AI-assisted development

A long-running software project contains more than source code. It accumulates decisions, failed approaches, architecture constraints, release evidence, task checkpoints, terminal output, and explanations for why the code looks the way it does.

FORGE treats those things as project state instead of disposable chat history.

The practical result is less repetitive briefing, less context drift, fewer repeated mistakes, and a cleaner handoff between models—or between an AI and a human engineer joining the project later.

Read the deeper [workspace philosophy](docs/PHILOSOPHY.md).

## ⚡ Start with FORGE

### Install the published macOS beta

1. Open the [`FORGE v2.3 Beta` release](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1).
2. Download `FORGE-2.3.0-beta.1-universal.dmg`.
3. Open the DMG and drag **FORGE** into **Applications**.
4. Launch FORGE and choose **Open workspace**.

The current beta is unsigned and not notarized. macOS may require Control-click → **Open** or approval in **System Settings → Privacy & Security**.

### Install or update from source

FORGE packages native dependencies on the target operating system. Use the command for the machine that will run it:

```sh
# macOS: fast-forward main, package, verify, install, and open /Applications/FORGE.app
cd ~/FORGE
npm run update:mac
```

```powershell
# Windows PowerShell: fast-forward main, package, install, and verify app.asar
cd $HOME\FORGE
npm run update:win
```

```sh
# Native Linux standalone package build (AppImage and DEB)
cd ~/FORGE
./scripts/package-linux.sh
```

The macOS and Windows update commands require a trusted `origin`, branch `main`, and no source changes outside `.obsidian`; they preserve local `.obsidian` UI state and refuse divergent history. Windows must be run on Windows with FORGE closed. Linux packaging must be run on Linux. For the integrated Arch environment, clone the sibling [FORGE-OS repository](https://github.com/kaeganscott26/FORGE-OS) and use its `./install.sh` or `./update.sh` entry point.

### Open a project

FORGE opens the project folder in place. It does not import, clone, or relocate your source. Choose **Home** to use your platform home directory (`~`) as the workspace, or **Open workspace** for a narrower project root. Workspace-owned state is stored under `<workspace>/.forge/metadata.sqlite`; project files and Git history remain where they already are. Explorer folders load on demand, and protected or transient subtrees that the operating system refuses to enumerate are skipped instead of making the whole workspace fail.

Use the Explorer to browse and edit files. **New file**, the Explorer `+`, and goal/task `+` controls open an in-app creation dialog and route through typed IPC. Source Control inspects Git state, Tasks keeps persistent work, and Terminal is available when a CLI agent or normal shell command is the best executor. The built-in **Browser** opens public HTTP(S) research in tabs; bookmarks and history remain in the active workspace database. After Web Research is enabled, `browser.read` and `browser.find` return bounded visible-page text automatically, while navigation and state-changing browser actions retain approval.

## 🏗️ Architecture at a glance

```text
Project folder
├── source + documentation
├── Git
├── .forge/metadata.sqlite
│   ├── tasks + checkpoints
│   ├── conversations
│   ├── durable memory
│   └── action history
│
▼
FORGE intelligence layer
├── context compilation
├── relevance selection
├── project chronology
└── durable knowledge

▼
replaceable agent
Codex / Ollama / hosted provider / future adapter

▼
FORGE capabilities
filesystem / Git / shell / tasks / web
```

The renderer has no direct Node.js access. Privileged project operations remain in the Electron main process, and generated build output is never treated as architecture authority.

See [Architecture](docs/ARCHITECTURE.md) for the full system map.

## 👩‍💻 Build FORGE

### Requirements

- A supported target OS: macOS 12+, Windows x64, or native x64 Linux
- Node.js 22 LTS (see `.nvmrc`)
- npm and Git

### Run locally

```sh
nvm use
npm ci
npm run dev
```

### Verify a change

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

For packages and releases, follow [Contributing](docs/CONTRIBUTING.md) and [Releasing FORGE](RELEASING.md).

## 🗺️ Documentation

| If you want to… | Start here |
| --- | --- |
| Understand why FORGE exists | [Workspace Philosophy](docs/PHILOSOPHY.md) |
| Understand runtime ownership and boundaries | [Architecture](docs/ARCHITECTURE.md) |
| Contribute a feature or fix | [Contributing](docs/CONTRIBUTING.md) |
| Use the application day to day | [User Manual](UserManual.md) |
| Configure models and Git | [User Configuration](UserConfig.md) |
| Learn what the built-in agent can do | [Tools in Plain English](docs/TOOLING_GUIDE.md) |
| Work with persistent tasks | [Persistent Tasks](docs/PERSISTENT_TASKS.md) |
| Use CLI agents in the workspace | [Integrated Terminal](docs/TERMINAL.md) |
| Review current implementation evidence | [Project Status](docs/PROJECT_STATUS.md) |
| Browse all documentation | [Documentation Index](docs/README.md) |

## 🛡️ Trust boundary

FORGE separates **authority** from **agency**.

The user decides what capabilities an agent may use. The agent decides how to complete the task within that authority. Workspace containment, validation, cancellation, audit history, backups, and explicit user permissions belong at the execution boundary; arbitrary limits on how many legitimate steps an agent may need do not.

That distinction is important to the direction of the runtime: **bound resources, not agency.**

## 🚧 Beta status

FORGE v2.3 Beta is a public universal macOS pre-release. The workspace, explorer, editor, Git integration, persistent task state, memory/context pipeline, integrated terminal, protected tabbed browser, capability-aware tool runtime, and hosted-provider conversation path are implemented.

The architecture is now being separated so workspace intelligence can feed replaceable external and local agent runtimes consistently. Provider-neutral adapters, broader local-model integration, permission simplification, and parallel/unbounded agent orchestration are active architectural work rather than completed release claims.

See [current status](docs/PROJECT_STATUS.md), [release notes](RELEASE_NOTES.md), and the [changelog](CHANGELOG.md) for implementation evidence and history.
