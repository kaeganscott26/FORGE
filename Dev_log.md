# FORGE Developer Log

## 2026-08-06 — Version 1.0.1 release repair

### Release and installed-binary audit

- Confirmed PR #7 is merged, Issues #5 and #6 are closed through it, and the remote feature branch was deleted after merge.
- Confirmed the three feature-branch commits are represented on `main` by squash merge `ad610fa`.
- Confirmed the annotated `v1.0.0` tag points to pre-PR commit `86ed05c`, while the five v1.0.0 release assets were replaced afterward from the workspace-intelligence build.
- Matched the uploaded universal DMG, ZIP, and `latest-mac.yml` SHA-256 digests to the local refreshed artifacts.
- Matched `/Applications/FORGE.app` to the refreshed universal `app.asar` and found a second stale `~/Applications/FORGE.app` with the same bundle identifier, old renderer code, and no `app-update.yml`.

### v1.0.1 repair scope

- Bumped the root, desktop, and every workspace package through npm so generated lockfile workspace versions remain consistent.
- Added non-secret build diagnostics for version, exact Git commit, build date, runtime, renderer source, platform, and architecture, with a Settings copy action.
- Made packaged renderer loading target the compiled `index.html` directly through `file://` inside `app.asar`.
- Added an explicit GitHub updater feed and kept renderer polling active between update discovery and download completion.
- Expanded automated coverage for cross-workspace operation rejection, active-thread/layout persistence, required context evidence classes, prompt ordering, and diagnostic formatting.
- Replaced the flat, noisy durable-memory inventory with classified Architecture, Documentation, Source Code, Memory, and Configuration groups.
- Excluded machine-specific `.obsidian` and generated state from default indexing, made reindexing idempotent by path, and filtered retrieval to actual query matches.
- Added heuristic relevance scores and selection reasons to grouped context disclosure.
- Replaced ambiguous **Delete** controls with **Remove indexed copy** and **Forget memory** confirmations that explicitly preserve project files.
- Documented concept extraction and cross-document relationship traversal as the next knowledge-graph layer; v1.0.1 does not misrepresent that larger semantic graph as complete.
- Final validation, package hashes, installed-runtime evidence, GitHub tag, workflow, and release results will be recorded after publication.

## 2026-08-06 — Workspace UX and AI context architecture milestone

### Why this milestone exists

- Reframed FORGE's AI from a generic assistant into workspace intelligence grounded in the project folder.
- Kept feature scope tied to FORGE's philosophy: local-first operation, durable project memory, and a connected graph of source, Markdown, Git, metadata, architecture, and conversations.
- Explicitly rejected unrelated generic IDE roadmap work.

### Conversation and storage architecture

- Added schema version 2 with `conversation_threads`, thread linkage on messages, and `workspace_state` for active conversation and layout.
- Migrated legacy unthreaded messages non-destructively into an **Imported conversation**.
- Added multiple named conversations per workspace, selection, rename, first-prompt automatic titles, New Chat, and Clear Chat.
- Enforced project ownership for every thread lookup so IDs from a different workspace cannot be read or selected.
- Defined Clear Chat as deleting only the active thread's message rows. It intentionally preserves memories, indexing, project metadata, layout, Git state, other conversations, and future embeddings/search indexes.
- Kept API/GitHub credentials app-global and Keychain-backed while keeping conversation and layout state inside the project folder.

### Workspace UX

- Replaced the fixed workspace grid with drag handles between Explorer/editor, editor/workspace intelligence, context/chat, and workspace/source control.
- Persisted clamped panel dimensions per workspace with debounced IPC saves.
- Consolidated dashboard and durable memory into the workspace-intelligence region and made the AI panel a thread-oriented project surface.
- Added context-source disclosure beneath the latest response.

### AI models and prompt assembly

- Changed the default for new configurations from `gpt-4o` to `gpt-5.6-sol`, the current resolved flagship GPT-5.x target at implementation time.
- Preserved all previously saved/environment model IDs and removed allowlist assumptions.
- Added provider model listing, exact validation, manual future-model entry, and actionable unsupported-model errors.
- Updated Chat Completions to use `max_completion_tokens`, with a narrow `max_tokens` retry for older compatible endpoints.
- Added an automatic FORGE philosophy system frame before every user prompt.
- Added priority/budget-based evidence assembly from architecture/project documents, metadata/goals, Git status/history, relevant or changed source snapshots, package metadata, file inventory, and retrieved memories.
- Bounded prior messages separately so each thread maintains continuity without allowing unbounded context growth.

### Future extension points

- Added provider-neutral interfaces for context sources and budgeting, architectural memory, project timeline, AI diff review, context inspection, intent navigation, and the composed workspace-intelligence boundary.
- Deferred implementations intentionally; these contracts establish architectural seams without claiming incomplete features.

### Files and subsystems affected

- `packages/storage`: schema, migration, threads, workspace state, and layout.
- `packages/ai`: provider model operations, context assembly, Agent framing, and intelligence interfaces.
- `packages/ipc`: typed layout, model, conversation, and context-source channels.
- `apps/desktop/src/main`: secure settings and workspace-bound orchestration.
- `apps/desktop/src/renderer`: resizable layout, model controls, memory, and conversation UX.
- Tests, ESLint configuration, CI validation, environment example, and all affected product/developer documentation.

### Validation and tradeoffs

- Repaired the memory test so it uses an isolated temporary workspace instead of the repository's live `.forge` database.
- Added storage isolation/clear-preservation tests and AI context/provider tests.
- Added the missing ESLint 9 flat configuration and included lint in the release workflow.
- Passed typecheck, lint, all 14 test files/30 tests, and the production Electron build before packaging.
- Built the current ARM64 macOS app, DMG, ZIP, and update blockmaps with Electron Builder 26.15.3. Packaging passed; signing remained unavailable because no Developer ID identity is configured.
- Initial smoke-start exposed a blank white window. Chrome DevTools Protocol network evidence showed `http://localhost:5173/` returned 404 because Electron Vite's renderer root pointed at `apps/desktop` instead of `apps/desktop/src/renderer`.
- Corrected the renderer root, then verified Vite connected, React mounted one root child, and the window rendered the FORGE header and welcome content. The previous missing-native-Electron blocker is also no longer present.
- Character budgeting is deterministic and provider neutral but is not yet token aware.
- Memory reindex deduplication, embeddings, persisted hybrid search, signed update validation, and renderer sandbox hardening remain deferred.

### GitHub delivery and v1.0.0 asset refresh

- Committed the implementation as `d5458db` and the synchronized documentation/tooling as `7f8bd85` on `agent/workspace-context-architecture`.
- Pushed the feature branch and opened draft pull request #7 against `main`.
- Built the universal DMG and ZIP and verified the executable contains `x86_64` and `arm64`; ZIP integrity passed.
- Verified the universal packaged app reaches a complete document, mounts React, and renders FORGE from a `file://` URL inside `app.asar`. Vite remains a compile-time tool only; the release does not use localhost.
- Replaced all five assets on the existing GitHub v1.0.0 Release at the user's direction: DMG, ZIP, both blockmaps, and `latest-mac.yml`.
- Confirmed every remote asset SHA-256 digest matches the corresponding local artifact and updated the published release notes.
- Documented the same-version limitation: existing 1.0.0 installs require one manual DMG replacement because update comparison cannot treat another 1.0.0 build as newer. Future automatic-update releases must increment the version.

## 2026-08-05 — Version 1.0.0 release preparation

### Repository audit

- Confirmed `main` started clean at `6d5bef6` and matched `origin/main` before work.
- Verified the old `dist_electron` package was version 0.1.0, ARM64-only, ad-hoc signed, and not installed in `/Applications` or `~/Applications`.
- Found and corrected shell heredoc text accidentally committed inside `.gitignore`.
- Found placeholder GitHub publisher and Apple signing values in `package.json`.
- Confirmed the Electron npm package initially lacked its native `Electron.app`; restored it with Electron's installer.
- Confirmed no valid Apple code-signing identity is installed on this Mac.

### Packaging and update workflow

- Set the application and desktop package versions to 1.0.0.
- Set product name `FORGE`, bundle ID `com.kaeganscott26.forge`, repository metadata, deterministic artifact names, and GitHub publisher coordinates.
- Added `electron-updater` and typed update IPC for status, checks, installation, and opening the latest release.
- Added title-bar update and release controls.
- Added in-app AI and GitHub settings with masked status, save/remove controls, and connection tests.
- Stored API and GitHub secrets outside projects using asynchronous Electron `safeStorage` backed by macOS Keychain.
- Routed HTTPS GitHub pull/push credentials through an ephemeral `GIT_ASKPASS` environment without modifying remote URLs.
- Added `npm run install:mac` to rebuild, update an existing app bundle in place, and reopen it without an uninstall.
- Added current-architecture, universal, local-install, and GitHub-publish scripts.
- Replaced the push-on-every-commit packaging workflow with validation, manual artifact, and version-tag release paths on Node.js 22.
- Enabled ASAR packaging and preserved unsigned local/release fallbacks.
- Upgraded Electron Builder to 26.15.3 to remove high and critical release-toolchain advisories.
- Pinned Monaco Editor 0.53.0 with DOMPurify 3.4.13 after the newer Monaco dependency line introduced sanitizer advisories; final `npm audit --omit=dev` reports zero vulnerabilities.

### Application icon

- Replaced the previous icon with a generated 1024×1024 FORGE mark.
- Design: a forged-metal F/anvil, layered code documents, and connected memory nodes in charcoal, molten amber, and cyan.
- Removed the old generated iconset and ICNS source; Electron Builder now derives the packaged ICNS from `ForgeIcon-1024.png`.

### Configuration and documentation

- Rewrote README as the product, installation, update, build, release, privacy, and documentation entry point.
- Added `UserManual.md`, `UserConfig.md`, `.env.example`, `.nvmrc`, and this developer log.
- Updated the OpenAI provider to honor `OPENAI_BASE_URL` and `OPENAI_MODEL` in addition to `OPENAI_API_KEY`.
- Sanitized rendered Markdown with DOMPurify and pinned Monaco's nested sanitizer to the patched release.
- Replaced the stale project-status report with the 1.0.0 release state.

### Stale repository content removed

- Removed the tracked Obsidian workspace and third-party plugin bundles.
- Removed Perplexity/reference prompts, incomplete Markdown code fragments, obsolete root architecture notes, and the old build continuation prompt.
- Removed the unrelated `zz-cf-lib` templates.
- Removed the duplicate `docs/USER_GUIDE.md` in favor of the root user manual.
- Removed the old iconset and ICNS artifacts.
- Preserved `.forge/metadata.sqlite` because it is ignored local user data.

### Validation record

- Baseline typecheck passed.
- Baseline production source build passed.
- Baseline test suite initially passed 20 of 21 tests because the current macOS session returned `EMFILE` even in a standalone Node watcher probe. The watcher now falls back to polling when native watcher allocation is exhausted.
- Final test suite passed all 12 test files and all 21 tests with the fallback in place.
- FORGE 1.0.0 ARM64 DMG and ZIP built successfully with Electron 43.3.0.
- Final universal DMG and ZIP built with Electron Builder 26.15.3 and passed DMG checksum, ZIP integrity, update-feed checksum, and Intel/Apple Silicon architecture checks.
- `npm run install:mac` updated and opened `~/Applications/FORGE.app`; the final installed bundle matches version 1.0.0 and `com.kaeganscott26.forge`.
- Settings-enabled installed app remained running; the generated Git ask-pass helper is mode `0700`, contains no credential, and the encrypted settings file is deferred until the first user save.
- Packaged metadata verified: product name FORGE, version 1.0.0, bundle ID `com.kaeganscott26.forge`, custom `icon.icns`, and embedded `app-update.yml`.
- Apple Developer ID signing and notarization remain unavailable until real credentials are configured.

### Custom icon generation prompt

Create a premium macOS icon for a local-first AI-native developer workspace. Combine an abstract forge/anvil with layered code documents, connected memory nodes, and a geometric F. Use a charcoal forged-metal base, molten amber core, restrained cyan accents, strong small-size silhouette, no text, no watermark, and no Electron atom logo.

## 2026-08-05 — Version 1.0.0 publication

- Committed release preparation as `86ed05c` and pushed it directly to `main`.
- Created and pushed the annotated `v1.0.0` tag.
- GitHub Actions passed dependency installation, typechecking, all 21 tests, the production build, and unsigned universal macOS packaging.
- Published the universal DMG, ZIP, update feed, and blockmaps to the public GitHub Release.
- Electron Builder's parallel publishers initially created two release records for the same new tag. Consolidated the assets into release `365969109`, removed only the accidental duplicate record, regenerated the DMG blockmap from the exact published DMG, and applied `RELEASE_NOTES.md`.
- Changed the workflow to create or update one tag release before Electron Builder starts parallel asset publication, preventing the race on future tags and making reruns idempotent.
- Committed the serialized release fix as `eb71e05`, reran the original tag workflow, and confirmed attempt 2 completed successfully with all five assets replaced as one matching publication set.
- Confirmed the first release is public at `https://github.com/kaeganscott26/FORGE/releases/tag/v1.0.0`.
