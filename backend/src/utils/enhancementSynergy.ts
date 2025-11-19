/**
 * 강화 등급 시너지 계산
 *
 * 5장 카드의 최소 강화 등급을 기준으로 시너지 부여:
 * - 1~4강: +1 전체 능력치
 * - 5~7강: +3 전체 능력치
 * - 8~10강: +5 전체 능력치
 */

export interface EnhancementSynergyResult {
  bonus: number;
  tier: '1-4' | '5-7' | '8-10' | 'none';
  minLevel: number;
}

export function calculateEnhancementSynergy(levels: number[]): EnhancementSynergyResult {
  // 5장 미만이면 시너지 없음
  if (levels.length < 5) {
    return {
      bonus: 0,
      tier: 'none',
      minLevel: 0,
    };
  }

  // 최소 강화 등급 찾기
  const minLevel = Math.min(...levels);

  // 최소 강화 등급이 0이면 시너지 없음
  if (minLevel === 0) {
    return {
      bonus: 0,
      tier: 'none',
      minLevel: 0,
    };
  }

  // 최소 등급에 따라 시너지 결정
  if (minLevel >= 1 && minLevel <= 4) {
    return {
      bonus: 1,
      tier: '1-4',
      minLevel,
    };
  } else if (minLevel >= 5 && minLevel <= 7) {
    return {
      bonus: 3,
      tier: '5-7',
      minLevel,
    };
  } else if (minLevel >= 8 && minLevel <= 10) {
    return {
      bonus: 5,
      tier: '8-10',
      minLevel,
    };
  }

  return {
    bonus: 0,
    tier: 'none',
    minLevel,
  };
}

/**
 * 강화 시너지 설명 텍스트 반환
 */
export function getEnhancementSynergyDescription(tier: '1-4' | '5-7' | '8-10' | 'none'): string {
  switch (tier) {
    case '1-4':
      return '전 카드 1~4강 달성: 전체 능력치 +1';
    case '5-7':
      return '전 카드 5~7강 달성: 전체 능력치 +3';
    case '8-10':
      return '전 카드 8~10강 달성: 전체 능력치 +5';
    default:
      return '강화 시너지 없음';
  }
}
