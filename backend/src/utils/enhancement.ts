/**
 * Calculate cumulative enhancement bonus
 * 1~10강: +1 each (총 +1, +2, +3, ... +10)
 * 10강 최대 +10
 */
export function calculateEnhancementBonus(level: number): number {
  if (level <= 0) return 0;
  return Math.min(level, 10); // 1강: +1, 2강: +2, ... 10강: +10
}
