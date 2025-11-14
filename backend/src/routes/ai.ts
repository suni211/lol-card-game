import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

const AI_BATTLE_LIMIT = 30; // Max AI battles per hour
const AI_BATTLE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

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

    // Check AI battle limit (30 per hour)
    const oneHourAgo = new Date(Date.now() - AI_BATTLE_WINDOW);
    const [recentBattles]: any = await connection.query(`
      SELECT COUNT(*) as count
      FROM user_stats_history
      WHERE user_id = ?
      AND battle_type = 'AI'
      AND created_at >= ?
    `, [userId, oneHourAgo]);

    if (recentBattles[0].count >= AI_BATTLE_LIMIT) {
      return res.status(400).json({
        success: false,
        error: 'AI battle limit reached',
        message: `1시간에 최대 ${AI_BATTLE_LIMIT}번의 AI 배틀만 가능합니다.`,
      });
    }

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

    // Get current streak
    const [currentStats]: any = await connection.query(
      'SELECT current_streak, longest_win_streak FROM user_stats WHERE user_id = ?',
      [userId]
    );

    let currentStreak = 0;
    let longestWinStreak = 0;

    if (currentStats.length > 0) {
      currentStreak = currentStats[0].current_streak;
      longestWinStreak = currentStats[0].longest_win_streak;
    }

    // Update streak
    let newStreak = 0;
    if (won) {
      newStreak = currentStreak + 1;
      if (newStreak > 10) newStreak = 10; // Max 10 streak
      if (newStreak > longestWinStreak) longestWinStreak = newStreak;
    } else {
      newStreak = 0;
    }

    // Calculate rewards
    let pointsReward = calculatePointsReward(aiPower, playerPower, won);

    // Win streak bonus: +10P per streak level (max 100P at 10 streak)
    let streakBonus = 0;
    if (won && newStreak > 0) {
      streakBonus = newStreak * 10;
      pointsReward += streakBonus;
    }

    // No rating change for AI battles
    const ratingChange = 0;

    // Update user points (no rating change for AI battles)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsReward, userId]
    );

    // Update user stats (AI battles count towards stats)
    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses, current_streak, longest_win_streak)
      VALUES (?, 1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_matches = total_matches + 1,
        wins = wins + ?,
        losses = losses + ?,
        current_streak = ?,
        longest_win_streak = GREATEST(longest_win_streak, ?)
    `, [userId, won ? 1 : 0, won ? 0 : 1, newStreak, longestWinStreak, won ? 1 : 0, won ? 0 : 1, newStreak, longestWinStreak]);

    // Record AI battle in history for rate limiting
    await connection.query(`
      INSERT INTO user_stats_history (user_id, battle_type, result, points_change, ai_difficulty)
      VALUES (?, 'AI', ?, ?, ?)
    `, [userId, won ? 'WIN' : 'LOSE', pointsReward, aiBasePower]);

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
        streakBonus,
        currentStreak: newStreak,
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

    // Get recent battles count (last hour) and oldest battle time
    const oneHourAgo = new Date(Date.now() - AI_BATTLE_WINDOW);
    const [recentBattles]: any = await connection.query(`
      SELECT COUNT(*) as count, MIN(created_at) as oldestBattle
      FROM user_stats_history
      WHERE user_id = ?
      AND battle_type = 'AI'
      AND created_at >= ?
    `, [userId, oneHourAgo]);

    const battlesRemaining = AI_BATTLE_LIMIT - recentBattles[0].count;

    // Calculate time until next reset (when oldest battle expires)
    let resetIn = null;
    if (recentBattles[0].count >= AI_BATTLE_LIMIT && recentBattles[0].oldestBattle) {
      const oldestBattleTime = new Date(recentBattles[0].oldestBattle).getTime();
      const resetTime = oldestBattleTime + AI_BATTLE_WINDOW;
      resetIn = Math.max(0, resetTime - Date.now());
    }

    res.json({
      success: true,
      data: {
        currentDifficulty: nextAIDifficulty,
        totalWins: aiWins,
        battlesRemaining,
        maxBattles: AI_BATTLE_LIMIT,
        resetIn, // milliseconds until next battle available
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

// Auto battle (multiple battles at once)
router.post('/auto-battle', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user!.id;
    const { count } = req.body; // Number of battles to run

    if (!count || count < 1 || count > 30) {
      return res.status(400).json({
        success: false,
        error: 'Invalid count (1-30)',
      });
    }

    // Check remaining battles
    const oneHourAgo = new Date(Date.now() - AI_BATTLE_WINDOW);
    const [recentBattles]: any = await connection.query(`
      SELECT COUNT(*) as count
      FROM user_stats_history
      WHERE user_id = ?
      AND battle_type = 'AI'
      AND created_at >= ?
    `, [userId, oneHourAgo]);

    const battlesRemaining = AI_BATTLE_LIMIT - recentBattles[0].count;

    if (battlesRemaining < count) {
      return res.status(400).json({
        success: false,
        error: 'Not enough battles remaining',
        message: `${battlesRemaining}번의 배틀만 남았습니다.`,
      });
    }

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

    // Get user stats for AI difficulty and streak
    const [stats]: any = await connection.query(
      'SELECT wins, current_streak, longest_win_streak FROM user_stats WHERE user_id = ?',
      [userId]
    );

    let aiWins = stats.length > 0 ? stats[0].wins : 0;
    let currentStreak = stats.length > 0 ? stats[0].current_streak : 0;
    let longestWinStreak = stats.length > 0 ? stats[0].longest_win_streak : 0;

    // Calculate player power once
    const playerPower = await calculateDeckPower(deckId);

    const results = [];
    let totalPointsEarned = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalStreakBonus = 0;

    await connection.beginTransaction();

    for (let i = 0; i < count; i++) {
      const aiBasePower = calculateAIDifficulty(aiWins);
      const aiRandomFactor = 0.9 + Math.random() * 0.2;
      const aiPower = Math.floor(aiBasePower * aiRandomFactor);

      const playerRandomFactor = 0.9 + Math.random() * 0.2;
      const playerFinalPower = playerPower * playerRandomFactor;
      const aiFinalPower = aiPower * aiRandomFactor;

      const won = playerFinalPower > aiFinalPower;
      let pointsReward = calculatePointsReward(aiPower, playerPower, won);

      // Update streak
      let streakBonus = 0;
      if (won) {
        currentStreak = Math.min(currentStreak + 1, 10); // Max 10 streak
        if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;

        // Win streak bonus: +10P per streak level
        streakBonus = currentStreak * 10;
        pointsReward += streakBonus;
        totalStreakBonus += streakBonus;

        totalWins++;
        aiWins++;
      } else {
        currentStreak = 0;
        totalLosses++;
      }

      totalPointsEarned += pointsReward;

      // Record battle
      await connection.query(`
        INSERT INTO user_stats_history (user_id, battle_type, result, points_change, ai_difficulty)
        VALUES (?, 'AI', ?, ?, ?)
      `, [userId, won ? 'WIN' : 'LOSE', pointsReward, aiBasePower]);

      results.push({
        battleNumber: i + 1,
        won,
        aiDifficulty: aiBasePower,
        pointsEarned: pointsReward,
        streakBonus,
        currentStreak: won ? currentStreak : 0,
      });
    }

    // Update user points
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [totalPointsEarned, userId]
    );

    // Update user stats
    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses, current_streak, longest_win_streak)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_matches = total_matches + ?,
        wins = wins + ?,
        losses = losses + ?,
        current_streak = ?,
        longest_win_streak = GREATEST(longest_win_streak, ?)
    `, [userId, count, totalWins, totalLosses, currentStreak, longestWinStreak, count, totalWins, totalLosses, currentStreak, longestWinStreak]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        totalBattles: count,
        totalWins,
        totalLosses,
        totalPointsEarned,
        totalStreakBonus,
        finalStreak: currentStreak,
        results,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Auto battle error:', error);
    res.status(500).json({
      success: false,
      error: 'Auto battle failed',
    });
  } finally {
    connection.release();
  }
});

export default router;
