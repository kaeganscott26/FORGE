# FORGE Developer Log

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
