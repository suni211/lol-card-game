/** 2026 season series assets and transparent cut-out portraits. */
export type Series2026 = '26 LIVE' | '26WR' | '26WRs';
export function getSeriesLogo(season?: string): string {
  if (season === '26WRs') return '/series/26-wrs.svg';
  if (season === '26WR') return '/series/26-wr.svg';
  return '/series/26-live.svg';
}
export function getPlayerImageUrl(playerName: string, season: string = '26 LIVE', _tier?: string, imageUrl?: string): string {
  if (imageUrl && (/^\/player-images\/2026-\d+\.(png|webp)$/.test(imageUrl) || imageUrl.startsWith('/players/'))) return imageUrl;
  const cleanName=playerName.trim().replace(/[^\p{L}\p{N} _-]/gu,'');
  const prefix=season === '26WRs' ? '26WRs' : season === '26WR' ? '26WR' : '26';
  return `/players/${prefix}_${cleanName}.png`;
}
export function getPlayerPlaceholder() { return '/players/placeholder.png'; }
