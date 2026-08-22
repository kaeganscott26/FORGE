# ⚙️ FORGE User Configuration

This guide covers Git integration, AI API integration, platform updates, and release credentials. Do not put real secrets in the repository.

## 🌿 Git integration

FORGE uses the system `git` executable and the repository's existing configuration. Open **GitHub** in the app to save a username and fine-grained personal access token. Grant only the selected repositories and the minimum Contents read/write permission needed for pull and push.

The token is encrypted with Electron `safeStorage` using the secure credential service available on macOS, Windows, or Linux. If secure OS encryption is unavailable, FORGE refuses to save the secret. During an HTTPS GitHub pull or push, FORGE provides it to Git through a private ask-pass environment. It is not placed in the remote URL, project files, or `.forge/metadata.sqlite`.

Set your commit identity once:

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Confirm the workspace remote:

```sh
git remote -v
```

For GitHub HTTPS authentication, use Git Credential Manager or authenticate GitHub CLI and allow Git to use the resulting credentials. For SSH, add an SSH remote and load the matching key into the platform SSH agent or credential service. FORGE never stores a GitHub password or token in `.forge/metadata.sqlite`.

Use **Test saved GitHub connection** in the app. You can also test system-managed credentials before using Pull or Push:

```sh
git fetch --prune origin
git push --dry-run origin HEAD
```

## 🤖 AI API integration

Open **Settings** in FORGE to save the API key, base URL, and model. The API key is encrypted with Electron's platform secure storage and is never returned to the renderer after saving.

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

The in-app settings are recommended for packaged builds. Desktop apps do not reliably inherit interactive-shell startup variables. On macOS, if you deliberately prefer session variables, use:

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

`.env.example` documents supported names, but the packaged app does not automatically load a repository `.env` file. Saved in-app values take precedence over environment values for base URL and model; a saved key takes precedence over `OPENAI_API_KEY`. Remote providers require a key. Loopback OpenAI-compatible providers at `localhost`, `127.0.0.1`, or `::1` may run keyless; Ollama's conventional base URL is `http://127.0.0.1:11434/v1`.

The default applies only when neither a saved preference nor `OPENAI_MODEL` exists. Existing saved model IDs, including older GPT-4o configurations, are preserved for backwards compatibility.

### 🔎 Model discovery and validation

The model field accepts any non-empty ID. This is deliberate: FORGE does not require a source update whenever OpenAI or an OpenAI-compatible provider introduces a model.

- **Refresh provider models** calls `<API base URL>/models` using the entered key, the stored key when the input is blank, or no authorization header for a keyless loopback provider.
- **Validate model** checks for an exact ID in that response.
- A missing ID can still be saved for a compatible provider or future availability, but chat requests will display an unsupported/unavailable error until the provider accepts it.
- **Test saved model and API connection** validates the already stored URL, key, and model.

GPT-5.6 tool-capable turns use `<API base URL>/responses`, flat Responses function tools, and provider aliases mapped back to FORGE's stable tool names. Other compatible models use Chat Completions; FORGE sends `max_completion_tokens` and retries with legacy `max_tokens` only when an older compatible endpoint rejects the newer parameter. Model routing changes provider protocol only—the same registry, policy, approval, executor, and audit boundaries apply.

### 🧠 Conversation and workspace configuration

AI credentials and the preferred model are app-global and encrypted outside project folders. Conversation and task state are not: threads, the selected thread, persistent task steps/checkpoints/events, audit links, and panel layout are stored in `<workspace>/.forge/metadata.sqlite`. Opening another folder therefore switches all workspace state without changing the API credentials. Assigning provider/model metadata to a task is provenance, not ownership or execution authority.

The Settings build diagnostic is intentionally separate from user configuration. It contains only application version, release channel, build commit/date, runtime and renderer modes, platform, and architecture; it never includes saved secrets or private local paths.

## 🛡️ Tool and update configuration

External web research is off by default and has no environment-variable bypass. Enable it explicitly in Settings. Enabled public `web.search`, `web.fetch`, `browser.read`, and `browser.find` requests run as bounded read-only tools; browser navigation, remote writes, and declared project-data transfer retain approval. Provider schemas contain only semantic tool arguments: FORGE supplies audit reasons and workspace/conversation/model/task execution identity internally. Every request remains validated, bounded, and audited.

The update channel defaults to **Stable**, including settings with no recognized channel. Choose **Beta** to allow newer beta, release-candidate, or stable versions. A legacy stored `preview` value migrates to `beta`. Bounded GitHub Release discovery filters drafts, malformed versions, incompatible prereleases, unsafe metadata, and non-forward versions before selecting an exact feed. Stable accepts only normal semantic versions. The selected feed resets downgrade permission, and the returned version is checked again before download. This preference contains no secret.

Beta does not accept future alpha versions. The legacy preference migration moves an installed alpha.3 forward to the Beta channel under the corrected discovery policy.

Tool session permissions are not stored in settings. They are exact workspace/tool/scope grants held only in memory, expire within one hour, and are cleared when the workspace changes. A persistent task or saved approval record never revives an expired permission. The persistent per-workspace action log and linked task events are stored in `.forge/metadata.sqlite`; sensitive inputs are redacted before insertion.

The **Home** control opens the current operating-system home directory as the active workspace. This changes the workspace boundary; it does not grant global filesystem access. Explorer folders load on demand, bounded intelligence scans stop after their evidence budget, and protected operating-system or container-storage subtrees are skipped. All normal file, terminal, Git, memory, and model tools remain confined to the selected workspace.

### Platform source updates

| Platform | Command | Result |
| --- | --- | --- |
| macOS | `npm run update:mac` | Trusted fast-forward, universal package verification, `/Applications/FORGE.app` install, launch |
| Windows PowerShell | `npm run update:win` | Trusted fast-forward, x64 NSIS package/install, installed `app.asar` verification |
| Linux standalone | `./scripts/package-linux.sh` | Native AppImage and DEB build/verification; does not install |
| FORGE-OS | `cd ~/FORGE-OS && ./update.sh` | Updates pinned sibling sources, checkpoints integration, installs runtime, preserves `.obsidian` |

The macOS and Windows update scripts require `main`, the trusted GitHub origin, and no source changes outside `.obsidian`. They refuse divergent history. Run native packaging on its target OS; macOS inspection does not prove a Windows or Linux package.

## 📦 GitHub Release integration

The package publisher targets `kaeganscott26/FORGE`. GitHub Actions uses its generated `GITHUB_TOKEN` to create a draft version-tag release, attach DMG, ZIP, blockmaps, and channel YAML serially, verify byte-identical assets on retry, and publish only after the upload sequence succeeds. Prerelease tags create GitHub Pre-releases; stable tags create normal Latest releases.

For signed and notarized releases, add these repository Actions secrets:

- `CSC_LINK`: base64 data or secure URL for the Developer ID Application certificate;
- `CSC_KEY_PASSWORD`: certificate password;
- `APPLE_ID`: Apple developer account email;
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific Apple password;
- `APPLE_TEAM_ID`: Apple Developer team identifier.

Never use placeholder certificate identities. If `CSC_LINK` is absent, the workflow deliberately publishes an unsigned build and in-app automatic installation is not expected to work on macOS.

## 🚀 Version and release procedure

1. Run `npm version X.Y.Z --workspaces --include-workspace-root --no-git-tag-version` so every workspace package and generated lockfile record agrees. The current beta identity is `2.3.0-beta.1` (`FORGE v2.3 Beta`).
2. Inspect the resulting package and lockfile diff, then run `npm run verify:release-version`; do not hand-edit generated dependency versions.
3. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package:mac`, and `npm run package:mac:universal`; use `package:mac:all` for one clean combined artifact directory.
4. Commit on a feature/release branch, push it, open a pull request, and merge only after checks pass.
5. Synchronize local `main` with `origin/main` and record the authoritative commit.
6. Create and push an annotated `vX.Y.Z` tag from that exact synchronized commit.
7. Verify workflow provenance, local/remote hashes, the installed app, runtime diagnostics, terminal input, task persistence, and updater behavior. See `RELEASING.md`.

Versions must always increase. Reusing a version can strand clients on an older update payload.
