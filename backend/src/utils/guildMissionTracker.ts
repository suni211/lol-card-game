import pool from '../config/database';

type GuildMissionType = 'WIN' | 'MATCH' | 'PERFECT' | 'COMEBACK' | 'STREAK' | 'AI' | 'VS' | 'TOTAL_DAMAGE' | 'COLLECT';

/**
 * 길드 미션 진행도 업데이트 (실시간)
 */
export async function updateGuildMissionProgress(
  userId: number,
  missionType: GuildMissionType,
  increment: number = 1
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 유저의 길드 ID 조회
    const [users]: any = await connection.query(
      'SELECT guild_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].guild_id) {
      await connection.commit();
      return; // 길드에 소속되지 않았으면 무시
    }

    const guildId = users[0].guild_id;

    // 이번 주 시작일 계산
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // 해당 타입의 진행중인 주간 미션 조회
    const [missions]: any = await connection.query(
      `SELECT gwm.id, gwm.current_progress, gwm.is_completed, gmp.requirement
       FROM guild_weekly_missions gwm
       JOIN guild_mission_pool gmp ON gwm.mission_id = gmp.id
       WHERE gwm.guild_id = ?
       AND gwm.week_start = ?
       AND gwm.is_completed = FALSE
       AND gmp.mission_type = ?`,
      [guildId, weekStartStr, missionType]
    );

    // 각 미션 업데이트
    for (const mission of missions) {
      const newProgress = mission.current_progress + increment;
      const isCompleted = newProgress >= mission.requirement;

      await connection.query(
        `UPDATE guild_weekly_missions
         SET current_progress = ?,
             is_completed = ?,
             completed_at = ?
         WHERE id = ?`,
        [
          newProgress,
          isCompleted,
          isCompleted ? new Date() : null,
          mission.id
        ]
      );

      // 완료 시 길드 포인트 추가
      if (isCompleted) {
        const [missionInfo]: any = await connection.query(
          'SELECT reward_points FROM guild_mission_pool WHERE id = (SELECT mission_id FROM guild_weekly_missions WHERE id = ?)',
          [mission.id]
        );

        if (missionInfo.length > 0) {
          await connection.query(
            'UPDATE guilds SET points = points + ? WHERE id = ?',
            [missionInfo[0].reward_points, guildId]
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Update guild mission progress error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 길드 미션 초기화 시 이미 완료한 업적 반영
 */
export async function syncCompletedMissions(guildId: number): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 이번 주 시작일 계산
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // 길드 멤버 목록 조회
    const [members]: any = await connection.query(
      'SELECT user_id FROM guild_members WHERE guild_id = ?',
      [guildId]
    );

    if (members.length === 0) {
      await connection.commit();
      return;
    }

    const memberIds = members.map((m: any) => m.user_id);

    // 현재 주간 미션 목록 조회
    const [missions]: any = await connection.query(
      `SELECT gwm.id, gmp.mission_type, gmp.requirement
       FROM guild_weekly_missions gwm
       JOIN guild_mission_pool gmp ON gwm.mission_id = gmp.id
       WHERE gwm.guild_id = ? AND gwm.week_start = ?`,
      [guildId, weekStartStr]
    );

    // 각 미션 타입별로 이번 주 완료한 업적 카운트
    for (const mission of missions) {
      let count = 0;

      switch (mission.mission_type) {
        case 'WIN':
          // 이번 주 총 승수 (모든 모드)
          const [winStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM user_stats_history
             WHERE user_id IN (?)
             AND result = 'WIN'
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = winStats[0]?.total || 0;
          break;

        case 'MATCH':
          // 이번 주 총 경기 수
          const [matchStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM user_stats_history
             WHERE user_id IN (?)
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = matchStats[0]?.total || 0;
          break;

        case 'PERFECT':
          // 이번 주 3:0 승리 (match_bonuses 테이블)
          const [perfectStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM match_bonuses
             WHERE user_id IN (?)
             AND bonus_type = 'PERFECT'
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = perfectStats[0]?.total || 0;
          break;

        case 'COMEBACK':
          // 이번 주 역전승
          const [comebackStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM match_bonuses
             WHERE user_id IN (?)
             AND bonus_type = 'COMEBACK'
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = comebackStats[0]?.total || 0;
          break;

        case 'STREAK':
          // 이번 주 연승 횟수 (3연승 이상)
          const [streakStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM match_bonuses
             WHERE user_id IN (?)
             AND bonus_type IN ('STREAK_3', 'STREAK_5', 'STREAK_10')
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = streakStats[0]?.total || 0;
          break;

        case 'AI':
          // 이번 주 AI 배틀 승수
          const [aiStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM user_stats_history
             WHERE user_id IN (?)
             AND battle_type = 'AI'
             AND result = 'WIN'
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = aiStats[0]?.total || 0;
          break;

        case 'VS':
          // 이번 주 VS 모드 클리어
          const [vsStats]: any = await connection.query(
            `SELECT COUNT(*) as total
             FROM user_stats_history
             WHERE user_id IN (?)
             AND battle_type = 'VSMODE'
             AND result = 'WIN'
             AND created_at >= ?`,
            [memberIds, weekStartStr]
          );
          count = vsStats[0]?.total || 0;
          break;
      }

      // 미션 진행도 업데이트
      if (count > 0) {
        const isCompleted = count >= mission.requirement;
        await connection.query(
          `UPDATE guild_weekly_missions
           SET current_progress = ?,
               is_completed = ?,
               completed_at = ?
           WHERE id = ?`,
          [
            count,
            isCompleted,
            isCompleted ? new Date() : null,
            mission.id
          ]
        );

        // 완료 시 길드 포인트 추가
        if (isCompleted) {
          const [missionInfo]: any = await connection.query(
            'SELECT reward_points FROM guild_mission_pool WHERE id = (SELECT mission_id FROM guild_weekly_missions WHERE id = ?)',
            [mission.id]
          );

          if (missionInfo.length > 0) {
            await connection.query(
              'UPDATE guilds SET points = points + ? WHERE id = ?',
              [missionInfo[0].reward_points, guildId]
            );
          }
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Sync completed missions error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
