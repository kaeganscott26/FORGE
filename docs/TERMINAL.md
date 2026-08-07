# 🖥️ Integrated Terminal

The terminal is where FORGE becomes a shared workspace for the tools you already use. It opens at the active project root, so a CLI agent, compiler, formatter, test runner, or ordinary shell command works against the same real files and Git repository visible in FORGE.

## 🚀 Launch the agent that fits the task

Install a CLI on your Mac, open **Terminal** in FORGE, select **New**, and run it as you normally would:

```sh
codex
claude
ollama
opencode
```

Those names are examples. FORGE does not maintain a vendor-specific terminal adapter or decide which agent you should use. If a future tool exposes a CLI and can run in your shell, it can work in the same workspace.

This is intentional: choose the agent for the job while keeping the project’s files, documentation, Git history, task evidence, and workspace memory stable.

## 🧭 Use the terminal safely

The terminal is a **user-controlled PTY**, not an agent permission bypass.

- **New** creates a shell at the active workspace root.
- **Clear visible** clears only xterm.js; it does not erase the process or audit data.
- **Copy output** copies selected or bounded recent output.
- **Cancel** terminates the active PTY.
- **Restart** creates a fresh shell in the same validated workspace directory.
- Exit codes and running/exited state remain visible in the terminal header.

FORGE keeps user terminal input separate from a model-requested `shell.run` action. A model cannot type into your terminal. Agent shell requests appear in **Agent Actions**, disclose their executable, arguments, working directory, and effect, and always require one-time approval.

## 🧠 What stays with the project

A terminal agent does not need FORGE-specific magic to work. It sees the real project folder. FORGE’s value is that the rest of the workspace remains available around that terminal session:

- Explorer and editor show the same files the CLI changes.
- Source Control shows the same real Git state.
- Documentation explains the architecture and constraints the next agent should respect.
- Persistent tasks and handoffs preserve verified progress outside any one CLI transcript.
- Workspace memory and conversations remain attached to the folder, not the terminal process.

If a CLI creates or changes files, review the result in the Explorer and Git panel before committing. The terminal does not make changes automatically trustworthy.

## 🔐 Runtime boundary

Keyboard data is bound to the selected terminal session through a fixed `terminal.input` IPC channel. The main process verifies that the session belongs to the active workspace, is still running, and receives bounded null-free input. Absolute paths and `..` escapes are rejected for normal terminal working-directory selection.

The shell receives a narrow, non-secret interactive environment: user identity, selected shell, terminal identity, and standard Homebrew/user executable paths. API keys, GitHub tokens, and unrelated parent environment values are not forwarded. This lets Finder-launched packaged builds resolve installed CLIs without turning the terminal into a credential transport.

Terminal output is bounded in memory. You may copy it or deliberately attach it as evidence, but FORGE does not automatically index it into project memory, conversations, or the audit log.

## 🛠️ Troubleshoot a CLI

| Symptom | What to check |
| --- | --- |
| `command not found` | Confirm the CLI is installed and reachable from your normal shell. FORGE forwards common user/Homebrew executable paths, not every shell initialization side effect. |
| macOS blocks the CLI | Gatekeeper has blocked that separately installed executable. Verify its origin/signature and approve only that binary through macOS security controls. FORGE never clears quarantine metadata. |
| Input is ignored after exit | Exited sessions reject writes by design. Use **Restart** to create a fresh shell. |
| The command starts in the wrong folder | Open the intended workspace first, then create a new terminal session. The displayed working directory is the authority. |
| A model suggested a command | Review and approve it in **Agent Actions**; it cannot be injected into the user terminal. |

## 🧪 Packaging note

`node-pty` is unpacked from `app.asar` so its native module and helper can execute. Universal packaging rebuilds and merges the app executable, `pty.node`, and `spawn-helper` for `arm64` and `x86_64`.

Automated tests cover ownership, exit rejection, restart, and input-routing contracts. A final release acceptance pass should still type a simple command such as `pwd` in the packaged application, because source-level tests are not a substitute for human terminal interaction.
