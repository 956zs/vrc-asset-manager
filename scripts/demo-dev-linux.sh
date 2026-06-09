#!/usr/bin/env bash
set -euo pipefail

keep_data=0

case "${1:-}" in
  "")
    ;;
  "--keep-data")
    keep_data=1
    ;;
  *)
    echo "Usage: npm run demo:linux -- [--keep-data]" >&2
    exit 2
    ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
demo_dir="$repo_root/.demo-data"

case "$demo_dir" in
  "$repo_root"/*)
    ;;
  *)
    echo "Refusing to use demo directory outside the repository: $demo_dir" >&2
    exit 1
    ;;
esac

if [[ -e "$demo_dir" && "$keep_data" -eq 0 ]]; then
  rm -rf -- "$demo_dir"
fi

mkdir -p -- "$demo_dir"

export VRC_ASSET_MANAGER_DEMO=1
export VRC_ASSET_MANAGER_DEMO_ROOT="$demo_dir"
export VRC_ASSET_MANAGER_DB_PATH="$demo_dir/vrc_asset_manager.sqlite3"
export LOCALAPPDATA="$demo_dir/LocalAppData"

echo "Starting demo mode with isolated data:"
echo "  DB: $VRC_ASSET_MANAGER_DB_PATH"
echo "  LOCALAPPDATA: $LOCALAPPDATA"

exec npm run tauri -- dev
