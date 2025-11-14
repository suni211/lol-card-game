import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Gacha probabilities (더 현실적인 확률)
const GACHA_OPTIONS = {
  free: { cost: 0, probabilities: { legendary: 0.1, epic: 1, rare: 15, common: 83.9 } },
  basic: { cost: 100, probabilities: { legendary: 0.3, epic: 2, rare: 20, common: 77.7 } },
  premium: { cost: 300, probabilities: { legendary: 1, epic: 5, rare: 30, common: 64 } },
  ultra: { cost: 500, probabilities: { legendary: 3, epic: 10, rare: 35, common: 52 } },
  worlds_winner: { cost: 2500, probabilities: { legendary: 100, epic: 0, rare: 0, common: 0 }, special: '25WW' }, // 25WW only, guaranteed Rare+
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
    if ((option as any).special === '25WW') {
      // Special 25WW pack - only get 25WW players
      [players] = await connection.query(
        "SELECT * FROM players WHERE name LIKE '25WW%' ORDER BY RAND() LIMIT 1"
      );
    } else {
      [players] = await connection.query(
        'SELECT * FROM players WHERE tier = ? ORDER BY RAND() LIMIT 1',
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
        p.image_url
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
          imageUrl: card.image_url,
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
        p.image_url
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
          imageUrl: card.image_url,
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
