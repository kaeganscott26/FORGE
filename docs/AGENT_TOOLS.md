# FORGE Agent Tools

FORGE 1.1 introduces provider-neutral, policy-controlled tools. A model sees stable tool names and schemas, but it never receives an executor, Node API, shell, credential, or IPC channel. Native provider calls and the strict `forge_tool_request` fallback normalize into the same internal request and are validated before policy evaluation.

## Runtime flow

```text
Model → Agent → Tool Registry → Policy Engine → Approval Manager
      → Executor → Filesystem / Git / Shell / Web
      → Structured Tool Result → bounded, redacted Agent context → User
```

Dependency injection keeps the registry/router independent of Electron and prevents circular package ownership. `@forge/agent-tools` coordinates definitions and execution; `@forge/tool-policy` owns risk and session decisions; `@forge/shell` owns child processes and PTYs; `@forge/web` owns external HTTP controls. Existing workspace, Git, storage, AI, and IPC packages remain authoritative for their domains.

## Tools

| Tool | Tier | Approval | Effect |
| --- | ---: | --- | --- |
| `file.list`, `file.read`, `file.search` | 0 | automatic | Bounded workspace inspection |
| `file.create`, `file.write`, `file.patch`, `file.rename`, `file.move`, `directory.create` | 1 | explicit or exact scoped session | Reversible workspace change |
| `file.delete` | 2 | always | Backup then remove source path |
| `terminal.read` | 0 | automatic | Read bounded, redacted recent terminal evidence |
| `git.status`, `git.diff`, `git.log`, `git.branches` | 0 | automatic | Read Git evidence |
| `git.stage`, `git.unstage` | 1 | explicit or exact path-set session | Change the index for listed paths |
| `git.commit`, `git.pull`, `git.push` | 2 | always | Local history or remote mutation |
| `shell.run` | 2 | always | Spawn one executable with an argument array |
| `web.search`, `web.fetch`, `web.open` | 2 | always and web enabled | Bounded external research |

Every definition includes purpose, Zod input/output schemas, risk, approval rule, workspace-boundary rule, timeout, audit metadata, cancellation behavior, target/effect descriptions, and network disclosure. Unknown names and invalid arguments fail closed.

## Results and context

Results contain success, affected paths, diff, warnings, error code/details, rollback data, exit code, duration, truncation, and cancellation state where applicable. Automatic Tier 0 results are bounded and redacted before the agent produces its final answer. After an approved Tier 1/2 action, FORGE records the result, asks the agent to continue using the bounded result, persists the continuation in the same workspace conversation, and shows the inspectable raw structured result locally.

Tool results are labeled `Tool Result`. Web evidence is labeled `External Web`; it is not presented as workspace evidence. Shell and terminal output are never automatically indexed into durable memory.
