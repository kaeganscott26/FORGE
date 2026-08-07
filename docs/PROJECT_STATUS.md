# 📍 FORGE Project Status

<<<<<<< HEAD
**Updated:** August 9, 2026
=======
**Updated:** August 7, 2026
>>>>>>> 0d34973 (docs: record verified beta publication)

**Working version:** `2.3.0-beta.1` — FORGE v2.3 Beta

<<<<<<< HEAD
**Published release:** [`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) on `main`
=======
**Source branch:** `main`
>>>>>>> 0d34973 (docs: record verified beta publication)

**Platform:** macOS arm64 with universal x86_64 + arm64 packaging

## 🧭 Current state

<<<<<<< HEAD
FORGE v2.3 Beta is the current published beta. It adds capability-aware provider tools, typed GitHub mutations, bounded file evidence, explicit network execution profiles, and workspace-data lifecycle controls to the protected-browser and durable-memory baseline.

The prior public baselines remain [FORGE beta 2.1](https://github.com/kaeganscott26/FORGE/releases/tag/v2.1.0-beta.2) and [FORGE beta 2.2](https://github.com/kaeganscott26/FORGE/releases/tag/v2.2.0-beta.3). They are historical releases, not the supported product identity.
=======
The repair and workspace-owned persistent-task milestone is released as `v1.1.0-beta.1`. After editor, terminal CLI, local-model, approval-projection, terminal-selection, and Monaco history repairs, the clean beta source gate passed dependency installation, typecheck, lint, 25 test files / 96 tests, production build, and a production audit with zero vulnerabilities. Exact-commit packaging, installed acceptance, public hashes, and public-artifact reinstallation passed.

Historical Releases and release tags remain intact. The pre-cleanup state is recorded in [PRE_BETA_RELEASE_AUDIT.md](archive/PRE_BETA_RELEASE_AUDIT.md). Stale application bundles were moved recoverably to Trash, and the downloaded public universal ZIP is installed at the single physical path `/Applications/FORGE.app`.
>>>>>>> 0d34973 (docs: record verified beta publication)

## ✅ Implemented capability matrix

| Area | Implemented behavior |
| --- | --- |
| Explorer and editor | Recursive workspace tree, safe file operations, UTF-8 editing, Monaco language mapping, responsive layout, and keyboard controls |
| Workspace intelligence | Bounded context packets from docs, source, Git, tasks, durable memory, and observations; context ownership stays with the workspace |
| Agent runtime | Provider-neutral tool routing, policy/approval/audit enforcement, progress-aware continuation, persistent tasks, and task handoffs |
| Browser | Native public-web BrowserView, Home, independent tabs, close/select controls, navigation, workspace-scoped bookmarks/history, and explicit agent page-read approval |
| Git and terminal | Workspace-contained Git service, user-controlled PTYs, visible action results, and durable audit history |
| Updates | Forward-only Stable/Beta discovery, strict SemVer eligibility, bounded GitHub release discovery, and updater metadata validation |

## 🧪 Current source validation

The current source has passed:

- `npm run typecheck`
- `npm run lint`
- `npm test` — 27 files; 112 passed and 1 skipped test
- `npm run build`
- `npm run verify:release-version`
- `git diff --check`

Browser acceptance loaded and visibly rendered `https://www.north3rnlight3r.com/` through the native BrowserView path after the surface-height regression was repaired. The memory database passes SQLite `integrity_check`; the out-of-bounds hardening applies bounded projections before memory scoring and provider handoff.

## 📦 Release state

<<<<<<< HEAD
[`v2.3.0-beta.1`](https://github.com/kaeganscott26/FORGE/releases/tag/v2.3.0-beta.1) is published as **FORGE v2.3 Beta**. Its annotated tag resolves to `302ff52b87e415d357c6fe5039869c742d5ecb24`; workflow [31323231310](https://github.com/kaeganscott26/FORGE/actions/runs/31323231310) completed successfully for that SHA, packaged the universal DMG/ZIP, uploaded the two blockmaps and `beta-mac.yml` serially, and published after upload verification. [The release record](V2.3.0_BETA1_VERIFICATION.md) preserves the observed public asset digests.

The beta is not Developer ID signed or notarized. Independent public download-hash comparison and mounted-DMG/app acceptance have not been recorded for this release. The public release is not currently flagged as a GitHub prerelease even though it uses a beta SemVer tag and FORGE Beta update channel; release verification must check that flag before treating a future publication as complete.
=======
The release payload is verified at `8350aab8d498073b2335dfb8a1d7caa227865514`, published as a GitHub Pre-release, and installed from the independently downloaded public ZIP. The five public asset digests match the release manifest. `main` later advanced only for the PR #15 draft-release lookup repair; the annotated release tag remains on the verified application source commit.
>>>>>>> 0d34973 (docs: record verified beta publication)

## 🚧 Known limitations

1. Apple Developer ID signing and notarization are not configured.
2. Public unauthenticated GitHub discovery is subject to rate limits and fails closed.
3. Browser access is public HTTP(S) only; pages, local networks, credential-bearing URLs, and implicit workspace disclosure are blocked.
4. Retrieval remains lexical; embeddings and a persisted semantic graph remain planned.
5. Persistent tasks do not provide unattended full workflow orchestration or a cross-restart supervisor.

## 🛡️ Repository authority

The workspace is authoritative; the model is replaceable. Current source, root documentation, `docs/`, package configuration, and workflows describe implemented behavior. Generated output, `.forge/`, `.obsidian/`, local databases, and updater caches are not source and must not be committed or indexed as memory.
