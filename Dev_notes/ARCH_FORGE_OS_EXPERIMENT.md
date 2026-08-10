# FORGE OS — Single-USB Arch Linux Experiment

> Command-by-command reconstruction of the Arch/FORGE experiment discussed on August 9, 2026, before the read-aloud rewrite.
>
> **Goal:** use one Arch Linux USB only as installation media, install a minimal persistent Arch system onto the computer's internal drive, boot into that real filesystem, launch FORGE as the primary graphical workspace, launch Codex from the FORGE terminal, and let Codex construct the higher-level operating environment around FORGE's existing architecture.

---

## 0. What this experiment is actually testing

This is **not** an attempt to replace the Linux kernel with FORGE.

The experiment is testing whether FORGE can become the persistent user-facing intelligence/runtime layer of an Arch Linux system while Linux continues doing the jobs Linux is already good at: hardware, drivers, processes, networking, filesystems, package management, and boot.

The intended stack is:

```text
hardware
  ↓
Linux kernel + Arch userspace
  ↓
systemd / NetworkManager / filesystem / package manager
  ↓
minimal graphical session
  ↓
FORGE
  ↓
FORGE workspace intelligence + persistent project state
  ↓
replaceable agents: Codex / Ollama / Claude / future models
  ↓
FORGE tools + normal Linux terminal + sudo when explicitly granted
```

The important architectural rule is:

> **The model is replaceable. The workspace is durable.**

FORGE's existing architecture already separates workspace intelligence from agent execution. This experiment extends that idea upward into the host operating environment.

---

# 1. The one-USB model

Only one USB drive is required.

The USB is **temporary scaffolding**:

1. Flash the official Arch ISO to the USB.
2. Boot the computer from the USB.
3. Use the Arch live terminal to install a minimal Arch system onto the internal SSD.
4. Reboot.
5. Remove the USB.
6. Boot the newly installed Arch system from the internal SSD.
7. Everything from this point forward happens inside the real installed filesystem.
8. Install the minimum graphics layer required by Electron.
9. Clone/build FORGE.
10. Launch FORGE from the terminal.
11. Open FORGE's integrated terminal.
12. Install/launch Codex there.
13. Give Codex the OS-construction prompt later in this document.

The USB does **not** become FORGE OS and it does not need to remain connected after Arch is installed.

---

# 2. Before starting

## You need

- One USB drive large enough for the Arch installer.
- A computer with an x86_64 CPU and an internal SSD/HDD that can be erased for this experiment.
- Internet access.
- A second device, such as a phone, with this document available while performing the installation.
- Your GitHub access for cloning FORGE.
- Your OpenAI/ChatGPT login for Codex.

## Hard compatibility gate

This runbook targets a **separate x86_64 UEFI computer**. FORGE's current Linux
package target is x64, and the Arch ISO used here is x86_64. An Apple Silicon
Mac can create the installer USB, but it is not the target machine for these
instructions.

Before any partitioning command, boot the USB on the target and verify:

```bash
uname -m
test -d /sys/firmware/efi/efivars && echo 'UEFI boot confirmed'
```

The first command must print `x86_64`, and the second must succeed. Stop if
either condition is false; do not attempt to adapt the disk or bootloader
instructions while in the installer.

## Important disk warning

The disk-formatting section intentionally destroys the selected target disk.

**Do not blindly copy a device name such as `/dev/nvme0n1` or `/dev/sda`.**

Always inspect `lsblk` and confirm which device is the internal target before formatting anything.

The commands below use these examples:

```text
/dev/nvme0n1      internal NVMe SSD
/dev/nvme0n1p1    EFI System Partition
/dev/nvme0n1p2    Arch root filesystem
```

On a SATA/SATA-like disk the equivalent may instead be:

```text
/dev/sda
/dev/sda1
/dev/sda2
```

Replace the example paths with the actual target discovered on the machine.

---

# 3. Create the Arch installer USB

Download the current official Arch Linux x86_64 ISO from:

https://archlinux.org/download/

## From Linux

First identify the USB:

```bash
lsblk
```

Unmount its mounted partitions if necessary, then write the ISO to the **whole USB device**, not a numbered partition:

```bash
sudo dd if=archlinux-x86_64.iso of=/dev/sdX bs=4M status=progress oflag=sync
sync
```

Replace `/dev/sdX` with the actual USB device.

## From macOS

Find the USB:

```bash
diskutil list
```

Unmount the disk:

```bash
diskutil unmountDisk /dev/diskN
```

Write the ISO using the raw device for speed:

```bash
sudo dd if=archlinux-x86_64.iso of=/dev/rdiskN bs=4m
sync
```

Replace `diskN` / `rdiskN` with the actual USB disk number.

## From Windows

Use a trusted raw-image writer such as Rufus and select the Arch ISO and the correct USB drive.

---

# 4. Boot the Arch USB

Boot the experimental computer from the USB using its firmware boot menu.

Choose the normal Arch Linux installation environment.

Once the terminal appears, confirm the machine booted in UEFI mode:

```bash
ls /sys/firmware/efi/efivars
```

If that directory exists and contains entries, continue with the UEFI instructions below.

Check the clock:

```bash
timedatectl
```

---

# 5. Get online from the live Arch terminal

Check interfaces:

```bash
ip link
```

If Ethernet is already connected, test it:

```bash
ping -c 3 archlinux.org
```

For Wi-Fi:

```bash
iwctl
```

Inside `iwctl`:

```text
device list
station <device> scan
station <device> get-networks
station <device> connect "YOUR_WIFI"
exit
```

For example, if the wireless interface is `wlan0`:

```text
station wlan0 scan
station wlan0 get-networks
station wlan0 connect "YOUR_WIFI"
```

Then verify networking:

```bash
ping -c 3 archlinux.org
```

Do not continue until networking works.

---

# 6. Identify the internal target disk

Run:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,MODEL
```

Also useful:

```bash
fdisk -l
```

Identify:

- the USB installer;
- the internal SSD/HDD that will become the Arch/FORGE system.

For the rest of this example assume the target is:

```text
/dev/nvme0n1
```

**Stop here and verify this is actually the disposable target disk before continuing.**

---

# 7. Partition the internal drive

Open the target with `cfdisk`:

```bash
cfdisk /dev/nvme0n1
```

Choose **GPT** if asked for a partition-table type.

For the experiment, keep the layout deliberately simple:

```text
Partition 1: 1 GiB       EFI System
Partition 2: remaining   Linux filesystem
```

Write the changes and quit.

Inspect again:

```bash
lsblk -f
```

The expected shape is approximately:

```text
nvme0n1
├─nvme0n1p1   1G
└─nvme0n1p2   remaining space
```

---

# 8. Format and mount the new filesystems

Example variables for NVMe:

```bash
ESP=/dev/nvme0n1p1
ROOT=/dev/nvme0n1p2
```

For SATA these might instead be `/dev/sda1` and `/dev/sda2`.

Format the EFI partition:

```bash
mkfs.fat -F32 "$ESP"
```

Format the root filesystem:

```bash
mkfs.ext4 "$ROOT"
```

Mount the new root:

```bash
mount "$ROOT" /mnt
```

Create and mount the EFI mount point:

```bash
mkdir -p /mnt/boot
mount "$ESP" /mnt/boot
```

Verify:

```bash
findmnt /mnt
findmnt /mnt/boot
```

---

# 9. Install only the base Arch system

The first target is deliberately boring: **a bootable Arch terminal**.

Do not install GNOME, KDE, a display manager, or a large desktop environment.

Install the base system:

```bash
pacstrap -K /mnt \
  base \
  linux \
  linux-firmware \
  networkmanager \
  sudo \
  nano \
  git \
  base-devel \
  grub \
  efibootmgr
```

## CPU microcode

Check CPU vendor if needed:

```bash
lscpu | grep 'Vendor ID'
```

For AMD:

```bash
pacstrap -K /mnt amd-ucode
```

For Intel:

```bash
pacstrap -K /mnt intel-ucode
```

---

# 10. Generate fstab

Generate persistent filesystem mounts using UUIDs:

```bash
genfstab -U /mnt >> /mnt/etc/fstab
```

Inspect it:

```bash
cat /mnt/etc/fstab
```

Make sure the root and boot partitions look correct before continuing.

---

# 11. Enter the installed Arch filesystem

This is the first major handoff from the installer into the system being created:

```bash
arch-chroot /mnt
```

You are now executing commands against the newly installed Arch root filesystem.

---

# 12. Configure time, locale, hostname, users, and sudo

## Time zone

For this experiment:

```bash
ln -sf /usr/share/zoneinfo/America/Chicago /etc/localtime
hwclock --systohc
```

For another location, replace `America/Chicago` with the appropriate zone.

## Locale

Enable US English UTF-8:

```bash
sed -i 's/^#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
locale-gen
```

Create locale configuration:

```bash
echo 'LANG=en_US.UTF-8' > /etc/locale.conf
```

## Hostname

```bash
echo 'forge-os' > /etc/hostname
```

Create `/etc/hosts`:

```bash
cat > /etc/hosts <<'EOF'
127.0.0.1 localhost
::1       localhost
127.0.1.1 forge-os.localdomain forge-os
EOF
```

## Root password

```bash
passwd
```

## Create the normal user

The experiment uses a normal user named `forge` rather than running the graphical environment as root:

```bash
useradd -m -G wheel -s /bin/bash forge
passwd forge
```

## Enable normal sudo access for wheel

Create a sudoers drop-in:

```bash
printf '%%wheel ALL=(ALL:ALL) ALL\n' > /etc/sudoers.d/10-wheel
chmod 440 /etc/sudoers.d/10-wheel
visudo -cf /etc/sudoers.d/10-wheel
```

The final command should report that the file parsed successfully.

This is the permanent sudo policy. It still requires the user's password.

---

# 13. Enable networking on boot

```bash
systemctl enable NetworkManager
```

---

# 14. Install the bootloader

Still inside `arch-chroot`:

```bash
grub-install \
  --target=x86_64-efi \
  --efi-directory=/boot \
  --bootloader-id=FORGE
```

Generate the GRUB configuration:

```bash
grub-mkconfig -o /boot/grub/grub.cfg
```

If firmware refuses to retain a normal UEFI boot entry on the particular experiment machine, the removable/fallback installation form can be used as a recovery option:

```bash
grub-install \
  --target=x86_64-efi \
  --efi-directory=/boot \
  --bootloader-id=FORGE \
  --removable

grub-mkconfig -o /boot/grub/grub.cfg
```

Do not run both forms repeatedly without a reason; the first normal UEFI install is the preferred starting point for an internal disk.

---

# 15. Leave chroot and reboot into the real system

Exit:

```bash
exit
```

Unmount everything:

```bash
umount -R /mnt
```

Reboot:

```bash
reboot
```

**Remove the USB when the machine begins rebooting.**

The next boot should come from the internal SSD.

This is the critical experimental boundary:

> From this point on, the machine is no longer running from the Arch USB. It is operating from the installed Arch filesystem that will become the FORGE environment.

---

# 16. First boot into bare Arch

Log in as:

```text
forge
```

Check the system:

```bash
uname -a
findmnt /
lsblk -f
ip link
```

If Wi-Fi is not connected, use NetworkManager's text UI:

```bash
sudo nmtui
```

Then confirm internet access:

```bash
ping -c 3 archlinux.org
```

Update the system:

```bash
sudo pacman -Syu
```

At this point the original goal has been reached:

**bare Arch terminal, running from the internal filesystem, with networking and sudo.**

Now FORGE gets layered onto it.

---

# 17. Install the minimum graphical and FORGE build stack

FORGE is an Electron application, so a completely text-only terminal cannot display the UI. We do **not** need a full desktop environment; we only need enough graphics infrastructure to create an X session and give Electron a window manager.

Install Node.js 22 LTS and the basic graphics/build packages:

```bash
sudo pacman -S --needed \
  nodejs-lts-jod \
  npm \
  git \
  base-devel \
  python \
  xorg-server \
  xorg-xinit \
  openbox \
  mesa \
  gtk3 \
  nss \
  libxss \
  alsa-lib \
  noto-fonts
```

Check versions:

```bash
node --version
npm --version
```

FORGE currently targets Node.js 22 LTS, which Arch provides as `nodejs-lts-jod`.

Record the exact installed versions before building. The source repository's
`.nvmrc` is the authority for the Node major version:

```bash
node --version
npm --version
cat ~/FORGE/.nvmrc 2>/dev/null || true
```

---

# 18. Clone and build FORGE

From the `forge` user's home directory:

```bash
cd ~
git clone https://github.com/kaeganscott26/FORGE.git
cd FORGE
```

Install exact lockfile dependencies:

```bash
npm ci
```

Verify the project before trying to make it the graphical shell:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If one of those fails, fix the actual build/runtime issue before continuing. The OS experiment is much easier to reason about if the normal FORGE build is known-good first.

---

# 19. Configure a minimal X session that launches FORGE

Create a deliberately temporary, logged development-session script. This proves
that the installed X stack, Electron, and FORGE can run together; it is not the
production session that the integration repository will later install.

First create the workspace FORGE will open and ensure its live database is not
mistakenly committed as source:

```bash
mkdir -p ~/FORGE-OS
cd ~/FORGE-OS
git init
printf '.forge/metadata.sqlite\n.forge/task-output/\n' > .gitignore
cat > README.md <<'EOF'
# FORGE OS Experiment

Arch Linux provides the kernel, hardware support, package management, networking, filesystems, and system services.

FORGE is being tested as the persistent user-facing workspace/intelligence/runtime layer above that substrate.
EOF
git add README.md .gitignore
git commit -m "chore: initialize FORGE OS experiment"
mkdir -p "$HOME/.local/state/forge"
```

Then create the X startup script:

```bash
cat > ~/.xinitrc <<'EOF'
#!/bin/sh

# Preserve the standard xinit environment hooks when Arch provides them.
if [ -d /etc/X11/xinit/xinitrc.d ]; then
  for hook in /etc/X11/xinit/xinitrc.d/*; do
    [ -x "$hook" ] && . "$hook"
  done
fi

# Minimal graphical substrate for the first FORGE experiment.
openbox-session &

exec sh -lc 'cd "$HOME/FORGE" && exec npm run dev -- --workspace="$HOME/FORGE-OS"' \
  >>"$HOME/.local/state/forge/session.log" 2>&1
EOF
```

Make it executable:

```bash
chmod +x ~/.xinitrc
```

Now, from the normal text console, launch X:

```bash
startx
```

The intended result is:

```text
Arch terminal login
  ↓
startx
  ↓
Xorg + tiny Openbox session
  ↓
FORGE Electron UI
```

There is deliberately no GNOME or KDE in between.

If Electron reports a missing shared library, inspect it rather than guessing:

```bash
ldd ~/FORGE/node_modules/electron/dist/electron | grep 'not found'
```

Install the missing Arch package(s), then retry `startx`.

Record the initial session result and inspect its log after closing FORGE or if
the window does not appear:

```bash
tail -n 200 "$HOME/.local/state/forge/session.log"
```

Do not treat this development launch as Linux support. Before Phase 6 makes
FORGE the normal graphical workflow, build the actual Linux package on the
target, start its unpacked executable under X, and exercise the same core
workflow (open a workspace, edit/save, open the PTY, run `pwd`, restart the
application, and reopen the workspace):

```bash
cd ~/FORGE
./scripts/package-linux.sh
test -x dist_electron/linux-unpacked/FORGE
sha256sum dist_electron/linux-unpacked/FORGE
```

Start `dist_electron/linux-unpacked/FORGE` under the same X/Openbox substrate
with `--workspace="$HOME/FORGE-OS"`. Record its path, SHA-256, and the manual
acceptance result in `~/FORGE-OS/BUILD_STATE.md`. The later reproducible
launcher must invoke this packaged/staged runtime, not `npm run dev`.

---

# 20. Verify FORGE before giving an agent root-capable authority

Inside FORGE, verify that the basic workspace is functional:

- Explorer opens the repository.
- Files can be read.
- Editor works.
- Integrated terminal opens.
- Git status works.
- Persistent workspace state initializes.
- Terminal starts as the normal `forge` user, not root.

In the FORGE terminal run:

```bash
whoami
pwd
sudo -l
```

Expected user:

```text
forge
```

The terminal should have normal Linux access and the ability to elevate through sudo.

---

# 21. Install Codex inside the installed system

From the FORGE integrated terminal:

```bash
sudo npm install -g @openai/codex
```

Verify:

```bash
codex --version
codex --help
```

Authenticate:

```bash
codex login
```

Complete the ChatGPT/OpenAI sign-in flow.

The architectural point is important:

> Codex is being launched **inside FORGE's terminal, inside the installed Arch filesystem**. Codex is an agent operating in the environment; it is not the owner of the environment's memory or architecture.

---

# 22. Create the OS-construction workspace

Do not use the FORGE source repository itself as the operating-system integration repo.

Create a separate workspace that represents the evolving operating environment.
If section 19 already created it, do not reinitialize it; continue from that
committed control point. Otherwise use the following:

```bash
mkdir -p ~/FORGE-OS
cd ~/FORGE-OS
git init
```

Configure Git identity if this machine does not already have it:

```bash
git config user.name "YOUR NAME"
git config user.email "YOUR EMAIL"
```

Create the initial README:

```bash
cat > README.md <<'EOF'
# FORGE OS Experiment

Arch Linux provides the kernel, hardware support, package management, networking, filesystems, and system services.

FORGE is being tested as the persistent user-facing workspace/intelligence/runtime layer above that substrate.
EOF
```

Ignore FORGE's live per-workspace records before they are created:

```bash
printf '.forge/metadata.sqlite\n.forge/task-output/\n' > .gitignore
```

Commit the blank control point:

```bash
git add README.md .gitignore
git commit -m "chore: initialize FORGE OS experiment"
```

Now open `~/FORGE-OS` as the active workspace in FORGE.

That gives FORGE's persistent workspace database, tasks, context, terminal evidence, files, and future agent sessions a project specifically representing the OS experiment.

---

# 23. Temporary autonomous-build sudo permission

## Why this exists

Codex will need to install packages and write system integration files under locations such as:

```text
/etc
/opt
/usr/local
/var/lib
/var/log
/etc/systemd
```

Normal password-protected sudo is the correct permanent policy, but an unattended agent loop cannot reliably answer an interactive password prompt.

For this **experimental build only**, create a temporary passwordless sudo rule for the `forge` user.

From the FORGE terminal:

```bash
printf 'forge ALL=(ALL:ALL) NOPASSWD: ALL\n' | sudo tee /etc/sudoers.d/90-forge-experiment
sudo chmod 440 /etc/sudoers.d/90-forge-experiment
sudo visudo -cf /etc/sudoers.d/90-forge-experiment
```

Verify:

```bash
sudo -n true && echo 'temporary non-interactive sudo is active'
```

### Important

This gives every process running as `forge` the ability to become root without a password. That is intentional for this controlled OS-construction experiment, but it should **not** be the final configuration.

The Codex prompt below explicitly requires the rule to be removed when the build stabilizes.

The final state should return to the permanent wheel rule:

```text
%wheel ALL=(ALL:ALL) ALL
```

---

# 24. Launch Codex with OS-build permissions

First inspect the installed Codex CLI's current flags:

```bash
codex --help
```

The intended experiment requires Codex to be able to write outside the current workspace and execute system commands. With current Codex CLI permission terminology, launch it with full filesystem/shell access and no repeated approval pauses:

```bash
cd ~/FORGE-OS
codex --sandbox danger-full-access --ask-for-approval never
```

If a later Codex CLI version renames these flags, use `codex --help` and select the equivalent **full local access / no repeated approval** mode.

The Linux privilege boundary still exists independently: system-owned operations require `sudo`, and the temporary sudoers rule above is what makes those commands non-interactive during the experiment.

---

# 25. MASTER CODEX PROMPT — paste this into Codex

Copy everything inside the following block into the Codex session running from `~/FORGE-OS` inside FORGE.

```text
You are operating inside the FORGE integrated terminal on a newly installed minimal Arch Linux system.

This is an operating-system architecture experiment.

Your job is to build the persistent operating environment AROUND FORGE using the architecture already present in ~/FORGE. Do not reinterpret this as "build another AI IDE" and do not attempt to replace the Linux kernel.

======================================================================
MISSION
======================================================================

Turn this minimal Arch installation into a machine whose primary user-facing environment is FORGE.

Arch/Linux remains responsible for:
- kernel and hardware abstraction
- processes and scheduling
- filesystems and block devices
- drivers
- package management
- networking
- systemd and low-level services
- authentication and normal Unix permissions

FORGE becomes the persistent higher-level workspace/runtime responsible for the long-lived project environment:
- project files and documentation
- Git evidence
- terminal/process evidence
- persistent tasks and checkpoints
- conversations
- durable memory
- project chronology
- context compilation
- agent/tool orchestration

Models remain replaceable workers.

Codex is the first construction agent for the experiment, not the architectural owner of the system.

The design principle is:

    THE MODEL IS REPLACEABLE. THE WORKSPACE IS DURABLE.

And the orchestration principle from FORGE is:

    BOUND RESOURCES, NOT AGENCY.

======================================================================
CURRENT ENVIRONMENT
======================================================================

Assume:
- the system has already booted from the internal SSD;
- the Arch installation is persistent and no longer running from the USB;
- the current normal user is `forge`;
- NetworkManager works;
- sudo is available;
- during this build ONLY, `forge` has a temporary NOPASSWD sudo rule;
- Xorg, xinit, Openbox, Node.js 22 LTS, npm, Git, and the basic Electron runtime dependencies are installed;
- the FORGE source repository is at ~/FORGE;
- this OS integration workspace/repository is ~/FORGE-OS;
- FORGE was launched from the text console using startx;
- this Codex process was launched from the integrated FORGE terminal.

You have intentionally been given broad local filesystem and shell authority for this experiment.

Use it carefully and continuously. Do not stop after producing a plan. Implement, test, inspect the results, repair failures, and continue until you reach a genuine human-required boundary such as reboot validation.

======================================================================
FIRST ACTION: DISCOVER REALITY
======================================================================

Before changing the system, inspect it.

At minimum inspect:

- pwd
- whoami
- id
- sudo -l
- uname -a
- cat /etc/os-release
- findmnt /
- lsblk -f
- df -h
- systemctl --failed
- systemctl get-default
- NetworkManager status
- Node and npm versions
- Codex version
- ~/FORGE Git status and current commit
- ~/FORGE/package.json
- ~/FORGE/README.md
- ~/FORGE/docs/ARCHITECTURE.md
- ~/FORGE/docs/PHILOSOPHY.md if present
- ~/FORGE/docs/TERMINAL.md if present
- ~/FORGE/docs/PROJECT_STATUS.md if present
- relevant package architecture under ~/FORGE/packages
- the current FORGE Linux build/package scripts
- ~/FORGE-OS Git status

Do not treat generated output as architecture authority when source/docs exist.

Use the current repository as evidence. If this prompt and the current source disagree about an implementation detail, preserve the architectural goal while following the current source of truth.

======================================================================
ARCHITECTURAL CONSTRAINTS
======================================================================

1. Do not rewrite Linux.

Linux/Arch is the low-level substrate. Do not build a kernel, package manager, network stack, driver framework, init system, or fake filesystem when the installed Linux system already provides those things.

2. Do not turn FORGE into a monolithic AI chatbot.

FORGE workspace intelligence and persistent project state remain distinct from any individual model runtime.

3. Preserve FORGE's current intelligence/agent split.

The intended flow is conceptually:

    project/files/Git/tasks/memory/terminal evidence
                    ↓
          FORGE workspace intelligence
                    ↓
           replaceable agent adapter
                    ↓
        Codex / Ollama / hosted model
                    ↓
          FORGE capability runtime
                    ↓
          verified results feed back

4. Do not make Codex a permanent hard dependency of the OS architecture.

Codex may construct the prototype and may remain available as one agent, but another compatible agent must be able to replace it later without replacing the workspace.

5. Do not run the FORGE graphical application itself as root.

FORGE should run as the normal `forge` user. Elevate individual system operations with sudo or root-owned services where appropriate.

6. Do not use chmod 777 as a shortcut.

Design normal Unix ownership and permissions.

7. Do not install a giant desktop environment simply to hide integration problems.

The experiment intentionally begins from a minimal Xorg/Openbox substrate. Add packages only when they solve a real dependency or usability problem.

8. Do not repartition, reformat, or erase block devices.

The base Arch installation is already complete. Storage destruction is outside your task.

9. Do not rewrite the EFI partition or bootloader unless an actual verified boot requirement makes it necessary.

If bootloader changes become genuinely necessary, stop and create a checkpoint explaining exactly why before touching them.

10. Do not delete ~/FORGE or rewrite its Git history.

FORGE is the source application. ~/FORGE-OS is the integration/control repository for this experiment.

======================================================================
TARGET SYSTEM MODEL
======================================================================

Build toward this conceptual system:

    Firmware / bootloader
            ↓
    Linux kernel + Arch
            ↓
    systemd + NetworkManager + core services
            ↓
    minimal FORGE graphical session
            ↓
    FORGE workspace runtime
            ↓
    workspace-owned persistent state
            ↓
    agent adapters / terminal agents
            ↓
    Codex / Ollama / future models

The desired user experience is eventually approximately:

    power on
      → Arch boots
      → normal user session becomes available
      → FORGE graphical session starts
      → FORGE restores/open its durable workspace state
      → terminal and tools are available inside FORGE
      → a selected agent can be launched without reconstructing project context from scratch

The machine must still retain a recovery path that does not depend on FORGE working.

Virtual terminals such as Ctrl+Alt+F2/F3 should remain usable.

======================================================================
BUILD A REAL OS-INTEGRATION REPOSITORY
======================================================================

Use ~/FORGE-OS as source control for the operating-system integration layer.

Create a clean structure based on what the implementation actually needs. A reasonable starting shape is:

    ~/FORGE-OS/
      README.md
      ARCHITECTURE.md
      BUILD_STATE.md
      CHANGELOG.md
      config/
      systemd/
      session/
      scripts/
      manifests/
      tests/
      docs/

Do not create empty decorative directories merely to match this example. Every committed artifact should have a purpose.

System-installed files should be reproducible from this repository rather than being hand-edited with no source record.

Examples of valid target locations when justified:

    /opt/forge/
    /etc/forge/
    /var/lib/forge/
    /var/log/forge/
    /usr/local/bin/forge
    /usr/local/bin/forge-session
    /etc/systemd/system/
    /usr/lib/systemd/user/ or ~/.config/systemd/user/

Choose locations based on Linux conventions and FORGE's real runtime needs.

Do not duplicate FORGE's existing workspace database architecture. FORGE already owns workspace-local `.forge/metadata.sqlite`; integrate with it rather than inventing a second competing memory store simply because this is now an OS experiment.

======================================================================
PHASE 1 — DOCUMENT THE OBSERVED SYSTEM
======================================================================

Create BUILD_STATE.md and record:

- current date/time
- Arch/kernel version
- machine architecture
- important hardware observations
- root filesystem
- installed graphics stack
- FORGE source commit
- FORGE source remote URL and whether the source tree is clean
- FORGE build status
- Node/npm versions
- current startup path
- current sudo experiment state
- failed services, if any
- known limitations

This file is a machine-readable/human-readable checkpoint so a later model can resume without guessing what happened.

Commit this checkpoint.

Suggested commit style:

    docs: record initial FORGE OS system state

======================================================================
PHASE 2 — DEFINE THE FORGE SESSION BOUNDARY
======================================================================

Design the smallest reliable graphical session that makes FORGE the primary environment.

The current temporary path is startx + Openbox + `npm run dev`.

Evolve that into a reproducible launcher rather than depending forever on an ad-hoc .xinitrc.

`npm run dev` is bootstrap evidence only. Before a launcher is enabled for the
normal graphical workflow, run the repository's native Linux packaging script,
start the resulting packaged executable under X, and manually verify workspace
open/edit/save, PTY `pwd`, restart, and workspace-state persistence. Record the
executable path and SHA-256 in BUILD_STATE.md. Do not point a boot/login
launcher at a mutable development checkout.

Requirements:

- FORGE runs as user `forge`, never as root.
- Xorg/graphical startup failures return the user to a usable console.
- There is still a normal TTY recovery path.
- Session logs are captured somewhere deliberate.
- The launcher can find the FORGE application deterministically.
- Development mode and a packaged/production mode are distinguishable.
- A FORGE crash should not leave the machine unrecoverable.
- The session should not require GNOME/KDE.

Create version-controlled session scripts/configuration and an installer that places them in the correct system/user locations.

Test the launcher without rebooting first.

Commit the working session layer.

======================================================================
PHASE 3 — CREATE REPRODUCIBLE INSTALL/UPDATE SCRIPTS
======================================================================

Create idempotent scripts that can converge a fresh compatible Arch install toward this FORGE environment.

The scripts should:

- detect Arch rather than silently assuming it;
- verify required commands;
- install only justified packages;
- build/install FORGE using the repo's actual supported Linux workflow and a
  recorded source commit, lockfile, artifact path, and SHA-256;
- install/update session integration;
- create required directories with explicit owners/modes;
- install systemd units only when they provide real value;
- support rerunning after a partial failure;
- stop on unexpected command failures;
- log meaningful actions;
- not erase user data;
- not repartition disks;
- not rewrite the bootloader.

Prefer scripts/config files in ~/FORGE-OS as source authority and copy/symlink/install from there.

Do not hide a pile of imperative mutations in one opaque script. Keep system state understandable.

Commit the installer/update layer.

======================================================================
PHASE 4 — FORGE AS THE WORKSPACE RUNTIME
======================================================================

Inspect FORGE's actual current behavior and integrate rather than invent.

Preserve these architectural properties:

- opening a workspace keeps the project in place;
- project state belongs to the workspace;
- `.forge/metadata.sqlite` remains project-owned state;
- tasks/checkpoints/conversations/memory/action history remain durable workspace records;
- terminal evidence should increasingly participate in project context;
- models are clients of the intelligence layer;
- capabilities belong to FORGE rather than to one provider.

If OS integration requires changes to the FORGE source repository itself, make the smallest coherent changes in ~/FORGE, test them there, and commit them separately with a clear explanation.

Do not make speculative architecture changes merely because you have root access.

======================================================================
PHASE 5 — SYSTEM SERVICES
======================================================================

Determine what truly belongs in systemd.

Possible examples include:

- preparation of persistent FORGE runtime directories;
- user-session startup helpers;
- recovery/health checks;
- optional background indexing/runtime services if the current architecture actually supports them.

Do NOT convert every script into a root daemon.

For each service:

- define why it exists;
- choose system vs user service intentionally;
- use least privilege;
- specify restart behavior;
- provide logs through journalctl or a deliberate log file;
- avoid restart loops;
- validate with `systemd-analyze verify` where applicable.

Test units before enabling them.

Commit the service layer.

======================================================================
PHASE 6 — BOOT/LOGIN EXPERIENCE
======================================================================

Create a reliable path from normal Arch boot to FORGE.

The first prototype may use a console login followed by an automatic `startx`-style handoff for the `forge` user, or a more appropriate minimal systemd user-session design if investigation shows that is cleaner.

Requirements:

- no graphical application runs as root;
- boot succeeds even if FORGE is broken;
- the user can reach a recovery TTY;
- FORGE startup logs are inspectable;
- startup is deterministic;
- disabling FORGE auto-start is documented and simple;
- the machine remains administrable with standard Linux tools.

Do not obscure the underlying Arch system. FORGE is the primary environment, not a trap door that removes recovery access.

Before modifying login startup, save the current working configuration in Git and create a rollback command/script.

======================================================================
PHASE 7 — AGENT ENVIRONMENT
======================================================================

Codex is already installed as the first external agent.

Make the environment suitable for replaceable terminal agents without hard-coding Codex everywhere.

At minimum document and verify:

- `codex` launches from a FORGE terminal;
- the terminal inherits the active workspace directory;
- normal user permissions are preserved;
- sudo is explicit at the command level;
- Git works;
- networking works;
- Node/build tools work;
- FORGE can observe/retain useful terminal/task evidence according to its current implementation.

If you add an agent launcher abstraction, keep it generic enough for future CLI agents such as Ollama-backed tools, Claude Code, OpenCode, or other runtimes.

Do not make all agents root by default.

======================================================================
PHASE 8 — SELF-OBSERVATION AND PERSISTENT BUILD HISTORY
======================================================================

This experiment matters because the environment should increasingly be able to understand the system it has become.

Maintain BUILD_STATE.md as work progresses.

Also create documentation that records:

- architecture decisions;
- installed package rationale;
- generated/installed system files;
- active services;
- session startup path;
- known failures and fixes;
- verification commands;
- rollback commands;
- current FORGE commit;
- current FORGE-OS commit;
- current unfinished task/checkpoint.

When you discover and fix a failure, record the failure and resolution instead of only leaving the final state.

This evidence is part of the long-term context of the environment.

======================================================================
PHASE 9 — TESTING
======================================================================

Create an executable verification script in ~/FORGE-OS that checks as many of these as possible without destructive behavior:

- OS is Arch Linux;
- expected user exists;
- sudo policy parses successfully;
- networking service is enabled;
- expected X/session packages exist;
- FORGE repo exists;
- FORGE build artifacts/dependencies exist as expected;
- FORGE integration launcher exists and is executable;
- systemd units parse;
- required directories exist with expected ownership;
- Git repositories are healthy;
- Node version is compatible;
- Codex is installed;
- recovery commands are documented;
- temporary experiment sudo rule status is explicitly reported.

Run FORGE's own relevant verification commands after any FORGE source modifications:

    npm run typecheck
    npm run lint
    npm test
    npm run build

Do not claim success when checks have not run.

======================================================================
PHASE 10 — HUMAN REBOOT CHECKPOINT
======================================================================

Do as much verification as possible before asking for a reboot.

When the system reaches the point where reboot validation is necessary:

1. make sure all repositories are committed;
2. update BUILD_STATE.md;
3. write exact expected post-reboot behavior;
4. write exact recovery commands in case FORGE does not launch;
5. verify the recovery TTY path remains intact;
6. stop and tell the human a reboot is required.

Do not issue an unattended reboot while actively communicating through this terminal unless explicitly told to do so.

After the human reboots and returns, inspect actual state before assuming startup worked.

======================================================================
PHASE 11 — REMOVE TEMPORARY ROOT ESCALATION
======================================================================

The build currently has a temporary rule:

    /etc/sudoers.d/90-forge-experiment

Before declaring the experiment stable, remove that rule:

    sudo rm -f /etc/sudoers.d/90-forge-experiment
    sudo visudo -c

Verify the normal `forge` user remains in wheel and that password-protected sudo still works.

The final system must not rely on blanket passwordless root access for normal use.

If a specific service genuinely requires a privileged operation, give that service the narrow authority it needs rather than restoring blanket NOPASSWD access.

======================================================================
PHASE 12 — DEFINE SUCCESS
======================================================================

The first experiment is successful when all of the following are true:

1. The USB is not connected and the machine boots from the internal SSD.
2. Arch boots reliably.
3. The normal `forge` user can reach a recovery console.
4. The primary graphical workflow launches FORGE with minimal surrounding desktop infrastructure.
5. FORGE runs as the normal user.
6. A project can be opened and edited.
7. FORGE's persistent workspace state survives application restart/reboot.
8. The integrated terminal works.
9. Codex can be launched from the integrated terminal.
10. Codex is only one replaceable agent; FORGE remains the durable workspace layer.
11. Git/tool/build workflows function.
12. System integration files are reproducible from ~/FORGE-OS.
13. Failures and recovery procedures are documented.
14. No blanket passwordless sudo rule remains in the stable system.
15. The system remains recognizable and maintainable as Arch Linux underneath FORGE.

======================================================================
PHASE 13 — ONLY AFTER THE EXPERIMENT WORKS
======================================================================

Do NOT start here.

Once this installed-system prototype is stable, the next project can be turning the reproducible configuration into a custom Arch installation image using Archiso.

That future phase would allow someone to flash a FORGE-oriented image directly rather than repeating the manual bootstrap.

The first experiment must prove the architecture on a normal installed Arch system before packaging it as distribution media.

======================================================================
WORKING STYLE
======================================================================

Operate agentically.

- Inspect before editing.
- Prefer evidence over assumptions.
- Implement instead of only proposing.
- Run tests after meaningful changes.
- Keep changes reversible.
- Keep OS integration source-controlled.
- Make Git commits at coherent milestones.
- Record failures and why they happened.
- Do not ask the human questions that can be answered by inspecting the machine or repositories.
- Stop for the human only at genuinely destructive/irreversible boundaries or when physical reboot/login interaction is required.
- Never silently repartition disks, wipe data, alter firmware, or weaken the final sudo policy.

Your final output for each major phase should state:

- what you inspected;
- what you changed;
- which files were installed into the system;
- what verification passed;
- current Git commit(s);
- remaining risks;
- next action.

Begin now by inspecting the machine and both repositories. Then create the initial BUILD_STATE.md checkpoint and proceed into implementation.
```

---

# 26. What should happen after the prompt is pasted

Codex should begin by reading the actual machine and the actual FORGE repository rather than assuming the prompt is perfectly current.

The expected construction loop is:

```text
inspect system
  ↓
inspect FORGE architecture
  ↓
record checkpoint
  ↓
design one layer
  ↓
implement
  ↓
test
  ↓
commit
  ↓
record evidence
  ↓
continue
```

That loop is the experiment.

Instead of the model receiving a static prompt, generating a pile of code, and disappearing, the workspace accumulates the history of what the system became and why.

---

# 27. Recovery commands

If the FORGE graphical session fails, switch to another virtual terminal with something like:

```text
Ctrl+Alt+F2
```

Log in as `forge`.

Inspect failed services:

```bash
systemctl --failed
```

Inspect the current graphical/session process:

```bash
ps aux | grep -E 'Xorg|openbox|electron|forge' | grep -v grep
```

FORGE source status:

```bash
cd ~/FORGE
git status
```

OS integration status:

```bash
cd ~/FORGE-OS
git status
```

Temporarily return to the simple known bootstrap session if later integration breaks:

```bash
cd ~/FORGE
startx
```

If automatic FORGE startup was added and is preventing a clean login, disable that startup integration from the recovery TTY using the rollback procedure Codex is required to create before enabling it.

---

# 28. When the first installed-system experiment passes

Do not immediately call the prototype a new kernel or a from-scratch operating system.

The more accurate description is initially:

> **An Arch-based operating environment in which FORGE becomes the persistent workspace/intelligence/runtime layer and models operate as replaceable workers inside that environment.**

If the experiment is successful, the next technical milestone is packaging the known-good configuration into reproducible installation media.

That is where Archiso becomes useful:

```bash
sudo pacman -S archiso
```

A future custom image can start from Arch's `releng` profile, add the package manifest and FORGE integration created by this experiment, and build with `mkarchiso`.

But the order matters:

```text
prove installed architecture first
        ↓
make integration reproducible
        ↓
then create custom installation media
```

---

# 29. Core hypothesis

The experiment is intentionally ridiculous enough to expose whether the architecture is real.

If FORGE can:

- run directly as the machine's primary graphical workspace;
- preserve its own project state and build history;
- launch interchangeable agents inside itself;
- let those agents modify and improve the surrounding system;
- retain the evidence of those modifications as context;
- survive model replacement and restart;

then FORGE is doing something meaningfully different from embedding a chatbot in an editor.

The long-term hypothesis is:

> **Do not make the AI the operating system. Make the environment persistent enough that intelligence emerges from the relationship between the model, the tools, and a workspace that remembers itself.**

---

# References

Official Arch resources:

- Installation guide: https://wiki.archlinux.org/title/Installation_guide
- Network configuration: https://wiki.archlinux.org/title/Network_configuration
- NetworkManager: https://wiki.archlinux.org/title/NetworkManager
- GRUB: https://wiki.archlinux.org/title/GRUB
- sudo: https://wiki.archlinux.org/title/Sudo
- xinit/startx: https://wiki.archlinux.org/title/Xinit
- Archiso: https://wiki.archlinux.org/title/Archiso
- Arch packages: https://archlinux.org/packages/

OpenAI Codex:

- Codex CLI commands, login, approvals, and sandboxing: https://learn.chatgpt.com/docs/developer-commands?surface=cli

FORGE source-of-truth documents to inspect during the experiment:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/PHILOSOPHY.md`
- `docs/TERMINAL.md`
- `docs/PROJECT_STATUS.md`
- current source under `apps/` and `packages/`
