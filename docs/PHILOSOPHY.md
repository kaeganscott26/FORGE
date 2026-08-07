# 🧠 Workspace Before Model

FORGE explores a simple idea: the AI should be replaceable, but the workspace should not be.

## ✨ The problem with a chat-first workflow

AI-assisted programming can feel magical until the context disappears. A new model, a cleared chat, a different IDE, or a terminal session can force a developer to re-explain the project: what matters, what changed, what has been verified, and what must not be repeated.

That friction is not just a prompt problem. It is a workspace-ownership problem.

FORGE keeps project understanding attached to the project instead of attaching it to one provider’s conversation format. The folder, documentation, Git evidence, structured tasks, checkpoints, memory, and audit trail remain the durable record. A model sees bounded context from that record; it does not become the record.

## 🔁 Choose agents by task

Different work calls for different strengths. A large refactor may suit Codex. Offline experimentation may suit Ollama. A specialist agent introduced tomorrow may be the right tool for a new job.

| Question | FORGE's answer |
| --- | --- |
| Which AI IDE should I lock into? | You do not have to. Keep the workspace and choose an agent per task. |
| What happens when I change models? | The project files, docs, task history, and workspace memory stay put. |
| Can a CLI agent work here? | Yes. Launch it in the user-controlled terminal at the active workspace. |
| Does an AI conversation own the task? | No. Tasks and checkpoints are workspace-owned and survive chat changes. |

The terminal makes this practical. FORGE can host the same real project folder where you launch OpenAI Codex, Claude Code, Ollama, OpenCode, or another installed CLI. These tools are not absorbed into a proprietary abstraction; they stay themselves, while the workspace stays coherent.

## 🧭 What remains stable

FORGE is built around a few durable invariants:

- **Files are real.** The project directory remains the source of truth; FORGE does not create a hidden remote copy.
- **Documentation is evidence.** Architecture, decisions, and release records shape context and guide the next contributor.
- **Tasks survive conversations.** Structured task state, checkpoints, artifacts, and handoffs live with the workspace.
- **Memory is explicit.** Derived indexed knowledge and durable memories have different semantics and never silently delete source files.
- **Authority is bounded.** Models request actions; FORGE validates, approves, executes, and records them through a policy boundary.
- **The model is replaceable.** Provider adapters can change without changing workspace ownership or policy.

## ⚡ Why this improves vibe-coding

Vibe-coding works best when ideas can move quickly without losing the reasoning behind them. FORGE reduces the cost of returning to a project because the project carries its own context:

1. Open the workspace instead of reconstructing it from a chat transcript.
2. Let the chosen agent inspect bounded, relevant evidence.
3. Use the terminal when a CLI agent or normal tool is the best fit.
4. Preserve task checkpoints and reviewable Git evidence as work progresses.
5. Switch agents without resetting the project’s memory of what has happened.

FORGE is not trying to build a smarter chatbot. It is trying to build a workspace where many kinds of intelligence can work responsibly over the same long-term project context.

## 🏗️ Architectural consequence

This philosophy leads directly to the runtime design: Electron main-process services own privileged operations; the renderer is a constrained interface; the workspace database owns conversations, tasks, layout, memory, and audit records; and providers adapt into a stable policy and tool contract.

Read [Architecture](ARCHITECTURE.md) for the implementation map and [Integrated Terminal](TERMINAL.md) for the human-controlled CLI boundary.
