/**
 * Get player image URL based on season and player name
 * Format: /players/25_선수이름.png or /players/ICON_선수이름.png
 */
export function getPlayerImageUrl(playerName: string, season: string = '25', tier?: string): string {
  // Remove leading/trailing spaces but keep internal spaces
  const cleanName = playerName.trim();

  // ICON tier uses tier as prefix instead of season
  if (tier === 'ICON' || season === 'ICON') {
    return `/players/ICON_${cleanName}.png`;
  }

  // GR tier uses _gr.png suffix
  if (tier === 'GR' || season === 'GR') {
    return `/players/${cleanName.replace('GR ', '')}_gr.png`;
  }

  return `/players/${season}_${cleanName}.png`;
}

/**
 * Get fallback placeholder for missing player images
 */
export function getPlayerPlaceholder(): string {
  return '/players/placeholder.png';
}
