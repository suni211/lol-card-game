#!/usr/bin/env bash
# DANGEROUS: irreversibly deletes ALL user accounts, cards, stats and old DB tables.
# No automatic backup, as explicitly requested for a clean new product launch.
# Run from project ROOT on the new / disposable server. Never run on production by accident.
set -euo pipefail
DB_NAME="lol_card_game"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_USER="${DB_USER:-root}"
echo "DESTROY ALL CONTENTS OF: ${DB_NAME} on ${DB_HOST}"
echo "This removes ALL accounts, passwords, points, cards, decks, records, ranks and logs."
read -r -p "Type DELETE-ALL-2026 to proceed: " CONFIRM
[ "$CONFIRM" = "DELETE-ALL-2026" ] || { echo "Cancelled."; exit 1; }
MYSQL=(mysql -h "$DB_HOST" -u "$DB_USER" -p)
"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`lol_card_game\`; CREATE DATABASE \`lol_card_game\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
"${MYSQL[@]}" "$DB_NAME" < database/schema.sql
"${MYSQL[@]}" "$DB_NAME" < database/migrations/2026_live_worlds.sql
"${MYSQL[@]}" "$DB_NAME" < database/migrations/2026_fresh_match.sql
echo "2026 fresh launch database is initialized. No old account or historical card data survives."
