# Release Channels

FORGE has three explicit channels.

| Channel | Version identity | Purpose |
| --- | --- | --- |
| Development | `1.1.0-alpha.2-dev` | `npm run dev` or an unpackaged source build |
| Preview | prerelease SemVer such as `1.1.0-alpha.2` | Security and packaging evaluation before stable |
| Stable | normal SemVer such as `1.1.0` | Public production updates |

Diagnostics display version, channel, exact source commit, build date, runtime mode, renderer source, platform, and architecture. Packaged prerelease versions infer `preview`; normal packaged versions infer `stable`; unpackaged runs are always `development`.

Existing and new settings default to **Stable**. Electron Updater sets `allowPrerelease=false` and channel `latest` for Stable. Selecting **Preview** sets `allowPrerelease=true` and channel `preview`. Changing Electron Updater's channel can internally enable downgrade checks, so FORGE always resets `allowDowngrade=false` after setting the channel. Automatic download is disabled until a separate SemVer gate proves the candidate is strictly newer than the installed version and, on Stable, has no prerelease component.

The resulting order is `1.0.1 < 1.1.0-alpha.1 < 1.1.0-alpha.2 < 1.1.0-beta.1 < 1.1.0`. Stable 1.0.1 therefore ignores both alphas and future betas unless Preview is selected. Preview alpha.1 may advance to alpha.2, beta, or stable, while Preview alpha.2 rejects alpha.1 and older Stable 1.0.1 as downgrades. Invalid or equal versions also fail closed.

Preview publication explicitly uses the `preview` GitHub channel and generates `preview-mac.yml`; Stable publication uses `latest`. GitHub Pre-releases are never marked Latest, so v1.0.1 remains the Latest stable release until a newer normal SemVer release is intentionally published.

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

Generated DMG/ZIP/blockmap/YAML output is ignored under `dist_electron/`. Preview publication is allowed only from merged, synchronized `main` at an annotated prerelease tag such as `v1.1.0-alpha.2`. The workflow marks prerelease tags as GitHub Pre-releases and does not mark them Latest. Stable publication uses a normal version/tag and GitHub Latest.

Before tagging, rerun install, typecheck, lint, tests, production build, both package commands, packaged runtime probes, architecture checks, hashes, signing inspection, and update-channel tests. Do not overwrite v1.0.1 or republish a tag for different source.
