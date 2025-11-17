import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { normalizeTeamName, isSameTeam, getTierByOverall } from '../utils/teamUtils';
import { addExperience, calculateExpReward } from '../utils/levelTracker';

const router = express.Router();

// Get VS Mode stages and user progress
router.get('/stages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all stages with enemies
    const [stages]: any = await pool.query(`
      SELECT
        s.id,
        s.stage_number,
        s.stage_name,
        s.is_boss,
        s.reward_points,
        s.hard_mode_multiplier
      FROM vs_stages s
      ORDER BY s.stage_number ASC
    `);

    // Get enemies for each stage
    for (const stage of stages) {
      const [enemies]: any = await pool.query(`
        SELECT
          player_name,
          enhancement_level,
          hard_enhancement_level,
          position_order
        FROM vs_stage_enemies
        WHERE stage_id = ?
        ORDER BY position_order ASC
      `, [stage.id]);

      stage.enemies = enemies || [];
    }

    // Get user progress
    let [progress]: any = await pool.query(
      'SELECT * FROM user_vs_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      // Initialize progress
      await pool.query(
        `INSERT INTO user_vs_progress (user_id, stages_cleared, hard_stages_cleared)
         VALUES (?, '[]', '[]')`,
        [userId]
      );
      progress = [{
        current_stage: 1,
        hard_mode_unlocked: false,
        stages_cleared: [],
        hard_stages_cleared: [],
        total_points_earned: 0
      }];
    } else {
      progress[0].stages_cleared = JSON.parse(progress[0].stages_cleared || '[]');
      progress[0].hard_stages_cleared = JSON.parse(progress[0].hard_stages_cleared || '[]');
    }

    res.json({
      success: true,
      data: {
        stages: stages || [],
        progress: progress[0] || {
          current_stage: 1,
          hard_mode_unlocked: false,
          stages_cleared: [],
          hard_stages_cleared: [],
          total_points_earned: 0
        }
      }
    });
  } catch (error) {
    console.error('Get VS stages error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Start VS battle
router.post('/battle/:stageNumber', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const stageNumber = parseInt(req.params.stageNumber);
    const { isHardMode, userDeckId } = req.body;

    // Get stage info
    const [stages]: any = await connection.query(
      'SELECT * FROM vs_stages WHERE stage_number = ?',
      [stageNumber]
    );

    if (stages.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '스테이지를 찾을 수 없습니다.' });
    }

    const stage = stages[0];

    // Get user progress
    let [progress]: any = await connection.query(
      'SELECT * FROM user_vs_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '진행 상황을 찾을 수 없습니다.' });
    }

    progress = progress[0];
    const stagesCleared = JSON.parse(progress.stages_cleared || '[]');
    const hardStagesCleared = JSON.parse(progress.hard_stages_cleared || '[]');

    // Check if hard mode is unlocked
    if (isHardMode && !progress.hard_mode_unlocked) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: '하드 모드가 잠겨있습니다.' });
    }

    // Check if stage is unlocked (must clear previous stages)
    if (stageNumber > 1) {
      const prevCleared = isHardMode ? hardStagesCleared : stagesCleared;
      if (!prevCleared.includes(stageNumber - 1)) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: '이전 스테이지를 먼저 클리어해야 합니다.' });
      }
    }

    // Get enemy deck for this stage - using subquery to get exactly one player per position
    const [enemyConfig]: any = await connection.query(`
      SELECT player_name, enhancement_level, hard_enhancement_level, position_order
      FROM vs_stage_enemies
      WHERE stage_id = ?
      ORDER BY position_order ASC
    `, [stage.id]);

    // 각 포지션별로 선수 매칭
    const enemies: any[] = [];
    const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

    for (let i = 0; i < enemyConfig.length && i < 5; i++) {
      const config = enemyConfig[i];
      const position = positions[i];

      // 우선순위 1: 이름과 조건이 맞는 선수
      let [player]: any = await connection.query(`
        SELECT * FROM players
        WHERE name = ? AND position = ?
          AND (
            (? <= 11 AND team IN ('LCP', 'LTA'))
            OR (? BETWEEN 12 AND 49 AND tier != 'ICON' AND region IN ('LPL', 'LCK', 'LEC'))
            OR (? = 50 AND tier = 'ICON')
          )
        ORDER BY overall DESC
        LIMIT 1
      `, [config.player_name, position, stageNumber, stageNumber, stageNumber]);

      // 우선순위 2: 이름만 맞는 선수
      if (player.length === 0) {
        [player] = await connection.query(`
          SELECT * FROM players
          WHERE name = ? AND position = ?
          ORDER BY overall DESC
          LIMIT 1
        `, [config.player_name, position]);
      }

      // 우선순위 3: 포지션만 맞는 랜덤 선수
      if (player.length === 0) {
        [player] = await connection.query(`
          SELECT * FROM players
          WHERE position = ?
            AND (
              (? <= 11 AND team IN ('LCP', 'LTA'))
              OR (? BETWEEN 12 AND 49 AND tier != 'ICON' AND region IN ('LPL', 'LCK', 'LEC'))
              OR (? = 50 AND tier = 'ICON')
            )
          ORDER BY RAND()
          LIMIT 1
        `, [position, stageNumber, stageNumber, stageNumber]);
      }

      if (player.length > 0) {
        enemies.push({
          ...player[0],
          player_name: config.player_name,
          enhancement_level: config.enhancement_level,
          hard_enhancement_level: config.hard_enhancement_level,
          position_order: config.position_order
        });
      }
    }

    // 5명이 안되면 나머지는 랜덤으로 채움
    while (enemies.length < 5) {
      const position = positions[enemies.length];
      const [randomPlayer]: any = await connection.query(`
        SELECT * FROM players
        WHERE position = ?
        ORDER BY RAND()
        LIMIT 1
      `, [position]);

      if (randomPlayer.length > 0) {
        enemies.push({
          ...randomPlayer[0],
          enhancement_level: 0,
          hard_enhancement_level: 0,
          position_order: enemies.length + 1
        });
      }
    }

    // Get user deck
    const [userDeck]: any = await connection.query(`
      SELECT
        d.*,
        p1.id as top_player_id, p1.name as top_name, p1.overall as top_overall, p1.position as top_position,
        p1.tier as top_tier, p1.team as top_team, p1.region as top_region,
        uc1.level as top_level,

        p2.id as jungle_player_id, p2.name as jungle_name, p2.overall as jungle_overall, p2.position as jungle_position,
        p2.tier as jungle_tier, p2.team as jungle_team, p2.region as jungle_region,
        uc2.level as jungle_level,

        p3.id as mid_player_id, p3.name as mid_name, p3.overall as mid_overall, p3.position as mid_position,
        p3.tier as mid_tier, p3.team as mid_team, p3.region as mid_region,
        uc3.level as mid_level,

        p4.id as adc_player_id, p4.name as adc_name, p4.overall as adc_overall, p4.position as adc_position,
        p4.tier as adc_tier, p4.team as adc_team, p4.region as adc_region,
        uc4.level as adc_level,

        p5.id as support_player_id, p5.name as support_name, p5.overall as support_overall, p5.position as support_position,
        p5.tier as support_tier, p5.team as support_team, p5.region as support_region,
        uc5.level as support_level
      FROM decks d
      LEFT JOIN user_cards uc1 ON d.top_card_id = uc1.id
      LEFT JOIN players p1 ON uc1.player_id = p1.id
      LEFT JOIN user_cards uc2 ON d.jungle_card_id = uc2.id
      LEFT JOIN players p2 ON uc2.player_id = p2.id
      LEFT JOIN user_cards uc3 ON d.mid_card_id = uc3.id
      LEFT JOIN players p3 ON uc3.player_id = p3.id
      LEFT JOIN user_cards uc4 ON d.adc_card_id = uc4.id
      LEFT JOIN players p4 ON uc4.player_id = p4.id
      LEFT JOIN user_cards uc5 ON d.support_card_id = uc5.id
      LEFT JOIN players p5 ON uc5.player_id = p5.id
      WHERE d.id = ? AND d.user_id = ?
    `, [userDeckId, userId]);

    if (userDeck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '덱을 찾을 수 없습니다.' });
    }

    await connection.commit();

    // Return battle data (frontend will simulate)
    res.json({
      success: true,
      data: {
        stage,
        enemies: enemies.map((e: any) => ({
          name: e.name,
          team: e.team,
          position: e.position,
          overall: e.overall,
          region: e.region,
          tier: e.tier,
          season: e.season,
          level: isHardMode ? e.hard_enhancement_level : e.enhancement_level
        })),
        userDeck: userDeck[0],
        isHardMode
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Start VS battle error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Complete VS battle
router.post('/battle/:stageNumber/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const stageNumber = parseInt(req.params.stageNumber);
    const { isHardMode, isVictory } = req.body;

    if (!isVictory) {
      await connection.rollback();
      return res.json({ success: true, message: '패배했습니다. 다시 도전하세요!' });
    }

    // Get stage info
    const [stages]: any = await connection.query(
      'SELECT * FROM vs_stages WHERE stage_number = ?',
      [stageNumber]
    );

    const stage = stages[0];
    const rewardPoints = isHardMode
      ? stage.reward_points * stage.hard_mode_multiplier
      : stage.reward_points;

    // Update user progress
    let [progress]: any = await connection.query(
      'SELECT * FROM user_vs_progress WHERE user_id = ?',
      [userId]
    );

    progress = progress[0];
    let stagesCleared = JSON.parse(progress.stages_cleared || '[]');
    let hardStagesCleared = JSON.parse(progress.hard_stages_cleared || '[]');

    // Check if already cleared
    const alreadyCleared = isHardMode
      ? hardStagesCleared.includes(stageNumber)
      : stagesCleared.includes(stageNumber);

    let actualRewardPoints = 0;

    if (!alreadyCleared) {
      // First time clear - give full reward
      actualRewardPoints = rewardPoints;

      if (isHardMode) {
        hardStagesCleared.push(stageNumber);
      } else {
        stagesCleared.push(stageNumber);

        // Check if all stages cleared (unlock hard mode) - 10단계 올클시 해금
        if (stagesCleared.length === 10 && !progress.hard_mode_unlocked) {
          await connection.query(
            'UPDATE user_vs_progress SET hard_mode_unlocked = TRUE WHERE user_id = ?',
            [userId]
          );
        }
      }

      // Update progress
      await connection.query(
        `UPDATE user_vs_progress
         SET stages_cleared = ?,
             hard_stages_cleared = ?,
             total_points_earned = total_points_earned + ?,
             last_played_at = NOW()
         WHERE user_id = ?`,
        [JSON.stringify(stagesCleared), JSON.stringify(hardStagesCleared), actualRewardPoints, userId]
      );

      // Award points
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [actualRewardPoints, userId]
      );
    } else {
      // Already cleared - no reward, just update last_played_at
      await connection.query(
        `UPDATE user_vs_progress
         SET last_played_at = NOW()
         WHERE user_id = ?`,
        [userId]
      );
    }

    // Check if stage 50 hard mode cleared (give ICON pack)
    let legendaryPackAwarded = false;
    let awardedPlayer = null;

    if (isHardMode && stageNumber === 50 && !alreadyCleared) {
      // Award ICON pack - give a random ICON player
      const [iconPlayers]: any = await connection.query(
        "SELECT * FROM players WHERE tier = 'ICON' ORDER BY RAND() LIMIT 1"
      );

      if (iconPlayers.length > 0) {
        const iconPlayer = iconPlayers[0];

        // Add ICON card to user
        await connection.query(
          'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
          [userId, iconPlayer.id]
        );

        // Record in gacha history
        await connection.query(
          'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, 0, FALSE, 0)',
          [userId, iconPlayer.id]
        );

        legendaryPackAwarded = true;
        awardedPlayer = {
          id: iconPlayer.id,
          name: iconPlayer.name,
          team: iconPlayer.team,
          position: iconPlayer.position,
          overall: iconPlayer.overall,
          tier: iconPlayer.tier,
          season: iconPlayer.season
        };
      }
    }

    await connection.commit();

    // Add experience (비동기로 처리)
    const expGained = calculateExpReward('VS', isVictory);
    addExperience(userId, expGained).catch(err =>
      console.error('Exp update error:', err)
    );

    res.json({
      success: true,
      message: alreadyCleared ? '이미 클리어한 스테이지입니다!' : '승리했습니다!',
      data: {
        rewardPoints: actualRewardPoints,
        stagesCleared,
        hardStagesCleared,
        hardModeUnlocked: progress.hard_mode_unlocked || stagesCleared.length === 10,
        legendaryPackAwarded,
        awardedPlayer,
        alreadyCleared
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Complete VS battle error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
