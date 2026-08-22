# ✅ Persistent Tasks

## 🧭 Operating model

Traditional IDEs manage files. AI assistants manage conversations. FORGE manages project understanding and durable workspace execution.

The workspace owns a task. A provider, model, conversation, renderer, or application process may disappear without deleting the task. The authoritative record is the active workspace's `.forge/metadata.sqlite`; chat and Markdown handoffs are projections of that record.

The permanent execution rule still applies:

> The model requests work. FORGE owns state, authorizes tools, records progress, and verifies outcomes.

Creating a task does not grant permission to execute it. Every non-read step still passes through the existing registry, side-effect policy, approval manager, executor, and action log. There is no approve-the-task-forever mode.

## 🗂️ Implemented data model

Schema version 4 retains the existing workspace tables and adds normalized task state:

- `tasks`: identity, type, status, current step, timestamps, conversation and model provenance, progress, interruption/resume state, Git/release/workflow fields, known process IDs, and external identifiers;
- `task_steps`: ordered typed steps, risk/tool contract, expected input/output, attempts, retry/timeout policy, approval state, process/output fields, artifacts, verification, rollback, and audit references;
- `task_dependencies` and `task_step_dependencies`: task and step DAG edges;
- `task_checkpoints`: verified or unverified facts and their evidence;
- `task_artifacts`: local or remote artifacts, sizes, hashes, and verification time;
- `task_external_references`: pull requests, releases, workflow runs, assets, processes, and URLs;
- `task_approvals`: exact approval decisions and expiration metadata;
- `task_events`: append-only transition history linked to an audit entry when one exists.

All records carry or inherit the active project ID. Storage methods reject foreign task, step, conversation, audit, and reality-snapshot identifiers.

Task statuses are `draft`, `ready`, `running`, `waiting`, `blocked`, `paused`, `failed`, `cancelled`, and `completed`. Step statuses are `pending`, `running`, `waiting`, `blocked`, `failed`, `skipped`, and `completed`. Progress is derived from structured steps, not only prose.

## 🧪 Transitions and evidence

Every state transition creates a task event. A successful tool result is evidence that a tool ran successfully; it is not automatically proof that all step verification criteria passed. FORGE therefore records a tool-result checkpoint and moves the step to `waiting` unless it is a background process that is still `running`. An explicit verified checkpoint is required to complete the step.

Verified checkpoints that cite an action-log record are accepted only when that record exists in the active workspace. Failed tool steps retain bounded output, exit code, retryability, rollback guidance, and a suggested next action when available. Structured evidence is sanitized before persistence.

Completed and skipped steps satisfy dependencies. A dependency-aware resume chooses the first unfinished step whose dependencies are complete. Cyclic and foreign dependencies are rejected at task creation.

## ⚙️ Background processes

`task.process.start` requires an explicit Run once approval. It starts an executable with an argument array, workspace-contained working directory, filtered environment, timeout, detached process group, and append-only output file under `.forge/task-output/<task-id>/`. FORGE persists the PID, start time, output path, tool request, approval, and audit linkage.

The child may continue without an active model turn and, where the operating system permits, after the Electron process exits. FORGE does not poll it continuously. On resume it checks the saved PID. If the PID is gone and there is no verified completion evidence, the step becomes blocked instead of being rerun or falsely completed.

Implemented limitation: a child that exits after the application process has ended cannot report its exit code back to the old process. A replacement session must inspect bounded output and any expected artifacts or external state, then record a verified checkpoint. A durable supervisor and event-driven GitHub workflow watcher are planned orchestration, not current functionality.

## 🛠️ Task tools and UI

The provider-neutral registry exposes:

- Tier 0: `task.inspect`;
- Tier 1: `task.create`, `task.resume`, `task.pause`, `task.cancel`, `task.checkpoint`, and `task.handoff`;
- Tier 2: `task.process.start`.

Existing filesystem, Git, shell, terminal, browser, and web tools receive task/step linkage through the internal `ToolExecutionContext`. Providers do not see or supply this metadata. The policy tier of the underlying tool does not change.

The renderer has a dedicated **TASKS** view, separate from chat. It shows progress, current step, blocker, checkpoint, related conversation/Git/workflow/process state, verification criteria, approvals, and events. Users can inspect, resume, pause, cancel tracking, retry a failed step, open the associated conversation or audit view, and generate/copy a handoff.

Cancelling tracking never silently kills a process. If a process is active, FORGE requires the user to choose tracking-only cancellation or separately authorize termination of the exact process. Tracking cancellation cannot undo a remote release, upload, workflow, or Git mutation.

## 📦 Release template

The first reusable workflow is `Release FORGE <version>`. It defines 26 dependency-linked steps from version/branch validation through tests, packages, Git/PR/tag/workflow/assets, installation, updater verification, and final handoff. The template stores risk, required tool, timeout, retries, expected evidence, rollback guidance, and an annotated tag target.

The template is a plan, not an autonomous release bot. Remote pull-request creation, merge, workflow control, release mutation, installation, and publication remain explicit Tier 2 operations. GitHub reconciliation currently consumes bounded web/tool evidence; a dedicated GitHub task adapter and scheduled event watcher remain planned.

## 🤝 Handoffs

`task.handoff` atomically writes `.forge/handoffs/<task-slug>-<task-id>.md`. It includes the objective, completed/current/waiting/blocked steps, PIDs, branch/commit/tag/PR/workflow, artifacts, verification, next action, and actions not to repeat.

The Markdown file is safe resume context for a human or replacement agent, but SQLite remains authoritative. Editing the projection does not mutate the task.

## 🚧 Implemented versus planned

Implemented now:

- schema migration and workspace-isolated persistence;
- typed task/step/checkpoint/artifact/reference/approval/event state;
- process-aware reconciliation and no-repeat dependency traversal;
- provider/model/conversation-independent task retrieval;
- policy-linked task tools and audit references;
- detached local background start with PID/output persistence;
- dedicated task UI and Markdown handoff;
- release workflow template.

Planned, not claimed:

- unattended multi-step orchestration;
- durable cross-restart process supervisor with exit-status sidecars;
- scheduled/event-driven GitHub Actions and release watchers;
- automatic remote asset discovery or checksum reconciliation without an approved configured integration;
- autonomous approval, release publication, installation, or rollback.
