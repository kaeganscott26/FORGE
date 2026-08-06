# FORGE User Configuration

This guide covers Git integration, AI API integration, and macOS release credentials. Do not put real secrets in the repository.

## Git integration

FORGE uses the system `git` executable and the repository's existing configuration. Open **GitHub** in the app to save a username and fine-grained personal access token. Grant only the selected repositories and the minimum Contents read/write permission needed for pull and push.

The token is encrypted with Electron `safeStorage` and macOS Keychain. During an HTTPS GitHub pull or push, FORGE provides it to Git through a temporary ask-pass environment. It is not placed in the remote URL, project files, or `.forge/metadata.sqlite`.

Set your commit identity once:

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Confirm the workspace remote:

```sh
git remote -v
```

For GitHub HTTPS authentication, use Git Credential Manager or authenticate GitHub CLI and allow Git to use the resulting credentials. For SSH, add an SSH remote and load the matching key into the macOS keychain. FORGE never stores a GitHub password or token in `.forge/metadata.sqlite`.

Use **Test saved GitHub connection** in the app. You can also test system-managed credentials before using Pull or Push:

```sh
git fetch --prune origin
git push --dry-run origin HEAD
```

## AI API integration

Open **Settings** in FORGE to save the API key, base URL, and model. The API key is encrypted with macOS Keychain-backed storage and is never returned to the renderer after saving.

For development and automation, the OpenAI-compatible provider also supports these environment fallbacks:

| Variable | Required | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | none |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | No | `gpt-5.6-sol` |

For terminal development:

```sh
export OPENAI_API_KEY="your-key"
export OPENAI_MODEL="gpt-5.6-sol"
npm run dev
```

Do not paste the key into documentation, source, shell history, or Git. Prefer a local secret manager.

The in-app settings are recommended for packaged builds. macOS apps opened from Finder do not normally inherit shell startup variables. If you deliberately prefer session variables, use:

```sh
launchctl setenv OPENAI_API_KEY "your-key"
launchctl setenv OPENAI_MODEL "gpt-5.6-sol"
```

Quit and reopen FORGE afterward. Remove the session variables when needed:

```sh
launchctl unsetenv OPENAI_API_KEY
launchctl unsetenv OPENAI_MODEL
launchctl unsetenv OPENAI_BASE_URL
```

`.env.example` documents supported names, but the packaged app does not automatically load a repository `.env` file. Saved in-app values take precedence over environment values for base URL and model; a saved key takes precedence over `OPENAI_API_KEY`.

The default applies only when neither a saved preference nor `OPENAI_MODEL` exists. Existing saved model IDs, including older GPT-4o configurations, are preserved for backwards compatibility.

### Model discovery and validation

The model field accepts any non-empty ID. This is deliberate: FORGE does not require a source update whenever OpenAI or an OpenAI-compatible provider introduces a model.

- **Refresh provider models** calls `<API base URL>/models` using the entered key, or the stored key when the input is blank.
- **Validate model** checks for an exact ID in that response.
- A missing ID can still be saved for a compatible provider or future availability, but chat requests will display an unsupported/unavailable error until the provider accepts it.
- **Test saved model and API connection** validates the already stored URL, key, and model.

The automated request uses Chat Completions. FORGE sends `max_completion_tokens` and retries with legacy `max_tokens` only when an OpenAI-compatible endpoint rejects the newer parameter.

### Conversation and workspace configuration

AI credentials and the preferred model are app-global and encrypted outside project folders. Conversation history is not: threads, the selected thread, and panel layout are stored in `<workspace>/.forge/metadata.sqlite`. Opening another folder therefore switches all three without changing the API credentials.

The Settings build diagnostic is intentionally separate from user configuration. It contains only application version, release channel, build commit/date, runtime and renderer modes, platform, and architecture; it never includes saved secrets or private local paths.

## Tool and update configuration

External web research is off by default and has no environment-variable bypass. Enable it explicitly in Settings. Enabling web research does not approve a request: each `web.search`, `web.fetch`, or `web.open` remains Tier 2 and shows its exact query/URL and declared project-data transfer.

The update channel defaults to **Stable**, including migrated settings that have no channel field. Choose **Preview** to allow alpha, beta, and release-candidate versions. Stable sets Electron Updater to `latest` with prereleases disallowed; Preview uses the preview channel with prereleases allowed. After setting either feed, FORGE resets Electron Updater's downgrade flag to false and independently accepts a candidate only when valid SemVer proves it is newer than the installed version and belongs to the selected channel. Downloads remain disabled until this check passes. This preference contains no secret.

Tool session permissions are not stored in settings. They are exact workspace/tool/scope grants held only in memory, expire within one hour, and are cleared when the workspace changes. The persistent per-workspace action log is stored in `.forge/metadata.sqlite`; sensitive inputs are redacted before insertion.

## GitHub Release integration

The package publisher targets `kaeganscott26/FORGE`. GitHub Actions uses its generated `GITHUB_TOKEN` to attach DMG, ZIP, blockmap, and `latest-mac.yml` assets to version-tag releases. Prerelease tags create GitHub Pre-releases; stable tags create normal Latest releases.

For signed and notarized releases, add these repository Actions secrets:

- `CSC_LINK`: base64 data or secure URL for the Developer ID Application certificate;
- `CSC_KEY_PASSWORD`: certificate password;
- `APPLE_ID`: Apple developer account email;
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific Apple password;
- `APPLE_TEAM_ID`: Apple Developer team identifier.

Never use placeholder certificate identities. If `CSC_LINK` is absent, the workflow deliberately publishes an unsigned build and in-app automatic installation is not expected to work on macOS.

## Version and release procedure

1. Run `npm version X.Y.Z --workspaces --include-workspace-root --no-git-tag-version` so every workspace package and the generated lockfile metadata agree. Use a prerelease version such as `1.1.0-alpha.2` for Preview.
2. Inspect the resulting package and lockfile diff; do not hand-edit generated dependency versions.
3. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package:mac`, and `npm run package:mac:universal`.
4. Commit and push `main`.
5. Create and push an annotated `vX.Y.Z` tag from the exact synchronized commit.
6. Verify the GitHub Release assets and test the DMG on a clean macOS account.

Versions must always increase. Reusing a version can strand clients on an older update payload.
