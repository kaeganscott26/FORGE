# FORGE User Manual

## 1. Install and open FORGE

Download the latest DMG from [GitHub Releases](https://github.com/kaeganscott26/FORGE/releases/latest), open it, and drag FORGE into Applications. Launch the app and select **Open workspace** to choose a project folder.

FORGE creates `<workspace>/.forge/metadata.sqlite` for app-specific metadata. It does not move or import the project files themselves.

## 2. Navigate a workspace

The Explorer lists directories and supported text files recursively. Select a file to open it. Use **New file** to create a relative path, **Save** to write changes, and **Delete** only after reviewing the confirmation.

FORGE rejects absolute paths, path traversal, and resolved paths outside the opened workspace.

## 3. Edit and preview files

The Monaco editor supports Markdown, TypeScript, JavaScript, JSON, Python, C, C++, CSS, HTML, and plain text. A dot in the active tab indicates unsaved work.

Markdown files open in preview mode. Use **Edit** and **Preview** to switch views.

## 4. Use the dashboard

The dashboard reports README presence, code and note counts, recent commits, goals, and tasks. The context-health number is a lightweight readiness indicator, not a code-quality score.

Goals and tasks are stored only in the workspace's local FORGE database.

## 5. Use source control

The Source Control panel shows the active branch and changed files. Select a change to stage it and inspect the parsed diff. Enter a commit message and choose **Commit**. **Pull** and **Push** use the Git remote and credentials already configured on the Mac.

Always confirm the file list and diff before a commit, pull, or push. FORGE operates on the real repository.

## 6. Use AI Assistant and memory

Open **Settings**, enter the API base URL, model, and API key, then choose **Save settings**. Use **Test saved API connection** after saving. The assistant can answer project questions, explain the repository, and review changes using high-level workspace context and retrieved project memories.

**Reindex workspace** creates searchable memory records from supported project files. Repeated indexing can currently produce duplicate entries; review the memory list after reindexing.

## 7. Update FORGE

Use **Check for updates** in the title bar. A signed future release can download and present **Restart to update**. Use **Releases** whenever automatic updating is unavailable.

For a local source build, run `npm run install:mac`. It updates the existing installed app bundle and opens the new build without an uninstall step.

## 8. Troubleshooting

### macOS blocks the first launch

Control-click FORGE and choose **Open**, or approve it under **System Settings → Privacy & Security**. Version 1.0.0 is unsigned.

### Electron reports that it is uninstalled

Verify `node_modules/electron/dist/Electron.app`. If it is absent after `npm install`, run:

```sh
node node_modules/electron/install.js
```

### The AI key is missing

Open **Settings** and save an API key. If macOS Keychain is unavailable, FORGE refuses to save the secret rather than writing it in plaintext.

### Git actions fail

Open **GitHub**, save a fine-grained token, and test the connection. Confirm the workspace is a Git repository and the `origin` remote is an HTTPS `github.com` URL. SSH and non-GitHub remotes continue to use system Git credentials.

### Local install cannot update `/Applications`

Move FORGE to `~/Applications`, or give your user write access through Finder. The update script intentionally does not invoke `sudo`.

## 9. Data safety

Project files are real files. Git actions are real Git actions. Keep a backup, review changes before remote operations, and do not delete `.forge/metadata.sqlite` unless you intend to remove FORGE's local project metadata.
