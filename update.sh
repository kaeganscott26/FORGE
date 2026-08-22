#!/usr/bin/env bash
set -euo pipefail

# Public Linux compatibility entry point. The complete Linux packaging/update
# gates live in the maintained script so this path remains stable for users.
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repository_root"
exec bash scripts/package-linux.sh "$@"
