xq# 🧰 FORGE Tools in Plain English

This is the practical guide to what the built-in agent can ask FORGE to do in **v2.3.0-beta.1**. A tool request is never direct access to your Mac: FORGE checks the request, shows approval when needed, performs the operation inside the active workspace boundary, records the result, and returns limited evidence to the model.

## 🧭 How an agent works

1. You ask for work in the built-in chat.
2. FORGE gathers a bounded amount of relevant workspace evidence and offers only the capabilities available in the current app configuration.
3. The model can inspect first, then request the next useful tool action.
4. FORGE either runs an allowed read or asks you to approve the exact change, command, or network action.
5. FORGE returns the observed result. The agent can continue while the workspace changes, but an identical request against unchanged observed state is suppressed.

An approval is not a blanket permission. A session approval is limited to the active workspace, tool, and exact path scope; it expires within one hour and disappears when the workspace changes. A task, chat, or earlier agent response never grants future execution authority.

## ✅ What can happen without a prompt

Read-only workspace and Git inspection is automatic. Public `web.search`, `web.fetch`, and `github.read` are also automatic only when their required capability is enabled and configured; they do not send workspace files by default. Every result is bounded and sanitized before it returns to a model.

| Tool commands | What they do |
| --- | --- |
| `file.list` | List workspace files and folders, beginning at the root. Large lists return an offset to continue. |
| `file.read` | Read a bounded range of one text file by line or character offset. |
| `file.search` | Search supported workspace text files. |
| `terminal.read` | Read limited, redacted recent output from a visible user terminal session. It cannot type into that terminal. |
| `git.status`, `git.diff`, `git.log`, `git.branches` | Inspect repository state, diffs, history, and branches. |
| `web.search`, `web.fetch` | Search or retrieve a safe public HTTP(S) page when Web Research is enabled. The query or URL is visible in the audit record. |
| `github.read` | Read bounded repository metadata, branches, commits, issues, pull requests, workflow state, releases, or release assets for the active GitHub origin. |
| `task.inspect` | Read a persistent task and its checkpoint evidence. |

## ✋ What requires your approval

FORGE derives the audit reason and execution identity internally. It shows the tool name, inferred reason, target, working directory, predicted file diff or paths where available, network use, and expected effect before an approval-required action. Models provide only semantic operation arguments.

| Tool commands | What approval allows |
| --- | --- |
| `file.create`, `file.write`, `file.patch` | Create, replace, or make a targeted text change. Writes are atomic and preserve a rollback backup where applicable. |
| `file.rename`, `file.move`, `directory.create` | Rename or move a path without overwriting, or create a workspace directory. |
| `file.delete` | Back up and then remove one workspace path. This always needs a fresh Run once approval. |
| `git.stage`, `git.unstage` | Change the Git index for only the listed paths. |
| `git.commit` | Create a commit from the exact staged set. This always needs a fresh approval. |
| `git.pull`, `git.push` | Receive remote Git changes or send local commits. This always needs a fresh approval and uses the configured Git credentials. |
| `shell.run` | Run one executable with an argument array in the workspace. The request declares `offline`, `network`, `package-manager`, or `git` network intent; this is a disclosure and policy guard, not an operating-system network sandbox. |
| `browser.open` | Open one validated public page in the visible FORGE Browser. |
| `browser.read`, `browser.find` | Automatically return bounded rendered text or matching excerpts from the visible Browser page when Web Research is enabled. |
| `browser.savecontext` | Save an agent-written page summary in workspace durable memory. |
| `github.mutate` | Make one typed GitHub change: create/update/comment on an issue, create a branch or file, create/comment on a pull request, retry a workflow, or create/update a release. |
| `task.create`, `task.resume`, `task.pause`, `task.cancel`, `task.checkpoint`, `task.handoff` | Create or update workspace task tracking, record a checkpoint, or write a human-readable task handoff. Task tracking alone never starts work. |
| `task.process.start` | Start one approved detached task process with output under `.forge/task-output`. Starting it does not prove the task step completed. |

## 🔐 Boundaries worth knowing

- All normal workspace paths are relative to the opened project. FORGE rejects absolute paths, `..` traversal, and symlink escapes.
- A model does not receive a shell, Node.js, raw IPC, or credential values. It requests named tools; FORGE performs validation and execution.
- The integrated terminal is yours. A model cannot inject keystrokes into it. Review ordinary terminal/CLI changes in Explorer and Source Control.
- Web pages are external data. Public HTTP(S) only is allowed; local, private-network, credential-bearing, and unsafe redirect destinations are blocked. Browser page text needs a separate approval before it is sent to a model.
- Tool results, task events, and audit entries are evidence, not hidden reasoning. They are bounded and redact likely secrets.

## 🤖 Choose or change a model

Open **Settings → API integration**, enter the provider base URL and model ID, then save. Use **Refresh provider models** to load the provider’s catalog, **Validate model** to check an exact ID, and **Test saved model and API connection** before starting important work.

- Remote OpenAI-compatible providers require an API key and an HTTPS base URL.
- A loopback provider, such as Ollama at `http://127.0.0.1:11434/v1`, may run without a key. Compatible local models receive every capability currently available from the FORGE registry; the same validation and approvals apply regardless of provider.
- Changing the model changes the provider protocol and reasoning quality, not workspace ownership or tool policy. Files, Git history, tasks, conversations, durable memory, and audit evidence remain with the workspace.
- GPT-5.6 tool-capable models use the Responses route. Other compatible providers use the Chat Completions route; either way, FORGE validates the same tool contracts.

For credential details, environment variables, and release settings, read [User Configuration](../UserConfig.md). For the lower-level schemas and policy implementation, read [Agent Tools](AGENT_TOOLS.md) and [Tool Security](TOOL_SECURITY.md).

## 🚧 Limits of the current beta

An agent can make a long, meaningful sequence of dependency-ready requests, but it cannot override approvals, read outside the workspace, access secrets, use disabled capabilities, or claim a result before FORGE returns it. It can still misunderstand intent or produce poor changes; review diffs, commands, and commits.

The current built-in hosted-provider path is one agent runtime, not the permanent owner of workspace intelligence. CLI agents such as Codex, Claude Code, Ollama, and OpenCode can work in the integrated terminal against the same files, but they do not automatically inherit FORGE memory or send their terminal transcript back into durable memory. Plugin-contributed executable tools, a cross-restart process supervisor, scheduled remote monitoring, semantic/embedding retrieval, code-split renderer performance work, Developer ID signing, notarization, and a trusted unattended macOS update path remain incomplete.
