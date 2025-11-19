/**
 * Calculate cumulative enhancement bonus
 * 1~4강: +1 each (총 +1, +2, +3, +4)
 * 5~7강: +2 each (총 +6, +8, +10)
 * 8~10강: +4 each (총 +14, +18, +22)
 */
export function calculateEnhancementBonus(level: number): number {
  if (level <= 0) return 0;
  if (level <= 4) return level; // 1강: +1, 2강: +2, 3강: +3, 4강: +4
  if (level <= 7) return 4 + (level - 4) * 2; // 5강: +6, 6강: +8, 7강: +10
  return 10 + (level - 7) * 4; // 8강: +14, 9강: +18, 10강: +22
}
