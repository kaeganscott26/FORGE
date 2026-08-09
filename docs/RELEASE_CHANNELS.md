# 📦 FORGE Release Channels

FORGE exposes logical user channels. Provider metadata names are an internal implementation detail and never become user authority.

| Channel | Current identity | Eligible newer versions | Purpose |
| --- | --- | --- | --- |
| Development | `2.3.0-beta.1-dev` | none | Source and renderer development |
| Beta | `2.3.0-beta.1` | `beta`, `rc`, or normal SemVer | Public evaluation before stable |
| Stable | normal SemVer | normal SemVer only | Supported production releases |

All channels are forward-only. Equal versions, downgrades, malformed versions, drafts, unpublished releases, incompatible prerelease flags, unsupported identifiers, unsafe asset URLs, and missing metadata are rejected before Electron Updater receives a feed.

## 🔄 Preference migration

Settings written by alpha builds may contain `preview`. FORGE normalizes that legacy value to `beta`; it does not retain a third executable channel. The Beta channel accepts only newer beta, release-candidate, or stable versions and never selects alpha builds.

Stable remains the default when no recognized channel is stored. Selecting Beta never authorizes a downgrade.

## 🔎 Discovery and feed selection

FORGE retrieves a bounded set of published Releases from the fixed repository and then:

1. validates response type, size, schema, tag, publication state, and prerelease consistency;
2. filters by the logical Stable or Beta policy;
3. chooses the highest strictly newer compatible version independently of API order;
4. validates the exact GitHub-hosted metadata URL;
5. supplies only that selected `latest-mac.yml` or `beta-mac.yml` feed to Electron Updater;
6. resets downgrade permission and verifies the updater-returned version again before download.

The current beta target is `2.3.0-beta.1`. Stable ignores every prerelease.

## 🚀 Publication

The current beta target is **FORGE v2.3 Beta** with annotated tag `v2.3.0-beta.1`. An annotated prerelease tag produces a GitHub Pre-release and `beta-mac.yml`; a normal tag produces a stable release and `latest-mac.yml`. Metadata is uploaded only after the DMG, ZIP, and both blockmaps have been uploaded and hash-verified.

The beta asset family is:

- `FORGE-2.3.0-beta.1-universal.dmg`;
- `FORGE-2.3.0-beta.1-universal.dmg.blockmap`;
- `FORGE-2.3.0-beta.1-universal.zip`;
- `FORGE-2.3.0-beta.1-universal.zip.blockmap`;
- `beta-mac.yml`.

The GitHub workflow validates source before packaging. A green job alone is insufficient: tag, workflow head, embedded commit, remote hashes, browser rendering, terminal behavior, AI routing, task persistence, and updater behavior must also be verified.

## ⚠️ Signing limitation

Without configured Apple Developer ID and notarization credentials, the workflow creates an ad-hoc/unsigned beta. Discovery and hash validation remain testable, but unattended in-app replacement is not a trusted installation path. Use the independently verified DMG and report signing state accurately.
