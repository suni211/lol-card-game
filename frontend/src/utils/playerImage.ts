/**
 * Get player image URL based on season and player name
 * Format: /players/25_선수이름.png or /players/ICON_선수이름.png
 */
export function getPlayerImageUrl(playerName: string, season: string = '25', tier?: string): string {
  // Remove spaces and special characters from player name
  const cleanName = playerName.trim();

  // ICON tier uses tier as prefix instead of season
  if (tier === 'ICON' || season === 'ICON') {
    return `/players/ICON_${cleanName}.png`;
  }

  return `/players/${season}_${cleanName}.png`;
}

/**
 * Get fallback placeholder for missing player images
 */
export function getPlayerPlaceholder(): string {
  return '/players/placeholder.png';
}
