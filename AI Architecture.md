The AI is not a chatbot. The AI is not a chatbot. It is an intelligent workspace service. 

# The pipeline:

Raw Files → Markdown Parser → Metadata Extraction → Embedding Generator
→ Vector Index → Knowledge Graph → Hybrid Retrieval → Dynamic Context Builder
→ AI Execution Engine

# Key Interfaces 

#phase2-4_stubs

•	 AIProvider  — Abstraction over OpenAI, Ollama, and custom providers
•	 ContextBuilder  — Assembles the smallest relevant context before AI changes
•	 ExecutionEngine  — Runs AI operations with tool calling (Phase 4)
•	 SearchService  — Hybrid search with Reciprocal Rank Fusion
•	 MemoryEngine  — Knowledge graph with entity extraction and auto-layout
•	 PluginRegistry  — Third-party connector system
AI Tools (Phase 4)
The AI has permission to: read files, write files, rename files, create notes, refactor code, summarize projects, generate documentation, generate prompts, explain code, and update architecture documents. All operations are transparent and reviewable.
---
Memory Architecture
Long-term project memory is maintained through:
1.	File watching — Changes trigger re-indexing
2.	Entity extraction — Notes and code are parsed for concepts, relationships
3.	Knowledge graph — Interconnected nodes with typed edges
4.	Hybrid retrieval — Semantic (vector) + keyword (FTS) search with RRF
5.	Dynamic context injection — The context builder assembles minimal relevant context
---
Development Phases
Phase 1 (Complete)
•	Markdown workspace with file explorer
•	Monaco code editor (C++, Python, JavaScript, TypeScript, Markdown)
•	Markdown preview with wiki-links, frontmatter, tags
•	Native Git integration (status, diff, commit, push, pull, branch)
•	SQLite metadata storage (projects, goals, tasks)
•	Project dashboard with goals, commits, tasks, context health
•	Typed IPC contract layer
•	Plugin SDK interfaces
Phase 2 (Planned)
•	AI provider abstraction (OpenAI, Ollama)
•	Prompt assembly with automatic context
•	Semantic search (ChromaDB / FAISS)
•	Keyword search (SQLite FTS5)
•	File watcher with live re-indexing
Phase 3 (Planned)
•	Persistent memory engine
•	Knowledge graph visualization
•	Dynamic context injection
•	Backlinks and graph relationships
•	AI-generated organization
Phase 4 (Planned)
•	Agentic execution with tool calling
•	Plugin SDK with first-party connectors
•	GitHub, GitLab, Cloudflare, Docker, Jira, Linear integrations
•	VS Code compatibility layer
---
Getting Started
Prerequisites
•	Node.js 18+
•	npm 9+

1. #Install 

cd forge
npm install

2. #Develop
npm run dev

3. #Build
npm run build

4. #Typecheck
[Main_process_preload]

npx tsc --noEmit -p apps/desktop/tsconfig.node.json

5. #Renderer
npx tsc --noEmit -p apps/desktop/tsconfig.web.json

# Tech Stack

import layer
import technology

layer {
"Desktop Framework",
"Build tooling",
"Frontend",
"State management",
"Code editor",
"Backend",
"Git",
"Database",
"Vector search",
"AI providers",
};

technology {

("Electron 31"), Desktop Framework.layer,

("Electron-vite + Vite 5"), Build tooling.layer,

("React 18 + TypeScript 5.4"), Frontend.layer

("Zustland 4"), State management.layer,

("Monaco Editor"), Code editor.layer,

(""Node.js("Electron main process")), Backend.layer,

("simple-git"), Git.layer,

("SQLite ('better-sqlite3')"), Database.layer

("ChromaDB/FAISS(phase 2+)"), Vector search.layer

("OpenAI, Ollama (phase 2+)"), AI providers.layer
};

#licence= "MIT"