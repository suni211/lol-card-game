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
echo "Creating 2026 Worlds LIVE / WR / WRs cards..."
sudo mariadb < database/migrations/2026_live_worlds.sql
echo "Adding all 2026 global tier-1 LIVE teams..."
sudo mariadb < database/migrations/2026_global_tier1_live.sql
echo "Creating RIFT Manager games and draft tables..."
sudo mariadb < database/migrations/rift_games.sql
echo "Removing historical cards seeded by the original schema..."
sudo mariadb < database/migrations/2026_fresh_only.sql
echo "Initializing market prices for the 2026 cards..."
sudo mariadb < database/migrations/2026_market_prices.sql
echo "Checking player pool and application database access..."
sudo mariadb -e "SELECT season, COUNT(*) AS cards FROM lol_card_game.players GROUP BY season ORDER BY season; SELECT COUNT(*) AS prices FROM lol_card_game.player_market_prices;"
echo "Fresh 2026 launch database ready. All old accounts have been deleted."
