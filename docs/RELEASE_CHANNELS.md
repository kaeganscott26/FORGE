# FORGE Release Channels

FORGE exposes logical **Stable** and **Beta** choices. Provider metadata channel names remain an internal implementation detail.

| Channel | Current identity | Eligible newer versions |
| --- | --- | --- |
| Stable | normal SemVer | strictly newer normal semantic versions |
| Beta | `2.5.0-beta` | strictly newer `beta`, `rc`, or normal semantic versions |

Both reject equal/older versions, downgrades, alpha and unsupported prereleases, drafts, malformed versions, unsafe asset URLs, missing metadata, and incompatible platform artifacts. A legacy stored `preview` value migrates to `beta`.

FORGE queries a bounded set of published GitHub Releases, applies semantic eligibility, validates the exact platform feed, disables downgrade permission, configures Electron Updater only after selection, and revalidates the returned version before download.

## Current published beta

`v2.5.0-beta` was published from annotated tag commit `430796e2b4de543f5e9c6b8a8195e407353c9f68` with:

- `FORGE-2.5.0-beta-x86_64.AppImage`
- `FORGE-2.5.0-beta-amd64.deb`
- `FORGE-2.5.0-beta-universal.dmg`
- `FORGE-2.5.0-beta-universal.zip`
- `FORGE-2.5.0-beta-x64.exe`
- payload blockmaps, `beta-linux.yml`, `beta-mac.yml`, `beta.yml`, `SHA256SUMS`, and `build-manifest.json`

GitHub reports the release as a non-draft prerelease, matching the Beta version. Future post-tag changes are not eligible for public publication until the version is incremented.

See [Releasing FORGE](../RELEASING.md) for provenance and publication checks.
