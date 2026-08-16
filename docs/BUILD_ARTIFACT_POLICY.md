# 🧪 Build Artifact Policy

Git history preserves source development. GitHub Releases contain only currently supported public binaries. Local packaging output contains only the newest validated build.

`dist_electron/` is generated, ignored by Git, excluded from workspace memory indexing, and cleaned before every standalone package command. `npm run package:mac:all` cleans once and creates the ARM64 and universal families together. Electron Builder debug state, temporary icons, obsolete versions, and stale updater YAML are removed before the manifest is written.

`dist_electron/build-manifest.json` is the authoritative local artifact selector. It records:

- release version, tag, channel, source commit, and build date;
- platform and observed architectures;
- exact artifact and packaged-app paths;
- byte sizes and SHA-256 hashes;
- packaged executable and `app.asar` hashes.

`npm run install:mac` and the serial release uploader read this manifest. They do not use wildcard-first-match selection. The verifier rejects a missing, malformed, stale, path-escaping, size-mismatched, or hash-mismatched record. The macOS installer verifies both the packaged source bundle and its `/Applications` staging copy before it activates the canonical app, then verifies the activated bundle again.

The installer treats system and user Applications directories as distinct installation locations while respecting the default case-insensitive macOS filesystem. A capitalization alias of `/Applications/FORGE.app` is not misclassified as a second bundle.

Old local packages are moved to a timestamped Trash location only after a replacement staging copy has passed manifest validation; a failed activation restores that prior system bundle. Do not index generated binaries, updater caches, `.forge/`, `.obsidian/`, local databases, or packaging output as workspace memory.

Deleting a GitHub Release and release tag removes convenient public access to that historical binary. The underlying source commits remain in Git history. Such cleanup is allowed only after a newer release has passed local and public artifact acceptance, and only for exact audited obsolete release tags.
