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
      -- Permanent milestones remain visible after reward claim or original expiry.
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

// Claim all completed goals in one atomic operation, suitable for 600+ milestones.
router.post('/claim-all', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user!.id;
    const [claimable]:any = await connection.query(
      `SELECT ua.id, a.reward FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id=? AND ua.is_completed=TRUE AND ua.is_claimed=FALSE
       FOR UPDATE`, [userId]
    );
    if (!claimable.length) {
      await connection.commit();
      return res.json({success:true,data:{count:0,reward:0}});
    }
    const ids = claimable.map((row:any)=>Number(row.id));
    const reward = claimable.reduce((sum:number,row:any)=>sum + Number(row.reward || 0),0);
    await connection.query(
      'UPDATE user_achievements SET is_claimed=TRUE, claimed_at=NOW() WHERE id IN (?) AND is_claimed=FALSE',
      [ids]
    );
    await connection.query('UPDATE users SET points=points+? WHERE id=?',[reward,userId]);
    await connection.commit();
    return res.json({success:true,data:{count:ids.length,reward}});
  } catch (error) {
    await connection.rollback();
    console.error('Claim all achievements error:',error);
    return res.status(500).json({success:false,error:'일괄 업적 보상 수령에 실패했습니다.'});
  } finally {
    connection.release();
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
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ? FOR UPDATE',
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
      'UPDATE user_achievements SET is_claimed = TRUE, claimed_at = NOW() WHERE id = ? AND is_claimed=FALSE',
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
