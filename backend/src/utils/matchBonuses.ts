import pool from '../config/database';

/**
 * 매치 보너스 체크 및 지급
 * @param userId - 유저 ID
 * @param matchId - 매치 ID (optional)
 * @param player1Score - 플레이어1 스코어
 * @param player2Score - 플레이어2 스코어
 * @param isPlayer1 - 현재 유저가 플레이어1인지
 * @param wonMatch - 승리 여부
 */
export async function checkAndAwardMatchBonuses(
  userId: number,
  matchId: number | null,
  player1Score: number,
  player2Score: number,
  isPlayer1: boolean,
  wonMatch: boolean
): Promise<{ bonuses: any[]; totalBonus: number }> {
  const connection = await pool.getConnection();
  const bonuses: any[] = [];
  let totalBonus = 0;

  try {
    await connection.beginTransaction();

    if (!wonMatch) {
      await connection.commit();
      return { bonuses, totalBonus };
    }

    const userScore = isPlayer1 ? player1Score : player2Score;
    const opponentScore = isPlayer1 ? player2Score : player1Score;

    // 퍼펙트 게임 (3:0 승리)
    if (userScore === 3 && opponentScore === 0) {
      const perfectBonus = 200;
      totalBonus += perfectBonus;

      await connection.query(
        `INSERT INTO match_bonuses (user_id, match_id, bonus_type, bonus_points)
         VALUES (?, ?, 'PERFECT', ?)`,
        [userId, matchId, perfectBonus]
      );

      bonuses.push({
        type: 'PERFECT',
        name: '퍼펙트 게임',
        points: perfectBonus,
        description: '3:0 완벽한 승리!',
      });
    }

    // 역전승 (0:2 → 3:2)
    if (userScore === 3 && opponentScore === 2) {
      // 실제로 0:2에서 역전했는지는 round history가 필요하지만
      // 간단하게 3:2 승리는 역전승으로 간주
      const comebackBonus = 300;
      totalBonus += comebackBonus;

      await connection.query(
        `INSERT INTO match_bonuses (user_id, match_id, bonus_type, bonus_points)
         VALUES (?, ?, 'COMEBACK', ?)`,
        [userId, matchId, comebackBonus]
      );

      bonuses.push({
        type: 'COMEBACK',
        name: '역전승',
        points: comebackBonus,
        description: '극적인 3:2 역전승!',
      });
    }

    // 연승 체크
    const [stats]: any = await connection.query(
      'SELECT current_streak FROM user_stats WHERE user_id = ?',
      [userId]
    );

    if (stats.length > 0) {
      const streak = stats[0].current_streak || 0;

      // 3연승
      if (streak === 3) {
        const streakBonus = 150;
        totalBonus += streakBonus;

        await connection.query(
          `INSERT INTO match_bonuses (user_id, match_id, bonus_type, bonus_points, streak_count)
           VALUES (?, ?, 'STREAK_3', ?, 3)`,
          [userId, matchId, streakBonus]
        );

        bonuses.push({
          type: 'STREAK_3',
          name: '3연승',
          points: streakBonus,
          description: '3연승 달성!',
        });
      }

      // 5연승
      if (streak === 5) {
        const streakBonus = 300;
        totalBonus += streakBonus;

        await connection.query(
          `INSERT INTO match_bonuses (user_id, match_id, bonus_type, bonus_points, streak_count)
           VALUES (?, ?, 'STREAK_5', ?, 5)`,
          [userId, matchId, streakBonus]
        );

        bonuses.push({
          type: 'STREAK_5',
          name: '5연승',
          points: streakBonus,
          description: '5연승 달성!',
        });
      }

      // 10연승
      if (streak === 10) {
        const streakBonus = 1000;
        totalBonus += streakBonus;

        await connection.query(
          `INSERT INTO match_bonuses (user_id, match_id, bonus_type, bonus_points, streak_count)
           VALUES (?, ?, 'STREAK_10', ?, 10)`,
          [userId, matchId, streakBonus]
        );

        bonuses.push({
          type: 'STREAK_10',
          name: '10연승',
          points: streakBonus,
          description: '10연승 달성! 대단합니다!',
        });
      }
    }

    // 보너스 포인트 지급
    if (totalBonus > 0) {
      await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [totalBonus, userId]);
    }

    await connection.commit();

    return { bonuses, totalBonus };
  } catch (error) {
    await connection.rollback();
    console.error('Match bonus error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 해피아워 배수 적용
 */
export function applyHappyHourMultiplier(points: number): number {
  const now = new Date();
  const hour = now.getHours();

  // 오후 7시 (19:00 ~ 19:59)
  if (hour === 19) {
    return points * 2;
  }

  return points;
}
