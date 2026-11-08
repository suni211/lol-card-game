#!/usr/bin/env bash
# One-command 12WR portrait import + safe DB URL mapping + frontend deployment.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
if [[ "$(id -un)" != "hisam" ]]; then
  echo "Run this script as the hisam account (PM2/deployment account)." >&2
  exit 1
fi
if [[ ! -f database/migrations/2026_12wr_worlds_roster.sql ]]; then
  echo "12WR roster migration is missing." >&2; exit 1
fi
echo "[1/6] Checking 12WR database roster"
count="$(sudo mariadb --batch --skip-column-names lol_card_game -e "SELECT COUNT(*) FROM players WHERE season='12WR'")"
if [[ "$count" != "60" ]]; then
  echo "Expected 60 12WR players in DB, found $count. Run the 12WR migration first." >&2
  exit 1
fi
echo "[2/6] Creating database backup"
backup="$HOME/lol-card-game-backup-before-12wr-photos-$(date +%Y%m%d-%H%M%S).sql"
sudo mariadb-dump lol_card_game > "$backup"
echo "Backup: $backup"
echo "[3/6] Fetching/validating portraits for each of 60 players"
python3 backend/scripts/import-12wr-portraits.py --apply
echo "[4/6] Applying image paths for successful downloads"
# SQL only touches image_url for the exact 12WR nickname/team/position.
sudo mariadb lol_card_game < database/12wr_portraits_update.generated.sql
echo "[5/6] Building frontend"
(cd frontend && VITE_API_URL=/api npm run build)
echo "[6/6] Deploying static assets"
sudo cp -a frontend/dist/. /var/www/lcg/
sudo nginx -t
sudo systemctl reload nginx
echo "Done. Check player-photo-report-12wr.json for downloaded/missing photos."
