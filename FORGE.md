Forge
An AI-native development workspace — a second brain, IDE, documentation system, project manager, and AI assistant in one coherent desktop application.
Forge is not a chatbot. The AI is part of the operating system of the application. Your notes, documentation, conversations, source code, architecture documents, design decisions, and project files become the AI’s long-term memory. The application should feel like a development workspace that happens to contain AI — not an AI chat application.

# Architecture overview
{{┌─────────────────────────────────────────────────────────────┐
│                     Renderer (React)                         │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Activity │ │  File     │ │  Editor  │ │  Dashboard   │  │
│  │ Bar      │ │  Explorer │ │  +Preview│ │  + Git Panel │  │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       └──────────────┴────────────┴─────────────┘          │
│                         │ window.forge.invoke()              │
├─────────────────────────┼───────────────────────────────────┤
│                    Preload Bridge                           │
│         (contextIsolation + channel allowlist)              │
├─────────────────────────┼───────────────────────────────────┤
│                    Main Process                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Workspace │ │   Git    │ │ Storage  │ │  AI / Search │  │
│  │ Service  │ │ Service  │ │ (SQLite) │ │  (Phase 2+)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
}};

# Design Principles
1.	The renderer is a pure UI client. All filesystem, Git, database, and AI operations live in the Electron main process. The renderer communicates exclusively through a typed IPC bridge.
2.	The AI is a service, not a chatbot. It reads project context and performs operations through tool calls. All operations are transparent and reviewable.
3.	Context is assembled, not manually provided. The user should never need to copy large prompts into an AI. The application assembles the correct context automatically using hybrid retrieval.
4.	Stable package boundaries from day one. Even in Phase 1, the monorepo has separate packages for each domain. This prevents tight coupling as features are added.

# Monorepo Structure

forge/
├── apps/
│   └── desktop/              # Electron application
│       ├── src/
│       │   ├── main/          # Electron main process (privileged)
│       │   ├── preload/       # Security bridge (contextIsolation)
│       │   └── renderer/      # React UI
│       │       └── src/
│       │           ├── components/
│       │           │   ├── common/    # StatusBar, WelcomeScreen, Icons, ForgeLogo
│       │           │   ├── explorer/   # ActivityBar, FileExplorer, FileTreeNode
│       │           │   ├── editor/     # CodeEditor (Monaco), MarkdownPreview, EditorTabs
│       │           │   ├── git/        # GitPanel
│       │           │   └── dashboard/  # Dashboard
│       │           ├── stores/         # Zustand state (workspace, editor, git)
│       │           └── styles/         # Design system (global.css)
│       └── electron.vite.config.ts
│
├── packages/
│   ├── ipc/           # Typed IPC contracts (request/response maps)
│   ├── workspace/     # Filesystem operations + Markdown parser
│   ├── git/           # Git integration (simple-git wrapper)
│   ├── storage/       # SQLite metadata (projects, goals, tasks, embeddings)
│   ├── ai/            # AI provider abstraction (OpenAI, Ollama) — Phase 2+
│   ├── search/        # Hybrid search (semantic + keyword, RRF) — Phase 2+
│   ├── memory/        # Knowledge graph + persistent memory — Phase 3+
│   └── plugin-sdk/   # Plugin architecture SDK — Phase 4+
│
├── package.json       # Workspace root
├── tsconfig.base.json # Shared TypeScript config
└── README.md

# IPC Contract Layer

---
IPC Contract Layer
The  @forge/ipc  package defines the complete communication contract between the main process and renderer. Every IPC channel is:
•	Typed: Request and response types are defined in  IPCRequestMap  and  IPCResponseMap 
•	Validated: The preload script only allows channels in the  IPC_CHANNELS  allowlist
•	Error-safe: All handlers return  IPCResult<T>  — a discriminated union of  { success: true, data }  or  { success: false, error } 

<typescript>

// Renderer calls go through the typed bridge:
const result = await window.forge.invoke('file.read', { path: '/README.md' });
if (result.success) {
  console.log(result.data.content);
} else {
  console.error(result.error.message);
}

