#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
manifest="$project_root/dist_electron/build-manifest.json"
session_launcher="$project_root/scripts/forge-session-macos.sh"

if [[ ! -f "$manifest" ]]; then
  echo "Build manifest was not found at $manifest. Package FORGE first." >&2
  exit 1
fi
if [[ ! -x "$session_launcher" ]]; then
  echo "macOS session launcher is missing or not executable: $session_launcher" >&2
  exit 1
fi

cd "$project_root"
node scripts/verify-build-manifest.mjs
built_app="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const a=m.packagedApplications.find((v)=>v.architectures.includes("arm64")&&v.architectures.includes("x86_64")); if(!a) process.exit(2); process.stdout.write(a.path)' "$manifest")"
built_app="$project_root/$built_app"
installed_app="/Applications/FORGE.app"
installed_launcher="/usr/local/bin/forge-session"

if [[ -d "$HOME/Applications/FORGE.app" ]]; then
  echo "A stale alternate FORGE installation exists. Move it to Trash before installing." >&2
  exit 1
fi

osascript -e 'tell application id "com.kaeganscott26.forge" to quit' >/dev/null 2>&1 || true
sleep 1
if pgrep -fl '/FORGE.app/Contents/MacOS/FORGE' >/dev/null; then
  echo "A FORGE process is still running. Installation was not attempted." >&2
  pgrep -fl '/FORGE.app/Contents/MacOS/FORGE' >&2
  exit 1
fi
if [[ -d "$installed_app" ]]; then
  backup="$HOME/.Trash/FORGE.app.pre-install-$(date -u +%Y%m%dT%H%M%SZ)"
  mv "$installed_app" "$backup"
  echo "Moved the previous /Applications installation to $backup"
fi
ditto "$built_app" "$installed_app"
touch "$installed_app"

# Keep a stable, version-independent session path. Replacing the application
# bundle (including a future signed Electron update) leaves this entrypoint in
# place and it dispatches only to the canonical system application location.
launcher_temporary="/usr/local/bin/.forge-session.new.$$"
cleanup_launcher() { sudo rm -f "$launcher_temporary"; }
trap cleanup_launcher EXIT
sudo install -d -o root -g wheel -m 0755 /usr/local/bin
sudo install -o root -g wheel -m 0755 "$session_launcher" "$launcher_temporary"
sudo mv -f "$launcher_temporary" "$installed_launcher"
trap - EXIT

"$installed_launcher" --runtime-info
open "$installed_app"

echo "Updated and opened $installed_app"
echo "Active executable: $installed_app/Contents/MacOS/FORGE"
echo "Stable session entrypoint: $installed_launcher"
