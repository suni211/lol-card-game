#!/usr/bin/env bash
# DESTRUCTIVE fresh-start bootstrap: wipes ALL users, passwords, cards, records,
# rankings, and previous player series. Intended for a fresh 2026 launch ONLY.
set -euo pipefail
if [[ "${1:-}" != "--destroy-everything" ]]; then
  echo "This script PERMANENTLY destroys the whole lol_card_game DB."
  echo "Usage: bash scripts/reset-all-2026.sh --destroy-everything"
  exit 1
fi
cd "$(dirname "$0")/.."
if ! command -v mariadb >/dev/null 2>&1; then
  echo "mariadb client not found. Install mariadb-server first."
  exit 1
fi
echo "Dropping accounts, cards and all old match data..."
sudo mariadb -e 'DROP DATABASE IF EXISTS lol_card_game;'
echo "Initializing tables and application schema..."
sudo mariadb < database/schema.sql
echo "Creating only 2026 LIVE / WR / WRs cards..."
sudo mariadb < database/migrations/2026_live_worlds.sql
echo "Creating RIFT Manager games and draft tables..."
sudo mariadb < database/migrations/rift_games.sql
echo "Removing historical cards seeded by the original schema..."
sudo mariadb < database/migrations/2026_fresh_only.sql
echo "Fresh 2026 launch database ready. All old accounts have been deleted."
