import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 전략 사용 통계 조회
router.get('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 현재 활성 덱들의 전략 사용 통계
    const [laningStats]: any = await pool.query(`
      SELECT
        laning_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE
      GROUP BY laning_strategy
      ORDER BY usage_count DESC
    `);

    const [teamfightStats]: any = await pool.query(`
      SELECT
        teamfight_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE
      GROUP BY teamfight_strategy
      ORDER BY usage_count DESC
    `);

    const [macroStats]: any = await pool.query(`
      SELECT
        macro_strategy as strategy,
        COUNT(*) as usage_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM decks WHERE is_active = TRUE), 2) as usage_percentage
      FROM decks
      WHERE is_active = TRUE
      GROUP BY macro_strategy
      ORDER BY usage_count DESC
    `);

    // 전략별 밸런스 수치 조회
    const [balanceData]: any = await pool.query(`
      SELECT strategy_type, strategy_name, balance_modifier, usage_count, win_rate
      FROM strategy_balance
      ORDER BY strategy_type, strategy_name
    `);

    res.json({
      success: true,
      data: {
        laning: laningStats,
        teamfight: teamfightStats,
        macro: macroStats,
        balance: balanceData,
      },
    });
  } catch (error: any) {
    console.error('Get strategy usage error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
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

export default router;
