# FORGE User Manual

## 1. Install and open FORGE

Download the latest DMG from [GitHub Releases](https://github.com/kaeganscott26/FORGE/releases/latest), open it, and drag FORGE into Applications. Launch the app and select **Open workspace** to choose a project folder.

FORGE creates `<workspace>/.forge/metadata.sqlite` for app-specific metadata. It does not move or import the project files themselves.

## 2. Navigate a workspace

The Explorer lists directories and supported text files recursively. Select a file to open it. Use **New file** to create a relative path, **Save** to write changes, and **Delete** only after reviewing the confirmation.

FORGE rejects absolute paths, path traversal, and resolved paths outside the opened workspace.

Drag the narrow dividers to resize Explorer, editor, workspace intelligence, AI chat, and Source Control. FORGE saves the dimensions in the current workspace, so each project can keep a layout suited to its own documents and conversations.

## 3. Edit and preview files

The Monaco editor supports Markdown, TypeScript, JavaScript, JSON, Python, C, C++, CSS, HTML, and plain text. A dot in the active tab indicates unsaved work.

Markdown files open in preview mode. Use **Edit** and **Preview** to switch views.

## 4. Use the dashboard

The dashboard reports README presence, code and note counts, recent commits, goals, and tasks. The context-health number is a lightweight readiness indicator, not a code-quality score.

Goals and tasks are stored only in the workspace's local FORGE database.

## 5. Use source control

The Source Control panel shows the active branch and changed files. Select a change to stage it and inspect the parsed diff. Enter a commit message and choose **Commit**. **Pull** and **Push** use the Git remote and credentials already configured on the Mac.

Always confirm the file list and diff before a commit, pull, or push. FORGE operates on the real repository.

## 6. Use workspace conversations

Open **Settings**, enter the API base URL, model ID, and API key, then choose **Save settings**. Use **Refresh provider models** to load IDs available to the current key and **Validate model** to check an exact ID before saving. The model field remains editable so new provider model IDs do not require a FORGE update. **Test saved model and API connection** validates the stored configuration.

Each project has its own conversations. Switching from FORGE to another folder automatically shows that folder's active thread; histories are never shared between workspace databases.

Use the conversation picker to switch threads:

- **New chat** creates a separate thread inside the current workspace. It keeps project files, memory, indexing, AI settings, Git state, and other conversations.
- **Rename** changes the active thread title.
- **Clear** removes messages only from the active thread. It does not delete the thread or any workspace intelligence.

Every prompt automatically receives FORGE's local-first system frame and bounded evidence from project architecture and documentation, Git state/history, goals/tasks, relevant source snapshots, file inventory, and retrieved memories. The context-source disclosure below a response shows which workspace artifacts were selected. You do not need to paste the philosophy or project description into each prompt.

When asking “What should I build next?”, expect FORGE to reason from the current repository and recommend architectural evolution. Generic IDE feature suggestions are intentionally deprioritized unless they strengthen the project's documented architecture.

## 7. Use durable memory

**Reindex workspace** creates searchable memory records from supported project files. Repeated indexing can currently produce duplicate entries; review the memory list after reindexing.

Memory is separate from conversation history. Deleting a memory is an explicit durable-data action and asks for confirmation. Clear Chat and New Chat never delete memory.

## 8. Update FORGE

Use **Check for updates** in the title bar. A signed future release can download and present **Restart to update**. Use **Releases** whenever automatic updating is unavailable.

For a local source build, run `npm run install:mac`. It updates the existing installed app bundle and opens the new build without an uninstall step.

## 9. Troubleshooting

### macOS blocks the first launch

Control-click FORGE and choose **Open**, or approve it under **System Settings → Privacy & Security**. Version 1.0.0 is unsigned.

### Electron reports that it is uninstalled

Verify `node_modules/electron/dist/Electron.app`. If it is absent after `npm install`, run:

```sh
node node_modules/electron/install.js
```

### The AI key is missing

Open **Settings** and save an API key. If macOS Keychain is unavailable, FORGE refuses to save the secret rather than writing it in plaintext.

### The chosen model is unavailable

Open **Settings**, refresh the provider model list, and validate the exact model ID. Availability can differ by API key and compatible provider. FORGE keeps a manually entered ID for future compatibility but reports unsupported-model responses clearly.

### Git actions fail

Open **GitHub**, save a fine-grained token, and test the connection. Confirm the workspace is a Git repository and the `origin` remote is an HTTPS `github.com` URL. SSH and non-GitHub remotes continue to use system Git credentials.

### Local install cannot update `/Applications`

Move FORGE to `~/Applications`, or give your user write access through Finder. The update script intentionally does not invoke `sudo`.

## 10. Data safety

Project files are real files. Git actions are real Git actions. Keep a backup, review changes before remote operations, and do not delete `.forge/metadata.sqlite` unless you intend to remove FORGE's local project metadata, layouts, conversation threads, and durable memories.
