import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 전략 사용 통계 조회
router.get('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('Fetching strategy usage stats...');

    // 현재 활성 덱들의 전략 사용 통계
    const [laningStats]: any = await pool.query(`
      SELECT
        laning_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 0), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE AND laning_strategy IS NOT NULL
      GROUP BY laning_strategy
      ORDER BY usage_count DESC
    `);

    const [teamfightStats]: any = await pool.query(`
      SELECT
        teamfight_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 0), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE AND teamfight_strategy IS NOT NULL
      GROUP BY teamfight_strategy
      ORDER BY usage_count DESC
    `);

    const [macroStats]: any = await pool.query(`
      SELECT
        macro_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 0), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE AND macro_strategy IS NOT NULL
      GROUP BY macro_strategy
      ORDER BY usage_count DESC
    `);

    console.log('Laning stats:', laningStats.length);
    console.log('Teamfight stats:', teamfightStats.length);
    console.log('Macro stats:', macroStats.length);

    // 전략별 밸런스 수치 조회
    const [balanceData]: any = await pool.query(`
      SELECT strategy_type, strategy_name, balance_modifier, usage_count, win_rate
      FROM strategy_balance
      ORDER BY strategy_type, strategy_name
    `);

    console.log('Balance data:', balanceData.length);

    res.json({
      success: true,
      data: {
        laning: laningStats || [],
        teamfight: teamfightStats || [],
        macro: macroStats || [],
        balance: balanceData || [],
      },
    });
  } catch (error: any) {
    console.error('Get strategy usage error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// 전략 밸런스 자동 조정 (관리자 또는 Cron Job)
router.post('/auto-balance', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 사용자 권한 확인 (관리자만)
    if (!req.user?.isAdmin) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    // 각 전략 타입별로 밸런싱
    const strategyTypes = ['LANING', 'TEAMFIGHT', 'MACRO'];
    const balanceChanges: any[] = [];

    for (const strategyType of strategyTypes) {
      let columnName = '';
      if (strategyType === 'LANING') columnName = 'laning_strategy';
      else if (strategyType === 'TEAMFIGHT') columnName = 'teamfight_strategy';
      else columnName = 'macro_strategy';

      // 전략별 사용률 및 승률 계산
      const [stats]: any = await connection.query(`
        SELECT
          d.${columnName} as strategy,
          COUNT(*) as usage_count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 2) as usage_percentage,
          COALESCE(
            (SELECT COUNT(*)
             FROM matches m
             JOIN decks d2 ON (m.player1_deck_id = d2.id OR m.player2_deck_id = d2.id)
             WHERE d2.${columnName} = d.${columnName}
             AND ((m.player1_deck_id = d2.id AND m.winner_id = m.player1_id)
                  OR (m.player2_deck_id = d2.id AND m.winner_id = m.player2_id))
            ) * 100.0 / NULLIF(
              (SELECT COUNT(*)
               FROM matches m
               JOIN decks d2 ON (m.player1_deck_id = d2.id OR m.player2_deck_id = d2.id)
               WHERE d2.${columnName} = d.${columnName}
              ), 0
            ), 50.00
          ) as win_rate
        FROM decks d
        WHERE d.is_active = TRUE
        GROUP BY d.${columnName}
      `);

      // 평균 사용률 계산
      const totalStrategies = stats.length;
      const avgUsagePercentage = 100 / totalStrategies;

      for (const stat of stats) {
        const strategy = stat.strategy;
        const usagePercentage = parseFloat(stat.usage_percentage);
        const winRate = parseFloat(stat.win_rate);

        // 현재 밸런스 수치 조회
        const [currentBalance]: any = await connection.query(
          'SELECT balance_modifier FROM strategy_balance WHERE strategy_type = ? AND strategy_name = ?',
          [strategyType, strategy]
        );

        let oldModifier = 1.000;
        if (currentBalance.length > 0) {
          oldModifier = parseFloat(currentBalance[0].balance_modifier);
        }

        let newModifier = oldModifier;

        // 밸런싱 로직
        // 사용률이 평균보다 20% 이상 높고 승률도 55% 이상이면 너프
        if (usagePercentage > avgUsagePercentage * 1.2 && winRate > 55) {
          newModifier = Math.max(0.850, oldModifier - 0.050); // 5% 너프, 최소 85%
          balanceChanges.push({
            type: strategyType,
            strategy,
            change: 'NERF',
            reason: `High usage (${usagePercentage.toFixed(1)}%) and win rate (${winRate.toFixed(1)}%)`,
          });
        }
        // 사용률이 평균보다 50% 이상 낮고 승률도 45% 이하면 버프
        else if (usagePercentage < avgUsagePercentage * 0.5 && winRate < 45) {
          newModifier = Math.min(1.150, oldModifier + 0.050); // 5% 버프, 최대 115%
          balanceChanges.push({
            type: strategyType,
            strategy,
            change: 'BUFF',
            reason: `Low usage (${usagePercentage.toFixed(1)}%) and win rate (${winRate.toFixed(1)}%)`,
          });
        }
        // 균형 잡혀있으면 서서히 1.000으로 회귀
        else if (oldModifier !== 1.000) {
          if (oldModifier > 1.000) {
            newModifier = Math.max(1.000, oldModifier - 0.025);
          } else {
            newModifier = Math.min(1.000, oldModifier + 0.025);
          }
          balanceChanges.push({
            type: strategyType,
            strategy,
            change: 'NORMALIZE',
            reason: `Balanced usage (${usagePercentage.toFixed(1)}%) and win rate (${winRate.toFixed(1)}%)`,
          });
        }

        // 밸런스 수치 업데이트
        if (newModifier !== oldModifier) {
          await connection.query(
            `INSERT INTO strategy_balance (strategy_type, strategy_name, balance_modifier, usage_count, win_rate, last_balanced_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               balance_modifier = ?,
               usage_count = ?,
               win_rate = ?,
               last_balanced_at = NOW()`,
            [strategyType, strategy, newModifier, stat.usage_count, winRate, newModifier, stat.usage_count, winRate]
          );

          // 히스토리 기록
          await connection.query(
            `INSERT INTO strategy_balance_history (strategy_type, strategy_name, old_modifier, new_modifier, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [strategyType, strategy, oldModifier, newModifier, balanceChanges[balanceChanges.length - 1].reason]
          );
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        message: 'Strategy balance updated',
        changes: balanceChanges,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Auto balance error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 밸런스 히스토리 조회
router.get('/balance-history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [history]: any = await pool.query(`
      SELECT *
      FROM strategy_balance_history
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Get balance history error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 선수 검색 (이름으로)
router.get('/search-players', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.status(400).json({ success: false, error: '최소 2글자 이상 입력하세요' });
    }

    const [players]: any = await pool.query(`
      SELECT
        id,
        name,
        team,
        position,
        overall,
        region,
        CASE
          WHEN name LIKE 'ICON%' THEN 'ICON'
          WHEN overall <= 80 THEN 'COMMON'
          WHEN overall <= 90 THEN 'RARE'
          WHEN overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        season,
        cs_ability,
        lane_pressure,
        damage_dealing,
        survivability,
        objective_control,
        vision_control,
        decision_making,
        consistency,
        trait1
      FROM players
      WHERE name LIKE ?
      ORDER BY overall DESC
      LIMIT 20
    `, [`%${query}%`]);

    res.json({ success: true, data: players });
  } catch (error: any) {
    console.error('Search players error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 선수 비교
router.post('/compare-players', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { player1Id, player2Id, player1Level, player2Level } = req.body;

    if (!player1Id || !player2Id) {
      return res.status(400).json({ success: false, error: 'Player IDs required' });
    }

    const level1 = player1Level || 0;
    const level2 = player2Level || 0;

    // Get player 1 data with traits
    const [player1Data]: any = await pool.query(`
      SELECT p.*
      FROM players p
      WHERE p.id = ?
    `, [player1Id]);

    // Get player 2 data with traits
    const [player2Data]: any = await pool.query(`
      SELECT p.*
      FROM players p
      WHERE p.id = ?
    `, [player2Id]);

    if (player1Data.length === 0 || player2Data.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const player1 = player1Data[0];
    const player2 = player2Data[0];

    // Parse traits from trait1 column
    const parseTraits = (trait1: string | null, position: string) => {
      if (!trait1) return [];

      // Map trait names to their effects
      const traitEffects: any = {
        '중국 최고 정글': {
          name: '중국 최고 정글',
          description: 'Mlxg의 야생적인 정글 플레이',
          effect: position === 'JUNGLE' ? '+3 오버롤' : '효과 없음 (정글 전용)'
        },
        '무작위 한타': {
          name: '무작위 한타',
          description: 'Mystic의 예측 불가능한 한타 운영',
          effect: '+3 오버롤'
        },
        '뚫고 지나가.': {
          name: '뚫고 지나가.',
          description: 'Ambition의 뛰어난 매크로와 결정력',
          effect: '+3 오버롤'
        },
        '나도 최강이야.': {
          name: '나도 최강이야.',
          description: 'Crown의 압도적인 미드 라이너 실력',
          effect: position === 'MID' ? '+5 오버롤' : '효과 없음 (미드 전용)'
        }
      };

      return traitEffects[trait1] ? [traitEffects[trait1]] : [];
    };

    player1.traits = parseTraits(player1.trait1, player1.position);
    player2.traits = parseTraits(player2.trait1, player2.position);

    // Calculate enhanced stats
    const calculateEnhancedStats = (player: any, level: number) => {
      const baseOverall = player.overall;
      const enhancedOverall = baseOverall + level;

      // Each stat increases proportionally with level
      const statMultiplier = 1 + (level * 0.01); // 1% per level

      return {
        ...player,
        level,
        baseOverall,
        enhancedOverall,
        baseCsAbility: player.cs_ability || 50,
        enhancedCsAbility: Math.round((player.cs_ability || 50) * statMultiplier),
        baseLanePressure: player.lane_pressure || 50,
        enhancedLanePressure: Math.round((player.lane_pressure || 50) * statMultiplier),
        baseDamageDealing: player.damage_dealing || 50,
        enhancedDamageDealing: Math.round((player.damage_dealing || 50) * statMultiplier),
        baseSurvivability: player.survivability || 50,
        enhancedSurvivability: Math.round((player.survivability || 50) * statMultiplier),
        baseObjectiveControl: player.objective_control || 50,
        enhancedObjectiveControl: Math.round((player.objective_control || 50) * statMultiplier),
        baseVisionControl: player.vision_control || 50,
        enhancedVisionControl: Math.round((player.vision_control || 50) * statMultiplier),
        baseDecisionMaking: player.decision_making || 50,
        enhancedDecisionMaking: Math.round((player.decision_making || 50) * statMultiplier),
        baseConsistency: player.consistency || 50,
        enhancedConsistency: Math.round((player.consistency || 50) * statMultiplier),
      };
    };

    const comparison = {
      player1: calculateEnhancedStats(player1, level1),
      player2: calculateEnhancedStats(player2, level2),
      differences: {
        overall: (player1.overall + level1) - (player2.overall + level2),
        csAbility: Math.round(((player1.cs_ability || 50) * (1 + level1 * 0.01)) - ((player2.cs_ability || 50) * (1 + level2 * 0.01))),
        lanePressure: Math.round(((player1.lane_pressure || 50) * (1 + level1 * 0.01)) - ((player2.lane_pressure || 50) * (1 + level2 * 0.01))),
        damageDealing: Math.round(((player1.damage_dealing || 50) * (1 + level1 * 0.01)) - ((player2.damage_dealing || 50) * (1 + level2 * 0.01))),
        survivability: Math.round(((player1.survivability || 50) * (1 + level1 * 0.01)) - ((player2.survivability || 50) * (1 + level2 * 0.01))),
        objectiveControl: Math.round(((player1.objective_control || 50) * (1 + level1 * 0.01)) - ((player2.objective_control || 50) * (1 + level2 * 0.01))),
        visionControl: Math.round(((player1.vision_control || 50) * (1 + level1 * 0.01)) - ((player2.vision_control || 50) * (1 + level2 * 0.01))),
        decisionMaking: Math.round(((player1.decision_making || 50) * (1 + level1 * 0.01)) - ((player2.decision_making || 50) * (1 + level2 * 0.01))),
        consistency: Math.round(((player1.consistency || 50) * (1 + level1 * 0.01)) - ((player2.consistency || 50) * (1 + level2 * 0.01))),
      }
    };

    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('Compare players error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 아이템 사용 통계 조회
router.get('/item-stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 전체 아이템 사용 통계
    const [overallStats]: any = await pool.query(`
      SELECT
        item_id,
        item_name,
        COUNT(*) as usage_count,
        SUM(gold_spent) as total_gold_spent,
        ROUND(AVG(gold_spent), 0) as avg_gold_spent,
        ROUND(SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate
      FROM moba_item_stats
      GROUP BY item_id, item_name
      ORDER BY usage_count DESC
      LIMIT 30
    `);

    // 포지션별 인기 아이템
    const [positionStats]: any = await pool.query(`
      SELECT
        player_position,
        item_id,
        item_name,
        COUNT(*) as usage_count,
        ROUND(SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate
      FROM moba_item_stats
      GROUP BY player_position, item_id, item_name
      ORDER BY player_position, usage_count DESC
    `);

    // 포지션별로 그룹화
    const positionItemStats: Record<string, any[]> = {};
    for (const stat of positionStats) {
      if (!positionItemStats[stat.player_position]) {
        positionItemStats[stat.player_position] = [];
      }
      if (positionItemStats[stat.player_position].length < 5) {
        positionItemStats[stat.player_position].push(stat);
      }
    }

    // 최근 7일간 아이템 트렌드
    const [recentTrends]: any = await pool.query(`
      SELECT
        item_id,
        item_name,
        COUNT(*) as usage_count,
        ROUND(SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate
      FROM moba_item_stats
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY item_id, item_name
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    // 총 골드 사용량 통계
    const [goldStats]: any = await pool.query(`
      SELECT
        COUNT(DISTINCT match_id) as total_matches,
        SUM(gold_spent) as total_gold_spent,
        ROUND(AVG(gold_spent), 0) as avg_gold_per_item
      FROM moba_item_stats
    `);

    // 티어별 아이템 사용 (비용 기준으로 티어 구분)
    const [tierStats]: any = await pool.query(`
      SELECT
        CASE
          WHEN gold_spent <= 500 THEN 'BASIC'
          WHEN gold_spent <= 1500 THEN 'TIER1'
          WHEN gold_spent <= 2500 THEN 'TIER2'
          ELSE 'TIER3'
        END as item_tier,
        COUNT(*) as usage_count,
        SUM(gold_spent) as total_gold
      FROM moba_item_stats
      GROUP BY item_tier
      ORDER BY total_gold DESC
    `);

    res.json({
      success: true,
      data: {
        overall: overallStats || [],
        byPosition: positionItemStats,
        recentTrends: recentTrends || [],
        goldStats: goldStats[0] || { total_matches: 0, total_gold_spent: 0, avg_gold_per_item: 0 },
        tierStats: tierStats || [],
      },
    });
  } catch (error: any) {
    console.error('Get item stats error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// 특정 아이템 상세 통계
router.get('/item-stats/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { itemId } = req.params;

    // 아이템 기본 통계
    const [basicStats]: any = await pool.query(`
      SELECT
        item_id,
        item_name,
        COUNT(*) as usage_count,
        SUM(gold_spent) as total_gold_spent,
        ROUND(SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate,
        SUM(CASE WHEN match_type = 'RANKED' THEN 1 ELSE 0 END) as ranked_usage,
        SUM(CASE WHEN match_type = 'NORMAL' THEN 1 ELSE 0 END) as normal_usage
      FROM moba_item_stats
      WHERE item_id = ?
      GROUP BY item_id, item_name
    `, [itemId]);

    // 포지션별 사용 통계
    const [positionUsage]: any = await pool.query(`
      SELECT
        player_position,
        COUNT(*) as usage_count,
        ROUND(SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate
      FROM moba_item_stats
      WHERE item_id = ?
      GROUP BY player_position
      ORDER BY usage_count DESC
    `, [itemId]);

    // 일별 사용 추이 (최근 14일)
    const [dailyTrend]: any = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as usage_count
      FROM moba_item_stats
      WHERE item_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [itemId]);

    if (basicStats.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found in stats' });
    }

    res.json({
      success: true,
      data: {
        basic: basicStats[0],
        byPosition: positionUsage,
        dailyTrend: dailyTrend,
      },
    });
  } catch (error: any) {
    console.error('Get item detail stats error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

export default router;
