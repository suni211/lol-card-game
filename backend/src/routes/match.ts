import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Calculate deck power
async function calculateDeckPower(connection: any, deckId: number): Promise<number> {
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
  const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const deckPositions: any = {
    [deckData.top_card_id]: 'TOP',
    [deckData.jungle_card_id]: 'JUNGLE',
    [deckData.mid_card_id]: 'MID',
    [deckData.adc_card_id]: 'ADC',
    [deckData.support_card_id]: 'SUPPORT',
  };

  cards.forEach((card: any) => {
    let power = card.overall + card.level;

    // Wrong position penalty
    const cardIds = Object.keys(deckPositions);
    const matchingCardId = cardIds.find(id => {
      const [cardData]: any = cards.filter((c: any) => c.position === card.position);
      return cardData && deckPositions[id] !== card.position;
    });

    if (matchingCardId && deckPositions[matchingCardId] !== card.position) {
      power -= 10; // Wrong position penalty
    }

    totalPower += power;

    // Count teams for synergy
    teams[card.team] = (teams[card.team] || 0) + 1;
  });

  // Calculate synergy
  let synergyBonus = 0;
  Object.values(teams).forEach((count: any) => {
    if (count === 3) synergyBonus += 5;
    if (count === 4) synergyBonus += 12;
    if (count === 5) synergyBonus += 25;
  });

  totalPower = Math.floor(totalPower * (1 + synergyBonus / 100));

  return totalPower;
}

// Find match
router.post('/find', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get user's active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'No active deck found' });
    }

    const userDeckId = decks[0].id;

    // Find opponent with similar rating
    const [users]: any = await connection.query(
      'SELECT rating FROM users WHERE id = ?',
      [userId]
    );

    const userRating = users[0].rating;

    const [opponents]: any = await connection.query(`
      SELECT u.id, u.username, u.tier, u.rating, d.id as deck_id
      FROM users u
      JOIN decks d ON u.id = d.user_id AND d.is_active = TRUE
      WHERE u.id != ?
      AND u.rating BETWEEN ? AND ?
      ORDER BY RAND()
      LIMIT 1
    `, [userId, userRating - 200, userRating + 200]);

    let opponent;
    let opponentDeckId;

    if (opponents.length === 0) {
      // Create AI opponent
      opponent = {
        id: 0,
        username: 'AI Opponent',
        tier: 'SILVER',
        rating: userRating,
      };

      // Use random deck (simulate)
      opponentDeckId = userDeckId; // For demo purposes
    } else {
      opponent = opponents[0];
      opponentDeckId = opponent.deck_id;
    }

    // Calculate powers
    const player1Power = await calculateDeckPower(connection, userDeckId);
    const player2Power = await calculateDeckPower(connection, opponentDeckId);

    // Determine winner (with some randomness)
    const randomFactor = 0.9 + Math.random() * 0.2; // 90%-110%
    const player1FinalPower = player1Power * randomFactor;
    const player2FinalPower = player2Power * randomFactor;

    const winnerId = player1FinalPower > player2FinalPower ? userId : opponent.id;
    const player1Score = player1FinalPower > player2FinalPower ? 3 : 1;
    const player2Score = player1FinalPower > player2FinalPower ? 1 : 3;

    // Create match record
    if (opponent.id !== 0) {
      const [matchResult]: any = await connection.query(`
        INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW())
      `, [userId, opponent.id, userDeckId, opponentDeckId, winnerId, player1Score, player2Score]);

      const matchId = matchResult.insertId;

      // Update match history
      const won = winnerId === userId;
      const pointsChange = won ? 100 : 50;
      const ratingChange = won ? 25 : -15;

      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, matchId, won ? 'WIN' : 'LOSE', pointsChange, ratingChange]);

      // Update user points and rating
      await connection.query(
        'UPDATE users SET points = points + ?, rating = rating + ? WHERE id = ?',
        [pointsChange, ratingChange, userId]
      );

      // Update stats
      await connection.query(`
        UPDATE user_stats
        SET
          total_matches = total_matches + 1,
          wins = wins + ?,
          losses = losses + ?,
          current_streak = ?,
          longest_win_streak = GREATEST(longest_win_streak, ?)
        WHERE user_id = ?
      `, [won ? 1 : 0, won ? 0 : 1, won ? 1 : 0, won ? 1 : 0, userId]);
    }

    await connection.commit();

    const won = winnerId === userId;

    res.json({
      success: true,
      data: {
        opponent,
        won,
        myScore: player1Score,
        opponentScore: player2Score,
        pointsChange: won ? 100 : 50,
        ratingChange: won ? 25 : -15,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Find match error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get match history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [history]: any = await pool.query(`
      SELECT
        mh.id,
        mh.result,
        mh.points_change,
        mh.rating_change,
        mh.created_at,
        m.player1_id,
        m.player2_id,
        u.username as opponent_username
      FROM match_history mh
      JOIN matches m ON mh.match_id = m.id
      JOIN users u ON u.id = IF(m.player1_id = ?, m.player2_id, m.player1_id)
      WHERE mh.user_id = ?
      ORDER BY mh.created_at DESC
      LIMIT 20
    `, [userId, userId]);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Get match history error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
