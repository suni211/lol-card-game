import pool from '../config/database';

type MissionType = 'ai_battle' | 'rank_match' | 'gacha';
type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export async function updateMissionProgress(
  userId: number,
  missionType: MissionType,
  increment: number = 1
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get all missions of this type
    const [missions]: any = await connection.query(
      'SELECT id, type, requirement FROM missions WHERE mission_type = ?',
      [missionType]
    );

    for (const mission of missions) {
      // Calculate expiry date based on mission type
      let expiresAt: Date;
      const now = new Date();

      if (mission.type === 'DAILY') {
        expiresAt = new Date(now);
        expiresAt.setHours(23, 59, 59, 999);
      } else if (mission.type === 'WEEKLY') {
        expiresAt = new Date(now);
        const daysUntilSunday = 7 - now.getDay();
        expiresAt.setDate(now.getDate() + daysUntilSunday);
        expiresAt.setHours(23, 59, 59, 999);
      } else {
        // MONTHLY
        expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Check if user has this mission
      const [existing]: any = await connection.query(
        'SELECT id, progress, is_completed FROM user_missions WHERE user_id = ? AND mission_id = ? AND expires_at > NOW()',
        [userId, mission.id]
      );

      if (existing.length > 0) {
        // Update existing mission
        const userMission = existing[0];

        if (!userMission.is_completed) {
          const newProgress = userMission.progress + increment;
          const isCompleted = newProgress >= mission.requirement;

          await connection.query(
            'UPDATE user_missions SET progress = ?, is_completed = ? WHERE id = ?',
            [newProgress, isCompleted, userMission.id]
          );
        }
      } else {
        // Create new user mission
        const isCompleted = increment >= mission.requirement;

        await connection.query(
          'INSERT INTO user_missions (user_id, mission_id, progress, is_completed, expires_at) VALUES (?, ?, ?, ?, ?)',
          [userId, mission.id, increment, isCompleted, expiresAt]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Update mission progress error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
