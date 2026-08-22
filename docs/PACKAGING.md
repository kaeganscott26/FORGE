# 📦 Native packaging

FORGE packages on the operating system it targets. This keeps native dependencies, especially `node-pty`, built and inspected for the platform that will run them. These commands create local artifacts only; they do not tag, upload, publish, install, or change updater configuration.

## 🍎 macOS

Run from macOS (Darwin):

```sh
./scripts/package-macos.sh
```

The script performs a clean lockfile install, typecheck, lint, tests, and production build. It then stages runtime metadata, runs the established universal macOS packaging target, and verifies its build manifest, bundle version, embedded UI commit/build date, runtime metadata, DMG, ZIP, and universal unpacked `node-pty` resources. Artifacts are written to `dist_electron/` as versioned `.dmg` and `.zip` files.

Install the verified package with `npm run install:mac`. The installer copies the universal app to a sibling staging path, verifies its executable hash, `app.asar` hash, architectures, bundle version, embedded UI commit/build date, and runtime metadata against `build-manifest.json`, then replaces `/Applications/FORGE.app` with rollback to the Trash copy if activation fails. It atomically refreshes the architecture-independent launcher at `/usr/local/bin/forge-session` only when that launcher changed, so normal app upgrades do not request administrator authentication. The launcher always targets the canonical application location, so it remains valid when a later packaged app replaces the bundle. `forge-session --runtime-info` reports the installed version and source commit without launching the UI.

For a clean `main` checkout, `npm run update:mac` performs a trusted-origin fast-forward, preserves local `.obsidian` UI state, runs the complete macOS packaging gates, installs the verified universal app, and opens it. It refuses source changes outside `.obsidian` and restores the pre-update source commit if packaging or installation fails.

Platform artifacts are deliberately not byte-identical: macOS is universal Mach-O while Linux and Windows use native platform executables. Parity is established by the exact `gitCommit` embedded in each runtime plus matching app behavior and UI; each platform verifies its own executable, `app.asar`, and payload hashes. FORGE-OS records that same source commit in `/opt/forge/current/.forge-runtime.env` and launches it through its own `/usr/local/bin/forge-session` session wrapper.

Signing and notarization remain controlled by the existing Electron Builder environment and release workflow. Set `CSC_IDENTITY_AUTO_DISCOVERY=false` when an unsigned development or beta package is intended.

## 🐧 Linux

Run from a Linux x64 machine or native Linux CI runner:

```sh
./scripts/package-linux.sh
```

The script requires Node.js, npm, Python 3, `make`, and `g++` so `node-pty` can be installed for Linux. It never installs system packages or uses `sudo`; on Debian/Ubuntu install `python3 build-essential`, or on Arch install `python3 base-devel`, before retrying. It produces and verifies versioned `.AppImage` and `.deb` artifacts in `dist_electron/` and checks the unpacked Linux PTY module and helper.

## 🪟 Windows

Run in PowerShell on a Windows x64 machine or native Windows CI runner:

```powershell
.\scripts\package-windows.ps1
```

The script performs the same lockfile install and source gate, creates the x64 NSIS installer, and verifies the installer plus unpacked Windows `node-pty`, ConPTY, and console-list modules. Its expected artifact is a versioned `FORGE-<version>-x64.exe` under `dist_electron/`.

For a clean `main` checkout, `npm run update:win` performs a trusted-origin fast-forward, preserves local `.obsidian` UI state, runs the complete native Windows packaging gates, installs the NSIS package silently after confirming FORGE is closed, and verifies that the installed `app.asar` matches the package. Run it from PowerShell on Windows.

The configured high-resolution FORGE PNG is converted to the Windows icon format by the installed Electron Builder during packaging; no hand-made ICO conversion is used. Windows packaging and runtime acceptance have not yet been executed.

## 🧾 Acceptance boundary

These scripts verify package inputs and artifacts; they do not establish a runtime-accepted release. Run the packaged app and follow the relevant release acceptance procedure before claiming platform support, updater compatibility, signing, or notarization. Windows and Linux packages must be produced on their native OS or a native CI runner; a macOS `node-pty` build is not reusable on either platform.
