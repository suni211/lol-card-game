// @ts-nocheck
import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitPointUpdate } from '../server';

const router = express.Router();

/**
 * Calculate reward based on stage
 * Formula: stage * 50 + (stage * stage * 10)
 */
function calculateStageReward(stage: number): number {
  return stage * 50 + stage * stage * 10;
}

/**
 * Calculate AI difficulty multiplier
 * AI gets stronger as stage increases
 */
function calculateAIDifficulty(stage: number): number {
  // Moderate difficulty increase
  // Stage 1: 40, Stage 50: 52, Stage 100: 65, Stage 200: 90, Stage 300: 115
  // Formula: 40 + (stage - 1) * 0.25
  const difficulty = 40 + (stage - 1) * 0.25;
  return Math.floor(difficulty);
}

/**
 * Get user's infinite challenge progress
 */
router.get('/progress', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    let [progress]: any = await pool.query(
      'SELECT * FROM infinite_challenge_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      // Create initial progress
      await pool.query(
        'INSERT INTO infinite_challenge_progress (user_id) VALUES (?)',
        [userId]
      );

      [progress] = await pool.query(
        'SELECT * FROM infinite_challenge_progress WHERE user_id = ?',
        [userId]
      );
    }

    const currentProgress = progress[0];

    // Calculate next stage reward
    const nextReward = calculateStageReward(currentProgress.current_stage);
    const aiDifficulty = calculateAIDifficulty(currentProgress.current_stage);

    res.json({
      success: true,
      data: {
        ...currentProgress,
        nextReward,
        aiDifficulty,
      },
    });
  } catch (error: any) {
    console.error('Get progress error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Start new infinite challenge run
 */
router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user?.id;

    await connection.beginTransaction();

    // Get or create progress
    let [progress]: any = await connection.query(
      'SELECT * FROM infinite_challenge_progress WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (progress.length === 0) {
      await connection.query(
        'INSERT INTO infinite_challenge_progress (user_id, is_active, started_at) VALUES (?, TRUE, NOW())',
        [userId]
      );
    } else {
      // Reset to stage 1
      await connection.query(
        `UPDATE infinite_challenge_progress
         SET current_stage = 1, is_active = TRUE, started_at = NOW()
         WHERE user_id = ?`,
        [userId]
      );
    }

    await connection.commit();

    // Get updated progress
    [progress] = await connection.query(
      'SELECT * FROM infinite_challenge_progress WHERE user_id = ?',
      [userId]
    );

    const nextReward = calculateStageReward(1);
    const aiDifficulty = calculateAIDifficulty(1);

    res.json({
      success: true,
      data: {
        ...progress[0],
        nextReward,
        aiDifficulty,
      },
      message: '무한 도전 시작!',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Start challenge error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

/**
 * Complete a stage (victory)
 */
router.post('/complete-stage', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user?.id;
    const { userScore, aiScore, totalDamage } = req.body;

    const isVictory = userScore > aiScore;

    await connection.beginTransaction();

    // Get current progress
    const [progress]: any = await connection.query(
      'SELECT * FROM infinite_challenge_progress WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (progress.length === 0 || !progress[0].is_active) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '진행중인 도전이 없습니다.',
      });
    }

    const currentStage = progress[0].current_stage;
    const reward = calculateStageReward(currentStage);

    if (isVictory) {
      // Victory - advance to next stage
      const newStage = currentStage + 1;
      const newHighest = Math.max(progress[0].highest_stage, newStage);

      await connection.query(
        `UPDATE infinite_challenge_progress
         SET current_stage = ?,
             highest_stage = ?,
             total_rewards = total_rewards + ?,
             last_played_at = NOW()
         WHERE user_id = ?`,
        [newStage, newHighest, reward, userId]
      );

      // Award points
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [reward, userId]
      );

      // Get updated user data
      const [updatedUser]: any = await connection.query(
        'SELECT points, level, exp FROM users WHERE id = ?',
        [userId]
      );

      // Record match
      await connection.query(
        `INSERT INTO infinite_challenge_matches
         (user_id, stage, ai_difficulty, user_score, ai_score, is_victory, total_damage, rewards_earned)
         VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`,
        [userId, currentStage, calculateAIDifficulty(currentStage), userScore, aiScore, totalDamage || 0, reward]
      );

      // Update leaderboard
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      await connection.query(
        `INSERT INTO infinite_challenge_leaderboard
         (week_start, user_id, highest_stage, total_rewards)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         highest_stage = GREATEST(highest_stage, ?),
         total_rewards = total_rewards + ?`,
        [weekStartStr, userId, newStage, reward, newStage, reward]
      );

      await connection.commit();

      // Emit real-time point update
      if (updatedUser.length > 0) {
        emitPointUpdate(userId, updatedUser[0].points, updatedUser[0].level, updatedUser[0].exp);
      }

      res.json({
        success: true,
        data: {
          currentStage: newStage,
          reward,
          nextReward: calculateStageReward(newStage),
          aiDifficulty: calculateAIDifficulty(newStage),
        },
        message: `스테이지 ${currentStage} 클리어! ${reward}P 획득!`,
      });
    } else {
      // Defeat - end run
      await connection.query(
        `UPDATE infinite_challenge_progress
         SET is_active = FALSE,
             last_played_at = NOW()
         WHERE user_id = ?`,
        [userId]
      );

      // Record defeat match (no reward)
      await connection.query(
        `INSERT INTO infinite_challenge_matches
         (user_id, stage, ai_difficulty, user_score, ai_score, is_victory, total_damage, rewards_earned)
         VALUES (?, ?, ?, ?, ?, FALSE, ?, 0)`,
        [userId, currentStage, calculateAIDifficulty(currentStage), userScore, aiScore, totalDamage || 0]
      );

      await connection.commit();

      res.json({
        success: true,
        data: {
          finalStage: currentStage,
          highestStage: progress[0].highest_stage,
        },
        message: `스테이지 ${currentStage}에서 패배! 최고 기록: ${progress[0].highest_stage}`,
      });
    }
  } catch (error: any) {
    await connection.rollback();
    console.error('Complete stage error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

/**
 * Get leaderboard
 */
router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [leaderboard]: any = await pool.query(
      `SELECT
        icl.*,
        u.username,
        u.tier,
        u.level,
        g.tag as guild_tag
      FROM infinite_challenge_leaderboard icl
      JOIN users u ON icl.user_id = u.id
      LEFT JOIN guilds g ON u.guild_id = g.id
      WHERE icl.week_start = ?
      ORDER BY icl.highest_stage DESC, icl.total_rewards DESC
      LIMIT 100`,
      [weekStartStr]
    );

    // Update rank positions
    for (let i = 0; i < leaderboard.length; i++) {
      const rank = i + 1;
      await pool.query(
        'UPDATE infinite_challenge_leaderboard SET rank_position = ? WHERE id = ?',
        [rank, leaderboard[i].id]
      );
      leaderboard[i].rank_position = rank;
    }

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get user's match history
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const [history]: any = await pool.query(
      `SELECT * FROM infinite_challenge_matches
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Battle current stage
 */
router.post('/battle', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user?.id;

    await connection.beginTransaction();

    // Get current progress
    const [progress]: any = await connection.query(
      'SELECT * FROM infinite_challenge_progress WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (progress.length === 0 || !progress[0].is_active) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '진행중인 도전이 없습니다.',
      });
    }

    const currentStage = progress[0].current_stage;
    const aiDifficulty = calculateAIDifficulty(currentStage);

    // Get active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '활성화된 덱이 없습니다.',
      });
    }

    const deckId = decks[0].id;

    // Calculate deck power
    const [deck]: any = await connection.query('SELECT * FROM decks WHERE id = ?', [deckId]);
    const deckData = deck[0];
    const cardIds = [
      deckData.top_card_id,
      deckData.jungle_card_id,
      deckData.mid_card_id,
      deckData.adc_card_id,
      deckData.support_card_id,
    ].filter(Boolean);

    const [cards]: any = await connection.query(`
      SELECT uc.level, p.overall, p.team
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id IN (?)
    `, [cardIds]);

    let playerPower = 0;
    const teams: any = {};

    cards.forEach((card: any) => {
      playerPower += card.overall + card.level;
      teams[card.team] = (teams[card.team] || 0) + 1;
    });

    // Team synergy bonus
    Object.values(teams).forEach((count: any) => {
      if (count === 3) playerPower += 1;
      if (count === 4) playerPower += 3;
      if (count === 5) playerPower += 5;
    });

    // Battle simulation
    const playerRandomFactor = 0.9 + Math.random() * 0.2;
    const aiRandomFactor = 0.9 + Math.random() * 0.2;

    const playerFinalPower = playerPower * playerRandomFactor;
    const aiFinalPower = aiDifficulty * 10 * aiRandomFactor; // Convert difficulty to power

    const won = playerFinalPower > aiFinalPower;
    const playerScore = won ? 3 : 1;
    const aiScore = won ? 1 : 3;

    await connection.commit();

    res.json({
      success: true,
      data: {
        won,
        playerScore,
        aiScore,
        playerPower: Math.floor(playerFinalPower),
        aiPower: Math.floor(aiFinalPower),
        currentStage,
        aiDifficulty,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Infinite challenge battle error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
