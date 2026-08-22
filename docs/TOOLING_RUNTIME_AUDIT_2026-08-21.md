# FORGE cross-platform tooling runtime audit — 2026-08-21

Status: approved, implemented, and published. FORGE commit `78b355d` contains the shared runtime repair, context-score removal, and macOS/Windows update entry points; FORGE-OS commit `ae9186d` contains the update-transaction repair.

Scope:

- FORGE model-tool registry, policy, provider adapter, native agent runtime, IPC contract, preload bridge, main-process handlers, Git, shell/terminal, browser/web, task, storage, memory/intelligence, packaging scripts, generated desktop main bundle, and the current packaged macOS `app.asar`.
- FORGE-OS build/runtime handoff, compatibility overlays, session launchers, runtime identity, and live workspace audit evidence.
- No source code was changed during the audit. This document is the requested findings/change log.

Implementation note: source changes made after approval are tracked by the commits that include this audit log; the read-only audit boundary above remains historical evidence of the pre-change state.

## Executive findings

1. **Confirmed: Ollama is deliberately restricted to file tools before it can call the router.**
   `packages/ai/src/openai.ts` defines `LOCAL_FILE_TOOLS` and filters every loopback provider to that set in `chatWithTools`. This removes `terminal.read`, all Git tools, browser/web tools, GitHub tools, shell execution, and persistent-task tools from the catalog sent to Ollama. The restriction applies to any loopback OpenAI-compatible provider, not just Ollama.

2. **Confirmed: the FORGE-OS UUID error is caused by untrusted optional task metadata, not by a missing UUID generator.**
   `packages/agent-tools/src/index.ts` adds optional `taskContext` to nearly every tool and requires `taskContext.taskId` to be a UUID. FORGE-generated workspace, conversation, task, step, terminal, browser, memory, and storage identifiers already use `crypto.randomUUID()`. The failing value is model-authored metadata. The FORGE-OS action log contains a rejected `file.read` with `taskId: "current"` and `stepId: "1"`, producing `Invalid arguments for file.read: Invalid uuid`.

3. **Confirmed regression: invalid or invented task context used to be stripped before tool validation.**
   Before the native-runtime extraction, the agent loop checked an offered tool's `taskContext` against persisted task/step state and removed a stale, foreign, or invented link before calling `ToolRouter.request`. `apps/desktop/src/main/native-agent-runtime.ts` now passes the model call directly to the router. Commit `19fb3ad` worked around the symptom only for `file.list` by removing `taskContext` from that one schema; `file.read`, `file.search`, Git, terminal, browser, web, shell, writes, and other tools retain the failure path.

4. **Confirmed: Ollama tool aliases are restored only on an exact indexed alias match.**
   FORGE offers aliases such as `forge_0_file_write`. The FORGE-OS action log records Ollama returning `forge_file_write`; the adapter did not resolve it and the router logged `Unknown tool name: forge_file_write`. Both native tool calls and strict-JSON fallback need one shared, allowlisted alias resolver that maps only to tools actually offered in that request.

5. **Confirmed: renderer IPC routes are present; duplicating model execution through renderer IPC would be the wrong repair.**
   `packages/ipc/src/index.ts` declares the file, Git, terminal, browser, tool-approval, task, memory, and FORGE-OS channels. `apps/desktop/src/preload/index.ts` derives its allowlist from all `IPC_CHANNELS`, and `apps/desktop/src/main/index.ts` registers handlers for every declared channel. Model calls follow a separate correct security boundary: provider adapter -> native agent runtime -> `ToolRouter` -> main-process services. The broken catalog and normalization occur before execution, not because macOS/Windows/Linux are missing renderer IPC handlers.

6. **Confirmed: all platform packages inherit the same defects.**
   macOS, Windows, and Linux package `apps/desktop/out/**/*` from the same TypeScript source. The current macOS `app.asar` contains the loopback file-only filter and the remaining UUID-constrained `taskContext` schemas. FORGE-OS has no independent AI tool router: `scripts/build-forge.sh` archives the selected FORGE commit, applies any overlays, and runs FORGE's Linux packager. `overlays/` currently contains no patch. Therefore the same source repair must be built natively for each target; no separate FORGE-OS routing fork should be introduced.

7. **Confirmed secondary regression: task approval projection is no longer wired.**
   `taskApprovalLink` remains implemented and tested, but current main/runtime code never calls it when a linked request becomes pending, approved, session-approved, or rejected. Successful tool evidence may later record a consumed approval, but the durable task approval lifecycle is incomplete.

8. **Confirmed compatibility weakness: provider retry logic does not remove the parameter it detects as unsupported.**
   The Chat Completions retry recognizes a broad `unknown/unsupported parameter` error but always removes only `max_completion_tokens`; an Ollama-compatible endpoint rejecting `parallel_tool_calls` would receive it again. The retry also drops the tool-turn output limit from 10,000 to 1,600 tokens. This is not the cause of the recorded UUID/alias failures, but it is in the same local-provider path and needs coverage.

9. **No executor registration gap was found.**
   The current tool registry has executors for its filesystem, Git, terminal, shell, web, browser, GitHub, memory-context, and task definitions. Availability filtering correctly removes browser/web tools when external research is disabled and removes integrations only when their service dependency is absent. Browser reads remain explicit-approval operations because rendered external page content is sent to the configured model.

## Context-health score finding

The large numeric `Context health` value is not workspace-memory content and is not persisted in `.forge/metadata.sqlite`. It is calculated in `apps/desktop/src/main/index.ts` as 65 when a project has a README and 35 otherwise, typed as `DashboardData.contextHealth.score` in `packages/ipc/src/index.ts`, mocked in `apps/desktop/src/renderer/src/forge.ts`, rendered in `apps/desktop/src/renderer/src/App.tsx`, styled in `global.css`, and described in `UserManual.md`.

Planned scope is to remove only this numeric score/label while retaining:

- README presence;
- Markdown note and code-file counts;
- goals, tasks, and recent commits;
- durable and indexed workspace-memory records and management actions;
- internal retrieval ranking needed to select bounded relevant evidence;
- context-source titles, kinds, and selection reasons.

The per-source relevance percentage shown after an agent turn is a separate disclosure field. It is not the dashboard context-health score and is not scheduled for removal unless the user explicitly expands the scope.

## Required changes after approval

### Provider and tool routing

- Remove the blanket loopback `LOCAL_FILE_TOOLS` catalog filter. Pass the same capability-aware `ToolRouter.providerDefinitions()` catalog to Ollama that a remote compatible provider receives. Preserve per-tool availability, validation, approval, network, audit, containment, cancellation, rollback, and redaction rules.
- Add a single provider alias resolver used by Chat Completions, Responses, and strict-JSON fallback. It should accept the exact indexed alias, the stable dotted tool name, and an unambiguous legacy `forge_<underscored-name>` alias only when it resolves to a tool offered in the current request. Unknown or ambiguous aliases must remain rejected.
- Keep provider call identifiers separate from FORGE-owned identifiers where practical. Do not weaken UUID validation for persisted workspace/task entities merely to accept invented model values.
- Make compatible-provider retries remove only the actually rejected optional field and preserve the configured tool-turn token limit. Add explicit Ollama-compatible request/response fixtures.

### UUID and task-context repair

- Restore pre-router reconciliation in `native-agent-runtime.ts`: examine an optional nested `taskContext`, confirm the task and step exist in the active workspace, and strip the entire invalid/foreign link before schema validation. Preserve an exact valid persisted link.
- Keep generated task IDs as UUIDs. Do not coerce strings such as `current` or `fix_git_pull_issue` into durable task IDs.
- Apply the reconciliation uniformly to all tools instead of special-casing `file.list`.
- Return a bounded validation Tool Result to the continuation loop where safe so one malformed model call can be corrected without aborting the entire agent turn; retain a redacted validation-failure audit record.
- Restore pending/approved/session/rejected task approval records through `taskApprovalLink`, and keep successful audit-linked outcome recording through `taskEvidenceLink`.

### Context-health score removal

- Remove `contextHealth.score` from the IPC type, main-process dashboard response, renderer fallback, and dashboard rendering.
- Retain the remaining `contextHealth` facts or rename that object to a neutral dashboard-facts name if doing so improves clarity without migrating stored data.
- Remove obsolete score-specific CSS and update the manual statement. No memory rows, indexes, retrieval code, tasks, conversations, or SQLite schema need deletion or migration.

### Tests and runtime acceptance

- Replace the test that requires loopback file-only filtering with tests proving an Ollama-compatible provider receives all currently available tool families.
- Add native and strict-JSON alias tests for exact, legacy, unknown, and ambiguous names.
- Add regression tests for invalid `taskContext` on file, Git, terminal, browser/web, shell, and write calls; add a valid persisted task/step linkage test.
- Add approval-lifecycle tests covering pending, run-once, session, rejected, consumed, and audit-reference integrity.
- Add an IPC contract test that compares declared channels, preload allowlisting, and main registrations so route omissions cannot silently recur.
- Run typecheck, lint, the full test suite, build, and generated-bundle inspection.
- Validate the packaged macOS application locally. Build and validate Windows on native Windows and FORGE-OS/Linux on the target x86_64 Linux/Arch environment; macOS source tests or an OS guard are not native Windows/Linux runtime proof.
- In each packaged runtime, use a tool-capable Ollama model to prove at minimum: `file.read`, `git.status`, `git.diff`, `git.log`, `terminal.read` against an existing terminal, `browser.open`/`browser.read` with research enabled and approval, an approval-gated write, and rejection of an unknown tool, invalid workspace path, and foreign task link.

## Verification performed during this audit

- FORGE and FORGE-OS were both on `main` aligned with `origin/main`; unrelated existing `.obsidian` modifications were preserved.
- FORGE targeted tooling tests: 9 files passed, 51 tests passed, 1 skipped.
- FORGE `npm run typecheck`: passed.
- FORGE-OS Bash syntax scan across scripts, sessions, tests, `install.sh`, and `update.sh`: zero failures.
- Local Ollama endpoint responded as version `0.32.1` and returned a model catalog. No model generation or workspace-data transmission was performed.
- Current macOS package manifest identifies FORGE commit `19fb3ad`; its `app.asar` contains both the file-only loopback filter and UUID-constrained task context.

## Current verification boundaries

- The installed FORGE-OS runtime on an Arch target was not available in this macOS checkout, and this FORGE-OS repository has no local `build/latest.env`/Linux packaged runtime to inspect.
- No native Windows package or Windows runtime was executed.
- No executable source, generated bundle, package, installed application, Git index, commit, remote, release, or workspace database was changed by this audit. The only audit-created workspace change is this findings document.

## Follow-up finding: tracked `tatus` file

- `tatus` is a 9,936-byte, 83-line ASCII text file containing ANSI terminal color escape sequences. It is not a script, executable, runtime database, IPC route, tool definition, or configuration file.
- Git history shows it was created as the only file in commit `717af08` (`Forge-recovery_patch`). Its content is a captured colored `git diff` of the generated `apps/desktop/out/main/index.js`, including the historical `file.list` task-context workaround and FORGE-OS application-discovery changes. The filename is consistent with an accidental status/diff command redirection, although the exact shell command cannot be proven from repository history.
- No source, test, documentation, package script, workflow, or runtime file references `tatus`. Electron Builder packages only `apps/desktop/out/**/*`, `node_modules/**/*`, and `package.json`, so `tatus` is not inside the macOS, Windows, or Linux desktop application.
- FORGE-OS `git archive` does carry the file into its temporary source staging directory, but `runtime-source-hash.sh` does not hash it and Electron Builder does not package it. The workspace-memory classifier ignores it because it is extensionless and does not match a recognized documentation/configuration/source name.
- The practical effect was limited to repository/archive clutter and an extra root entry visible to `file.list`; a model could waste time inspecting this stale historical snapshot. After the audit, the user explicitly approved deletion. Commit `4a54d32` removed `tatus` from `main`; Git history still preserves the forensic record.

## Implementation verification after approval

- Full FORGE source gate passed: 28 test files, 127 tests passed, 1 skipped; lint, typecheck, production build, and `git diff --check` passed.
- A live local Ollama `llama3.2:3b` request was offered file, Git, terminal, and browser descriptors together and returned the requested `forge_1_git_status` native call. No workspace content was sent and no model-requested tool was executed during this protocol smoke test.
- `npm run update:mac` fast-forwarded from the trusted origin, preserved/restored local `.obsidian` state, rebuilt the exact pushed commit `78b355d`, produced and verified a universal DMG/ZIP and universal `node-pty`, installed the verified app at `/Applications/FORGE.app`, moved the previous app to a timestamped Trash location, and opened the replacement.
- The FORGE-OS transaction test passed after the remote `121ac25` recovery change was reconciled: unsafe source state is rejected, local `.obsidian` state survives both success and rollback, both repositories return to their original commits after an installer failure, and a clean fast-forward invokes installation.
- The Windows update script and platform-specific updater metadata selection passed source tests, lint, typecheck, and production build. Native Windows packaging, silent NSIS installation, and installed `app.asar` comparison still require execution on Windows.

## Runtime-metadata separation follow-up

The remaining browser friction was traced to a shared internal Zod schema being serialized directly into every provider definition. For `browser.read`, generated JSON Schema marked root `reason` as required and exposed optional `taskContext` whose nested object marked `taskId` and `stepId` as required. Provider adapters did not flatten or alter that schema; the model was reacting to metadata FORGE advertised.

The repair now filters `reason` and `taskContext` from every provider-visible schema branch, discards any provider-authored values for those keys, and enriches the validated runtime call with a `ToolExecutionContext` owned by FORGE. The context carries request, workspace, conversation, model, inferred audit reason, and active task/step identity. Schema-v8 action records store optional task/step columns without changing existing workspace data. Enabled `browser.read({})` and `browser.find(...)` are automatic bounded reads; `browser.open`, writes, shell/process execution, deletion, Git mutation, GitHub mutation, and other approval-required tools retain their policy.
