// @ts-nocheck
import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * Get current clan war season info
 */
router.get('/season/current', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [seasons]: any = await pool.query(
      `SELECT * FROM clan_war_seasons WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active clan war season',
      });
    }

    res.json({ success: true, data: seasons[0] });
  } catch (error: any) {
    console.error('Get current season error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get guild stats for current season
 */
router.get('/stats/:guildId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { guildId } = req.params;

    // Get current season
    const [seasons]: any = await pool.query(
      `SELECT id FROM clan_war_seasons WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.json({ success: true, data: null });
    }

    const seasonId = seasons[0].id;

    // Get or create guild stats
    const [stats]: any = await pool.query(
      `SELECT * FROM clan_war_guild_stats WHERE season_id = ? AND guild_id = ?`,
      [seasonId, guildId]
    );

    if (stats.length === 0) {
      // Create initial stats
      await pool.query(
        `INSERT INTO clan_war_guild_stats (season_id, guild_id) VALUES (?, ?)`,
        [seasonId, guildId]
      );

      const [newStats]: any = await pool.query(
        `SELECT * FROM clan_war_guild_stats WHERE season_id = ? AND guild_id = ?`,
        [seasonId, guildId]
      );

      return res.json({ success: true, data: newStats[0] });
    }

    res.json({ success: true, data: stats[0] });
  } catch (error: any) {
    console.error('Get guild stats error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get clan war leaderboard
 */
router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Get current season
    const [seasons]: any = await pool.query(
      `SELECT id FROM clan_war_seasons WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const seasonId = seasons[0].id;

    const [leaderboard]: any = await pool.query(
      `SELECT
        cws.*,
        g.name as guild_name,
        g.tag as guild_tag,
        u.username as leader_name
      FROM clan_war_guild_stats cws
      JOIN guilds g ON cws.guild_id = g.id
      JOIN users u ON g.leader_id = u.id
      WHERE cws.season_id = ?
      ORDER BY cws.total_points DESC, cws.wins DESC, cws.total_damage DESC
      LIMIT 100`,
      [seasonId]
    );

    // Update rank positions
    for (let i = 0; i < leaderboard.length; i++) {
      const rank = i + 1;
      await pool.query(
        `UPDATE clan_war_guild_stats SET rank_position = ? WHERE id = ?`,
        [rank, leaderboard[i].id]
      );
      leaderboard[i].rank_position = rank;
    }

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Start clan war matchmaking (find opponent from different guild)
 */
router.post('/matchmaking/start', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user?.id;

    await connection.beginTransaction();

    // Get user's guild
    const [user]: any = await connection.query(
      'SELECT guild_id FROM users WHERE id = ?',
      [userId]
    );

    if (!user[0] || !user[0].guild_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드에 가입되어 있지 않습니다.',
      });
    }

    const userGuildId = user[0].guild_id;

    // Get current season
    const [seasons]: any = await connection.query(
      `SELECT id FROM clan_war_seasons WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (seasons.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '현재 진행중인 클랜전 시즌이 없습니다.',
      });
    }

    const seasonId = seasons[0].id;

    // Find waiting match from OTHER guild
    const [waitingMatches]: any = await connection.query(
      `SELECT cwm.*, u.username as opponent_name, g.name as opponent_guild_name, g.tag as opponent_guild_tag
       FROM clan_war_matches cwm
       JOIN users u ON cwm.player1_id = u.id
       JOIN guilds g ON cwm.guild1_id = g.id
       WHERE cwm.status = 'WAITING'
       AND cwm.season_id = ?
       AND cwm.guild1_id != ?
       AND cwm.player1_id != ?
       ORDER BY cwm.created_at ASC
       LIMIT 1`,
      [seasonId, userGuildId, userId]
    );

    let matchId;

    if (waitingMatches.length > 0) {
      // Join existing match
      const match = waitingMatches[0];
      matchId = match.id;

      await connection.query(
        `UPDATE clan_war_matches
         SET player2_id = ?, guild2_id = ?, status = 'IN_PROGRESS'
         WHERE id = ?`,
        [userId, userGuildId, matchId]
      );
    } else {
      // Create new waiting match
      const [result]: any = await connection.query(
        `INSERT INTO clan_war_matches (season_id, guild1_id, player1_id, status)
         VALUES (?, ?, ?, 'WAITING')`,
        [seasonId, userGuildId, userId]
      );

      matchId = result.insertId;
    }

    await connection.commit();

    // Get match details
    const [matches]: any = await connection.query(
      `SELECT cwm.*,
        u1.username as player1_username,
        u2.username as player2_username,
        g1.name as guild1_name,
        g1.tag as guild1_tag,
        g2.name as guild2_name,
        g2.tag as guild2_tag
       FROM clan_war_matches cwm
       JOIN users u1 ON cwm.player1_id = u1.id
       JOIN guilds g1 ON cwm.guild1_id = g1.id
       LEFT JOIN users u2 ON cwm.player2_id = u2.id
       LEFT JOIN guilds g2 ON cwm.guild2_id = g2.id
       WHERE cwm.id = ?`,
      [matchId]
    );

    res.json({
      success: true,
      data: matches[0],
      message: waitingMatches.length > 0 ? '매칭 성공!' : '상대를 기다리는 중...',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Clan war matchmaking error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

/**
 * Cancel matchmaking
 */
router.post('/matchmaking/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    await pool.query(
      `DELETE FROM clan_war_matches
       WHERE (player1_id = ? OR player2_id = ?)
       AND status = 'WAITING'`,
      [userId, userId]
    );

    res.json({ success: true, message: '매칭이 취소되었습니다.' });
  } catch (error: any) {
    console.error('Cancel matchmaking error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get user's clan war contributions
 */
router.get('/contributions/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    // Get current season
    const [seasons]: any = await pool.query(
      `SELECT id FROM clan_war_seasons WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.json({ success: true, data: null });
    }

    const seasonId = seasons[0].id;

    const [contributions]: any = await pool.query(
      `SELECT * FROM clan_war_contributions
       WHERE season_id = ? AND user_id = ?`,
      [seasonId, userId]
    );

    res.json({
      success: true,
      data: contributions.length > 0 ? contributions[0] : null,
    });
  } catch (error: any) {
    console.error('Get contributions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get guild's top contributors
 */
router.get('/contributions/guild/:guildId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { guildId } = req.params;

    // Get current season
    const [seasons]: any = await pool.query(
      `SELECT id FROM clan_war_seasons WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const seasonId = seasons[0].id;

    const [contributors]: any = await pool.query(
      `SELECT cwc.*, u.username, u.tier, u.level
       FROM clan_war_contributions cwc
       JOIN users u ON cwc.user_id = u.id
       WHERE cwc.season_id = ? AND cwc.guild_id = ?
       ORDER BY cwc.contribution_points DESC
       LIMIT 50`,
      [seasonId, guildId]
    );

    res.json({ success: true, data: contributors });
  } catch (error: any) {
    console.error('Get guild contributors error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
