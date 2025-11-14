import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Practice matchmaking queue
const practiceQueue: Array<{
  userId: number;
  username: string;
  deckId: number;
  timestamp: number;
}> = [];

// Find practice match opponent (with matchmaking queue)
router.post('/find', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const username = req.user!.username;

    // Get active deck
    const [decks]: any = await connection.query(
      'SELECT * FROM decks WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '활성 덱이 없습니다' });
    }

    const userDeck = decks[0];

    // Check if already in queue
    const queueIndex = practiceQueue.findIndex(p => p.userId === userId);
    if (queueIndex !== -1) {
      practiceQueue.splice(queueIndex, 1);
    }

    // Try to find opponent in queue first
    let opponent: any = null;
    if (practiceQueue.length > 0) {
      // Match with first person in queue
      const queuedPlayer = practiceQueue.shift()!;

      // Get opponent user info
      const [opponentUsers]: any = await connection.query(
        'SELECT id, username, rating FROM users WHERE id = ?',
        [queuedPlayer.userId]
      );

      if (opponentUsers.length > 0) {
        opponent = {
          id: queuedPlayer.userId,
          username: queuedPlayer.username,
          rating: opponentUsers[0].rating,
          deck_id: queuedPlayer.deckId
        };
      }
    }

    // If no one in queue, add self to queue and wait
    if (!opponent) {
      // Add to queue
      practiceQueue.push({
        userId,
        username,
        deckId: userDeck.id,
        timestamp: Date.now()
      });

      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '매칭 대기 중... 다른 플레이어를 기다리는 중입니다.',
        inQueue: true,
        queueSize: practiceQueue.length
      });
    }

    // Calculate deck powers
    const userPower = await calculateDeckPower(userDeck.id, connection);
    const opponentPower = await calculateDeckPower(opponent.deck_id, connection);

    // Add randomness (±10%)
    const userFinalPower = userPower * (0.9 + Math.random() * 0.2);
    const opponentFinalPower = opponentPower * (0.9 + Math.random() * 0.2);

    const won = userFinalPower > opponentFinalPower;

    // Practice match rewards (lower than ranked)
    const pointsChange = won ? 50 : 30; // Win: 50P, Loss: 30P (no rating change)

    // Create match record
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (
        player1_id, player2_id, player1_deck_id, player2_deck_id,
        winner_id, player1_score, player2_score, status, match_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'PRACTICE')
    `, [
      userId,
      opponent.id,
      userDeck.id,
      opponent.deck_id,
      won ? userId : opponent.id,
      won ? 3 : 1,
      won ? 1 : 3
    ]);

    const matchId = matchResult.insertId;

    // Record match history for user (no rating change)
    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, 0)
    `, [userId, matchId, won ? 'WIN' : 'LOSE', pointsChange]);

    // Record match history for opponent (no rating change)
    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, 0)
    `, [opponent.id, matchId, won ? 'LOSE' : 'WIN', won ? 30 : 50]);

    // Update points for both players
    await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [pointsChange, userId]);
    await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [won ? 30 : 50, opponent.id]);

    // Update user stats (only match count, no rating)
    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses)
      VALUES (?, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_matches = total_matches + 1,
        wins = wins + ?,
        losses = losses + ?
    `, [userId, won ? 1 : 0, won ? 0 : 1, won ? 1 : 0, won ? 0 : 1]);

    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses)
      VALUES (?, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_matches = total_matches + 1,
        wins = wins + ?,
        losses = losses + ?
    `, [opponent.id, won ? 0 : 1, won ? 1 : 0, won ? 0 : 1, won ? 1 : 0]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        result: won ? 'WIN' : 'LOSE',
        opponent: {
          username: opponent.username,
          rating: opponent.rating,
          power: Math.floor(opponentPower)
        },
        userPower: Math.floor(userPower),
        pointsGained: pointsChange,
        ratingChange: 0 // Practice matches don't affect rating
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Practice match error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Calculate deck power
async function calculateDeckPower(deckId: number, connection: any): Promise<number> {
  const [deck]: any = await connection.query('SELECT * FROM decks WHERE id = ?', [deckId]);
  if (deck.length === 0) return 0;

  const deckData = deck[0];
  const cardIds = [
    deckData.top_card_id,
    deckData.jungle_card_id,
    deckData.mid_card_id,
    deckData.adc_card_id,
    deckData.support_card_id,
  ].filter(Boolean);

  if (cardIds.length === 0) return 0;

  const [cards]: any = await connection.query(`
    SELECT uc.level, p.overall, p.team, p.position
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  let totalPower = 0;
  const teams: any = {};

  cards.forEach((card: any) => {
    let power = card.overall + card.level;
    totalPower += power;
    teams[card.team] = (teams[card.team] || 0) + 1;
  });

  // Team synergy
  let synergyBonus = 0;
  Object.values(teams).forEach((count: any) => {
    if (count === 3) synergyBonus += 5;
    if (count === 4) synergyBonus += 12;
    if (count === 5) synergyBonus += 25;
  });

  totalPower = Math.floor(totalPower * (1 + synergyBonus / 100));
  return totalPower;
}

export default router;
