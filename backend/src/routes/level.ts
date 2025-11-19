import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user level progress and rewards
router.get('/progress', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get user level info
    const [userRows]: any = await pool.query(
      'SELECT level, exp, total_exp FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userRows[0];
    const currentLevel = user.level || 1;
    const currentExp = user.exp || 0;
    const totalExp = user.total_exp || 0;

    // Get current and next level requirements
    const [currentLevelData]: any = await pool.query(
      'SELECT required_exp, reward_points, reward_description FROM level_rewards WHERE level = ?',
      [currentLevel]
    );

    const [nextLevelData]: any = await pool.query(
      'SELECT required_exp, reward_points, reward_description FROM level_rewards WHERE level = ?',
      [currentLevel + 1]
    );

    // Get all level rewards
    const [allRewards]: any = await pool.query(
      'SELECT level, required_exp, reward_points, reward_description FROM level_rewards ORDER BY level ASC'
    );

    // Get claimed rewards
    const [claimedRewards]: any = await pool.query(
      'SELECT level, reward_points, claimed_at FROM user_level_rewards WHERE user_id = ? ORDER BY level ASC',
      [userId]
    );

    // Calculate unclaimed rewards
    const claimedLevels = new Set(claimedRewards.map((r: any) => r.level));
    const unclaimedRewards = allRewards.filter(
      (reward: any) => reward.level <= currentLevel && !claimedLevels.has(reward.level) && reward.level > 1
    );

    res.json({
      success: true,
      data: {
        currentLevel,
        currentExp,
        totalExp,
        currentLevelRequired: currentLevelData[0]?.required_exp || 0,
        nextLevelRequired: nextLevelData[0]?.required_exp || 0,
        nextLevelReward: nextLevelData[0]?.reward_points || 0,
        allRewards,
        claimedRewards,
        unclaimedRewards,
      },
    });
  } catch (error: any) {
    console.error('Get level progress error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Claim level rewards
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user?.id;
    const { level } = req.body;

    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!level || level < 2 || level > 60) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid level' });
    }

    // Get user's current level
    const [userRows]: any = await connection.query(
      'SELECT level FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentLevel = userRows[0].level || 1;

    // Check if user has reached this level
    if (level > currentLevel) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Level not reached yet' });
    }

    // Check if reward already claimed
    const [claimed]: any = await connection.query(
      'SELECT id FROM user_level_rewards WHERE user_id = ? AND level = ?',
      [userId, level]
    );

    if (claimed.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // Get reward info
    const [rewardInfo]: any = await connection.query(
      'SELECT reward_points, reward_description FROM level_rewards WHERE level = ?',
      [level]
    );

    if (rewardInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    const rewardPoints = rewardInfo[0].reward_points;

    // Add reward to user_level_rewards
    await connection.query(
      'INSERT INTO user_level_rewards (user_id, level, reward_points) VALUES (?, ?, ?)',
      [userId, level, rewardPoints]
    );

    // Add points to user
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [rewardPoints, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        level,
        rewardPoints,
        message: `레벨 ${level} 보상 ${rewardPoints} 포인트를 획득했습니다!`,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim level reward error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get level leaderboard
router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [leaderboard]: any = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.level,
        u.total_exp,
        u.tier
      FROM users u
      ORDER BY u.level DESC, u.total_exp DESC
      LIMIT 100
    `);

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get level leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
