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

**Reindex workspace** creates classified, searchable knowledge records from supported project files. Reindexing updates existing records by source path instead of creating duplicates. Machine-specific `.obsidian` state and generated output are excluded by default.

The panel separates Architecture, Documentation, Source Code, Memory, and Configuration so a file-derived context record is not mislabeled as a personal or durable memory. Source and configuration groups are collapsed by default to keep the panel concise.

**Remove indexed copy** deletes only FORGE's derived retrieval record; it never changes the source file, and a later reindex can restore it. **Forget memory** applies only to a durable memory record and also never deletes a project file. Both actions require confirmation.

After an AI turn, context disclosure groups the evidence used and shows a heuristic relevance score plus the reason each item was selected. Memory retrieval requires an actual query-concept match, so recency alone cannot pull unrelated content into a request.

Memory is separate from conversation history. Deleting a memory is an explicit durable-data action and asks for confirmation. Clear Chat and New Chat never delete memory.

## 8. Review and approve agent tools

When Workspace AI requests a tool, open **Agent Actions** in the bottom panel. The request remains visible and shows tool, risk tier, reason, exact target or command, working directory, network use, expected effect, predicted paths, and a file diff when applicable.

- Tier 0 reads may complete automatically and return bounded evidence to the conversation.
- Tier 1 changes offer **Run once**, an exact-scope session permission, or **Reject**. Session permissions expire and reset when the workspace changes.
- Tier 2 actions offer only a one-time approval or rejection. Shell, delete, commit, pull, push, and web requests are always Tier 2.

Running operations can be cancelled. Completed requests retain their state; local structured results can be inspected and copied. The persistent action log can be filtered by tool, risk, and outcome. Tool logs and conversations are stored in the active workspace database, so another workspace cannot see them.

Web research is disabled by default. Enable it in Settings only if you want requests to external services. The approval card names the exact query/URL and any project data declared for transfer.

## 9. Use the integrated terminal

Choose **Terminal** in the bottom panel and select **New**. A user terminal starts at the active workspace and shows the exact working directory. Create or switch multiple sessions, resize the panel, copy output, clear only the visible screen, cancel a process, restart a session, and inspect exit state.

The user terminal is separate from model-requested `shell.run`. The model cannot type into a user session. Agent shell requests appear under Agent Actions and require one-time approval. FORGE rejects normal terminal working directories outside the workspace, and terminal output is not automatically indexed into memory.

## 10. Update FORGE

Use **Check for updates** in the title bar. A signed future release can download and present **Restart to update**. Use **Releases** whenever automatic updating is unavailable.

Open **Settings → About this build** to see or copy the application version, release channel, exact source commit, build date, runtime mode, renderer source, platform, and architecture. The current 1.1 preview reports `1.1.0-alpha.2`, `preview`, `packaged`, and `file:// packaged app.asar`; source development reports `1.1.0-alpha.2-dev` and `development`.

Stable is the default update channel and excludes every prerelease. Preview must be selected explicitly and permits newer alpha, beta, release-candidate, and stable versions. Both channels reject equal or older versions, so changing channels never authorizes a downgrade. A candidate is downloaded only after FORGE validates its semantic version and channel eligibility.

For a local source build, run `npm run install:mac`. It updates the existing installed app bundle and opens the new build without an uninstall step.

## 11. Troubleshooting

### macOS blocks the first launch

Control-click FORGE and choose **Open**, or approve it under **System Settings → Privacy & Security**. Version 1.0.1 is unsigned.

### The old UI still opens after replacement

Check both `/Applications/FORGE.app` and `~/Applications/FORGE.app`. macOS can retain two apps with the same bundle identifier and launch the older user-level copy. Open the system Applications copy explicitly, then verify **Settings → About this build** before removing any duplicate.

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

### Agent tool request is pending

Open **Agent Actions**, inspect the exact scope, and choose Run once, the offered exact-scope session permission, or Reject. A model tool call never approves itself.

### Terminal session will not start

Confirm the app was packaged with `node-pty` unpacked and that its `spawn-helper` is executable. From source, rerun `npm install`; FORGE's postinstall repairs the helper permission and missing Electron vendor app.

## 12. Data safety

Project files are real files. Git actions are real Git actions. Keep a backup, review changes before remote operations, and do not delete `.forge/metadata.sqlite` unless you intend to remove FORGE's local project metadata, layouts, conversation threads, and durable memories.
