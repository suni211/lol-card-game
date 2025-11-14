import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user missions
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [missions]: any = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.description,
        m.type,
        m.requirement,
        m.reward,
        COALESCE(um.progress, 0) as progress,
        COALESCE(um.is_completed, FALSE) as is_completed,
        COALESCE(um.is_claimed, FALSE) as is_claimed,
        um.expires_at
      FROM missions m
      LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = ?
      WHERE um.id IS NULL OR um.expires_at > NOW()
      ORDER BY m.type, m.id
    `, [userId]);

    // Calculate expires_at for missions without user_missions record
    const now = new Date();
    const formattedMissions = missions.map((mission: any) => {
      if (!mission.expires_at) {
        // Calculate expires_at based on mission type
        let expiresAt: Date;

        if (mission.type === 'DAILY') {
          expiresAt = new Date(now);
          expiresAt.setHours(23, 59, 59, 999);
        } else if (mission.type === 'WEEKLY') {
          expiresAt = new Date(now);
          const daysUntilSunday = 7 - now.getDay();
          expiresAt.setDate(now.getDate() + daysUntilSunday);
          expiresAt.setHours(23, 59, 59, 999);
        } else {
          // MONTHLY
          expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        mission.expires_at = expiresAt;
      }

      return mission;
    });

    res.json({ success: true, data: formattedMissions });
  } catch (error: any) {
    console.error('Get missions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Claim mission reward
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { missionId } = req.body;

    if (!missionId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Mission ID required' });
    }

    // Get user mission
    const [userMissions]: any = await connection.query(
      'SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ?',
      [userId, missionId]
    );

    if (userMissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }

    const userMission = userMissions[0];

    if (!userMission.is_completed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Mission not completed' });
    }

    if (userMission.is_claimed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // Get mission reward
    const [missions]: any = await connection.query(
      'SELECT reward FROM missions WHERE id = ?',
      [missionId]
    );

    const reward = missions[0].reward;

    // Update user mission
    await connection.query(
      'UPDATE user_missions SET is_claimed = TRUE WHERE id = ?',
      [userMission.id]
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
    console.error('Claim mission error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
