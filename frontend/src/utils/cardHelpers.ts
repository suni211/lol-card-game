// 강화 등급별 오버롤 보너스 계산
export function calculateEnhancementBonus(level: number): number {
  if (level <= 4) {
    return level; // 1~4강: +1씩
  } else if (level <= 7) {
    return 4 + (level - 4) * 2; // 5~7강: +2씩
  } else {
    return 10 + (level - 7) * 4; // 8~10강: +4씩
  }
}

// 팀 컬러 가져오기
export function getTeamColor(team: string): string {
  const teamColors: Record<string, string> = {
    // LCK Teams
    'T1': 'bg-red-600',
    'GEN': 'bg-yellow-600',
    'KT': 'bg-red-500',
    'DK': 'bg-blue-600',
    'HLE': 'bg-orange-500',
    'DRX': 'bg-blue-500',
    'BRO': 'bg-green-600',
    'KDF': 'bg-purple-600',
    'NS': 'bg-red-700',
    'FOX': 'bg-orange-600',

    // Legacy LCK
    'SKT': 'bg-red-600',
    'SSG': 'bg-blue-700',
    'ROX': 'bg-orange-600',
    'KOO': 'bg-orange-600',
    'CJ': 'bg-green-700',
    'MVP': 'bg-yellow-600',
    'AZF': 'bg-red-800',
    'NJS': 'bg-green-600',

    // LPL Teams
    'EDG': 'bg-red-600',
    'RNG': 'bg-yellow-500',
    'WE': 'bg-blue-600',
    'IG': 'bg-gray-800',
    'FPX': 'bg-red-700',
    'JDG': 'bg-red-500',
    'TES': 'bg-blue-700',
    'BLG': 'bg-blue-600',
    'LNG': 'bg-green-600',
    'WBG': 'bg-blue-800',

    // LEC Teams
    'G2': 'bg-gray-700',
    'FNC': 'bg-orange-600',
    'MAD': 'bg-yellow-600',
    'RGE': 'bg-orange-700',
    'VIT': 'bg-yellow-500',

    // LCS Teams
    'C9': 'bg-blue-600',
    'TL': 'bg-blue-700',
    'TSM': 'bg-gray-800',
    '100T': 'bg-red-600',
    'FLY': 'bg-green-600',
  };

  return teamColors[team] || 'bg-gray-600';
}

// 티어 컬러 가져오기
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'LEGENDARY':
      return 'from-yellow-400 to-orange-500';
    case 'EPIC':
      return 'from-purple-400 to-pink-500';
    case 'RARE':
      return 'from-blue-400 to-cyan-500';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

// 포지션 컬러 가져오기
export function getPositionColor(position: string): string {
  switch (position) {
    case 'TOP':
      return 'bg-red-500';
    case 'JUNGLE':
      return 'bg-green-500';
    case 'MID':
      return 'bg-blue-500';
    case 'ADC':
      return 'bg-yellow-500';
    case 'SUPPORT':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}
