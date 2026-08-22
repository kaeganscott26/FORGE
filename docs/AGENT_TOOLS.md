# FORGE Agent Tools

FORGE tools are provider-neutral execution capabilities. A model receives only stable tool names and semantic schemas; it never receives an executor, Node API, shell, credential, IPC channel, or internal task metadata.

## Runtime flow

```text
Model / Hermes → Tool Registry → schema validation → runtime-context injection
               → Tool Router → Executor → structured, audited result → agent continues
```

`@forge/tool-runtime` owns registry, validation, request/result contracts, and execution context. `@forge/agent-tools` owns the shared definitions and router. `@forge/shell` owns child processes and PTYs, while `@forge/web` owns configured external HTTP controls. The workspace, Git, task, storage, AI, and IPC packages remain authoritative for their domains.

No FORGE policy engine, approval queue, approval grant, session permission, or approval IPC channel exists in this flow. A registered tool that is available on the current platform and receives valid semantic arguments executes immediately. OS permissions, schema/path validation, timeouts, cancellation, atomic writes/rollback, secret redaction, loop protection, and audit logging remain in effect.

## Tool metadata

Definitions describe a tool's name, purpose, Zod input/output schemas, side-effect category, workspace relationship, timeout, audit metadata, cancellation behavior, target/effect description, network capability, and bounded-result behavior. They do not classify approval requirements.

Representative capabilities include bounded file/terminal/Git inspection; atomic file create/write/patch/move/delete operations with rollback metadata; shell and background-process execution; Git mutations; visible browser navigation and interaction; configured web/GitHub operations; and durable task creation, checkpoints, cancellation, and process tracking.

## Context, audits, and recovery

Provider-visible schemas contain only operation arguments. FORGE injects workspace, conversation, model, request, task-step, and audit identity after schema validation. Provider-authored `taskContext`, `reason`, and internal identifiers are discarded. Task linkage comes only from the active FORGE task runtime.

Every execution records sanitized inputs, execution state, duration, result summary, affected paths, exit code, and rollback metadata where relevant. The Agent Actions panel is an activity/audit view with cancellation controls; it is not an approval queue.

Tool results are bounded and redacted before returning to the agent. Missing files, optional executables, page changes, transient network failures, and comparable recoverable errors return structured evidence so the agent can choose another valid action. Unknown tools and invalid schemas fail before execution. Cancellation, timeouts, and progress-aware loop protection prevent runaway work without introducing an approval pause.
