# FORGE 1.1.0-alpha.2

This preview preserves the complete policy-controlled agent tools and integrated terminal introduced in alpha.1, and fixes updater downgrade behavior discovered during alpha.1 installed-runtime verification. The immutable alpha.1 release and its assets are unchanged.

## Forward-only update policy

- Keeps Stable as the default and requires explicit Preview selection before any alpha, beta, or release-candidate can be offered.
- Resets Electron Updater's `allowDowngrade` flag after every channel change because changing its channel can enable downgrade checks internally.
- Disables automatic download until FORGE independently validates the candidate.
- Requires valid semantic versions and strictly forward movement.
- Excludes prereleases on Stable while allowing Preview to advance through newer alpha, beta, release-candidate, and stable versions.
- Rejects equal versions, malformed versions, alpha.2 to alpha.1, and alpha.2 to stable 1.0.1.

The enforced order includes `1.0.1 < 1.1.0-alpha.1 < 1.1.0-alpha.2 < 1.1.0-beta.1 < 1.1.0`.

## Agent authority and terminal

- The model requests tools; FORGE validates schemas, authorizes risk, executes in the main process, audits outcomes, bounds results, and returns evidence.
- Tier 0 read operations may run automatically. Tier 1 reversible changes require one-time approval or an exact, expiring session grant. Tier 2 executable, destructive, Git write, and network operations always require explicit one-time approval.
- Filesystem operations enforce workspace containment, symlink escape rejection, atomic writes, diffs, backups, and dirty-editor protection.
- The integrated `node-pty` terminal remains main-process owned with workspace cwd, multiple sessions, streaming, resize, terminate/restart, output copy, and exit state.
- External web research remains disabled by default and never uploads workspace content implicitly.
- Tool requests and sanitized results remain visible in the per-workspace action log.

## Release identity

- Version: `1.1.0-alpha.2`.
- Development diagnostics: `1.1.0-alpha.2-dev / development`.
- Preview package diagnostics: `1.1.0-alpha.2 / preview`.
- Preview publication produces a GitHub Pre-release and `preview-mac.yml`; it does not become Latest.
- v1.0.1 remains the Latest stable release.

## Limitation

This preview is ad-hoc signed/unsigned and is not notarized because no Apple Developer ID credentials are configured. Update detection and download can be verified, but unattended in-app replacement is not a trusted installation path. Use the DMG or `npm run install:mac` for the local source build and verify About diagnostics after replacement.
