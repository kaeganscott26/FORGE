# 🧭 Task Recovery

## 🔄 Resume invariant

Persisted state is a lead, not proof. Resuming always audits reality before deciding what is unfinished.

```text
load task
  → validate active workspace ownership
  → load checkpoints, dependencies, approvals, artifacts, and external references
  → inspect Git and saved process IDs
  → accept configured external observations only with evidence
  → reconcile stale running/waiting/failed state
  → preserve completed steps
  → select first dependency-ready unfinished step
  → require fresh policy approval for Tier 1 or Tier 2 execution
```

Another model's prose is never completion evidence. Provider/model metadata is provenance only and does not affect routing or authority.

## 🧪 Reconciliation rules

- A verified completed observation completes a step and creates a checkpoint.
- An already completed or skipped step is not repeated.
- A live saved PID keeps its step running.
- A missing PID plus no completion evidence blocks the step and preserves its PID/output path for investigation.
- A missing PID plus verified remote/local completion reconciles to completed.
- A checksum mismatch is failed, not waiting.
- A queued workflow, approval request, active upload, or unmet external condition is waiting/running rather than failed.
- A failed dependency prevents downstream execution.
- A task from another workspace is rejected before reconciliation.
- A completed or cancelled task is not restarted by Resume.

## 🧯 Recovery playbooks

### Application or AI session interruption

Open **TASKS**, select the task, inspect the handoff/evidence, and choose **Resume**. FORGE re-reads Git and known PIDs. Generate a fresh handoff if the prior projection is stale. Do not reconstruct completion from the old chat transcript.

### Local process disappeared

Read the step's `.forge/task-output/` log and inspect expected artifact paths. If exit and artifact evidence satisfy the criteria, record a verified checkpoint linked to the relevant audit result. Otherwise keep it blocked or retry only after confirming the operation is idempotent and receiving fresh approval.

### Upload interrupted

Inspect the remote release before starting another upload. If the named asset exists, download or otherwise obtain a bounded remote digest and compare it with the validated local SHA-256. Matching bytes complete the upload step. A mismatch fails the step and forbids replacement until a human chooses recovery. Missing assets may be uploaded serially with fresh Tier 2 approval.

### Workflow queued or GitHub unavailable

Queued/running is `waiting`; a transient 502 or network outage is `waiting` or `blocked` with retry metadata. Record the workflow run ID. Do not create a second run, pull request, tag, or release simply because status could not be fetched.

### Partial release

Reconcile tag commit, workflow run, draft/published state, DMG, ZIP, blockmaps, updater YAML, and remote hashes independently. Continue at the first missing or invalid item. The repository upload script skips byte-identical remote assets and fails closed when an existing name has different bytes.

### Stale installation or updater cache

Inspect `/Applications` and `~/Applications` for duplicate FORGE bundles, record the selected bundle path, and compare packaged diagnostics with the intended tag/commit. Treat updater cache cleanup or app replacement as a separate explicit action. Never infer installation success from a downloaded DMG.

## 🤝 Safe handoff checklist

The handoff should identify:

- objective and task ID;
- verified completed steps and checkpoints;
- current/next step and dependencies;
- waiting conditions and blockers;
- PID/output path and artifact paths;
- branch, commit, tag, PR, workflow, and release references;
- local and remote hashes;
- exact next action and its risk tier;
- operations that must not be repeated;
- unsupported or still-unverified claims.

See [Persistent Tasks](PERSISTENT_TASKS.md) for the data model and [Releasing FORGE](../RELEASING.md) for release-specific evidence.
