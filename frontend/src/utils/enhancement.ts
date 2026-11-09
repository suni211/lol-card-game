/**
 * Cumulative OVR gained from card enhancement:
 * +1–+4: +1 OVR per level
 * +5–+7: +2 OVR per level
 * +8–+10: +4 OVR per level
 * +10 therefore grants +22 OVR.
 */
export function calculateEnhancementBonus(level: number): number {
  const safeLevel = Math.max(0, Math.min(10, Math.trunc(Number(level) || 0)));
  return Math.min(safeLevel, 4)
    + Math.max(0, Math.min(safeLevel - 4, 3)) * 2
    + Math.max(0, safeLevel - 7) * 4;
}
