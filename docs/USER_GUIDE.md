# FORGE User Guide

## What FORGE Is

FORGE is a local-first desktop workspace for opening a project folder, reading and editing files, reviewing Git changes, tracking project work, and using project-aware AI and memory from the same application.

The workspace is the center of the app. The AI assistant is one tool inside that workspace.

---

## 1. Start FORGE

From the repository root:

```sh
npm install
npm run dev
```

When the desktop window opens, FORGE starts with no active workspace.

Use **Open workspace** or **Open a project folder** to select a local project directory.

---

## 2. Open a Workspace

After choosing a folder, FORGE initializes three project systems:

1. the workspace file service,
2. the Git service,
3. the local SQLite metadata store.

FORGE creates local application state under:

```text
<workspace>/.forge/metadata.sqlite
```

That database is excluded from Git by default.

---

## 3. Use the Explorer

The Explorer appears on the left side of the application.

- Select a text file to open it.
- Select a directory to inspect its files.
- Use the refresh button after external file changes.
- Use **New file** to create a file by relative path.
- Use **Delete** to remove the active file after confirmation.

Supported editor modes currently include:

- Markdown
- TypeScript
- JavaScript
- JSON
- Python
- C and C++
- CSS
- HTML

---

## 4. Edit and Save Files

Selecting a supported file opens it in the Monaco editor.

- Unsaved changes are marked in the active tab.
- **Save** writes the current editor contents to disk.
- Markdown files open in preview mode by default.
- Use **Edit** or **Preview** to switch Markdown presentation.

FORGE restricts file operations to the opened workspace. Paths that attempt to escape the workspace should be rejected.

---

## 5. Read the Project Dashboard

The Project Dashboard summarizes the opened workspace.

Current information includes:

- context-health score,
- README detection,
- Markdown-note count,
- code-file count,
- project goals,
- project tasks,
- recent Git commits.

The context-health score is currently a simple project-readiness indicator, not a full code-quality score.

Use the **+** buttons to add goals and tasks to FORGE’s local project database.

---

## 6. Use Source Control

The Source Control panel shows the current branch and working-tree changes.

Current actions include:

- inspect changed files,
- stage a file,
- enter a commit message,
- commit changes,
- pull,
- push,
- inspect parsed diffs.

Before committing, verify the exact file list. Machine-local files such as `.forge/`, `node_modules/`, generated build output, and `.DS_Store` should remain ignored.

---

## 7. Use the AI Assistant

The AI Assistant sends questions through the Electron IPC bridge to FORGE’s Agent API.

The current Agent can:

- answer project questions,
- explain the repository,
- review project changes,
- use high-level project context,
- retrieve relevant stored memories.

The current OpenAI provider requires:

```sh
OPENAI_API_KEY
```

The key must be available to the Electron process before starting FORGE.

ChatGPT subscriptions do not automatically provide API access inside the application.

---

## 8. Use Project Memory

The Memories panel lists memory entries stored in the project database.

Available actions:

- **Refresh** reloads the current memory list.
- **Reindex workspace** reads supported text and source files and creates searchable memory entries.
- **Delete** removes an individual memory entry.

Current indexing supports common documentation and source-code extensions.

### Important limitation

Reindexing is still early-stage. Repeated reindexing may create duplicate memory entries until path-based update and content-hash behavior is implemented.

Do not treat the current memory list as a polished knowledge base yet.

---

## 9. Work Across Different Projects

Each opened workspace has its own `.forge/metadata.sqlite` database.

That means goals, tasks, conversations, and memories belong to the selected project rather than to one global FORGE account.

Opening another workspace switches the active file, Git, storage, and memory context.

---

## 10. Renderer-Only Development

For browser-based renderer work:

```sh
npm run start-renderer
```

This is useful for visual layout testing. Features that require Electron’s preload bridge may not work in an ordinary browser unless a browser fallback is present.

---

## 11. Validate a Development Change

Before committing application changes, run:

```sh
npm run typecheck
npm test
npm run build
```

For Electron runtime changes, also run:

```sh
npm run dev
```

Then verify:

- the window opens,
- a workspace can be selected,
- files can be opened and saved,
- Git status loads,
- project metadata loads,
- the memory panel loads,
- the chat panel reports useful errors when a provider is not configured.

---

## 12. Troubleshooting

### Electron reports that it is uninstalled

Check whether the native bundle exists:

```sh
ls node_modules/electron/dist
```

On macOS, verify:

```text
Electron.app/Contents/MacOS/Electron
```

Do not commit manual `node_modules` repairs.

### The AI reports that the API key is missing

Export `OPENAI_API_KEY` in the environment that launches Electron, then restart FORGE.

### The dashboard or memory panel is empty

Confirm that a workspace is open and that `.forge/metadata.sqlite` can be created in that workspace.

### Reindexing creates repeated entries

Delete duplicate entries manually for now and avoid unnecessary repeated reindex operations until idempotent indexing is implemented.

### Git operations fail

Confirm that the opened directory is a valid Git repository and that the machine’s Git authentication is configured outside FORGE.

---

## Safe Operating Rule

FORGE can edit real files and run real Git operations. Review paths, diffs, and commit contents before destructive or remote actions.
