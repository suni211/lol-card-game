import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all campaign stages and user progress
router.get('/stages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [stages]: any = await pool.query(`
      SELECT
        cs.*,
        ucp.stars,
        ucp.best_score,
        ucp.completed_at
      FROM campaign_stages cs
      LEFT JOIN user_campaign_progress ucp ON cs.id = ucp.stage_id AND ucp.user_id = ?
      ORDER BY
        FIELD(cs.region, 'LCP', 'LTA', 'LEC', 'LPL', 'LCK'),
        cs.stage_number
    `, [userId]);

    // Group by region
    const groupedStages: any = {};
    stages.forEach((stage: any) => {
      if (!groupedStages[stage.region]) {
        groupedStages[stage.region] = [];
      }
      groupedStages[stage.region].push({
        id: stage.id,
        stageNumber: stage.stage_number,
        difficulty: stage.difficulty,
        requiredPower: stage.required_power,
        pointsReward: stage.points_reward,
        firstClearBonus: stage.first_clear_bonus,
        threeStarBonus: stage.three_star_bonus,
        stars: stage.stars || 0,
        bestScore: stage.best_score || 0,
        completedAt: stage.completed_at,
      });
    });

    res.json({
      success: true,
      data: groupedStages,
    });
  } catch (error: any) {
    console.error('Get campaign stages error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// Battle campaign stage
router.post('/battle', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'Stage ID required',
      });
    }

    // Get stage info
    const [stages]: any = await connection.query(
      'SELECT * FROM campaign_stages WHERE id = ?',
      [stageId]
    );

    if (stages.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
      });
    }

    const stage = stages[0];

    // Get user's active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'No active deck found',
      });
    }

    const deckId = decks[0].id;

    // Calculate deck power
    const [cards]: any = await connection.query(`
      SELECT p.overall, uc.level
      FROM decks d
      JOIN user_cards uc ON (
        uc.id = d.top_card_id OR
        uc.id = d.jungle_card_id OR
        uc.id = d.mid_card_id OR
        uc.id = d.adc_card_id OR
        uc.id = d.support_card_id
      )
      JOIN players p ON uc.player_id = p.id
      WHERE d.id = ?
    `, [deckId]);

    let playerPower = 0;
    cards.forEach((card: any) => {
      playerPower += card.overall + (card.level || 0);
    });

    // Battle simulation
    const playerRandomFactor = 0.9 + Math.random() * 0.2;
    const stageRandomFactor = 0.9 + Math.random() * 0.2;

    const playerFinalPower = playerPower * playerRandomFactor;
    const stageFinalPower = stage.required_power * stageRandomFactor;

    const won = playerFinalPower > stageFinalPower;

    if (!won) {
      await connection.rollback();
      return res.json({
        success: true,
        data: {
          won: false,
          playerPower: Math.floor(playerFinalPower),
          stagePower: Math.floor(stageFinalPower),
          pointsEarned: 0,
        },
      });
    }

    // Calculate stars (1-3 based on power difference)
    const powerDiff = playerFinalPower - stageFinalPower;
    const powerRatio = powerDiff / stageFinalPower;

    let stars = 1;
    if (powerRatio >= 0.5) stars = 3; // 150% or more = 3 stars
    else if (powerRatio >= 0.2) stars = 2; // 120% or more = 2 stars

    // Check existing progress
    const [existingProgress]: any = await connection.query(
      'SELECT * FROM user_campaign_progress WHERE user_id = ? AND stage_id = ?',
      [userId, stageId]
    );

    let pointsEarned = stage.points_reward;
    const isFirstClear = existingProgress.length === 0;

    if (isFirstClear) {
      pointsEarned += stage.first_clear_bonus;
    }

    // Check if achieved 3 stars for the first time
    const isFirst3Stars = isFirstClear ? (stars === 3) : (existingProgress[0].stars < 3 && stars === 3);
    if (isFirst3Stars) {
      pointsEarned += stage.three_star_bonus;
    }

    // Update or insert progress
    if (existingProgress.length === 0) {
      await connection.query(`
        INSERT INTO user_campaign_progress (user_id, stage_id, stars, best_score, completed_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [userId, stageId, stars, Math.floor(playerFinalPower)]);
    } else {
      // Only update if better
      if (stars > existingProgress[0].stars || playerFinalPower > existingProgress[0].best_score) {
        await connection.query(`
          UPDATE user_campaign_progress
          SET stars = GREATEST(stars, ?),
              best_score = GREATEST(best_score, ?),
              completed_at = NOW()
          WHERE user_id = ? AND stage_id = ?
        `, [stars, Math.floor(playerFinalPower), userId, stageId]);
      }
    }

    // Give rewards
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsEarned, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        won: true,
        stars,
        playerPower: Math.floor(playerFinalPower),
        stagePower: Math.floor(stageFinalPower),
        pointsEarned,
        isFirstClear,
        isFirst3Stars,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Campaign battle error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  } finally {
    connection.release();
  }
});

export default router;
