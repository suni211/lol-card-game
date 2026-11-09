import pool from '../config/database';

/**
 * Bulk update for hundreds of milestones without one SELECT/UPDATE per achievement.
 * Never revoke earned or claimed achievements when card inventories or points shrink.
 * Milestone rows are one-time goals; new records get a long-lived expiry.
 */
export async function updateAchievementProgress(
  userId: number,
  requirementType: string,
  currentValue: number
): Promise<void> {
  const value = Math.max(0, Math.floor(Number(currentValue) || 0));
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       SET ua.progress = GREATEST(ua.progress, LEAST(?, a.requirement_value)),
           ua.completed_at = CASE WHEN ua.is_completed = 0 AND ? >= a.requirement_value THEN NOW() ELSE ua.completed_at END,
           ua.is_completed = IF(? >= a.requirement_value, TRUE, ua.is_completed)
       WHERE ua.user_id = ? AND a.requirement_type = ? AND ua.is_claimed = FALSE`,
      [value, value, value, userId, requirementType]
    );
    await connection.query(
      `INSERT INTO user_achievements
         (user_id, achievement_id, progress, is_completed, completed_at, expires_at)
       SELECT ?, a.id, LEAST(?, a.requirement_value),
              IF(? >= a.requirement_value, TRUE, FALSE),
              IF(? >= a.requirement_value, NOW(), NULL),
              DATE_ADD(NOW(), INTERVAL 20 YEAR)
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
       WHERE a.requirement_type = ? AND ua.id IS NULL`,
      [userId, value, value, value, userId, requirementType]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Update achievement progress error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Helper function to get user stats for achievement checking
export async function checkAndUpdateAchievements(userId: number): Promise<void> {
  const connection = await pool.getConnection();

  try {
    // Get user stats
    const [stats]: any = await connection.query(
      'SELECT total_matches, wins FROM user_stats WHERE user_id = ?',
      [userId]
    );

    if (stats.length > 0) {
      const { total_matches, wins } = stats[0];

      // Update battle achievements
      await updateAchievementProgress(userId, 'total_wins', wins);
      await updateAchievementProgress(userId, 'total_matches', total_matches);
    }

    // Get AI wins
    const [aiStats]: any = await connection.query(
      'SELECT COUNT(*) as ai_wins FROM user_stats_history WHERE user_id = ? AND battle_type = "AI" AND result = "WIN"',
      [userId]
    );
    if (aiStats.length > 0) {
      await updateAchievementProgress(userId, 'ai_wins', aiStats[0].ai_wins);
    }

    // Get ranked wins (match_history only tracks ranked matches)
    const [rankedStats]: any = await connection.query(
      'SELECT COUNT(*) as ranked_wins FROM match_history WHERE user_id = ? AND result = "WIN"',
      [userId]
    );
    if (rankedStats.length > 0) {
      await updateAchievementProgress(userId, 'ranked_wins', rankedStats[0].ranked_wins);
    }

    // Note: Practice wins are not tracked in match_history, only in socket matchmaking
    // For practice wins achievements, we would need a separate tracking table

    // Get card count
    const [cardStats]: any = await connection.query(
      'SELECT COUNT(*) as card_count FROM user_cards WHERE user_id = ?',
      [userId]
    );
    if (cardStats.length > 0) {
      await updateAchievementProgress(userId, 'card_count', cardStats[0].card_count);
    }

    // Get tier-specific card counts
    const [tierCounts]: any = await connection.query(`
      SELECT
        CASE
          WHEN p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        COUNT(*) as count
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      GROUP BY tier
    `, [userId]);

    for (const tier of tierCounts) {
      if (tier.tier === 'RARE') {
        await updateAchievementProgress(userId, 'rare_count', tier.count);
      } else if (tier.tier === 'EPIC') {
        await updateAchievementProgress(userId, 'epic_count', tier.count);
      } else if (tier.tier === 'LEGENDARY') {
        await updateAchievementProgress(userId, 'legendary_count', tier.count);
      }
    }

    // Get gacha count (실제 가챠를 뽑은 횟수)
    const [gachaStats]: any = await connection.query(
      'SELECT COUNT(*) as gacha_count FROM gacha_history WHERE user_id = ?',
      [userId]
    );
    if (gachaStats.length > 0) {
      await updateAchievementProgress(userId, 'gacha_count', gachaStats[0].gacha_count);
    }

    // Get user tier and check tier achievements
    const [user]: any = await connection.query(
      'SELECT tier, rating, points FROM users WHERE id = ?',
      [userId]
    );

    if (user.length > 0) {
      const { tier, points } = user[0];

      // Tier achievements
      const tierMap: any = {
        'BRONZE': 'reach_tier_bronze',
        'SILVER': 'reach_tier_silver',
        'GOLD': 'reach_tier_gold',
        'PLATINUM': 'reach_tier_platinum',
        'DIAMOND': 'reach_tier_diamond',
        'MASTER': 'reach_tier_master',
        'GRANDMASTER': 'reach_tier_grandmaster',
        'CHALLENGER': 'reach_tier_challenger',
      };

      if (tierMap[tier]) {
        await updateAchievementProgress(userId, tierMap[tier], 1);
      }

      // One-time points balance milestones (retain the highest previously achieved progress).
      await updateAchievementProgress(userId, 'points_balance', points);

      // Points achievements
      if (points >= 1000) await updateAchievementProgress(userId, 'points_owned_1000', 1);
      if (points >= 5000) await updateAchievementProgress(userId, 'points_owned_5000', 1);
      if (points >= 100000) await updateAchievementProgress(userId, 'points_owned_100000', 1);


    }

  } catch (error) {
    console.error('Check and update achievements error:', error);
  } finally {
    connection.release();
  }
}
