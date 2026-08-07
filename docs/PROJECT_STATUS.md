# FORGE Project Status

**Updated:** August 7, 2026

**Working version:** 1.1.0-beta.1

**Source branch:** `main`

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## Current state

The repair and workspace-owned persistent-task milestone is released as `v1.1.0-beta.1`. After editor, terminal CLI, local-model, approval-projection, terminal-selection, and Monaco history repairs, the clean beta source gate passed dependency installation, typecheck, lint, 25 test files / 96 tests, production build, and a production audit with zero vulnerabilities. Exact-commit packaging, installed acceptance, public hashes, and public-artifact reinstallation passed.

Historical Releases and release tags remain intact. The pre-cleanup state is recorded in [PRE_BETA_RELEASE_AUDIT.md](archive/PRE_BETA_RELEASE_AUDIT.md). Stale application bundles were moved recoverably to Trash, and the downloaded public universal ZIP is installed at the single physical path `/Applications/FORGE.app`.

## Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Provider routing | GPT-5.6 tool turns use `/v1/responses`; keyless loopback/Ollama uses compatible Chat Completions; provider-neutral requests retain one policy path |
| Workspace recovery | Root-first discovery, structured missing-path suggestions, and a capped Tier 0 continuation loop prevent a missing assumed directory from ending a scan |
| Tool policy | Tier 0 reads; Tier 1 one-time or exact expiring session approval; Tier 2 always explicit |
| Filesystem | Workspace containment, symlink escape rejection, atomic writes, diffs, backups, dirty-editor protection |
| Git and shell | Protected Git service; argument-array shell spawn with workspace cwd, bounds, cancellation, and process-tree controls |
| Approval and audit | Retained request/result UI, per-workspace audit records, task references, and secret redaction |
| Persistent tasks | Schema-v4 tasks, steps, dependencies, checkpoints, artifacts, external references, approvals, events, reconciliation, UI, and Markdown handoffs |
| Background operations | Task-linked local PID, output path, bounded output, audit reference, and restart reconciliation |
| Editor and terminal | New blank files activate Monaco; save/open/undo/redo shortcuts; workspace-owned PTY with safe CLI environment, restart, and canonical cwd handling |
| Renderer boundary | Context isolation, no Node integration, sandbox, allowlisted preload, navigation denial, packaged `file://` renderer |
| Update discovery | Stable/Beta logical policy, legacy Preview migration, bounded GitHub response, strict forward SemVer, selected safe feed |
| Packaging | Clean ARM64/universal commands, beta metadata, exact hash-bearing manifest, manifest-driven install/upload |
| Signing/notarization | Not configured in repository; final workflow state must be inspected |

## Persistent task boundary

Tasks belong to the workspace SQLite database, not to a conversation or provider. Resume audits current Git, known local processes, and supplied external observations; it preserves verified checkpoints and selects the first dependency-ready unfinished step. Conversation deletion does not delete a task. Every executable step still uses the existing policy and approval path.

Implemented background starts can survive the initiating AI turn while the main process remains active. Durable exit supervision across a full application restart, scheduled GitHub polling, and autonomous multi-step execution are not implemented. A later session reconciles persisted PID/remote observations rather than trusting stale running state.

## Beta release state

The intended release identity is `1.1.0-beta.1`, annotated tag `v1.1.0-beta.1`, Beta channel, and `beta-mac.yml`. Beta accepts newer beta, rc, or stable versions; it rejects alpha. Stable accepts only stable.

The release payload is verified at `8350aab8d498073b2335dfb8a1d7caa227865514`, published as a GitHub Pre-release, and installed from the independently downloaded public ZIP. The five public asset digests match the release manifest. `main` later advanced only for the PR #15 draft-release lookup repair; the annotated release tag remains on the verified application source commit.

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
