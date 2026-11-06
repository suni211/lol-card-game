/**
 * Local asset contract for 2026 seasons, team crests and transparent player photos.
 * Place custom PNG/WebP files in frontend/public/players and frontend/public/teams.
 * Season badges are intentionally just flat rectangles: 26 / 26WR / 26WRs.
 */
export type Series2026 = '26 LIVE' | '26WR' | '26WRs';
export function getSeriesLabel(season?: string): string {
  if (season === '26WRs') return '26WRs';
  if (season === '26WR') return '26WR';
  return '26';
}
export function getSeriesLogo(season?: string): string {
  if (season === '26WRs') return '/series/26-wrs.svg';
  if (season === '26WR') return '/series/26-wr.svg';
  return '/series/26-live.svg';
}
export function getTeamLogoUrl(team: string): string {
  // Team names are controlled by DB; encode and constrain them to a filename.
  const clean = team.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  return `/teams/${clean || 'UNKNOWN'}.png`;
}
export function getPlayerImageUrl(
  playerName: string,
  season: string = '26 LIVE',
  _tier?: string,
  imageUrl?: string
): string {
  // Uploaded 2026 portraits served from backend; else try local cut-out portrait.
  if (imageUrl && /^\/(player-images|players)\/[\w\p{L}. _-]+\.(png|webp)$/u.test(imageUrl)) {
    return imageUrl;
  }
  const cleanName = playerName.trim().replace(/[^\p{L}\p{N} _-]/gu, '');
  const prefix = season === '26WRs' ? '26WRs' : season === '26WR' ? '26WR' : '26';
  return `/players/${prefix}_${cleanName}.png`;
}
export function getPlayerPlaceholder(): string {
  return '/players/placeholder.png';
}
