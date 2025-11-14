import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user data
    const [users]: any = await pool.query(
      'SELECT id, username, email, points, tier, rating, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];

    // Get stats
    const [stats]: any = await pool.query(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const userStats = stats.length > 0 ? stats[0] : {
      total_matches: 0,
      wins: 0,
      losses: 0,
      current_streak: 0,
      longest_win_streak: 0,
    };

    // Get total cards
    const [cardCount]: any = await pool.query(
      'SELECT COUNT(*) as total FROM user_cards WHERE user_id = ?',
      [userId]
    );

    // Get legendary cards count
    const [legendaryCount]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ? AND p.tier = 'LEGENDARY'
    `, [userId]);

    // Get most used cards
    const [mostUsed]: any = await pool.query(`
      SELECT
        p.name,
        p.team,
        p.position,
        p.overall,
        COUNT(*) as games_played
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      GROUP BY uc.player_id
      ORDER BY games_played DESC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          ...userStats,
          totalCards: cardCount[0].total,
          legendaryCards: legendaryCount[0].total,
          winRate: userStats.total_matches > 0
            ? Math.round((userStats.wins / userStats.total_matches) * 100)
            : 0,
        },
        mostUsedCards: mostUsed,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Check in (daily attendance)
router.post('/checkin', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get user
    const [users]: any = await connection.query(
      'SELECT last_check_in, consecutive_days FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = user.last_check_in ? new Date(user.last_check_in).toISOString().split('T')[0] : null;

    if (lastCheckIn === today) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Already checked in today' });
    }

    // Calculate consecutive days
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let consecutiveDays = 1;
    if (lastCheckIn === yesterdayStr) {
      consecutiveDays = (user.consecutive_days || 0) + 1;
    }

    // Base reward: 50P
    let reward = 50;

    // Milestone bonuses (7, 30, 90, 180, 365 days)
    let milestoneBonus = 0;
    let milestone = null;

    if (consecutiveDays === 7) {
      milestoneBonus = 500;
      milestone = '7일 연속';
    } else if (consecutiveDays === 30) {
      milestoneBonus = 500;
      milestone = '30일 연속';
    } else if (consecutiveDays === 90) {
      milestoneBonus = 500;
      milestone = '90일 연속';
    } else if (consecutiveDays === 180) {
      milestoneBonus = 500;
      milestone = '180일 연속';
    } else if (consecutiveDays === 365) {
      milestoneBonus = 500;
      milestone = '365일 연속';
    }

    const totalReward = reward + milestoneBonus;

    // Update user
    await connection.query(`
      UPDATE users
      SET
        last_check_in = CURDATE(),
        consecutive_days = ?,
        points = points + ?
      WHERE id = ?
    `, [consecutiveDays, totalReward, userId]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        reward: totalReward,
        baseReward: reward,
        milestoneBonus,
        milestone,
        consecutiveDays,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Check in error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
