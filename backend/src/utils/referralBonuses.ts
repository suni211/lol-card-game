import pool from '../config/database';

/**
 * Referral bonus milestones
 * When referred user completes N matches, both users get rewards
 */
const REFERRAL_MILESTONES = [
  { matches: 1, bonusType: 'MATCH_1', referrerBonus: 100, referredBonus: 100 },
  { matches: 5, bonusType: 'MATCH_5', referrerBonus: 250, referredBonus: 250 },
  { matches: 10, bonusType: 'MATCH_10', referrerBonus: 500, referredBonus: 500 },
  { matches: 20, bonusType: 'MATCH_20', referrerBonus: 1000, referredBonus: 1000 },
  { matches: 50, bonusType: 'MATCH_50', referrerBonus: 2500, referredBonus: 2500 },
  { matches: 100, bonusType: 'MATCH_100', referrerBonus: 5000, referredBonus: 5000 },
];

/**
 * Award referral bonuses when referred user completes a match
 * @param referredUserId - The referred user who completed a match
 */
export async function awardReferralMatchBonus(referredUserId: number): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if this user was referred by someone
    const [referralRows]: any = await connection.query(
      `SELECT id, referrer_id, referred_match_count FROM referrals WHERE referred_id = ?`,
      [referredUserId]
    );

    if (referralRows.length === 0) {
      // User was not referred, no bonus to award
      await connection.commit();
      return;
    }

    const referral = referralRows[0];
    const referralId = referral.id;
    const referrerId = referral.referrer_id;
    const currentMatchCount = referral.referred_match_count + 1;

    // Update match count
    await connection.query(
      'UPDATE referrals SET referred_match_count = ? WHERE id = ?',
      [currentMatchCount, referralId]
    );

    // Check if we hit a milestone
    const milestone = REFERRAL_MILESTONES.find((m) => m.matches === currentMatchCount);

    if (milestone) {
      // Check if bonus already awarded (prevent duplicates)
      const [existingBonus]: any = await connection.query(
        `SELECT id FROM referral_bonuses WHERE referral_id = ? AND bonus_type = ?`,
        [referralId, milestone.bonusType]
      );

      if (existingBonus.length === 0) {
        // Award points to referrer
        await connection.query(
          `UPDATE users SET points = points + ?, total_referral_bonus = total_referral_bonus + ? WHERE id = ?`,
          [milestone.referrerBonus, milestone.referrerBonus, referrerId]
        );

        // Award points to referred user
        await connection.query(
          `UPDATE users SET points = points + ? WHERE id = ?`,
          [milestone.referredBonus, referredUserId]
        );

        // Update total match bonus in referrals table
        await connection.query(
          `UPDATE referrals SET total_match_bonus = total_match_bonus + ? WHERE id = ?`,
          [milestone.referrerBonus + milestone.referredBonus, referralId]
        );

        // Log the bonus
        await connection.query(
          `INSERT INTO referral_bonuses (referral_id, referrer_id, referred_id, bonus_type, referrer_bonus, referred_bonus, match_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            referralId,
            referrerId,
            referredUserId,
            milestone.bonusType,
            milestone.referrerBonus,
            milestone.referredBonus,
            currentMatchCount,
          ]
        );

        console.log(`Referral milestone ${milestone.bonusType} reached for referral ${referralId}`);
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Award referral match bonus error:', error);
    // Don't throw - we don't want to break match completion if referral bonus fails
  } finally {
    connection.release();
  }
}

/**
 * Get next milestone for a referred user
 * @param referredUserId - The referred user ID
 * @returns Next milestone info or null
 */
export async function getNextReferralMilestone(referredUserId: number): Promise<{
  matches: number;
  referrerBonus: number;
  referredBonus: number;
  currentMatches: number;
} | null> {
  try {
    const [referralRows]: any = await pool.query(
      `SELECT referred_match_count FROM referrals WHERE referred_id = ?`,
      [referredUserId]
    );

    if (referralRows.length === 0) {
      return null;
    }

    const currentMatches = referralRows[0].referred_match_count;

    // Find next milestone
    const nextMilestone = REFERRAL_MILESTONES.find((m) => m.matches > currentMatches);

    if (!nextMilestone) {
      return null; // All milestones completed
    }

    return {
      matches: nextMilestone.matches,
      referrerBonus: nextMilestone.referrerBonus,
      referredBonus: nextMilestone.referredBonus,
      currentMatches: currentMatches,
    };
  } catch (error) {
    console.error('Get next referral milestone error:', error);
    return null;
  }
}
