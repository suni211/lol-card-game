/**
 * Get player image URL based on season and player name
 * Format: /players/25_선수이름.svg
 */
export function getPlayerImageUrl(playerName: string, season: string = '25'): string {
  // Remove spaces and special characters from player name
  const cleanName = playerName.trim();
  return `/players/${season}_${cleanName}.svg`;
}

/**
 * Get fallback placeholder for missing player images
 */
export function getPlayerPlaceholder(): string {
  return '/players/placeholder.svg';
}
