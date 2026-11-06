#!/usr/bin/env bash
# Run from the repository root: bash backend/scripts/install-rift-rebuild.sh /path/to/rift-rebuild.zip
set -euo pipefail
ZIP="${1:-}"
DEST="backend/rift_engine"
if [ ! -f "$ZIP" ]; then echo "Usage: bash backend/scripts/install-rift-rebuild.sh /path/to/rift-rebuild.zip"; exit 1; fi
mkdir -p "$DEST/assets/champions"
for name in engine.py data.py draft.py terrain.py; do
  unzip -p "$ZIP" "$name" > "$DEST/$name"
  [ -s "$DEST/$name" ] || { echo "Missing $name"; exit 1; }
done
unzip -p "$ZIP" assets/map.png > "$DEST/assets/map.png"
[ -s "$DEST/assets/map.png" ] || { echo "Missing assets/map.png"; exit 1; }
unzip -jo "$ZIP" "assets/champions/*.png" -d "$DEST/assets/champions" >/dev/null
python3 -m pip install --user "Pillow>=10,<13" || true
PYTHONDONTWRITEBYTECODE=1 python3 -c 'import sys;sys.path.insert(0,"backend/rift_engine");from engine import Match;from draft import Draft;print("Rift engine ready:",len(Match().players()),"champions instantiated")'
echo "Installed rift-rebuild engine. The repository wrapper is backend/rift_engine/bridge.py."
