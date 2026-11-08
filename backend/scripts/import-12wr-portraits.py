#!/usr/bin/env python3
"""12WR 60-player portrait importer. Stdlib only, no external pip packages.

Discovers a candidate portrait through Leaguepedia MediaWiki APIs. Downloads
ONLY images with player-specific filename matches; never substitutes generic
team logos or another person's portrait. Manual approved URLs can be supplied
in frontend/12wr-portrait-sources.json. Emits a report and safe SQL updates.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROSTER = ROOT / "database/migrations/2026_12wr_worlds_roster.sql"
OUT = ROOT / "frontend/public/players"
REPORT = ROOT / "player-photo-report-12wr.json"
SQL = ROOT / "database/12wr_portraits_update.generated.sql"
OVERRIDES = ROOT / "frontend/12wr-portrait-sources.json"
HEADERS = {"User-Agent": "LCG-12WR-Portrait-Importer/1.0 (archival player photos; contact site operator)",
           "Accept": "application/json,image/*;q=0.9,*/*;q=0.5"}
API_ENDPOINTS = ("https://lol.fandom.com/api.php",
                 "https://wiki.leaguepedia.com/en-us/api.php")

def read_roster():
    content = ROSTER.read_text(encoding="utf-8")
    # Exactly the 60 roster INSERT values, never query live game records.
    rows = re.findall(r"^\('((?:[^']|'')+)','([^']+)','(TOP|JUNGLE|MID|ADC|SUPPORT)',(\d+),'([^']+)','([^']+)'\)", content, re.M)
    roster = [{"name": n.replace("''", "'"), "team": team, "position": pos}
              for n, team, pos, _ovr, _region, _country in rows]
    if len(roster) != 60 or len({x["name"] for x in roster}) != 60:
        raise RuntimeError("12WR roster SQL must contain exactly 60 unique players; found %d" % len(roster))
    return roster

def read_url(url, maxbytes=6_000_000):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=16) as res:
        if res.status != 200:
            raise RuntimeError("HTTP %s" % res.status)
        return res.read(maxbytes + 1)

def image_extension(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None

def clean(s):
    return re.sub("[^a-z0-9]", "", s.casefold())

def likely_player_portrait(url, nickname):
    path = urllib.parse.unquote(urllib.parse.urlparse(url).path)
    filename = path.split("/revision/")[0].split("/")[-1]
    # Some wikis store variants in filename; do not use ambiguous generic images.
    fname = clean(filename)
    nick = clean(nickname)
    return (bool(nick) and len(nick) >= 3 and nick in fname
            and not any(x in fname for x in ("logo", "icon", "team", "champion", "flag", "placeholder")))

def wiki_candidate(nickname):
    for api in API_ENDPOINTS:
        for title in (nickname, nickname.replace(" ", "_")):
            url = api + "?" + urllib.parse.urlencode({
                "action": "query", "format": "json", "redirects": "1",
                "prop": "pageimages", "piprop": "original", "titles": title})
            try:
                obj = json.loads(read_url(url, 1_000_000).decode("utf-8"))
                pages = obj.get("query", {}).get("pages", {})
                for page in pages.values():
                    pic = page.get("original", {}).get("source", "")
                    if pic.startswith("https://") and likely_player_portrait(pic, nickname):
                        return pic
            except (ValueError, OSError, urllib.error.URLError, RuntimeError):
                pass
    return None

def sql_quote(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="download approved/matched images")
    p.add_argument("--no-discovery", action="store_true", help="use only manually supplied URLs")
    p.add_argument("--report", default=str(REPORT))
    p.add_argument("--sql", default=str(SQL))
    args = p.parse_args()
    roster = read_roster()
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    if not isinstance(overrides, dict):
        raise RuntimeError("portrait source JSON must be a name->HTTPS URL map")
    OUT.mkdir(parents=True, exist_ok=True) if args.apply else None
    results = []
    updates = ["-- Generated 12WR portrait URL updates. Review sources before applying.",
               "USE lol_card_game;"]
    for i, player in enumerate(roster, 1):
        name = player["name"]
        url = overrides.get(name) or (None if args.no_discovery else wiki_candidate(name))
        record = dict(player, photo_url=url, status="missing", local_file=None)
        if url:
            try:
                if not url.startswith("https://"):
                    raise ValueError("Only HTTPS URLs are accepted")
                data = read_url(url)
                ext = image_extension(data)
                if ext is None or not 3_000 <= len(data) <= 6_000_000:
                    raise ValueError("Not a valid player photo or unreasonable image size")
                filename = "12WR_" + re.sub(r"[^a-zA-Z0-9_-]", "_", name) + ext
                relative = "/players/" + filename
                record.update(status="ready" if args.apply else "candidate", local_file=relative)
                if args.apply:
                    (OUT / filename).write_bytes(data)
                    updates.append("UPDATE players SET image_url=%s WHERE season='12WR' AND name=%s AND team=%s AND position=%s;"
                                   % tuple(map(sql_quote, (relative, name, player["team"], player["position"]))))
            except (OSError, ValueError, urllib.error.URLError, RuntimeError) as exc:
                record.update(status="download_failed", error=str(exc))
        results.append(record)
        print("[%02d/60] %-17s %-15s %s" % (i, player["team"], name, record["status"]), flush=True)
    report_path = Path(args.report)
    report_path.write_text(json.dumps({"total":60, "downloaded":sum(x["status"]=="ready" for x in results),
                                       "missing":sum(x["status"] not in ("ready", "candidate") for x in results),
                                       "players":results}, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    if args.apply:
        Path(args.sql).write_text("\n".join(updates)+"\n", encoding="utf-8")
    print("Report:", report_path)
    if args.apply:
        print("Downloaded:", sum(x["status"]=="ready" for x in results), "/ 60")
        print("SQL updates:", args.sql)
        print("Apply SQL only after review with: sudo mariadb lol_card_game < " + str(args.sql))
        print("Then rebuild frontend and deploy its dist directory.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
