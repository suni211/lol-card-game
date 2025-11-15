import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const { region, limit = 100 } = req.query;

    let query = `
      SELECT
        u.id,
        u.username,
        u.tier,
        u.rating,
        COALESCE(MAX(s.wins), 0) as wins,
        COALESCE(MAX(s.losses), 0) as losses,
        COALESCE(MAX(s.total_matches), 0) as total_matches,
        COALESCE(MAX(s.current_streak), 0) as current_streak,
        COALESCE(MAX(s.longest_win_streak), 0) as longest_win_streak,
        ROUND((COALESCE(MAX(s.wins), 0) / NULLIF(COALESCE(MAX(s.total_matches), 0), 0)) * 100, 1) as win_rate,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = u.id) as total_cards,
        (SELECT COUNT(*) FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.user_id = u.id AND p.tier = 'LEGENDARY') as legendary_cards
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.is_admin = FALSE AND u.is_active = TRUE
      GROUP BY u.id, u.username, u.tier, u.rating
    `;

    const params: any[] = [];

    if (region && region !== 'ALL') {
      // TODO: Add region filter if needed
    }

    query += ' ORDER BY u.rating DESC LIMIT ?';
    params.push(parseInt(limit as string));

    const [users]: any = await pool.query(query, params);

    const leaderboard = users.map((user: any, index: number) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      tier: user.tier,
      rating: user.rating,
      wins: user.wins || 0,
      losses: user.losses || 0,
      totalMatches: user.total_matches || 0,
      currentStreak: user.current_streak || 0,
      longestWinStreak: user.longest_win_streak || 0,
      winRate: user.win_rate || 0,
      totalCards: user.total_cards || 0,
      legendaryCards: user.legendary_cards || 0,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
