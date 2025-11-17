import pool from '../config/database';

type QuestType = 'NORMAL_MATCH' | 'RANKED_MATCH' | 'AI_MATCH';

export async function updateEventProgress(
  userId: number,
  questType: QuestType,
  increment: number = 1
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 유저 진행도 조회 또는 생성
    let [progress]: any = await connection.query(
      'SELECT * FROM user_event_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      // 진행도가 없으면 생성
      await connection.query(
        'INSERT INTO user_event_progress (user_id, total_mileage) VALUES (?, 0)',
        [userId]
      );

      [progress] = await connection.query(
        'SELECT * FROM user_event_progress WHERE user_id = ?',
        [userId]
      );
    }

    const userProgress = progress[0];

    // 날짜 확인 (하루가 지났으면 일일 퀘스트 초기화)
    const today = new Date().toISOString().split('T')[0];
    const lastQuestDate = userProgress.last_quest_date
      ? new Date(userProgress.last_quest_date).toISOString().split('T')[0]
      : null;

    let normalMatchToday = userProgress.normal_match_today;
    let rankedMatchToday = userProgress.ranked_match_today;
    let aiMatchToday = userProgress.ai_match_today;

    if (lastQuestDate !== today) {
      // 날짜가 바뀌었으면 초기화
      normalMatchToday = 0;
      rankedMatchToday = 0;
      aiMatchToday = 0;
    }

    // 퀘스트 타입에 따라 업데이트
    let mileageEarned = 0;
    let updateField = '';
    let newValue = 0;

    // 활성화된 퀘스트 조회
    const [quests]: any = await connection.query(
      `SELECT * FROM event_quests
       WHERE quest_type = ?
       AND is_active = TRUE
       AND CURDATE() BETWEEN start_date AND end_date`,
      [questType]
    );

    if (quests.length > 0) {
      const quest = quests[0];

      if (questType === 'NORMAL_MATCH') {
        updateField = 'normal_match_today';
        newValue = normalMatchToday + increment;

        // 퀘스트 완료 체크 (예: 3판)
        if (normalMatchToday < quest.requirement && newValue >= quest.requirement) {
          mileageEarned = quest.reward_mileage;
        }
      } else if (questType === 'RANKED_MATCH') {
        updateField = 'ranked_match_today';
        newValue = rankedMatchToday + increment;

        if (rankedMatchToday < quest.requirement && newValue >= quest.requirement) {
          mileageEarned = quest.reward_mileage;
        }
      } else if (questType === 'AI_MATCH') {
        updateField = 'ai_match_today';
        newValue = aiMatchToday + increment;

        if (aiMatchToday < quest.requirement && newValue >= quest.requirement) {
          mileageEarned = quest.reward_mileage;
        }
      }

      // 진행도 업데이트
      await connection.query(
        `UPDATE user_event_progress
         SET ${updateField} = ?,
             total_mileage = total_mileage + ?,
             last_quest_date = CURDATE()
         WHERE user_id = ?`,
        [newValue, mileageEarned, userId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Update event progress error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
