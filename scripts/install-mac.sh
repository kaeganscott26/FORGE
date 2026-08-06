#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
manifest="$project_root/dist_electron/build-manifest.json"

if [[ ! -f "$manifest" ]]; then
  echo "Build manifest was not found at $manifest. Package FORGE first." >&2
  exit 1
fi

cd "$project_root"
node scripts/verify-build-manifest.mjs
built_app="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const a=m.packagedApplications.find((v)=>v.architectures.includes("arm64")&&v.architectures.includes("x86_64")); if(!a) process.exit(2); process.stdout.write(a.path)' "$manifest")"
built_app="$project_root/$built_app"
installed_app="/Applications/FORGE.app"

if [[ -d "$HOME/Applications/FORGE.app" || -d "$HOME/Applications/Forge.app" || -d "/Applications/Forge.app" ]]; then
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
open "/Applications/FORGE.app"

echo "Updated and opened $installed_app"
echo "Active executable: $installed_app/Contents/MacOS/FORGE"
