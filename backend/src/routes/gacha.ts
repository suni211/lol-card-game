import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateMissionProgress } from '../utils/missionTracker';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';

const router = express.Router();

// Gacha probabilities (더 어려운 확률로 조정)
const GACHA_OPTIONS = {
  free: { cost: 0, probabilities: { legendary: 0.01, epic: 0.1, rare: 5, common: 94.89 } },
  basic: { cost: 100, probabilities: { legendary: 0.05, epic: 0.5, rare: 10, common: 89.45 } },
  premium: { cost: 300, probabilities: { legendary: 0.2, epic: 2, rare: 18, common: 79.8 } },
  ultra: { cost: 500, probabilities: { legendary: 0.5, epic: 4, rare: 25, common: 70.5 } },
  worlds_winner: { cost: 2500, probabilities: { legendary: 5, epic: 25, rare: 70, common: 0 }, special: 'WORLDS' }, // 25WW, 25WUD, and Rare+ cards (레어 이상 확정)
  lck_legend: { cost: 2200, probabilities: { legendary: 3, epic: 22, rare: 75, common: 0 }, special: 'RE' }, // RE cards and Rare+ only
};

function selectTierByProbability(probabilities: any): string {
  const random = Math.random() * 100;

  if (random < probabilities.legendary) return 'LEGENDARY';
  if (random < probabilities.legendary + probabilities.epic) return 'EPIC';
  if (random < probabilities.legendary + probabilities.epic + probabilities.rare) return 'RARE';
  return 'COMMON';
}

// Draw card
router.post('/draw', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { type } = req.body; // 'free', 'basic', 'premium', 'ultra'
    const userId = req.user!.id;

    // Validate gacha type
    if (!GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS]) {
      return res.status(400).json({ success: false, error: 'Invalid gacha type' });
    }

    const option = GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS];

    // Check if free draw was used today
    if (type === 'free') {
      const [lastFree]: any = await connection.query(
        'SELECT created_at FROM gacha_history WHERE user_id = ? AND cost = 0 AND DATE(created_at) = CURDATE()',
        [userId]
      );

      if (lastFree.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Daily free draw already used' });
      }
    }

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (users[0].points < option.cost) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    // Select tier
    const tier = selectTierByProbability(option.probabilities);

    // Get random player of that tier
    let players: any;
    if ((option as any).special === 'WORLDS') {
      // WORLDS pack is now CLOSED - no more 25WW/25WUD cards available
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'This gacha pack is no longer available' });
    } else if ((option as any).special === 'RE') {
      // LCK Legend pack - RE cards and all Rare+ cards (exclude 25WW, 25WUD)
      [players] = await connection.query(
        "SELECT * FROM players WHERE tier IN ('RARE', 'EPIC', 'LEGENDARY') AND tier = ? AND name NOT LIKE '25WW%' AND name NOT LIKE '25WUD%' ORDER BY RAND() LIMIT 1",
        [tier]
      );
    } else {
      // Regular packs - exclude 25WW and 25WUD cards
      [players] = await connection.query(
        "SELECT * FROM players WHERE tier = ? AND name NOT LIKE '25WW%' AND name NOT LIKE '25WUD%' ORDER BY RAND() LIMIT 1",
        [tier]
      );
    }

    if (players.length === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: 'No players available' });
    }

    const player = players[0];

    // Check if duplicate
    const [existing]: any = await connection.query(
      'SELECT id FROM user_cards WHERE user_id = ? AND player_id = ?',
      [userId, player.id]
    );

    const isDuplicate = existing.length > 0;
    const refundPoints = isDuplicate ? Math.floor(option.cost * 0.5) : 0;

    // Add card to user (even if duplicate)
    await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    // Update user points
    const pointsChange = refundPoints - option.cost;
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsChange, userId]
    );

    // Record gacha history
    await connection.query(
      'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, ?, ?, ?)',
      [userId, player.id, option.cost, isDuplicate, refundPoints]
    );

    await connection.commit();

    // Update mission progress
    updateMissionProgress(userId, 'gacha', 1).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

    // Get player traits
    const [traits]: any = await connection.query(
      'SELECT * FROM player_traits WHERE player_id = ?',
      [player.id]
    );

    res.json({
      success: true,
      data: {
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          overall: player.overall,
          region: player.region,
          tier: player.tier,
          season: player.season,
          traits: traits,
        },
        isDuplicate,
        refundPoints,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Gacha draw error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get user cards
router.get('/my-cards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [cards]: any = await pool.query(`
      SELECT
        uc.id,
        uc.user_id,
        uc.player_id,
        uc.level,
        uc.created_at,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.region,
        p.tier,
        p.season,
        p.image_url,
        p.laning,
        p.teamfight,
        p.macro,
        p.mental
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      ORDER BY p.overall DESC, uc.created_at DESC
    `, [userId]);

    // Transform to nested structure
    const formattedCards = await Promise.all(cards.map(async (card: any) => {
      const [traits]: any = await pool.query(
        'SELECT * FROM player_traits WHERE player_id = ?',
        [card.player_id]
      );

      return {
        id: card.id,
        userId: card.user_id,
        playerId: card.player_id,
        level: card.level,
        createdAt: card.created_at,
        player: {
          id: card.player_id,
          name: card.name,
          team: card.team,
          position: card.position,
          overall: card.overall,
          region: card.region,
          tier: card.tier,
          season: card.season,
          imageUrl: card.image_url,
          laning: card.laning || 50,
          teamfight: card.teamfight || 50,
          macro: card.macro || 50,
          mental: card.mental || 50,
          traits: traits,
        },
      };
    }));

    res.json({ success: true, data: formattedCards });
  } catch (error: any) {
    console.error('Get cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get another user's cards (for trade)
router.get('/user-cards/:username', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username;

    // Get user by username
    const [users]: any = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const targetUserId = users[0].id;

    const [cards]: any = await pool.query(`
      SELECT
        uc.id,
        uc.user_id,
        uc.player_id,
        uc.level,
        uc.created_at,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.region,
        p.tier,
        p.season,
        p.image_url,
        p.laning,
        p.teamfight,
        p.macro,
        p.mental
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      ORDER BY p.overall DESC, uc.created_at DESC
    `, [targetUserId]);

    // Transform to nested structure
    const formattedCards = await Promise.all(cards.map(async (card: any) => {
      const [traits]: any = await pool.query(
        'SELECT * FROM player_traits WHERE player_id = ?',
        [card.player_id]
      );

      return {
        id: card.id,
        userId: card.user_id,
        playerId: card.player_id,
        level: card.level,
        createdAt: card.created_at,
        player: {
          id: card.player_id,
          name: card.name,
          team: card.team,
          position: card.position,
          overall: card.overall,
          region: card.region,
          tier: card.tier,
          season: card.season,
          imageUrl: card.image_url,
          laning: card.laning || 50,
          teamfight: card.teamfight || 50,
          macro: card.macro || 50,
          mental: card.mental || 50,
          traits: traits,
        },
      };
    }));

    res.json({ success: true, data: formattedCards });
  } catch (error: any) {
    console.error('Get user cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Enhancement success rates per level (0→1, 1→2, ..., 9→10)
const ENHANCEMENT_RATES = [80, 65, 60, 50, 45, 40, 20, 10, 5, 1];
const MAX_ENHANCEMENT_LEVEL = 10;

// Enhance card
router.post('/enhance', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { targetCardId, materialCardId } = req.body;

    // Validate input
    if (!targetCardId || !materialCardId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Target card and material card are required' });
    }

    if (targetCardId === materialCardId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot use the same card as both target and material' });
    }

    // Get both cards
    const [cards]: any = await connection.query(
      'SELECT uc.*, p.name as player_name FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.id IN (?, ?) AND uc.user_id = ?',
      [targetCardId, materialCardId, userId]
    );

    if (cards.length !== 2) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'One or both cards not found' });
    }

    const targetCard = cards.find((c: any) => c.id === targetCardId);
    const materialCard = cards.find((c: any) => c.id === materialCardId);

    // Validate same player
    if (targetCard.player_id !== materialCard.player_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cards must be of the same player' });
    }

    // Check max level
    if (targetCard.level >= MAX_ENHANCEMENT_LEVEL) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Card is already at maximum enhancement level' });
    }

    // Calculate cost
    const cost = (targetCard.level + 1) * 100;

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (users[0].points < cost) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    // Calculate success rate
    const successRate = ENHANCEMENT_RATES[targetCard.level];
    const random = Math.random() * 100;
    const isSuccess = random < successRate;

    // Delete material card
    await connection.query('DELETE FROM user_cards WHERE id = ?', [materialCardId]);

    // Deduct points
    await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [cost, userId]);

    // Update target card level if success
    if (isSuccess) {
      await connection.query('UPDATE user_cards SET level = level + 1 WHERE id = ?', [targetCardId]);
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        isSuccess,
        newLevel: targetCard.level + (isSuccess ? 1 : 0),
        cost,
        successRate,
        playerName: targetCard.player_name,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Enhancement error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Dismantle card
router.delete('/dismantle/:cardId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const cardId = parseInt(req.params.cardId);

    // Get card
    const [cards]: any = await connection.query(
      'SELECT uc.*, p.tier FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.id = ? AND uc.user_id = ?',
      [cardId, userId]
    );

    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const card = cards[0];

    // Calculate refund based on tier
    const refundMap: any = {
      COMMON: 25,
      RARE: 50,
      EPIC: 100,
      LEGENDARY: 200,
    };

    const refund = refundMap[card.tier] || 25;

    // Delete card
    await connection.query('DELETE FROM user_cards WHERE id = ?', [cardId]);

    // Refund points
    await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [refund, userId]);

    await connection.commit();

    res.json({ success: true, data: { refund } });
  } catch (error: any) {
    await connection.rollback();
    console.error('Dismantle card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
