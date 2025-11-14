// Tier calculation based on rating
export type UserTier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'CHALLENGER';

export function calculateTier(rating: number): UserTier {
  if (rating >= 10001) return 'CHALLENGER';
  if (rating >= 7001) return 'MASTER';
  if (rating >= 6001) return 'DIAMOND';
  if (rating >= 5001) return 'PLATINUM';
  if (rating >= 4001) return 'GOLD';
  if (rating >= 3001) return 'SILVER';
  if (rating >= 2001) return 'BRONZE';
  return 'IRON';
}

export function getTierLevel(tier: UserTier): number {
  const tierLevels: Record<UserTier, number> = {
    'IRON': 1,
    'BRONZE': 2,
    'SILVER': 3,
    'GOLD': 4,
    'PLATINUM': 5,
    'DIAMOND': 6,
    'MASTER': 7,
    'CHALLENGER': 8,
  };
  return tierLevels[tier];
}

export function canMatchTiers(tier1: UserTier, tier2: UserTier): boolean {
  const level1 = getTierLevel(tier1);
  const level2 = getTierLevel(tier2);
  const difference = Math.abs(level1 - level2);

  // Allow matching if tier difference is less than 2
  return difference < 2;
}
