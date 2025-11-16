// MMR 기반 티어 계산
export function calculateTier(rating: number): string {
  if (rating >= 2000) return 'CHALLENGER';
  if (rating >= 1700) return 'MASTER';
  if (rating >= 1600) return 'DIAMOND';
  if (rating >= 1400) return 'PLATINUM';
  if (rating >= 1300) return 'GOLD';
  if (rating >= 1200) return 'SILVER';
  return 'BRONZE';
}

// 티어 색상 (프론트엔드용)
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'CHALLENGER':
      return 'from-cyan-400 via-blue-500 to-purple-600';
    case 'MASTER':
      return 'from-purple-500 via-pink-500 to-red-500';
    case 'DIAMOND':
      return 'from-blue-400 via-cyan-400 to-blue-500';
    case 'PLATINUM':
      return 'from-teal-400 via-cyan-500 to-teal-600';
    case 'GOLD':
      return 'from-yellow-400 via-yellow-500 to-yellow-600';
    case 'SILVER':
      return 'from-gray-300 via-gray-400 to-gray-500';
    case 'BRONZE':
      return 'from-orange-600 via-orange-700 to-orange-800';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

// 티어 이름 (한글)
export function getTierName(tier: string): string {
  switch (tier) {
    case 'CHALLENGER':
      return '챌린저';
    case 'MASTER':
      return '마스터';
    case 'DIAMOND':
      return '다이아몬드';
    case 'PLATINUM':
      return '플래티넘';
    case 'GOLD':
      return '골드';
    case 'SILVER':
      return '실버';
    case 'BRONZE':
      return '브론즈';
    default:
      return '언랭크';
  }
}

// MMR 범위 정보
export function getTierRange(tier: string): { min: number; max: number | null } {
  switch (tier) {
    case 'CHALLENGER':
      return { min: 2000, max: null };
    case 'MASTER':
      return { min: 1700, max: 1999 };
    case 'DIAMOND':
      return { min: 1600, max: 1699 };
    case 'PLATINUM':
      return { min: 1400, max: 1599 };
    case 'GOLD':
      return { min: 1300, max: 1399 };
    case 'SILVER':
      return { min: 1200, max: 1299 };
    case 'BRONZE':
      return { min: 1000, max: 1199 };
    default:
      return { min: 0, max: 999 };
  }
}
