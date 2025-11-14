import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Calculate deck power (same as matchmaking)
async function calculateDeckPower(deckId: number): Promise<number> {
  const connection = await pool.getConnection();

  try {
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
  } finally {
    connection.release();
  }
}

// Calculate AI difficulty based on user's win count
function calculateAIDifficulty(aiWins: number): number {
  // Base difficulty: 400
  // Increases by 20 per win
  return 400 + (aiWins * 20);
}

// Calculate points reward based on difficulty
function calculatePointsReward(aiPower: number, playerPower: number, won: boolean): number {
  if (!won) return 20; // Loss gives small reward

  const difficultyRatio = aiPower / playerPower;

  // Base reward: 50 points
  // Increases based on how difficult the AI was
  let reward = 50;

  if (difficultyRatio >= 1.5) reward = 150; // Very hard AI
  else if (difficultyRatio >= 1.2) reward = 100; // Hard AI
  else if (difficultyRatio >= 0.9) reward = 70; // Normal AI

  return reward;
}

// Battle AI
router.post('/battle', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user!.id;

    await connection.beginTransaction();

    // Get active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active deck found',
      });
    }

    const deckId = decks[0].id;

    // Get user stats to calculate AI difficulty
    const [stats]: any = await connection.query(
      'SELECT wins FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const aiWins = stats.length > 0 ? stats[0].wins : 0;

    // Calculate powers
    const playerPower = await calculateDeckPower(deckId);
    const aiBasePower = calculateAIDifficulty(aiWins);

    // Add randomness to AI (±10%)
    const aiRandomFactor = 0.9 + Math.random() * 0.2;
    const aiPower = Math.floor(aiBasePower * aiRandomFactor);

    // Calculate battle result
    const playerRandomFactor = 0.9 + Math.random() * 0.2;
    const playerFinalPower = playerPower * playerRandomFactor;
    const aiFinalPower = aiPower * aiRandomFactor;

    const won = playerFinalPower > aiFinalPower;
    const playerScore = won ? 3 : 1;
    const aiScore = won ? 1 : 3;

    // Calculate rewards
    const pointsReward = calculatePointsReward(aiPower, playerPower, won);

    // No rating change for AI battles
    const ratingChange = 0;

    // Create match record (AI is player2 with id 0)
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at)
      VALUES (?, 0, ?, 0, ?, ?, ?, 'COMPLETED', NOW())
    `, [userId, deckId, won ? userId : 0, playerScore, aiScore]);

    const matchId = matchResult.insertId;

    // Add match history
    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, matchId, won ? 'WIN' : 'LOSE', pointsReward, ratingChange]);

    // Update user points (no rating change)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsReward, userId]
    );

    // Update user stats
    await connection.query(`
      UPDATE user_stats
      SET
        total_matches = total_matches + 1,
        wins = wins + ?,
        losses = losses + ?
      WHERE user_id = ?
    `, [won ? 1 : 0, won ? 0 : 1, userId]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        won,
        playerScore,
        aiScore,
        playerPower: Math.floor(playerFinalPower),
        aiPower: Math.floor(aiFinalPower),
        pointsReward,
        aiDifficulty: aiBasePower,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('AI battle error:', error);
    res.status(500).json({
      success: false,
      error: 'AI battle failed',
    });
  } finally {
    connection.release();
  }
});

// Get AI battle stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user!.id;

    // Get user stats
    const [stats]: any = await connection.query(
      'SELECT wins FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const aiWins = stats.length > 0 ? stats[0].wins : 0;
    const nextAIDifficulty = calculateAIDifficulty(aiWins);

    res.json({
      success: true,
      data: {
        currentDifficulty: nextAIDifficulty,
        totalWins: aiWins,
      },
    });

  } catch (error: any) {
    console.error('Get AI stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI stats',
    });
  } finally {
    connection.release();
  }
});

export default router;
