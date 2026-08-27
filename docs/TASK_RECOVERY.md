# Persistent Task Recovery

Task recovery resumes workspace-owned work from observed evidence, not from a previous model's narrative.

```text
load task + steps + checkpoints + events + audit references
  → inspect current files, Git, known processes, artifacts, and external state
  → locate the last verified checkpoint
  → continue the first dependency-ready unfinished step
  → record evidence and outcome
```

## Reconciliation rules

- Do not repeat a completed step without contradictory current evidence.
- Do not mark a step complete from chat text or another model's claim.
- A missing process without completion evidence is missing/blocked, not automatically restarted.
- A running process with matching workspace/task identity remains running; read bounded output before deciding.
- Verify expected artifact paths, hashes, exit codes, Git state, and remote references appropriate to the step.
- Retry only when the operation is safe/idempotent or its rollback/recovery path is understood.
- Persist new checkpoints and audit references so another runtime can resume.

## Common cases

### Background process

Inspect the recorded PID/state, bounded task output, expected artifacts, and exit evidence. A live matching process remains running. A clean exit plus verified artifacts may complete the step. A missing process with no evidence remains blocked.

### Git operation

Re-read branch, HEAD, upstream/divergence, and working tree. A commit step completes only when the expected commit and exact staged/content evidence exist. A push completes only when the remote ref contains the commit.

### Release upload

Inspect tag provenance, workflow/release state, asset names, manifest, and remote digests before uploading again. A byte-identical remote asset satisfies the upload; a same-name mismatch fails closed and requires explicit human recovery outside automatic resume.

### Workspace switch

Tasks belong to one workspace ID. Switching workspaces clears runtime-scoped services but does not delete task state. Foreign task/step identifiers cannot attach evidence in the new workspace.

## Cancellation and deletion

Cancellation stops supported running work and records the observed outcome. Tracking-only cancellation is used when FORGE cannot safely terminate the external operation. Deleting a task removes its task-owned definition/checkpoints/events; it does not delete project files, Git history, conversations, or durable memory.

The current runtime does not restore approval state because the approval subsystem has been retired. Resumed calls still pass through current schemas, containment, runtime availability, cancellation, output bounds, redaction, and audit recording.
