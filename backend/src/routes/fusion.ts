import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Fusion tier determination based on total overall
function calculateFusionTier(totalOverall: number): string {
  if (totalOverall >= 480) {
    // 480+ = Epic or Legendary (70% Epic, 30% Legendary)
    return Math.random() < 0.7 ? 'EPIC' : 'LEGENDARY';
  } else if (totalOverall >= 420) {
    // 420-479 = Rare or Epic (60% Rare, 40% Epic)
    return Math.random() < 0.6 ? 'RARE' : 'EPIC';
  } else if (totalOverall >= 360) {
    // 360-419 = Common or Rare (50% Common, 50% Rare)
    return Math.random() < 0.5 ? 'COMMON' : 'RARE';
  } else {
    // Below 360 = Common
    return 'COMMON';
  }
}

// Fuse cards
router.post('/fuse', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { cardIds } = req.body; // Array of card IDs to fuse (2-5 cards)
    const userId = req.user!.id;

    // Validate input
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length < 2 || cardIds.length > 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Must select 2-5 cards to fuse' });
    }

    // Get all cards and verify ownership
    const [cards]: any = await connection.query(
      `SELECT uc.id, uc.user_id, uc.level, p.overall, p.name, p.tier
       FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.id IN (?) AND uc.user_id = ?`,
      [cardIds, userId]
    );

    if (cards.length !== cardIds.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'One or more cards not found or not owned' });
    }

    // Calculate total overall (base + level)
    let totalOverall = 0;
    cards.forEach((card: any) => {
      totalOverall += card.overall + card.level;
    });

    // Determine result tier
    const resultTier = calculateFusionTier(totalOverall);

    // Get random player of that tier
    const [players]: any = await connection.query(
      'SELECT * FROM players WHERE tier = ? ORDER BY RAND() LIMIT 1',
      [resultTier]
    );

    if (players.length === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: 'No players available for this tier' });
    }

    const resultPlayer = players[0];

    // Check if duplicate
    const [existing]: any = await connection.query(
      'SELECT id FROM user_cards WHERE user_id = ? AND player_id = ?',
      [userId, resultPlayer.id]
    );

    const isDuplicate = existing.length > 0;
    const refundPoints = isDuplicate ? 100 : 0; // Flat refund for duplicate fusion result

    // Delete fusion material cards
    await connection.query('DELETE FROM user_cards WHERE id IN (?)', [cardIds]);

    // Add result card
    await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, resultPlayer.id]
    );

    // Update points if duplicate
    if (isDuplicate) {
      await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [refundPoints, userId]);
    }

    await connection.commit();

    // Get player traits
    const [traits]: any = await connection.query(
      'SELECT * FROM player_traits WHERE player_id = ?',
      [resultPlayer.id]
    );

    res.json({
      success: true,
      data: {
        player: {
          id: resultPlayer.id,
          name: resultPlayer.name,
          team: resultPlayer.team,
          position: resultPlayer.position,
          overall: resultPlayer.overall,
          region: resultPlayer.region,
          tier: resultPlayer.tier,
          season: resultPlayer.season,
          traits: traits,
        },
        isDuplicate,
        refundPoints,
        totalOverall,
        fusedCards: cards.length,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Fusion error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
