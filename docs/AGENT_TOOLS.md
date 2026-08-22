# 🛡️ FORGE Agent Tools

FORGE v2.3.0-beta.1 provides provider-neutral, policy-controlled tools. A model sees stable tool names and schemas, but it never receives an executor, Node API, shell, credential, or IPC channel. Native provider calls and the strict `forge_tool_request` fallback normalize into the same internal request and are validated before policy evaluation. For a non-technical guide, see [Tools in Plain English](TOOLING_GUIDE.md).

## ⚡ Runtime flow

```text
Model → Agent → Tool Registry → Policy Engine → Approval Manager
      → Executor → Filesystem / Git / Shell / Web / Task Runtime
      → Structured Tool Result → bounded, redacted Agent context → User
```

Dependency injection keeps the registry/router independent of Electron and prevents circular package ownership. `@forge/agent-tools` coordinates definitions and execution; `@forge/tool-policy` evaluates concrete side effects and exact-scope session authority without numeric tool-risk tiers; `@forge/shell` owns child processes and PTYs; `@forge/web` owns external HTTP controls. Existing workspace, Git, storage, AI, and IPC packages remain authoritative for their domains.

## 🧰 Tools

| Tool | Side effect | Approval | Effect |
| --- | ---: | --- | --- |
| `file.list`, `file.read`, `file.search` | read | automatic | Bounded workspace inspection |
| `file.create`, `file.write`, `file.patch`, `file.rename`, `file.move`, `directory.create` | workspace write | explicit or exact scoped session | Reversible workspace change |
| `file.delete` | destructive | Run once | Backup then remove source path |
| `terminal.read` | read | automatic | Read bounded, redacted recent terminal evidence |
| `git.status`, `git.diff`, `git.log`, `git.branches` | read | automatic | Read Git evidence |
| `git.stage`, `git.unstage` | workspace write | explicit or exact path-set session | Change the index for listed paths |
| `git.commit` | repository write | Run once | Create a local commit from the exact staged set |
| `git.pull`, `git.push` | remote write | Run once | Receive remote changes or send local commits |
| `shell.run` | process | Run once | Spawn one executable with an argument array |
| `web.search`, `web.fetch` | public network read | automatic when web is enabled | Bounded external research with no automatic workspace disclosure |
| `browser.open`, `browser.read`, `browser.find` | remote/read | Run once | Open a validated visible public page or disclose bounded rendered text to the configured model |
| `browser.savecontext` | workspace write | Exact scoped session | Save an agent-authored page summary as durable workspace context |
| `github.read` | read | automatic | Bounded metadata, branches, commits, issues, pull requests, comments, workflows, releases, and assets for the active origin |
| `github.mutate` | remote | Run once | Explicitly approved GitHub REST mutation for issues, branches, files, pull requests, comments, workflows, or releases |
| `task.inspect` | read | automatic | Read the active workspace's structured task evidence |
| `task.create`, `task.resume`, `task.pause`, `task.cancel`, `task.checkpoint`, `task.handoff` | workspace write | explicit or exact scoped session | Change reversible task tracking/projections |
| `task.process.start` | process | Run once | Start a workspace-owned detached argument-array process and persist PID/output |

Every definition includes purpose, Zod input/output schemas, side-effect and approval metadata, workspace-boundary rule, timeout, audit metadata, cancellation behavior, target/effect descriptions, network disclosure, and bounded-result semantics. Unknown names and invalid arguments fail closed.

## 🧠 Results and context

Results contain success, affected paths, diff, warnings, error code/details, rollback data, exit code, duration, truncation, and cancellation state where applicable. Automatic read results are bounded and redacted before the agent produces its final answer. After an approved action, FORGE records the result, resumes the native runtime using bounded evidence, persists the continuation in the same workspace conversation, and shows the inspectable raw structured result locally.

Tool results are labeled `Tool Result`. Web evidence is labeled `External Web`; it is not presented as workspace evidence. Shell and terminal output are never automatically indexed into durable memory.

Filesystem inspection starts at the workspace root. A missing read/list/search path returns a structured recovery result (`missing`, requested path, nearest requested parent, and `restart-at-workspace-root`) instead of abandoning the scan after `ENOENT`.

FORGE does not impose a small fixed tool-count or continuation-round cap. It runs while the runtime has time/context budget, is not cancelled, and continues to observe meaningful progress. Remote providers are asked for one dependency-ready tool call per response, then FORGE supplies its bounded observed result and continues; this prevents a provider-level parallel-call burst from ending a large audit while preserving unlimited progress-aware continuation. An exact normalized call is suppressed only when its arguments, workspace revision, and observed result are unchanged. An approval-required request pauses the loop without losing workspace/task/context state; approval resumes from its bounded result.

If a compatible provider emits strict plain JSON naming an actually offered tool, the adapter promotes it to the same validated request structure as a native call. Unoffered names remain text and cannot reach the router. If the provider repeats an already completed call, FORGE deduplicates it and performs one no-tools synthesis pass over the bounded observed results. This protects small compatible models from repeating a completed file read while preserving genuine validated calls for a different next tool.

Provider-visible schemas contain only arguments needed to perform the operation. `reason`, nested `taskContext`, task-creation conversation identity, workspace/conversation/model identity, and execution audit identifiers are removed from provider schemas; the router injects them into a runtime execution context using the current request and active task step. `task.process.start` also receives its task and step IDs internally. Task association never changes a tool's side effect or approval requirement. Successful linked tool execution creates audit-linked evidence; it does not automatically complete verification criteria. GPT-5.6 tools travel through `/v1/responses`; other compatible provider paths normalize into the same registry contracts. Browser content is external data: a page cannot access Node.js, workspace files, shell, or credentials. When Web Research is enabled, bounded `browser.read` and `browser.find` calls execute automatically; `browser.open` remains explicitly approved.

OpenAI-compatible loopback providers may run without an API key. For example, Ollama at `http://127.0.0.1:11434/v1` receives every tool currently available from `ToolRouter.providerDefinitions()`, including files, Git, terminal evidence, tasks, and configured browser/web or GitHub capabilities. Provider-safe indexed names, stable dotted names, and unambiguous legacy `forge_<tool_name>` aliases resolve only within that offered catalog. Model capability still matters, and all returned calls remain subject to normal validation, side-effect policy, approval, execution, and audit. Remote providers continue to require authentication.

Task linkage comes from the active FORGE task runtime, not provider arguments. Legacy provider-authored `taskContext` and `reason` values are discarded during enrichment, so stale, foreign, or invented metadata cannot block an otherwise valid semantic tool request or attach evidence to another task.

Approval projection and evidence projection are separate. A direct `task.checkpoint` request records its pending/approved/rejected decision against the task step, but the checkpoint result is not reprocessed as ordinary step tool evidence. Task-context file/shell results and direct task process starts retain both links.
