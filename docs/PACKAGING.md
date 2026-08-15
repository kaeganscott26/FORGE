# 📦 Native packaging

FORGE packages on the operating system it targets. This keeps native dependencies, especially `node-pty`, built and inspected for the platform that will run them. These commands create local artifacts only; they do not tag, upload, publish, install, or change updater configuration.

## 🍎 macOS

Run from macOS (Darwin):

```sh
./scripts/package-macos.sh
```

The script performs a clean lockfile install, typecheck, lint, tests, and production build. It then runs the established universal macOS packaging target and verifies its build manifest, DMG, ZIP, and universal unpacked `node-pty` resources. Artifacts are written to `dist_electron/` as versioned `.dmg` and `.zip` files.

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

Windows native packaging requires:

- Node.js 22 (the repository `.nvmrc` major) and npm
- Python 3 for `node-gyp`
- Visual Studio 2022 or Visual Studio 2022 Build Tools with **Desktop development with C++**
- a Windows 10/11 SDK containing the Desktop C++ libraries
- the **x64/x86 Spectre-mitigated libraries matching the installed MSVC toolset**; with current VS 2022 tooling this is normally the latest v143 x64/x86 Spectre component in Visual Studio Installer

The packaging script checks those native prerequisites before running the source gate so an incomplete Visual Studio installation fails immediately with an actionable message instead of reaching Electron's `node-pty` rebuild and failing with `MSB8040`. It then performs the clean lockfile install, typecheck, lint, tests, creates the x64 NSIS installer, and verifies the installer plus unpacked Windows `node-pty`, ConPTY, and console-list modules. Every external command is checked for a non-zero exit code so Windows PowerShell and PowerShell 7 fail consistently.

The expected artifact is a versioned `FORGE-<version>-x64.exe` under `dist_electron/`. The configured high-resolution FORGE PNG is converted to the Windows icon format by Electron Builder during packaging; no hand-made ICO conversion is used.

Packaging success is not installation or runtime acceptance. After the installer is produced, install and launch that exact artifact on Windows and complete the release acceptance checks before marking Windows support verified.

## 🧾 Acceptance boundary

These scripts verify package inputs and artifacts; they do not establish a runtime-accepted release. Run the packaged app and follow the relevant release acceptance procedure before claiming platform support, updater compatibility, signing, or notarization. Windows and Linux packages must be produced on their native OS or a native CI runner; a macOS `node-pty` build is not reusable on either platform.
