Project: AI-Native Development Workspace
You are a senior software architect and full-stack engineer.
Your objective is to design and implement a desktop application that combines the best aspects of Obsidian, Git, AI-assisted development, and an IDE into a single cohesive application.
Core Philosophy
This is NOT a chatbot.
The AI is part of the operating system of the application.
The user’s notes, documentation, conversations, source code, architecture documents, design decisions, and project files become the AI’s long-term memory.
The application should feel like a development workspace that happens to contain AI—not an AI chat application.
---
Primary Goals
Create a desktop application that allows users to:
•	Organize projects using Markdown.
•	Build software from notes.
•	Maintain persistent project memory.
•	Integrate Git directly.
•	Integrate AI directly.
•	Compile and run projects.
•	Search knowledge semantically.
•	Automatically maintain project context.
The user should never need to manually copy large prompts into an AI.
The software should assemble the correct context automatically.
---
Technical Stack
Preferred stack:
Frontend:
•	Electron
•	React
•	TypeScript
Backend:
•	Node.js
•	TypeScript
Storage:
•	Local Markdown files
•	SQLite for metadata
•	ChromaDB or FAISS for vector search
AI Providers:
•	OpenAI API
•	Local Ollama models
•	Provider abstraction layer
Git:
•	Native Git integration
•	Clone
•	Commit
•	Branch
•	Push
•	Pull
•	Diff viewer
---
AI Architecture
Do NOT build a chatbot.
Instead build an intelligent workspace.
The AI should:
•	Read project files.
•	Read Markdown notes.
•	Read architecture documents.
•	Read README files.
•	Read design decisions.
•	Read Git history.
•	Read TODO lists.
Then assemble the smallest amount of relevant context required before making changes.
---
Memory Architecture
The application must maintain long-term project memory.
Implement:
Raw Files
↓
Markdown Parser
↓
Metadata Extraction
↓
Embedding Generator
↓
Vector Index
↓
Knowledge Graph
↓
Hybrid Retrieval
↓
Dynamic Context Builder
↓
AI Execution Engine
Use semantic search plus keyword search.
Never inject unnecessary context.
---
Notes
Support:
•	Markdown
•	Wiki links
•	Backlinks
•	Tags
•	Attachments
Allow right-click linking between notes.
Automatically maintain graph relationships.
Do not require users to manually type wiki links.
---
Graph View
Replace Obsidian’s graph with a cleaner visualization.
Requirements:
•	Project clusters
•	Color by category
•	Clickable relationships
•	AI-generated organization
•	Auto-layout
•	No visual clutter
The graph should help users understand projects—not simply look impressive.
---
IDE
Integrate a code editor.
Support:
•	C++
•	Python
•	JavaScript
•	TypeScript
•	Markdown
Future plugin architecture for additional languages.
---
AI Tools
The AI should have permission to:
•	Read files
•	Write files
•	Rename files
•	Create notes
•	Refactor code
•	Summarize projects
•	Generate documentation
•	Generate prompts
•	Explain code
•	Update architecture documents
All operations should be transparent and reviewable.
---
Project Dashboard
Provide a dashboard showing:
•	Current project
•	Active goals
•	Recent commits
•	AI suggestions
•	Open tasks
•	Build status
•	Context health
---
Plugin System
Build a first-party plugin architecture.
Support future connectors for:
•	OpenAI
•	Ollama
•	GitHub
•	GitLab
•	Cloudflare
•	Docker
•	Jira
•	Linear
•	VS Code compatibility
---
User Experience
The application should feel like:
•	a second brain,
•	a software engineering IDE,
•	a documentation system,
•	a project manager,
•	and an AI assistant,
all integrated into one coherent workspace.
The user should spend their time building projects—not managing AI prompts.
---
Development Plan
Build incrementally.
Phase 1:
•	Markdown workspace
•	Project explorer
•	Code editor
•	Git integration
Phase 2:
•	AI provider abstraction
•	Prompt assembly
•	Semantic search
Phase 3:
•	Persistent memory engine
•	Knowledge graph
•	Dynamic context injection
Phase 4:
•	Agentic execution
•	Tool calling
•	Plugin SDK
At every stage, prioritize maintainability, modular architecture, and extensibility over quick implementation.
Act as a lead software architect. Challenge weak design decisions and propose better alternatives when appropriate.