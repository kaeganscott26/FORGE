#!/usr/bin/env bash
set -euo pipefail

tag="${1:?release tag is required}"
channel="${2:?metadata channel is required}"
repository="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
artifact_directory="${FORGE_ARTIFACT_DIRECTORY:-dist_electron}"

if [[ "$channel" != "beta" && "$channel" != "latest" ]]; then
  echo "Unsupported updater metadata channel: $channel" >&2
  exit 1
fi

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT

manifest="$artifact_directory/build-manifest.json"
metadata_asset="$artifact_directory/$channel-mac.yml"

if [[ ! -f "$manifest" || ! -f "$metadata_asset" ]]; then
  echo "Expected $manifest and $metadata_asset." >&2
  exit 1
fi

asset_list="$(node scripts/manifest-assets.mjs "$manifest" "$channel" "$tag")"
assets=()
while IFS= read -r asset; do
  [[ -n "$asset" ]] && assets+=("$asset")
done <<<"$asset_list"
if [[ ${#assets[@]} -ne 5 ]]; then
  echo "Expected exactly five manifest-selected release assets; found ${#assets[@]}." >&2
  exit 1
fi
remote_names="$(gh release view "$tag" --repo "$repository" --json assets --jq '.assets[].name')"

for asset in "${assets[@]}"; do
  name="$(basename "$asset")"
  local_sha="$(shasum -a 256 "$asset" | awk '{print $1}')"
  if grep -Fqx -- "$name" <<<"$remote_names"; then
    download_directory="$temporary_directory/$name"
    mkdir -p "$download_directory"
    gh release download "$tag" --repo "$repository" --pattern "$name" --dir "$download_directory"
    remote_sha="$(shasum -a 256 "$download_directory/$name" | awk '{print $1}')"
    if [[ "$remote_sha" != "$local_sha" ]]; then
      echo "Remote asset $name exists with SHA-256 $remote_sha; expected $local_sha. Refusing replacement." >&2
      exit 1
    fi
    echo "Verified existing $name SHA-256 $local_sha; upload skipped."
    continue
  fi
  gh release upload "$tag" "$asset" --repo "$repository"
  echo "Uploaded $name SHA-256 $local_sha."
done
