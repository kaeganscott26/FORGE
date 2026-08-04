Use this strategy:

1. Scaffold with  electron-vite , not Electron Forge first. It gives cleaner Electron + React + TypeScript ergonomics, fast dev server, separate main/preload/renderer builds, and less boilerplate. Forge can be added later for packaging if needed.

2. Use a workspace monorepo from the beginning:


apps/desktop/
  src/main/
  src/preload/
  src/renderer/

packages/core/
packages/ipc/
packages/workspace/
packages/git/
packages/storage/
packages/ai/
packages/search/
packages/plugin-sdk/


Keep Phase 1 focused, but create stable packagte boundaries now.

3. Phase 1 implementation target should be a real usable shell:
•	Open/select local project folder.
•	File explorer for Markdown/code files.
•	Monaco editor.
•	Markdown preview.
•	Git status, branch, diff, commit.
•	SQLite metadata DB initialized per workspace.
•	IPC contract layer between renderer and main.
4. IPC should be typed and narrow:
•	Renderer never touches Node APIs directly.
•	 preload  exposes a small  window.workspaceAPI .
•	Define request/response contracts in  packages/ipc .
•	Main process owns filesystem, Git, SQLite, and later AI/tool execution.
•	Prefer command-style APIs:  workspace.open ,  files.read ,  files.write ,  git.status ,  git.commit .

5. Architectural rule: don’t implement the AI as UI chat. Implement it as services behind domain interfaces:
{
`typescript' :

ContextBuilder
RetrievalService
AiProvider
WorkspaceIndexer
ExecutionEngine
}

In phase 1, stub these interfaces but do not build the full AI stack yet.

6. Suggested immediate next step:
•	Create the repo scaffold.
•	Add Electron/React/TypeScript.
•	Add Monaco editor.
•	Add a left project explorer, center editor, right dashboard shell, bottom Git panel.
•	Add filesystem + Git IPC services.
•	Add placeholder package interfaces for memory/search/AI so future phases fit naturally.


< "One important constraint: keep all AI, Git, filesystem, and database operations in the Electron main process or backend service layer. The renderer should remain a UI client, not a privileged workspace runtime." >






