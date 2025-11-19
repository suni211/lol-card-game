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

    // Check if previous stage is completed (for stage_number > 1 in same region)
    if (stage.stage_number > 1) {
      const [prevProgress]: any = await connection.query(`
        SELECT ucp.stars
        FROM campaign_stages cs
        LEFT JOIN user_campaign_progress ucp ON cs.id = ucp.stage_id AND ucp.user_id = ?
        WHERE cs.region = ? AND cs.stage_number = ?
      `, [userId, stage.region, stage.stage_number - 1]);

      if (prevProgress.length === 0 || !prevProgress[0].stars) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: '이전 스테이지를 먼저 클리어해야 합니다.',
        });
      }
    }

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

    // Battle simulation - 3 rounds system (best of 3)
    let playerRoundsWon = 0;
    let totalPlayerPower = 0;
    let totalStagePower = 0;
    const roundResults = [];

    for (let round = 0; round < 3; round++) {
      const playerRandomFactor = 0.85 + Math.random() * 0.3;
      const stageRandomFactor = 0.85 + Math.random() * 0.3;

      const playerRoundPower = playerPower * playerRandomFactor;
      const stageRoundPower = stage.required_power * stageRandomFactor;

      totalPlayerPower += playerRoundPower;
      totalStagePower += stageRoundPower;

      const playerWon = playerRoundPower > stageRoundPower;
      if (playerWon) {
        playerRoundsWon++;
      }

      roundResults.push({
        round: round + 1,
        playerPower: Math.floor(playerRoundPower),
        enemyPower: Math.floor(stageRoundPower),
        playerWon,
      });
    }

    const avgPlayerPower = totalPlayerPower / 3;
    const avgStagePower = totalStagePower / 3;

    // Win if won 2 or more rounds
    const won = playerRoundsWon >= 2;

    if (!won) {
      await connection.rollback();
      return res.json({
        success: true,
        data: {
          won: false,
          playerPower: Math.floor(playerPower), // Actual deck power without random factor
          stagePower: Math.floor(stage.required_power), // Required power without random factor
          pointsEarned: 0,
          roundsWon: playerRoundsWon,
          roundResults, // Round-by-round results for animation
        },
      });
    }

    // Calculate stars based on rounds won (1승=1별, 2승=2별, 3승=3별)
    const stars = playerRoundsWon;

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
      `, [userId, stageId, stars, Math.floor(avgPlayerPower)]);
    } else {
      // Only update if better
      if (stars > existingProgress[0].stars || avgPlayerPower > existingProgress[0].best_score) {
        await connection.query(`
          UPDATE user_campaign_progress
          SET stars = GREATEST(stars, ?),
              best_score = GREATEST(best_score, ?),
              completed_at = NOW()
          WHERE user_id = ? AND stage_id = ?
        `, [stars, Math.floor(avgPlayerPower), userId, stageId]);
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
        playerPower: Math.floor(playerPower), // Actual deck power without random factor
        stagePower: Math.floor(stage.required_power), // Required power without random factor
        pointsEarned,
        isFirstClear,
        isFirst3Stars,
        roundsWon: playerRoundsWon,
        roundResults, // Round-by-round results for animation
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
