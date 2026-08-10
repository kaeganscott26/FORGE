# Codex session handoff: FORGE Linux / FORGE OS

## Resume objective

Continue the FORGE Linux primary implementation mission on the minimal Arch
installation. Arch remains the low-level substrate; FORGE is to become the
persistent user-facing workspace/runtime. Preserve FORGE's provider-neutral
intelligence, workspace-owned `.forge/metadata.sqlite`, constrained renderer,
normal-user execution, and recoverable TTY path.

Do not resume the unrelated Cloudflare/AIFRED work described by the stale root
`codex_prompt.md`.

## Authoritative mission source

The correct high-level prompt is:

- `Dev_notes/FORGE_Linux_OS_Prompt.md`

The complete executable mission is the **MASTER CODEX PROMPT** embedded in:

- `Dev_notes/ARCH_FORGE_OS_EXPERIMENT.md`, beginning near line 983 and ending
  near line 1525.

Read that complete block and the repository `AGENTS.md` before continuing.

## Verified machine state

Observed on 2026-08-10, America/Chicago:

- Host: `forge-linux`, ASUS TUF Gaming FX705DY, x86_64.
- OS: Arch Linux on persistent ext4 root `/dev/sda2`; EFI mounted at `/boot`.
- Running kernel at discovery: `7.1.6-arch1-1`.
- Active user: `North3rnLight3r` UID 1000, member of `wheel`; there is a prompt
  mismatch because the master prompt assumed a user named `forge`.
- Session: local `tty1`; no active X11/Wayland display or display manager.
- NetworkManager: enabled, active, full connectivity.
- Failed systemd units: none at discovery.
- Recovery getty template is enabled; physical VT recovery is not yet tested.
- Sudo: `sudo -l` reports blanket `NOPASSWD: ALL` plus normal ALL authority.
  `/etc/sudoers.d/90-forge-experiment` was absent, so the defining rule still
  needs to be located before stable-state removal.
- CPU: AMD Ryzen 5 3550H, 4 cores / 8 threads; 15 GiB RAM; no swap.
- GPUs: AMD Picasso/Vega integrated plus AMD Baffin discrete, both using
  `amdgpu`.
- Wi-Fi: Qualcomm Atheros QCA9377 using `ath10k_pci`.
- Node at discovery/current pre-install check: `v26.7.0`; npm `12.0.2`.
- Repository requirement: Node.js 22 LTS.
- Codex CLI: `0.147.0`; Git `2.55.0`; `base-devel` is installed.

## FORGE source state

- Repository: `/home/North3rnLight3r/FORGE`
- Branch: `main`, tracking `origin/main`.
- Source commit before this handoff commit:
  `ab650e63714b9e23b87200b8c0d61a327f5ec118`.
- Pre-existing user-owned modification:
  `apps/desktop/out/main/index.js` contains only updated generated build commit
  and date constants. It was not edited, reverted, or staged during this work.
- Linux packaging entrypoint: `scripts/package-linux.sh`.
- Existing unverified artifacts:
  `dist_electron/FORGE-2.3.0-beta.1-x86_64.AppImage` and
  `dist_electron/linux-unpacked/forge`.
- Existing AppImage SHA-256:
  `4a2752da4f5acd7dd30dff053de4e0ceaa74c077f99d6a0f827377150ede7865`.
- Existing unpacked executable SHA-256:
  `57defb643d7c3e0718419a414dfd758986d6d50ba9b50c9f7ff154eeb26e973d`.
- Electron could not start at discovery because the bare system lacked GTK/X11
  runtime libraries. These artifacts are not accepted production evidence.

## FORGE-OS integration repository created

A new local repository exists at `/home/North3rnLight3r/FORGE-OS`.

Initial commit:

```text
1cb1bbe8147193f381ac3666f26f0e85e0e6f012
docs: record initial FORGE OS system state
```

Tracked files:

- `README.md`
- `ARCHITECTURE.md`
- `BUILD_STATE.md`

The repository was clean after the commit and has no configured remote. Its
local Git author identity was copied from authoritative FORGE history rather
than changing global Git configuration.

## Package transaction currently in progress

An Arch bootstrap transaction was started with:

```bash
sudo pacman -Syu --needed nodejs-lts-jod xorg-server xorg-xinit openbox xterm gtk3 mesa alsa-lib libnotify cups
```

The explicit `nodejs` 26 -> `nodejs-lts-jod` 22 conflict replacement and the
139-package transaction were approved interactively. Pacman reported roughly
283.50 MiB download, 744.81 MiB installed size, and 530.57 MiB net increase. The
transaction also includes a kernel upgrade to `7.1.7.arch1-1` because Arch was
being fully synchronized.

At handoff creation, pacman processes were still alive (parent PID 5377 and
download worker PID 5392), `/var/lib/pacman/db.lck` was owned by them, and the
requested packages had **not** yet been installed. Node remained 26. The
download was slow and had previously reached only the early part of the total.

Do not start another pacman process. First reconcile reality:

```bash
ps -eo pid,ppid,state,comm,args | rg 'pacman|sudo pacman'
sudo fuser /var/lib/pacman/db.lck
pacman -Q nodejs nodejs-lts-jod xorg-server xorg-xinit openbox
node --version
```

If the process is alive, monitor it rather than duplicating it. If it ended,
inspect its exit status/output if available and verify package state before
deciding whether to retry. Never remove the pacman lock while a pacman process
is alive.

## Next dependency-ready work

1. Reconcile and complete/verify the existing package transaction.
2. Record the resulting package and kernel state in FORGE-OS `BUILD_STATE.md`.
   A reboot will eventually be needed for the new kernel, but do not reboot
   unattended.
3. Verify Node 22, Electron shared libraries, Xorg/Openbox binaries, and package
   ownership.
4. Run FORGE's relevant checks using the supported toolchain. Preserve the
   pre-existing generated-file modification and inspect all new build output.
5. Build a fresh native Linux package with `scripts/package-linux.sh`; record
   source commit, artifact path, and SHA-256.
6. Test the packaged executable under X manually before creating any boot/login
   launcher.
7. Implement the session/install/verification layer in `~/FORGE-OS` as tracked,
   reversible files. Preserve console recovery and do not run FORGE as root.
8. Update and commit `BUILD_STATE.md` at coherent milestones.

## Non-actions and safety boundaries

- No disks, partitions, filesystems, EFI files, bootloader, login startup, or
  service enablement were changed.
- No FORGE source file was intentionally modified during the session.
- No reboot was issued.
- No blanket sudo rule was removed; its actual source is unresolved.
- Do not point automatic startup at the mutable FORGE development checkout.
- Do not claim graphical, PTY, persistence, reboot, or packaged-app acceptance
  until each is observed and recorded.
- Keep `/home/North3rnLight3r/FORGE-OS` as the source authority for installed OS
  integration files; do not hand-edit system state without a reproducible
  tracked source.
