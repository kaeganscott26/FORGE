# FORGE 1.1.0-alpha.3

## Unreleased repair and persistent-task milestone

The current source branch adds workspace-owned structured tasks, task steps/checkpoints/events, dependency-aware reality reconciliation, approval/audit linkage, detached PID/output tracking, a dedicated Tasks view, durable Markdown handoffs, and a reusable 26-step release template. Task state survives conversation deletion and storage restart; no persisted task grants permanent execution approval.

It also repairs root-first workspace discovery and structured missing-path recovery, keeps terminal keyboard input bound to a writable workspace-owned PTY across restart, and routes GPT-5.6 function tools through the Responses API while preserving provider-neutral internal messages and tool policy.

Release automation now creates a draft, packages without provider-side parallel publication, uploads DMG/ZIP/blockmaps serially, publishes updater metadata last, skips byte-identical retry assets, and fails on a same-name hash conflict. These changes are not a published release yet. Source tests/build, ARM64/universal packaging, archive integrity, packaged terminal input/restart, and packaged task persistence/restart pass at the uncommitted checkpoint. Exact committed-source provenance, live provider use, installation over the existing app, remote workflow/assets, trusted signing/notarization, and updater verification remain required before publishing the next preview.

This preview preserves the policy-controlled agent tools and integrated terminal while correcting Preview update discovery. Alpha.1 and alpha.2 remain immutable; no compatibility release or replacement asset is published.

## Corrected Preview discovery

- Adds provider-independent, bounded GitHub Release discovery in `@forge/updater`.
- Retrieves only the fixed FORGE release collection with a timeout, response-size cap, schema validation, and no credential headers.
- Excludes drafts, unpublished releases, malformed versions, incompatible prerelease flags, unsupported prerelease identifiers, unsafe metadata URLs, and missing metadata.
- Keeps Stable limited to strictly newer stable semantic versions.
- Lets Preview advance only to a strictly newer `alpha`, `beta`, `rc`, or stable semantic version.
- Selects the highest compatible release independently of GitHub API order.
- Gives Electron Updater only the selected release feed, resets downgrade permission, and validates the returned version again before download.
- Preserves checksum verification, download progress, diagnostics, signing warnings, installation, and restart states.

The enforced order includes `1.0.1 < 1.1.0-alpha.1 < 1.1.0-alpha.2 < 1.1.0-alpha.3 < 1.1.0-beta.1 < 1.1.0-rc.1 < 1.1.0`.

## One-time manual migration

Alpha.1 and alpha.2 passed FORGE's logical Preview value directly to Electron Updater as a provider channel. Those immutable clients cannot discover conventional `alpha`, `beta`, or `rc` tags through that mapping. Alpha.2 therefore requires one manual installation of alpha.3. Alpha.2-to-alpha.3 is not claimed as an automatic update.

After alpha.3 is installed, future Preview releases are discovered through the corrected logical-channel layer without compatibility tags. The migration issue does not invalidate the earlier packaged apps, five-asset release sets, annotated tags, or semantic-version policy.

## Agent authority and terminal

- The model requests tools; FORGE validates schemas, authorizes risk, executes in the main process, audits outcomes, bounds results, and returns evidence.
- Tier 0 read operations may run automatically. Tier 1 reversible changes require one-time approval or an exact, expiring session grant. Tier 2 executable, destructive, Git write, and network operations always require explicit one-time approval.
- Filesystem operations enforce workspace containment, symlink escape rejection, atomic writes, diffs, backups, and dirty-editor protection.
- The integrated `node-pty` terminal remains main-process owned with workspace cwd, multiple sessions, streaming, resize, terminate/restart, output copy, and exit state.
- External web research remains disabled by default and never uploads workspace content implicitly.
- Tool requests and sanitized results remain visible in the per-workspace action log.

## Release identity

- Version: `1.1.0-alpha.3`.
- Development diagnostics: `1.1.0-alpha.3-dev / development`.
- Preview package diagnostics: `1.1.0-alpha.3 / preview`.
- Preview publication creates a GitHub Pre-release and `preview-mac.yml`; it does not become Latest.
- v1.0.1 remains the Latest stable release.

## Validation

The clean pre-commit candidate passed dependency installation with zero audit findings, typecheck, lint, 20 test files / 61 tests, production build, ARM64 packaging, universal packaging, ZIP/DMG integrity, and x86_64 + arm64 inspection of the app and PTY binaries. Packaged probes passed for the `file://` app.asar renderer, diagnostics, PTY execution, workspace escape rejection, Tier 0 execution, Tier 1 diff and Run Once approval, Tier 2 rejection, retained audit results, FORGE/AIFRED/INTERVENTION isolation, and live Stable/Preview filtering of older public releases. Exact merged-commit validation remains required before publication.

## Limitation

This preview remains ad-hoc signed/unsigned and is not notarized because no Apple Developer ID credentials are configured. Discovery and verified download can be tested, but unattended in-app replacement is not a trusted installation path. Alpha.3 is manually installed over alpha.2 for this migration.
