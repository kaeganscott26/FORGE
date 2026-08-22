# 📘 FORGE User Manual

## 🚀 1. Install and open FORGE

Download the current published macOS beta DMG from [FORGE v2.3 Beta](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1), open it, and drag FORGE into Applications. Launch the app and select **Open workspace** to choose a project folder, or **Home** to use your platform home directory as the workspace.

Native source install/update entry points are `npm run update:mac` on macOS and `npm run update:win` from Windows PowerShell. Native Linux standalone packaging uses `./scripts/package-linux.sh`; FORGE-OS installs and updates the Linux runtime through the sibling repository's `./install.sh` and `./update.sh`.

FORGE creates `<workspace>/.forge/metadata.sqlite` for app-specific metadata. It does not move or import the project files themselves.

## 🗂️ 2. Navigate a workspace

The Explorer lists the workspace root and loads each folder on demand when you expand it, keeping home-sized workspaces responsive. Click a folder name or chevron to expand/collapse it; right-click an entry for file actions. **New file** and **New folder** open an in-app name dialog, then create entries under the selected folder (or the active file's parent) through typed IPC. A new file opens immediately in the editor. Copy/paste uses **Command/Ctrl+C** and **Command/Ctrl+V**, with collision-safe copy names. **F2** opens the same in-app rename flow and **Delete/Backspace** deletes after confirmation. Select a text file to open it. **Command/Ctrl+O** opens the workspace picker. Monaco supports **Command/Ctrl+Z** for undo and **Command+Shift+Z** or **Ctrl+Y** for redo.

FORGE rejects absolute tool paths, path traversal, and resolved paths outside the opened workspace. Opening **Home** makes the user's actual home directory the workspace on macOS, Windows, and Linux without granting access outside it. Unreadable, vanished, or container-backed subtrees are omitted from Explorer, bounded memory-index, and model file discovery instead of failing the entire home workspace; directly reading a protected file still returns the operating-system permission error.

Drag the narrow dividers to resize Explorer, editor, workspace intelligence, AI chat, and Source Control. FORGE saves the dimensions in the current workspace and clamps them during window resizing so the editor and panels remain usable. On narrow windows, secondary panels collapse to preserve an editable editor surface.

## ✍️ 3. Edit and preview files

The Monaco editor opens any UTF-8 text file regardless of extension and rejects binary files with a clear message. It provides language support for major JavaScript/TypeScript, Python, C/C++, Java, Rust, Go, Swift, Kotlin, C#, PHP, Ruby, shell, markup, data, SQL, and configuration files; unknown text extensions remain editable as plain text. A dot in the active tab indicates unsaved work.

Markdown files open in preview mode. Use **Edit** and **Preview** to switch views.

## 📊 4. Use the dashboard

The dashboard reports README presence, code and note counts, recent commits, goals, and tasks. FORGE does not reduce workspace intelligence or memory to a numeric context-health score.

Use the `+` beside Goals or Tasks to open an in-app title dialog. Both are stored only in the workspace's local FORGE database; the task also appears in the persistent Tasks panel.

## 🌿 5. Use source control

The Source Control panel shows the active branch and changed files. Select a change to stage it and inspect the parsed diff. Enter a commit message and choose **Commit**. **Pull** and **Push** use the Git remote and credentials already configured on the host operating system.

Always confirm the file list and diff before a commit, pull, or push. FORGE operates on the real repository.

## 💬 6. Use workspace conversations

Open **Settings**, enter the API base URL, model ID, and API key, then choose **Save settings**. An API key remains mandatory for remote providers. For local Ollama, use `http://127.0.0.1:11434/v1` and leave the key blank. FORGE automatically loads the provider catalog when the saved remote key or loopback endpoint is available; **Refresh provider models** repeats the request and **Validate model** checks an exact ID before saving. The model field remains editable so new provider model IDs do not require a FORGE update. **Test saved model and API connection** validates the stored configuration.

Compatible local models receive every capability currently available from the FORGE tool registry through the same policy router as hosted models, including workspace files, Git, terminal evidence, tasks, and configured browser/web or GitHub tools. Read-only inspection may run automatically; writes, commands, browser disclosure, commits, pushes, and other protected actions retain their normal approval requirements. A raw `ollama run` terminal chat remains Ollama's own CLI and does not receive hidden filesystem access from FORGE.

### Use an agent safely

Ask the built-in agent to inspect, explain, plan, or propose changes. FORGE supplies bounded workspace context and offers only the enabled capabilities. The agent can read files and Git evidence automatically, but it must request permission before it changes files, runs a command, commits, pushes, starts a task process, opens/reads a Browser page for the model, or changes GitHub. Review every approval card: it shows the command or target, effect, working directory, network intent, and predicted paths or diff where available.

The agent cannot directly access your shell, Node.js, raw files outside the workspace, credentials, or hidden reasoning. It may make mistakes, so review the editor diff and Source Control after it acts. [Tools in Plain English](docs/TOOLING_GUIDE.md) lists every command the current agent runtime can request and the limits that remain.

### Change the model

In **Settings → API integration**, enter a model ID and provider base URL, then choose **Save settings**. Use **Refresh provider models**, **Validate model**, and **Test saved model and API connection** to confirm it works. This changes the model used by the built-in chat; it does not move your files or reset workspace tasks, conversations, durable memory, Git history, or audit records. See [User Configuration](UserConfig.md) for keys, local Ollama, and environment-variable options.

Each project has its own conversations. Switching from FORGE to another folder automatically shows that folder's active thread; histories are never shared between workspace databases.

Use the conversation picker to switch threads:

- **New chat** creates a separate thread inside the current workspace. It keeps project files, memory, indexing, AI settings, Git state, and other conversations.
- **Rename** changes the active thread title.
- **Clear** removes messages only from the active thread. It does not delete the thread or any workspace intelligence.

Every prompt automatically receives FORGE's local-first system frame and bounded evidence from project architecture and documentation, Git state/history, goals/tasks, relevant source snapshots, file inventory, and retrieved memories. The context-source disclosure below a response shows which workspace artifacts were selected. You do not need to paste the philosophy or project description into each prompt.

When asking “What should I build next?”, expect FORGE to reason from the current repository and recommend architectural evolution. Generic IDE feature suggestions are intentionally deprioritized unless they strengthen the project's documented architecture.

## 🧠 7. Use durable memory

**Reindex workspace** creates classified, searchable knowledge records from supported project files. Reindexing updates existing records by source path instead of creating duplicates. Machine-specific `.obsidian` state and generated output are excluded by default.

The panel separates Architecture, Documentation, Source Code, Memory, and Configuration so a file-derived context record is not mislabeled as a personal or durable memory. Source and configuration groups are collapsed by default to keep the panel concise.

**Remove indexed copy** deletes only FORGE's derived retrieval record; it never changes the source file, and a later reindex can restore it. **Forget memory** applies only to a durable memory record and also never deletes a project file. Both actions require confirmation.

After an AI turn, context disclosure groups the evidence used and shows a heuristic relevance score plus the reason each item was selected. Memory retrieval requires an actual query-concept match, so recency alone cannot pull unrelated content into a request.

Memory is separate from conversation history. Deleting a memory is an explicit durable-data action and asks for confirmation. Clear Chat and New Chat never delete memory.

## 🛡️ 8. Review and approve agent tools

When Workspace AI requests a tool, FORGE generates its execution identity and audit reason internally. You never provide task IDs, step IDs, conversation/workspace IDs, or a bookkeeping reason. Open **Agent Actions** in the bottom panel to inspect the resulting tool, side effect, inferred reason, exact target or command, working directory, network use, expected effect, predicted paths, and file diff when applicable.

- Tier 0 reads may complete automatically and return bounded evidence to the conversation.
- Tier 1 changes offer **Run once**, an exact-scope session permission, or **Reject**. Session permissions expire and reset when the workspace changes.
- Tier 2 actions offer only a one-time approval or rejection. Shell, delete, commit, pull, push, browser navigation, and remote mutations remain Tier 2. Enabled `browser.read`, `browser.find`, `web.search`, and `web.fetch` are bounded read-only tools; web search/fetch never send workspace content automatically.

Running operations can be cancelled. Completed requests retain their state; local structured results can be inspected and copied. The persistent action log can be filtered by tool, risk, and outcome. Tool logs and conversations are stored in the active workspace database, so another workspace cannot see them.

Web research is disabled by default. Enable it in Settings only if you want requests to external services. Audit history records the exact query/URL. Any request that declares private project-data transfer requires explicit disclosure and approval.

## ✅ 9. Use persistent tasks

Choose **TASKS** in the bottom panel. Tasks remain in the opened workspace even when you switch conversations, providers, or models, reload the renderer, or restart FORGE.

Choose **New task** to open the in-app task-title dialog. **Release workflow** and **Pause** use the same routed dialog rather than a browser-native prompt.

- Select a task to inspect its structured steps, dependencies, progress, verification criteria, approvals, events, Git/release references, and active PID/output path.
- **Resume** audits current Git and known local processes before selecting unfinished work.
- **Pause** records an interruption without erasing history.
- **Cancel tracking** stops FORGE from advancing the record; it does not silently kill a process, cancel a GitHub workflow, remove an upload, or undo remote state.
- **Retry step** is available only for a failed or blocked step within its retry policy and requires fresh approval when the tool is Tier 1 or Tier 2.
- **Copy handoff** creates `.forge/handoffs/<task>.md` from the authoritative SQLite record and copies its concise resume context.

A successful tool result is recorded as evidence but does not by itself satisfy every verification criterion. The step completes only after a verified checkpoint. If a saved PID disappears without completion evidence, FORGE blocks the step and asks you to inspect its bounded output/artifacts before retrying.

## 🖥️ 10. Use the integrated terminal

Choose **Terminal** in the bottom panel and select **New**. A user terminal starts at the active workspace and shows the exact working directory. Create or switch multiple sessions, resize the panel, copy output, clear only the visible screen, cancel a process, restart a session, and inspect exit state.

The user terminal is separate from model-requested `shell.run`. The model cannot type into a user session. Agent shell requests appear under Agent Actions and require one-time approval. FORGE rejects normal terminal working directories outside the workspace, and terminal output is not automatically indexed into memory.

Login shells receive a small explicit environment with the current user home, shell identity, and common Homebrew/user CLI paths, so installed tools such as `ollama` and `codex` can be resolved without forwarding API keys or other secret environment variables. macOS may still block an independently installed quarantined CLI until that exact signed binary is approved under **System Settings → Privacy & Security**.

The terminal is designed for your choice of CLI agent. Launch Codex, Claude Code, Ollama, OpenCode, or another installed tool in the active project; FORGE preserves the surrounding workspace while the CLI remains a normal user-controlled process. Read [Integrated Terminal](docs/TERMINAL.md) for the execution boundary and troubleshooting details.

## 🔄 11. Update FORGE

Use **Check for updates** in the title bar. A signed future release can download and present **Restart to update**. Use **Releases** whenever automatic updating is unavailable.

Open **Settings → About this build** to see or copy the application version, release channel, exact source commit, build date, runtime mode, renderer source, platform, and architecture. FORGE v2.3 Beta reports `2.3.0-beta.1`, `beta`, `packaged`, and `file:// packaged app.asar`; source development reports `2.3.0-beta.1-dev` and `development`.

Stable is the default update channel and excludes every prerelease. Beta must be selected explicitly and permits newer beta, release-candidate, and stable versions. FORGE discovers published GitHub Releases, ignores drafts and malformed or unsupported versions, chooses only the highest strictly newer compatible release, then hands its validated metadata feed to the downloader. Both channels reject equal or older versions, so changing channels never authorizes a downgrade.

Existing settings that contain the former Preview preference migrate to Beta. This supports the alpha.3-to-Beta transition but does not permit future alpha builds on the Beta channel.

For a clean trusted source checkout on macOS, run `npm run update:mac`. It fast-forwards `main`, preserves `.obsidian`, packages and verifies the universal bundle, installs `/Applications/FORGE.app`, and opens it. `npm run package:mac:universal` plus `npm run install:mac` remains the manual two-step packaging path. Use `forge-session --runtime-info` to confirm the installed UI/runtime version and source commit, or run `forge-session --workspace "$PWD"` for a specific workspace.

On Windows, close FORGE and run `npm run update:win` in PowerShell. It fast-forwards the trusted checkout, preserves `.obsidian`, runs native NSIS packaging, installs silently, and verifies that the installed `app.asar` matches the package. On Linux, use `./scripts/package-linux.sh` for standalone AppImage/DEB artifacts. FORGE-OS users run `cd ~/FORGE-OS && ./update.sh`; that transaction updates both trusted sibling repositories, checkpoints the OS integration, preserves `.obsidian`, installs the pinned Linux runtime, and restores both source checkouts if installation fails.

The session path is deliberately stable across upgrades: macOS bundle replacements target `/Applications/FORGE.app`, while `/usr/local/bin/forge-session` continues to dispatch to that single location. Future automatic Electron updates still require a properly signed and notarized macOS release; unsigned builds must be installed through this verified local flow.

## 🧯 12. Troubleshooting

### macOS blocks the first launch

Control-click FORGE and choose **Open**, or approve it under **System Settings → Privacy & Security**. The beta remains ad-hoc/unsigned unless the published workflow proves a Developer ID signature and notarization.

### The old UI still opens after replacement

Check both `/Applications/FORGE.app` and `~/Applications/FORGE.app`. macOS can retain two apps with the same bundle identifier and launch the older user-level copy. Open the system Applications copy explicitly, then verify **Settings → About this build** before removing any duplicate.

### Electron reports that it is uninstalled

Verify `node_modules/electron/dist/Electron.app`. If it is absent after `npm install`, run:

```sh
node node_modules/electron/install.js
```

### The AI key is missing

Open **Settings** and save an API key. If Electron cannot reach secure operating-system credential storage, FORGE refuses to save the secret rather than writing it in plaintext.

### The chosen model is unavailable

Open **Settings**, refresh the provider model list, and validate the exact model ID. Availability can differ by API key and compatible provider. FORGE keeps a manually entered ID for future compatibility but reports unsupported-model responses clearly.

GPT-5.6 tool-capable requests use the Responses API. If a compatible provider implements only Chat Completions, choose a model/path that provider supports; FORGE does not disable reasoning or silently drop tools to conceal an incompatible endpoint.

### Git actions fail

Open **GitHub**, save a fine-grained token, and test the connection. Confirm the workspace is a Git repository and the `origin` remote is an HTTPS `github.com` URL. SSH and non-GitHub remotes continue to use system Git credentials.

### Local install cannot update `/Applications`

Resolve permissions through Finder or the account that owns `/Applications/FORGE.app`. The install script intentionally does not invoke `sudo` and does not fall back to `~/Applications`.

### Agent tool request is pending

Open **Agent Actions**, inspect the exact scope, and choose Run once, the offered exact-scope session permission, or Reject. A model tool call never approves itself.

### Terminal session will not start

Confirm the app was packaged with `node-pty` unpacked and that its `spawn-helper` is executable. From source, rerun `npm install`; FORGE's postinstall repairs the helper permission and missing Electron vendor app.

If a command resolves but macOS reports that it cannot verify the executable, the PTY is working and Gatekeeper is blocking that separately installed CLI. Verify the binary's origin and signature, then approve only that exact executable through macOS security controls or reinstall it from a trusted source. FORGE does not disable Gatekeeper globally.

### A task says a process disappeared

Open the task and inspect its saved output path, expected artifacts, and external references. Resume does not rerun it automatically. Record a verified checkpoint if reality proves completion, or retry only after confirming the action is safe and approving its exact tool request.

## 🔐 13. Data safety

Project files are real files. Git actions are real Git actions. Keep a backup, review changes before remote operations, and do not delete `.forge/metadata.sqlite` unless you intend to remove FORGE's local project metadata, persistent tasks/checkpoints/events, layouts, conversation threads, audit history, and durable memories.
