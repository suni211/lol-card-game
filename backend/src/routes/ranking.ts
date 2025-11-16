import express from 'express';
import pool from '../config/database';
import { calculateTier } from '../utils/rankTier';

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
      WHERE u.is_admin = FALSE AND u.is_active = TRUE AND u.username NOT LIKE 'AI_%'
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
      tier: calculateTier(user.rating),
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

// Get most used cards
router.get('/popular-cards', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [cards]: any = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.tier,
        p.season,
        p.region,
        COUNT(DISTINCT d.user_id) as usage_count,
        COUNT(DISTINCT d.id) as deck_count
      FROM players p
      JOIN (
        SELECT user_id, top_card_id as card_id, id FROM decks WHERE top_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, jungle_card_id as card_id, id FROM decks WHERE jungle_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, mid_card_id as card_id, id FROM decks WHERE mid_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, adc_card_id as card_id, id FROM decks WHERE adc_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, support_card_id as card_id, id FROM decks WHERE support_card_id IS NOT NULL
      ) d ON p.id IN (
        SELECT player_id FROM user_cards WHERE id = d.card_id
      )
      GROUP BY p.id, p.name, p.team, p.position, p.overall, p.tier, p.season, p.region
      ORDER BY usage_count DESC, deck_count DESC
      LIMIT ?
    `, [parseInt(limit as string)]);

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('Get popular cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get most used cards by position
router.get('/popular-cards/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const { limit = 10 } = req.query;

    const validPositions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    if (!validPositions.includes(position.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Invalid position' });
    }

    let cardIdField = '';
    switch (position.toUpperCase()) {
      case 'TOP': cardIdField = 'top_card_id'; break;
      case 'JUNGLE': cardIdField = 'jungle_card_id'; break;
      case 'MID': cardIdField = 'mid_card_id'; break;
      case 'ADC': cardIdField = 'adc_card_id'; break;
      case 'SUPPORT': cardIdField = 'support_card_id'; break;
    }

    const [cards]: any = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.tier,
        p.season,
        p.region,
        COUNT(DISTINCT d.user_id) as usage_count,
        COUNT(d.id) as deck_count
      FROM players p
      JOIN user_cards uc ON p.id = uc.player_id
      JOIN decks d ON uc.id = d.${cardIdField}
      WHERE p.position = ?
      GROUP BY p.id, p.name, p.team, p.position, p.overall, p.tier, p.season, p.region
      ORDER BY usage_count DESC, deck_count DESC
      LIMIT ?
    `, [position.toUpperCase(), parseInt(limit as string)]);

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('Get popular cards by position error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get top rated decks
router.get('/top-decks', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [decks]: any = await pool.query(`
      SELECT
        d.id as deck_id,
        d.user_id,
        u.username,
        u.rating,
        u.tier,
        d.laning_strategy,
        d.teamfight_strategy,
        d.macro_strategy,
        top_p.name as top_name,
        top_p.team as top_team,
        top_p.overall as top_overall,
        top_p.tier as top_tier,
        jungle_p.name as jungle_name,
        jungle_p.team as jungle_team,
        jungle_p.overall as jungle_overall,
        jungle_p.tier as jungle_tier,
        mid_p.name as mid_name,
        mid_p.team as mid_team,
        mid_p.overall as mid_overall,
        mid_p.tier as mid_tier,
        adc_p.name as adc_name,
        adc_p.team as adc_team,
        adc_p.overall as adc_overall,
        adc_p.tier as adc_tier,
        support_p.name as support_name,
        support_p.team as support_team,
        support_p.overall as support_overall,
        support_p.tier as support_tier
      FROM decks d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN user_cards top_uc ON d.top_card_id = top_uc.id
      LEFT JOIN players top_p ON top_uc.player_id = top_p.id
      LEFT JOIN user_cards jungle_uc ON d.jungle_card_id = jungle_uc.id
      LEFT JOIN players jungle_p ON jungle_uc.player_id = jungle_p.id
      LEFT JOIN user_cards mid_uc ON d.mid_card_id = mid_uc.id
      LEFT JOIN players mid_p ON mid_uc.player_id = mid_p.id
      LEFT JOIN user_cards adc_uc ON d.adc_card_id = adc_uc.id
      LEFT JOIN players adc_p ON adc_uc.player_id = adc_p.id
      LEFT JOIN user_cards support_uc ON d.support_card_id = support_uc.id
      LEFT JOIN players support_p ON support_uc.player_id = support_p.id
      WHERE u.is_admin = FALSE AND u.is_active = TRUE
        AND d.top_card_id IS NOT NULL
        AND d.jungle_card_id IS NOT NULL
        AND d.mid_card_id IS NOT NULL
        AND d.adc_card_id IS NOT NULL
        AND d.support_card_id IS NOT NULL
      ORDER BY u.rating DESC
      LIMIT ?
    `, [parseInt(limit as string)]);

    const formattedDecks = decks.map((deck: any, index: number) => ({
      rank: index + 1,
      deckId: deck.deck_id,
      username: deck.username,
      rating: deck.rating,
      tier: deck.tier,
      deckName: deck.deck_name,
      strategies: {
        laning: deck.laning_strategy,
        teamfight: deck.teamfight_strategy,
        macro: deck.macro_strategy,
      },
      cards: {
        top: { name: deck.top_name, team: deck.top_team, overall: deck.top_overall, tier: deck.top_tier },
        jungle: { name: deck.jungle_name, team: deck.jungle_team, overall: deck.jungle_overall, tier: deck.jungle_tier },
        mid: { name: deck.mid_name, team: deck.mid_team, overall: deck.mid_overall, tier: deck.mid_tier },
        adc: { name: deck.adc_name, team: deck.adc_team, overall: deck.adc_overall, tier: deck.adc_tier },
        support: { name: deck.support_name, team: deck.support_team, overall: deck.support_overall, tier: deck.support_tier },
      },
    }));

    res.json({ success: true, data: formattedDecks });
  } catch (error: any) {
    console.error('Get top decks error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
