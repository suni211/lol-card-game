import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';

const router = express.Router();

// Get user achievements
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Update achievements based on current stats (이미 달성한 업적 자동 반영)
    await checkAndUpdateAchievements(userId);

    const [achievements]: any = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.category,
        a.difficulty,
        a.requirement_type,
        a.requirement_value,
        a.reward,
        a.icon,
        COALESCE(ua.progress, 0) as progress,
        COALESCE(ua.is_completed, FALSE) as is_completed,
        COALESCE(ua.is_claimed, FALSE) as is_claimed,
        ua.completed_at,
        ua.expires_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE (ua.id IS NULL OR (ua.expires_at > NOW() AND ua.is_claimed = FALSE))
      ORDER BY a.difficulty DESC, a.category, a.id
    `, [userId]);

    // Calculate expires_at for achievements without user_achievements record (1 year from now)
    const now = new Date();
    const formattedAchievements = achievements.map((achievement: any) => {
      if (!achievement.expires_at) {
        const expiresAt = new Date(now);
        expiresAt.setFullYear(now.getFullYear() + 1);
        achievement.expires_at = expiresAt;
      }
      return achievement;
    });

    res.json({ success: true, data: formattedAchievements });
  } catch (error: any) {
    console.error('Get achievements error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Claim achievement reward
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { achievementId } = req.body;

    if (!achievementId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Achievement ID required' });
    }

    // Get user achievement
    const [userAchievements]: any = await connection.query(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );

    if (userAchievements.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Achievement not found' });
    }

    const userAchievement = userAchievements[0];

    if (!userAchievement.is_completed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Achievement not completed' });
    }

    if (userAchievement.is_claimed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // Get achievement reward
    const [achievements]: any = await connection.query(
      'SELECT reward FROM achievements WHERE id = ?',
      [achievementId]
    );

    const reward = achievements[0].reward;

    // Update user achievement
    await connection.query(
      'UPDATE user_achievements SET is_claimed = TRUE, claimed_at = NOW() WHERE id = ?',
      [userAchievement.id]
    );

    // Give reward
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [reward, userId]
    );

    await connection.commit();

    res.json({ success: true, data: { reward } });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim achievement error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
