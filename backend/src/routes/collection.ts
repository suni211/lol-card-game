import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user collection with filters
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { tier, season, team, position, search } = req.query;

    let query = `
      SELECT
        p.*,
        ucc.first_obtained_at,
        ucc.total_obtained,
        ucc.reward_claimed,
        IF(ucc.id IS NOT NULL, TRUE, FALSE) as collected
      FROM players p
      LEFT JOIN user_collected_cards ucc ON p.id = ucc.player_id AND ucc.user_id = ?
      WHERE 1=1
    `;

    const params: any[] = [userId];

    if (tier) {
      // Calculate tier from overall rating
      if (tier === 'ICON') {
        query += " AND p.name LIKE 'ICON%'";
      } else if (tier === 'COMMON') {
        query += " AND p.name NOT LIKE 'ICON%' AND p.overall <= 80";
      } else if (tier === 'RARE') {
        query += " AND p.name NOT LIKE 'ICON%' AND p.overall > 80 AND p.overall <= 90";
      } else if (tier === 'EPIC') {
        query += " AND p.name NOT LIKE 'ICON%' AND p.overall > 90 AND p.overall <= 100";
      } else if (tier === 'LEGENDARY') {
        query += " AND p.name NOT LIKE 'ICON%' AND p.overall > 100";
      }
    }

    if (season) {
      query += ' AND p.season = ?';
      params.push(season);
    }

    if (team) {
      query += ' AND p.team = ?';
      params.push(team);
    }

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.overall DESC, p.name ASC';

    const [cards]: any = await pool.query(query, params);

    // Get collection stats
    const [stats]: any = await pool.query(
      `SELECT
        COUNT(DISTINCT ucc.player_id) as collected_count,
        (SELECT COUNT(*) FROM players) as total_count
       FROM user_collected_cards ucc
       WHERE ucc.user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        cards,
        stats: stats[0],
      },
    });
  } catch (error: any) {
    console.error('Get collection error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get collection progress
router.get('/progress', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get overall progress
    const [progress]: any = await pool.query(
      'SELECT * FROM user_collection_progress WHERE user_id = ?',
      [userId]
    );

    // Get tier-wise progress
    const [tierProgress]: any = await pool.query(
      `SELECT
        CASE
          WHEN p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        COUNT(DISTINCT ucc.player_id) as collected,
        COUNT(DISTINCT p.id) as total
       FROM players p
       LEFT JOIN user_collected_cards ucc ON p.id = ucc.player_id AND ucc.user_id = ?
       GROUP BY tier`,
      [userId]
    );

    // Get season-wise progress
    const [seasonProgress]: any = await pool.query(
      `SELECT
        p.season,
        COUNT(DISTINCT ucc.player_id) as collected,
        COUNT(DISTINCT p.id) as total
       FROM players p
       LEFT JOIN user_collected_cards ucc ON p.id = ucc.player_id AND ucc.user_id = ?
       GROUP BY p.season`,
      [userId]
    );

    // Get team-wise progress
    const [teamProgress]: any = await pool.query(
      `SELECT
        p.team,
        COUNT(DISTINCT ucc.player_id) as collected,
        COUNT(DISTINCT p.id) as total
       FROM players p
       LEFT JOIN user_collected_cards ucc ON p.id = ucc.player_id AND ucc.user_id = ?
       GROUP BY p.team
       ORDER BY collected DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        progress: progress[0] || { total_cards_collected: 0, total_reward_points: 0 },
        tierProgress,
        seasonProgress,
        teamProgress,
      },
    });
  } catch (error: any) {
    console.error('Get progress error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get milestones
router.get('/milestones', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [milestones]: any = await pool.query(
      `SELECT
        cm.*,
        IF(ucm.id IS NOT NULL, TRUE, FALSE) as claimed
       FROM collection_milestones cm
       LEFT JOIN user_collection_milestones ucm ON cm.id = ucm.milestone_id AND ucm.user_id = ?
       ORDER BY cm.milestone_type, cm.required_cards`,
      [userId]
    );

    res.json({ success: true, data: milestones });
  } catch (error: any) {
    console.error('Get milestones error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Claim milestone reward
router.post('/milestones/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { milestoneId } = req.body;

    // Get milestone info
    const [milestones]: any = await connection.query(
      'SELECT * FROM collection_milestones WHERE id = ?',
      [milestoneId]
    );

    if (milestones.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '마일스톤을 찾을 수 없습니다.',
      });
    }

    const milestone = milestones[0];

    // Check if already claimed
    const [claimed]: any = await connection.query(
      'SELECT id FROM user_collection_milestones WHERE user_id = ? AND milestone_id = ?',
      [userId, milestoneId]
    );

    if (claimed.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 받은 보상입니다.',
      });
    }

    // Check if user meets requirements
    let meetsRequirement = false;
    let collectedCount = 0;

    if (milestone.milestone_type === 'TOTAL') {
      const [count]: any = await connection.query(
        'SELECT COUNT(DISTINCT player_id) as count FROM user_collected_cards WHERE user_id = ?',
        [userId]
      );
      collectedCount = count[0].count;
      meetsRequirement = collectedCount >= milestone.required_cards;
    } else if (milestone.milestone_type === 'TIER') {
      let tierCondition = '';
      if (milestone.filter_value === 'ICON') {
        tierCondition = "p.name LIKE 'ICON%'";
      } else if (milestone.filter_value === 'COMMON') {
        tierCondition = "p.name NOT LIKE 'ICON%' AND p.overall <= 80";
      } else if (milestone.filter_value === 'RARE') {
        tierCondition = "p.name NOT LIKE 'ICON%' AND p.overall > 80 AND p.overall <= 90";
      } else if (milestone.filter_value === 'EPIC') {
        tierCondition = "p.name NOT LIKE 'ICON%' AND p.overall > 90 AND p.overall <= 100";
      } else if (milestone.filter_value === 'LEGENDARY') {
        tierCondition = "p.name NOT LIKE 'ICON%' AND p.overall > 100";
      }

      const [count]: any = await connection.query(
        `SELECT COUNT(DISTINCT ucc.player_id) as count
         FROM user_collected_cards ucc
         JOIN players p ON ucc.player_id = p.id
         WHERE ucc.user_id = ? AND ${tierCondition}`,
        [userId]
      );
      collectedCount = count[0].count;
      meetsRequirement = collectedCount >= milestone.required_cards;
    } else if (milestone.milestone_type === 'SEASON') {
      const [count]: any = await connection.query(
        `SELECT COUNT(DISTINCT ucc.player_id) as count
         FROM user_collected_cards ucc
         JOIN players p ON ucc.player_id = p.id
         WHERE ucc.user_id = ? AND p.season = ?`,
        [userId, milestone.filter_value]
      );
      collectedCount = count[0].count;
      meetsRequirement = collectedCount >= milestone.required_cards;
    } else if (milestone.milestone_type === 'TEAM') {
      const [count]: any = await connection.query(
        `SELECT COUNT(DISTINCT ucc.player_id) as count
         FROM user_collected_cards ucc
         JOIN players p ON ucc.player_id = p.id
         WHERE ucc.user_id = ? AND p.team = ?`,
        [userId, milestone.filter_value]
      );
      collectedCount = count[0].count;
      meetsRequirement = collectedCount >= milestone.required_cards;
    }

    if (!meetsRequirement) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `${milestone.required_cards}장이 필요합니다. (현재: ${collectedCount}장)`,
      });
    }

    // Give reward
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [milestone.reward_points, userId]
    );

    // Mark as claimed
    await connection.query(
      'INSERT INTO user_collection_milestones (user_id, milestone_id) VALUES (?, ?)',
      [userId, milestoneId]
    );

    // Update progress
    await connection.query(
      `INSERT INTO user_collection_progress (user_id, total_reward_points)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE total_reward_points = total_reward_points + ?`,
      [userId, milestone.reward_points, milestone.reward_points]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `${milestone.reward_points}P 획득!`,
      data: { reward: milestone.reward_points },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim milestone error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Toggle card lock status
router.post('/lock/:userCardId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userCardId = parseInt(req.params.userCardId);

    // Check if card belongs to user
    const [cards]: any = await pool.query(
      'SELECT id, is_locked FROM user_cards WHERE id = ? AND user_id = ?',
      [userCardId, userId]
    );

    if (cards.length === 0) {
      return res.status(404).json({
        success: false,
        error: '카드를 찾을 수 없습니다.',
      });
    }

    const newLockStatus = !cards[0].is_locked;

    // Toggle lock status
    await pool.query(
      'UPDATE user_cards SET is_locked = ? WHERE id = ?',
      [newLockStatus, userCardId]
    );

    res.json({
      success: true,
      message: newLockStatus ? '카드가 잠금되었습니다.' : '카드 잠금이 해제되었습니다.',
      data: { is_locked: newLockStatus },
    });
  } catch (error: any) {
    console.error('Toggle lock error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
