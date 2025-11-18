/**
 * Get player image URL based on season and player name
 * Format: /players/25_선수이름.png or /players/ICON_선수이름.png
 */
export function getPlayerImageUrl(playerName: string, season: string = '25', tier?: string): string {
  // Remove leading/trailing spaces but keep internal spaces
  let cleanName = playerName.trim();

  // Remove [ICON], [NR], [GR] prefixes from name
  cleanName = cleanName.replace(/^\[ICON\]\s*/i, '').replace(/^\[NR\]\s*/i, '').replace(/^\[GR\]\s*/i, '');

  // ICON tier uses tier as prefix instead of season
  if (tier === 'ICON' || season === 'ICON') {
    return `/players/ICON_${cleanName}.png`;
  }

  // NR tier (No Rival) - use same image as base player
  if (season === 'NR') {
    return `/players/25_${cleanName}.png`;
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
