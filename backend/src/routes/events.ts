import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 해피아워 시간 체크 (오후 7시 ~ 8시)
function isHappyHour(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour === 19; // 오후 7시 (19:00 ~ 19:59)
}

// 핫타임 시간 체크 (오후 7시 30분)
function isHotTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour === 19 && minute === 30; // 오후 7시 30분 정각
}

// 해피아워 상태 조회
router.get('/happy-hour/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];

    const happyHour = isHappyHour();
    const hotTime = isHotTime();

    // 오늘 해피아워 참여 여부
    const [happyHourParticipation]: any = await pool.query(
      `SELECT * FROM happy_hour_participants
       WHERE user_id = ? AND event_date = ? AND event_type = 'HAPPY_HOUR'`,
      [userId, today]
    );

    // 오늘 핫타임 참여 여부
    const [hotTimeParticipation]: any = await pool.query(
      `SELECT * FROM happy_hour_participants
       WHERE user_id = ? AND event_date = ? AND event_type = 'HOT_TIME'`,
      [userId, today]
    );

    res.json({
      success: true,
      data: {
        happyHour: {
          isActive: happyHour,
          participated: happyHourParticipation.length > 0,
          multiplier: 2,
        },
        hotTime: {
          isActive: hotTime,
          participated: hotTimeParticipation.length > 0,
          reward: 1000,
        },
      },
    });
  } catch (error: any) {
    console.error('Get happy hour status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 핫타임 추첨 참여
router.post('/hot-time/participate', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // 핫타임 시간 체크
    if (!isHotTime()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '핫타임이 아닙니다. 오후 7시 30분에 참여 가능합니다.',
      });
    }

    // 이미 참여했는지 체크
    const [existing]: any = await connection.query(
      `SELECT * FROM happy_hour_participants
       WHERE user_id = ? AND event_date = ? AND event_type = 'HOT_TIME'`,
      [userId, today]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 오늘 핫타임에 참여하셨습니다.',
      });
    }

    // 추첨 (100% 당첨)
    const reward = 1000;

    // 포인트 지급
    await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [reward, userId]);

    // 참여 기록
    await connection.query(
      `INSERT INTO happy_hour_participants (user_id, event_date, event_type, points_earned)
       VALUES (?, ?, 'HOT_TIME', ?)`,
      [userId, today, reward]
    );

    await connection.commit();

    res.json({
      success: true,
      message: '핫타임 추첨에 당첨되었습니다!',
      data: {
        reward,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Hot time participate error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
