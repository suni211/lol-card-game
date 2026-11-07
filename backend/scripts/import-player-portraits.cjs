#!/usr/bin/env node
/**
 * Bulk import approved player portraits into LCG.
 *
 * Usage (from backend/):
 *   node scripts/import-player-portraits.cjs --images /srv/lcg-player-photos
 *   node scripts/import-player-portraits.cjs --images /srv/lcg-player-photos --apply
 *
 * Source photographs must be licensed or otherwise authorized for publication.
 * This tool does NOT scrape NamuWiki, bypass website restrictions or claim that
 * merely displaying an image on a wiki grants redistribution rights.
 *
 * Image filenames:
 *   Name__TEAM.jpg   (preferred; unambiguous even if names repeat across teams)
 *   TEAM__Name.png   (also supported)
 *   Name.jpg         (only if this name is unique among 2026 roster identities)
 *
 * Non-destructive: leaves already assigned photo URLs intact by default.
 * Imports one portrait per distinct name/team/position and shares it across
 * 26 LIVE / 26WR / 26WRs cards for that exact player identity.
 */
'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const argv = process.argv.slice(2);
const valueOf = flag => {
  const index = argv.indexOf(flag);
  if (index >= 0) return argv[index + 1] || '';
  const prefixed = argv.find(arg => arg.startsWith(flag + '='));
  return prefixed ? prefixed.slice(flag.length + 1) : '';
};
const imageDir = valueOf('--images');
const apply = argv.includes('--apply');
const overwrite = argv.includes('--overwrite');
const csvPath = valueOf('--report');
const help = argv.includes('--help') || !imageDir;
const normalize = text => String(text || '').normalize('NFKC').toLowerCase()
  .replace(/[^a-z0-9\p{L}\p{N}]+/gu, '');
const escapeCsv = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const withNames = (name, team) => [
  normalize(name + '__' + team),
  normalize(team + '__' + name)
];
const EXT = /\.(jpe?g|png|webp)$/i;
const LIMIT = 5 * 1024 * 1024;

if (help) {
  console.log('Usage: node scripts/import-player-portraits.cjs --images /path/to/approved-photos [--apply] [--overwrite] [--report /path/missing.csv]');
  console.log('Dry-run is the default. Existing images are never replaced unless --overwrite is specified.');
  process.exit(imageDir ? 0 : 1);
}
function imageExtension(buffer) {
  if (buffer.length > LIMIT || buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buffer[0] === 255 && buffer[1] === 216 &&
      buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return 'jpg';
  return null;
}
async function main() {
  const allEntries = await fs.readdir(path.resolve(imageDir), {withFileTypes: true});
  const files = new Map();
  for (const entry of allEntries) {
    if (!entry.isFile() || !EXT.test(entry.name)) continue;
    const key = normalize(entry.name.replace(EXT, ''));
    if (!files.has(key)) files.set(key, []);
    files.get(key).push(entry.name);
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lol_card_game',
    charset: 'utf8mb4'
  });
  try {
    const [rows] = await db.query(
      `SELECT id,name,team,position,season,image_url FROM players
       WHERE season IN ('26 LIVE','26WR','26WRs')
       ORDER BY name,team,position,id`
    );
    const groups = new Map();
    const nameToIdentities = new Map();
    for (const row of rows) {
      const id = [normalize(row.name),normalize(row.team),row.position].join(':');
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(row);
      const nameKey = normalize(row.name);
      if (!nameToIdentities.has(nameKey)) nameToIdentities.set(nameKey, new Set());
      nameToIdentities.get(nameKey).add(id);
    }
    const uploaded = path.resolve(__dirname, '../uploads/players');
    const missing = [['name','team','position','seasons','reason']];
    let imported = 0, existing = 0, unresolved = 0, errors = 0;
    for (const [identity, cards] of groups) {
      const sample = cards[0];
      const previous = cards.find(card => card.image_url);
      if (previous && !overwrite) {
        existing++;
        // Propagate an already-approved portrait only within the exact identity.
        if (apply) await db.query(
          `UPDATE players SET image_url=? WHERE name=? AND team=? AND position=?
           AND season IN ('26 LIVE','26WR','26WRs')
           AND (image_url IS NULL OR image_url='')`,
          [previous.image_url,sample.name,sample.team,sample.position]
        );
        continue;
      }
      let candidates = withNames(sample.name,sample.team);
      if (nameToIdentities.get(normalize(sample.name)).size === 1) {
        candidates.push(normalize(sample.name));
      }
      const matches = [...new Set(candidates.flatMap(key => files.get(key) || []))];
      if (matches.length !== 1) {
        unresolved++;
        missing.push([sample.name,sample.team,sample.position,
          cards.map(c => c.season).join('/'),matches.length ? 'AMBIGUOUS_FILES' : 'PHOTO_MISSING'
        ]);
        continue;
      }
      const source = path.join(path.resolve(imageDir), matches[0]);
      try {
        const bytes = await fs.readFile(source);
        const ext = imageExtension(bytes);
        if (!ext) throw new Error('INVALID_IMAGE_OR_OVER_5MB');
        const digest = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
        const filename = `portrait-${sample.id}-${digest}.${ext}`;
        const url = `/api/player-images/${filename}`;
        if (apply) {
          await fs.mkdir(uploaded, {recursive: true});
          const target = path.join(uploaded, filename);
          await fs.writeFile(target, bytes, {flag:'wx'}).catch(err => {
            if (err.code !== 'EEXIST') throw err;
          });
          // Update only the exact player identity across 2026 seasons.
          const extra = overwrite ? '' : "AND (image_url IS NULL OR image_url='')";
          await db.query(
            `UPDATE players SET image_url=? WHERE name=? AND team=? AND position=?
             AND season IN ('26 LIVE','26WR','26WRs') ${extra}`,
            [url,sample.name,sample.team,sample.position]
          );
        }
        imported++;
        console.log(`${apply?'IMPORTED':'WOULD_IMPORT'} ${sample.name} (${sample.team}/${sample.position}) <- ${matches[0]}`);
      } catch (e) {
        errors++;
        missing.push([sample.name,sample.team,sample.position,
          cards.map(c=>c.season).join('/'),String(e.code || e.message || e)]);
      }
    }
    const report = csvPath || path.resolve(imageDir, 'lcg-portrait-missing.csv');
    await fs.writeFile(report, missing.map(r=>r.map(escapeCsv).join(',')).join('\n')+'\n','utf8');
    console.log(JSON.stringify({
      mode:apply?'APPLY':'DRY_RUN',identities:groups.size,
      withExistingPortraits:existing,matched:imported,missing:unresolved,
      invalidOrFailed:errors,report
    },null,2));
    if (!apply) console.log('No database writes. Re-run with --apply after reviewing the matched files and photo licenses.');
  } finally { await db.end(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
