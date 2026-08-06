#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
machine_arch="$(uname -m)"

case "$machine_arch" in
  arm64) builder_arch="arm64"; output_dir="mac-arm64" ;;
  x86_64) builder_arch="x64"; output_dir="mac" ;;
  *) echo "Unsupported macOS architecture: $machine_arch" >&2; exit 1 ;;
esac

cd "$project_root"
npm run build
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dir --"$builder_arch" --publish never

built_app="$project_root/dist_electron/$output_dir/FORGE.app"
if [[ ! -d "$built_app" ]]; then
  echo "Packaged app was not found at $built_app" >&2
  exit 1
fi

candidate_apps=("/Applications/FORGE.app" "/Applications/Forge.app" "$HOME/Applications/FORGE.app" "$HOME/Applications/Forge.app")
found_apps=()
for candidate in "${candidate_apps[@]}"; do
  [[ -d "$candidate" ]] && found_apps+=("$candidate")
done
if [[ ${#found_apps[@]} -gt 0 ]]; then
  echo "Detected FORGE installations (none will be deleted):"
  printf '  %s\n' "${found_apps[@]}"
fi

if [[ -d "/Applications/FORGE.app" ]]; then
  installed_app="/Applications/FORGE.app"
elif [[ -d "/Applications/Forge.app" ]]; then
  installed_app="/Applications/Forge.app"
elif [[ -d "$HOME/Applications/FORGE.app" ]]; then
  installed_app="$HOME/Applications/FORGE.app"
elif [[ -d "$HOME/Applications/Forge.app" ]]; then
  installed_app="$HOME/Applications/Forge.app"
else
  mkdir -p "$HOME/Applications"
  installed_app="$HOME/Applications/FORGE.app"
fi

osascript -e 'tell application id "com.kaeganscott26.forge" to quit' >/dev/null 2>&1 || true
sleep 1
ditto "$built_app" "$installed_app"
touch "$installed_app"
open "$installed_app"

echo "Updated and opened $installed_app"
echo "Active executable: $installed_app/Contents/MacOS/FORGE"
