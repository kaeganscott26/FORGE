# FORGE Release Channels

FORGE exposes logical **Stable** and **Beta** choices. Provider metadata channel names remain an internal implementation detail.

| Channel | Eligible versions |
| --- | --- |
| Stable | strictly newer normal semantic versions |
| Beta | strictly newer `beta`, `rc`, or normal semantic versions |

Both reject equal/older versions, downgrades, alpha and unsupported prereleases, drafts, malformed versions, unsafe asset URLs, missing metadata, and incompatible platform artifacts. A legacy stored `preview` value migrates to `beta`.

FORGE queries a bounded set of published GitHub Releases, applies semantic eligibility, validates the exact platform feed, disables downgrade permission, configures Electron Updater only after selection, and revalidates the returned version before download.

## Current published beta

`v2.4.0-beta` was published from tag commit `ff798b91a1a027a4891214c4da6549fc3336d210` with:

- `FORGE-2.4.0-beta-x86_64.AppImage`
- `FORGE-2.4.0-beta-amd64.deb`
- `FORGE-2.4.0-beta-universal.dmg`
- `FORGE-2.4.0-beta-universal.zip`
- `FORGE-2.4.0-beta-x64.exe`
- payload blockmaps, `beta-linux.yml`, `beta-mac.yml`, `beta.yml`, `SHA256SUMS`, and `build-manifest.json`

GitHub currently reports this release as `isPrerelease: false` despite the beta version and workflow intent. That record should be reported accurately and verified in the next release; it is not a reason to move the tag or replace assets.

Current `main` is ahead of the tag under the same package version, so its fixes are not eligible for public publication until the version is incremented.

See [Releasing FORGE](../RELEASING.md) for provenance and publication checks.
