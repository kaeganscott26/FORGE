# FORGE Project Status

**Updated:** August 6, 2026

**Working version:** 1.1.0-beta.1

**Source branch:** `feature/persistent-task-engine` until reviewed and merged

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## Current state

The repair and workspace-owned persistent-task milestone is implemented in source. The pre-beta source gate passed dependency installation with zero reported vulnerabilities, typecheck, lint, 21 test files / 78 tests, and production build before the beta identity conversion. Focused beta IPC, updater, and task checks then passed 3 files / 20 tests. The full beta gate, exact-commit packaging, installed acceptance, public workflow, remote hashes, and public-artifact reinstallation remain mandatory before release verification.

Historical Releases and release tags remain intact while validation proceeds. The pre-cleanup state is recorded in [PRE_BETA_RELEASE_AUDIT.md](archive/PRE_BETA_RELEASE_AUDIT.md). The old 4.5 GB local packaging tree was moved recoverably to Trash after audit; installed applications have not yet been removed.

## Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Provider routing | GPT-5.6 tool turns use `/v1/responses`; provider-neutral messages, tool requests, and direct-response support remain internal |
| Workspace recovery | Root-first discovery and structured missing-path suggestions prevent a missing assumed directory from ending a scan |
| Tool policy | Tier 0 reads; Tier 1 one-time or exact expiring session approval; Tier 2 always explicit |
| Filesystem | Workspace containment, symlink escape rejection, atomic writes, diffs, backups, dirty-editor protection |
| Git and shell | Protected Git service; argument-array shell spawn with workspace cwd, bounds, cancellation, and process-tree controls |
| Approval and audit | Retained request/result UI, per-workspace audit records, task references, and secret redaction |
| Persistent tasks | Schema-v4 tasks, steps, dependencies, checkpoints, artifacts, external references, approvals, events, reconciliation, UI, and Markdown handoffs |
| Background operations | Task-linked local PID, output path, bounded output, audit reference, and restart reconciliation |
| Integrated terminal | Workspace-owned `node-pty`, renderer xterm, input/resize/output/terminate/restart, exit rejection, canonical cwd handling |
| Renderer boundary | Context isolation, no Node integration, sandbox, allowlisted preload, navigation denial, packaged `file://` renderer |
| Update discovery | Stable/Beta logical policy, legacy Preview migration, bounded GitHub response, strict forward SemVer, selected safe feed |
| Packaging | Clean ARM64/universal commands, beta metadata, exact hash-bearing manifest, manifest-driven install/upload |
| Signing/notarization | Not configured in repository; final workflow state must be inspected |

## Persistent task boundary

Tasks belong to the workspace SQLite database, not to a conversation or provider. Resume audits current Git, known local processes, and supplied external observations; it preserves verified checkpoints and selects the first dependency-ready unfinished step. Conversation deletion does not delete a task. Every executable step still uses the existing policy and approval path.

Implemented background starts can survive the initiating AI turn while the main process remains active. Durable exit supervision across a full application restart, scheduled GitHub polling, and autonomous multi-step execution are not implemented. A later session reconciles persisted PID/remote observations rather than trusting stale running state.

## Beta release state

The intended release identity is `1.1.0-beta.1`, annotated tag `v1.1.0-beta.1`, Beta channel, and `beta-mac.yml`. Beta accepts newer beta, rc, or stable versions; it rejects alpha. Stable accepts only stable.

The release is not yet verified. Required remaining gates include:

1. complete beta source suite and clean ARM64/universal packages;
2. local installation at exactly `/Applications/FORGE.app` and packaged acceptance;
3. branch push, pull request, checks, merge, and synchronized main;
4. rebuild/accept the exact final main commit;
5. annotated tag, public workflow, serial assets, independent remote hashes, and public reinstall;
6. only then remove audited obsolete Releases/tags and stale local installations/artifacts.

## Known limitations

1. Apple Developer ID signing and notarization are not configured; unattended replacement cannot be called trusted.
2. Public unauthenticated GitHub discovery is subject to GitHub rate limits and fails closed.
3. Web search uses a bounded public HTML endpoint rather than a contracted search API.
4. File rollback backups are recovery aids rather than transactional storage.
5. Tool-result context bounds are character-based rather than tokenizer-aware.
6. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
7. OAuth device flow is not implemented; GitHub uses a user-created Keychain-backed encrypted token.
8. Persistent tasks do not provide unattended full workflow orchestration, a cross-restart supervisor, or scheduled external-service watchers.

## Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
