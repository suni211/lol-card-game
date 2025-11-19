import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateMissionProgress } from '../utils/missionTracker';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';
import { normalizeTeamName } from '../utils/teamUtils';
import { updateEventProgress } from '../utils/eventTracker';
import { addExperience, calculateExpReward } from '../utils/levelTracker';
import { calculateDeckPowerWithCoachBuffs } from '../utils/coachBuffs';
import { updateGuildMissionProgress } from '../utils/guildMissionTracker';

const router = express.Router();

const AI_BATTLE_LIMIT = 100; // Max AI battles per 30 minutes
const AI_BATTLE_WINDOW = 30 * 60 * 1000; // 30 minutes in milliseconds

// Calculate deck power (same as matchmaking) - with coach buffs
async function calculateDeckPower(deckId: number, userId?: number): Promise<number> {
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

    // Calculate enhancement bonus helper
    const calculateEnhancementBonus = (level: number): number => {
      if (level <= 0) return 0;
      if (level <= 4) return level; // 1~4강: +1씩
      if (level <= 7) return 4 + (level - 4) * 2; // 5~7강: +2씩
      return 10 + (level - 7) * 5; // 8~10강: +5씩
    };

    // Apply coach buffs if userId is provided
    if (userId) {
      const { totalPower: powerWithCoach } = await calculateDeckPowerWithCoachBuffs(userId, cards);
      totalPower = powerWithCoach;
    } else {
      cards.forEach((card: any) => {
        const enhancementBonus = calculateEnhancementBonus(card.level || 0);
        let power = card.overall + enhancementBonus;
        totalPower += power;
      });
    }

    // Calculate team synergy
    cards.forEach((card: any) => {
      const synergyTeam = normalizeTeamName(card.team);
      teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
    });

    // Team synergy: same team 3 players = +1 OVR, 4 players = +3 OVR, 5 players = +5 OVR
    let synergyBonus = 0;
    Object.values(teams).forEach((count: any) => {
      if (count === 3) synergyBonus += 1;
      if (count === 4) synergyBonus += 3;
      if (count === 5) synergyBonus += 5;
    });

    totalPower += synergyBonus;
    return totalPower;
  } finally {
    connection.release();
  }
}

// Calculate AI difficulty based on user's win/loss record
function calculateAIDifficulty(aiWins: number, aiLosses: number): number {
  // Base difficulty: 400
  // Increases by 20 per win, decreases by 15 per loss
  // Minimum difficulty: 300
  const difficulty = 400 + (aiWins * 20) - (aiLosses * 15);
  return Math.max(300, difficulty);
}

// Calculate points reward based on difficulty
function calculatePointsReward(aiPower: number, playerPower: number, won: boolean, userRating: number = 1000): number {
  if (!won) return 60; // Loss gives small reward

  const difficultyRatio = aiPower / playerPower;

  // Base reward
  let reward = 120;

  if (difficultyRatio >= 1.5) reward = 300; // Very hard AI
  else if (difficultyRatio >= 1.2) reward = 200; // Hard AI
  else if (difficultyRatio >= 0.9) reward = 160; // Normal AI

  // MMR-based bonus: +1P per 10 MMR above 1000
  if (userRating > 1000) {
    const mmrBonus = Math.floor((userRating - 1000) / 10);
    reward += mmrBonus;
  }

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
        message: `30분에 최대 ${AI_BATTLE_LIMIT}번의 AI 배틀만 가능합니다.`,
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
      'SELECT ai_wins, ai_losses FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const aiWins = stats.length > 0 ? (stats[0].ai_wins || 0) : 0;
    const aiLosses = stats.length > 0 ? (stats[0].ai_losses || 0) : 0;

    // Get user rating for MMR bonus
    const [user]: any = await connection.query(
      'SELECT rating FROM users WHERE id = ?',
      [userId]
    );
    const userRating = user[0]?.rating || 1000;

    // Calculate powers (with coach buffs)
    const playerPower = await calculateDeckPower(deckId, userId);
    const aiBasePower = calculateAIDifficulty(aiWins, aiLosses);

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
    let pointsReward = calculatePointsReward(aiPower, playerPower, won, userRating);

    // Win streak bonus: +5P per streak level (max 50P at 10 streak)
    let streakBonus = 0;
    if (won && newStreak > 0) {
      streakBonus = newStreak * 5;
      pointsReward += streakBonus;
    }

    // No rating change for AI battles
    const ratingChange = 0;

    // Check for active points boost
    const [boostEffects]: any = await connection.query(`
      SELECT si.effect_value
      FROM item_usage_log iul
      JOIN shop_items si ON iul.item_id = si.id
      WHERE iul.user_id = ?
        AND si.effect_type = 'points_boost'
        AND iul.effect_expires_at > NOW()
      LIMIT 1
    `, [userId]);

    // Apply boost multiplier
    if (boostEffects.length > 0) {
      const multiplier = parseFloat(boostEffects[0].effect_value);
      pointsReward = Math.floor(pointsReward * multiplier);
    }

    // Update user points (no rating change for AI battles)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsReward, userId]
    );

    // Update user stats - track AI wins/losses separately
    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses, ai_wins, ai_losses, current_streak, longest_win_streak)
      VALUES (?, 0, 0, 0, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ai_wins = ai_wins + ?,
        ai_losses = ai_losses + ?,
        current_streak = ?,
        longest_win_streak = GREATEST(longest_win_streak, ?)
    `, [userId, won ? 1 : 0, won ? 0 : 1, newStreak, longestWinStreak, won ? 1 : 0, won ? 0 : 1, newStreak, longestWinStreak]);

    // Record AI battle in history for rate limiting
    await connection.query(`
      INSERT INTO user_stats_history (user_id, battle_type, result, points_change, ai_difficulty)
      VALUES (?, 'AI', ?, ?, ?)
    `, [userId, won ? 'WIN' : 'LOSE', pointsReward, aiBasePower]);

    await connection.commit();

    // Update mission progress (don't await to avoid slowing down response)
    updateMissionProgress(userId, 'ai_battle', 1).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update event progress
    updateEventProgress(userId, 'AI_MATCH', 1).catch(err =>
      console.error('Event update error:', err)
    );

    // Update guild missions
    updateGuildMissionProgress(userId, 'MATCH', 1).catch(err =>
      console.error('Guild mission update error:', err)
    );
    if (won) {
      updateGuildMissionProgress(userId, 'WIN', 1).catch(err =>
        console.error('Guild mission update error:', err)
      );
      updateGuildMissionProgress(userId, 'AI', 1).catch(err =>
        console.error('Guild mission update error:', err)
      );
    }

    // Add experience
    const expGained = calculateExpReward('AI', won);
    addExperience(userId, expGained).catch(err =>
      console.error('Exp update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

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
      'SELECT ai_wins, ai_losses FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const aiWins = stats.length > 0 ? (stats[0].ai_wins || 0) : 0;
    const aiLosses = stats.length > 0 ? (stats[0].ai_losses || 0) : 0;
    const nextAIDifficulty = calculateAIDifficulty(aiWins, aiLosses);

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
      'SELECT ai_wins, ai_losses, current_streak, longest_win_streak FROM user_stats WHERE user_id = ?',
      [userId]
    );

    let aiWins = stats.length > 0 ? (stats[0].ai_wins || 0) : 0;
    let aiLosses = stats.length > 0 ? (stats[0].ai_losses || 0) : 0;
    let currentStreak = stats.length > 0 ? (stats[0].current_streak || 0) : 0;
    let longestWinStreak = stats.length > 0 ? (stats[0].longest_win_streak || 0) : 0;

    // Get user rating for MMR bonus
    const [user]: any = await connection.query(
      'SELECT rating FROM users WHERE id = ?',
      [userId]
    );
    const userRating = user[0]?.rating || 1000;

    // Calculate player power once (with coach buffs)
    const playerPower = await calculateDeckPower(deckId, userId);

    const results = [];
    let totalPointsEarned = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalStreakBonus = 0;

    await connection.beginTransaction();

    for (let i = 0; i < count; i++) {
      const aiBasePower = calculateAIDifficulty(aiWins, aiLosses);
      const aiRandomFactor = 0.9 + Math.random() * 0.2;
      const aiPower = Math.floor(aiBasePower * aiRandomFactor);

      const playerRandomFactor = 0.9 + Math.random() * 0.2;
      const playerFinalPower = playerPower * playerRandomFactor;
      const aiFinalPower = aiPower * aiRandomFactor;

      const won = playerFinalPower > aiFinalPower;
      let pointsReward = calculatePointsReward(aiPower, playerPower, won, userRating);

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
        aiLosses++;
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

    // Update user stats - AI battles tracked separately
    await connection.query(`
      INSERT INTO user_stats (user_id, total_matches, wins, losses, ai_wins, ai_losses, current_streak, longest_win_streak)
      VALUES (?, 0, 0, 0, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ai_wins = ai_wins + ?,
        ai_losses = ai_losses + ?,
        current_streak = ?,
        longest_win_streak = GREATEST(longest_win_streak, ?)
    `, [userId, totalWins, totalLosses, currentStreak, longestWinStreak, totalWins, totalLosses, currentStreak, longestWinStreak]);

    await connection.commit();

    // Update mission progress for all battles
    updateMissionProgress(userId, 'ai_battle', count).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update event progress for all battles
    updateEventProgress(userId, 'AI_MATCH', count).catch(err =>
      console.error('Event update error:', err)
    );

    // Update guild missions for all battles
    updateGuildMissionProgress(userId, 'MATCH', count).catch(err =>
      console.error('Guild mission update error:', err)
    );
    if (totalWins > 0) {
      updateGuildMissionProgress(userId, 'WIN', totalWins).catch(err =>
        console.error('Guild mission update error:', err)
      );
      updateGuildMissionProgress(userId, 'AI', totalWins).catch(err =>
        console.error('Guild mission update error:', err)
      );
    }

    // Add experience for all battles
    const totalExp = results.reduce((sum, result) => {
      const expForBattle = calculateExpReward('AI', result.won);
      return sum + expForBattle;
    }, 0);
    addExperience(userId, totalExp).catch(err =>
      console.error('Exp update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

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
