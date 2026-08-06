# Release Channels

FORGE has three explicit logical channels.

| Channel | Version identity | Accepted published versions | Purpose |
| --- | --- | --- | --- |
| Development | `1.1.0-alpha.3-dev` | none | `npm run dev` or an unpackaged source build |
| Preview | prerelease SemVer such as `1.1.0-alpha.3` | strictly newer `alpha`, `beta`, `rc`, or stable | Security and packaging evaluation before stable |
| Stable | normal SemVer such as `1.1.0` | strictly newer stable only | Public production updates |

Diagnostics display version, logical channel, exact source commit, build date, runtime mode, renderer source, platform, and architecture. Packaged prerelease versions infer `preview`; normal packaged versions infer `stable`; unpackaged runs are always `development`.

## Discovery and forward-only policy

Existing and new settings default to **Stable**. Selecting Preview does not give Electron Updater a provider channel named `preview`. Instead, FORGE retrieves a bounded set of published GitHub Releases and validates it before configuring the downloader:

1. request at most 50 releases from the fixed `kaeganscott26/FORGE` GitHub API endpoint, without credentials;
2. enforce a ten-second timeout, one-megabyte response limit, JSON content, and a strict response schema;
3. ignore drafts, unpublished entries, malformed tags, unsupported prerelease identifiers, mismatched GitHub prerelease flags, missing metadata, and metadata outside this repository's HTTPS release-download path;
4. filter by the selected logical channel;
5. use SemVer to choose the highest version that is strictly newer than the installed version;
6. pass only that release's `preview-mac.yml` or `latest-mac.yml` feed to Electron Updater.

Stable accepts only a normal semantic version. Preview accepts a normal version or a prerelease whose first identifier is exactly `alpha`, `beta`, or `rc`. The intended progression includes:

```text
1.0.1 < 1.1.0-alpha.1 < 1.1.0-alpha.2 < 1.1.0-alpha.3
      < 1.1.0-beta.1 < 1.1.0-rc.1 < 1.1.0
```

Every channel is forward-only. Stable on alpha.3 rejects older stable 1.0.1 rather than treating it as a downgrade target. Preview rejects alpha.1 or alpha.2 from alpha.3, while accepting a future alpha, beta, rc, or stable version only when it compares strictly newer. The version Electron Updater returns is checked again before download. Automatic download remains disabled until both discovery and this second gate pass. Electron Updater preserves update metadata checksum validation, progress, download, and restart state.

## Alpha.1 and alpha.2 migration

Alpha.1 and alpha.2 used an incompatible provider-channel mapping: FORGE's stored logical value `Preview` was passed to Electron Updater as if it identified GitHub prereleases. Normal tags use SemVer identifiers such as `alpha`, `beta`, and `rc`, so those immutable clients cannot discover the ordinary prerelease tags through that mapping.

Alpha.2 therefore requires a one-time manual installation of alpha.3. Alpha.1-to-alpha.2 and alpha.2-to-alpha.3 automatic transitions are not claimed as passing. No duplicate compatibility release or `preview` tag is published, and alpha.1/alpha.2 assets remain untouched. After alpha.3 is installed, future Preview updates use the corrected discovery layer without compatibility tags.

This is a preview-channel migration defect. It is not a failure of the packaged alpha.1/alpha.2 application, release assets, annotated-tag provenance, or SemVer comparison.

## Publication behavior

An annotated prerelease tag creates a draft that becomes a GitHub Pre-release and emits `preview-mac.yml`; a normal tag creates a draft that becomes a stable release and emits `latest-mac.yml`. GitHub Pre-releases are never marked Latest. v1.0.1 remains Latest until a newer intentional stable release is published. The logical Preview label remains FORGE UI vocabulary; metadata filenames and Electron Updater provider configuration are internal implementation details.

The tag workflow packages without direct provider publication. It uploads the DMG, ZIP, blockmaps, then updater YAML serially and publishes the draft only afterward. Retry logic downloads and verifies an existing named asset, skips it when SHA-256 matches, and fails without replacement when bytes differ. See [Releasing FORGE](../RELEASING.md).

## Local development and install

```sh
npm ci
npm run dev
```

`npm run dev` builds main and preload, starts the Vite renderer, and launches Electron. The root postinstall ensures Electron's vendor app exists and makes the macOS `node-pty` helper executable.

To replace a local installed copy without a GitHub Release:

```sh
npm run install:mac
```

This builds the current architecture, updates one detected FORGE app under `/Applications` or `~/Applications`, and reopens it. It does not publish, sign, notarize, or establish a trusted automatic-update chain. Check both Applications locations for duplicates before deciding which copy to use.

## Packaging and publication

```sh
npm run package:mac
npm run package:mac:universal
npm run release:preview
npm run release:stable
```

Generated DMG/ZIP/blockmap/YAML output is ignored under `dist_electron/`. Preview publication is allowed only from merged, synchronized `main` at an annotated prerelease tag such as `v1.1.0-alpha.3`. The workflow marks prerelease tags as GitHub Pre-releases and does not mark them Latest. Stable publication uses a normal version/tag and GitHub Latest.

Before tagging, create a workspace-owned release task and rerun dependency installation, typecheck, lint, tests, production build, both package commands, packaged runtime probes, architecture checks, hashes, signing inspection, task persistence, terminal input, provider routing, and update-channel tests. Each executable step still requires approval. Do not overwrite v1.0.1, alpha.1, or alpha.2, and never republish a tag for different source.
