import pool from '../config/database';

/**
 * Add experience points to a user and handle level-ups (with deadlock retry)
 * @param userId - The user's ID
 * @param expGained - Amount of experience to add
 * @param retryCount - Internal retry counter
 * @returns Object with level-up information
 */
export async function addExperience(
  userId: number,
  expGained: number,
  retryCount: number = 0
): Promise<{
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  rewardPoints: number;
  currentExp: number;
  nextLevelExp: number;
}> {
  const connection = await pool.getConnection();

  try {
    // Use FOR UPDATE to lock the row
    await connection.beginTransaction();

    // Get current user level and exp with row lock
    const [userRows]: any = await connection.query(
      'SELECT level, exp, total_exp FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    const currentLevel = userRows[0].level || 1;
    const currentExp = userRows[0].exp || 0;
    const totalExp = userRows[0].total_exp || 0;

    const newExp = currentExp + expGained;
    const newTotalExp = totalExp + expGained;

    // Update user exp
    await connection.query(
      'UPDATE users SET exp = ?, total_exp = ? WHERE id = ?',
      [newExp, newTotalExp, userId]
    );

    // Check for level-ups
    const [levelRewards]: any = await connection.query(
      'SELECT level, required_exp, reward_points FROM level_rewards WHERE level > ? ORDER BY level ASC',
      [currentLevel]
    );

    let newLevel = currentLevel;
    let totalRewardPoints = 0;

    for (const levelReward of levelRewards) {
      if (newTotalExp >= levelReward.required_exp) {
        newLevel = levelReward.level;

        // Check if reward already claimed
        const [claimed]: any = await connection.query(
          'SELECT id FROM user_level_rewards WHERE user_id = ? AND level = ?',
          [userId, newLevel]
        );

        if (claimed.length === 0) {
          // Add reward to user_level_rewards
          await connection.query(
            'INSERT INTO user_level_rewards (user_id, level, reward_points) VALUES (?, ?, ?)',
            [userId, newLevel, levelReward.reward_points]
          );

          // Add points to user
          await connection.query(
            'UPDATE users SET points = points + ? WHERE id = ?',
            [levelReward.reward_points, userId]
          );

          totalRewardPoints += levelReward.reward_points;
        }
      } else {
        break;
      }
    }

    // Update user level if changed
    if (newLevel > currentLevel) {
      // Calculate remaining exp after level-up
      const [currentLevelReward]: any = await connection.query(
        'SELECT required_exp FROM level_rewards WHERE level = ?',
        [newLevel]
      );

      const expForCurrentLevel = currentLevelReward[0]?.required_exp || 0;
      const remainingExp = newTotalExp - expForCurrentLevel;

      await connection.query(
        'UPDATE users SET level = ?, exp = ? WHERE id = ?',
        [newLevel, remainingExp, userId]
      );
    }

    // Get next level requirement
    const [nextLevel]: any = await connection.query(
      'SELECT required_exp FROM level_rewards WHERE level = ?',
      [newLevel + 1]
    );

    const nextLevelExp = nextLevel[0]?.required_exp || 0;
    const [updatedUser]: any = await connection.query(
      'SELECT exp FROM users WHERE id = ?',
      [userId]
    );

    await connection.commit();

    return {
      leveledUp: newLevel > currentLevel,
      oldLevel: currentLevel,
      newLevel: newLevel,
      rewardPoints: totalRewardPoints,
      currentExp: updatedUser[0]?.exp || 0,
      nextLevelExp: nextLevelExp,
    };
  } catch (error: any) {
    await connection.rollback();

    // Retry on deadlock
    if (error.code === 'ER_LOCK_DEADLOCK' && retryCount < 3) {
      connection.release();
      console.log(`Deadlock detected, retrying... (attempt ${retryCount + 1}/3)`);
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
      return addExperience(userId, expGained, retryCount + 1);
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Calculate exp reward based on match type and result
 */
export function calculateExpReward(
  matchType: 'NORMAL' | 'RANKED' | 'AI' | 'VS',
  isWin: boolean
): number {
  const expTable = {
    NORMAL: { win: 100, loss: 50 },
    RANKED: { win: 120, loss: 60 },
    AI: { win: 80, loss: 40 },
    VS: { win: 150, loss: 75 },
  };

  const expData = expTable[matchType];
  return isWin ? expData.win : expData.loss;
}
