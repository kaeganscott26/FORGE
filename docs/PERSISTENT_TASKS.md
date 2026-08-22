# Persistent Tasks

Tasks belong to the workspace, not a conversation, provider, model, or Hermes session. Their state, steps, checkpoints, artifacts, external references, event history, process tracking, and audit linkage live in `.forge/metadata.sqlite`.

When a task resumes, FORGE reconciles the stored task with the workspace, Git state, tracked processes, and supplied external evidence. It continues from the first dependency-ready unfinished step. Valid tool calls execute directly through the shared `ToolRouter`; task progression pauses only when the task completes, is cancelled/paused, becomes genuinely blocked, or needs information the agent cannot determine.

Tasks preserve retries, timeouts, cancellation, verification checkpoints, atomic-write rollback metadata, and bounded audit evidence. A successful tool result is observed evidence, not automatic proof that a verification criterion is complete.

Legacy `task_approvals` and `task_steps.approval_state` SQLite structures are retained temporarily so existing workspace databases open safely. Current task/runtime code does not read either structure or write `task_approvals`; older databases with the non-null `approval_state` column receive only the inert `not-required` compatibility value while a future table rebuild removes that column safely.
