import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';
import { calculateTier } from '../utils/rankTier';

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
      WHERE uc.user_id = ? AND p.name NOT LIKE 'ICON%' AND p.overall > 100
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
        user: {
          ...user,
          tier: calculateTier(user.rating),
        },
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

// Get other user's profile by ID
router.get('/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    // Get user data
    const [users]: any = await pool.query(
      'SELECT id, username, email, points, tier, rating, created_at FROM users WHERE id = ?',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];

    // Get stats
    const [stats]: any = await pool.query(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [targetUserId]
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
      [targetUserId]
    );

    // Get legendary cards count
    const [legendaryCount]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ? AND p.name NOT LIKE 'ICON%' AND p.overall > 100
    `, [targetUserId]);

    // Get active deck with full card details
    const [decks]: any = await pool.query(`
      SELECT
        d.id,
        d.name,
        d.is_active,
        d.laning_strategy,
        d.teamfight_strategy,
        d.macro_strategy
      FROM decks d
      WHERE d.user_id = ? AND d.is_active = TRUE
      LIMIT 1
    `, [targetUserId]);

    let activeDeck = null;

    if (decks.length > 0) {
      const deck = decks[0];

      // Get deck cards
      const [deckCards]: any = await pool.query(`
        SELECT
          uc.id as user_card_id,
          p.id as player_id,
          p.name,
          p.team,
          p.position,
          p.overall,
          p.region,
          CASE
            WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
            WHEN p.overall <= 80 THEN 'COMMON'
            WHEN p.overall <= 90 THEN 'RARE'
            WHEN p.overall <= 100 THEN 'EPIC'
            ELSE 'LEGENDARY'
          END as tier,
          p.season,
          uc.level,
          CASE
            WHEN d.top_card_id = uc.id THEN 'TOP'
            WHEN d.jungle_card_id = uc.id THEN 'JUNGLE'
            WHEN d.mid_card_id = uc.id THEN 'MID'
            WHEN d.adc_card_id = uc.id THEN 'ADC'
            WHEN d.support_card_id = uc.id THEN 'SUPPORT'
          END as deck_position
        FROM decks d
        LEFT JOIN user_cards uc ON (
          uc.id = d.top_card_id OR
          uc.id = d.jungle_card_id OR
          uc.id = d.mid_card_id OR
          uc.id = d.adc_card_id OR
          uc.id = d.support_card_id
        )
        LEFT JOIN players p ON uc.player_id = p.id
        WHERE d.id = ? AND uc.id IS NOT NULL
      `, [deck.id]);

      activeDeck = {
        id: deck.id,
        name: deck.name,
        isActive: deck.is_active,
        laningStrategy: deck.laning_strategy,
        teamfightStrategy: deck.teamfight_strategy,
        macroStrategy: deck.macro_strategy,
        cards: {
          top: deckCards.find((c: any) => c.deck_position === 'TOP') || null,
          jungle: deckCards.find((c: any) => c.deck_position === 'JUNGLE') || null,
          mid: deckCards.find((c: any) => c.deck_position === 'MID') || null,
          adc: deckCards.find((c: any) => c.deck_position === 'ADC') || null,
          support: deckCards.find((c: any) => c.deck_position === 'SUPPORT') || null,
        },
      };
    }

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
        activeDeck,
      },
    });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get attendance status


// Check in (daily attendance)


export default router;
