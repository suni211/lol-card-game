import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitPointUpdate } from '../server';

const router = express.Router();

// 마일리지 보상 설정
const MILEAGE_REWARDS = [
  { milestone: 300, points: 500, pack: null },
  { milestone: 600, points: 1000, pack: null },
  { milestone: 900, points: 2000, pack: null },
  { milestone: 1200, points: 3000, pack: null },
  { milestone: 1500, points: 4000, pack: null },
  { milestone: 1800, points: 6000, pack: null },
  { milestone: 2100, points: 10000, pack: null },
  { milestone: 3000, points: 20000, pack: 'LEGENDARY' }, // 오버롤 100이상 팩
  { milestone: 4000, points: 50000, pack: 'LEGENDARY' }, // 오버롤 100이상 팩
  { milestone: 5600, points: 100000, pack: 'ICON' }, // 아이콘 팩 확정
];

// 마일리지 현황 조회
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // 가차 히스토리에서 유료 뽑기 횟수 계산 (cost > 0인 것만)
    const [gachaCount]: any = await pool.query(
      `SELECT COUNT(*) as total_draws
       FROM gacha_history
       WHERE user_id = ? AND cost > 0`,
      [userId]
    );

    const currentMileage = gachaCount[0].total_draws;

    // 받을 수 있는 보상 확인
    const [claimed]: any = await pool.query(
      'SELECT milestone FROM gacha_mileage_claims WHERE user_id = ?',
      [userId]
    );

    const claimedMilestones = claimed.map((c: any) => c.milestone);
    const availableRewards = MILEAGE_REWARDS.filter(
      r => r.milestone <= currentMileage && !claimedMilestones.includes(r.milestone)
    );

    res.json({
      success: true,
      data: {
        currentMileage,
        availableRewards,
        allRewards: MILEAGE_REWARDS,
        claimedMilestones,
      },
    });
  } catch (error: any) {
    console.error('Get mileage status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 마일리지 보상 수령
router.post('/claim/:milestone', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const milestone = parseInt(req.params.milestone);

    // 해당 마일스톤 보상 확인
    const reward = MILEAGE_REWARDS.find(r => r.milestone === milestone);
    if (!reward) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid milestone' });
    }

    // 가차 히스토리에서 유료 뽑기 횟수 계산
    const [gachaCount]: any = await connection.query(
      `SELECT COUNT(*) as total_draws
       FROM gacha_history
       WHERE user_id = ? AND cost > 0`,
      [userId]
    );

    const currentMileage = gachaCount[0].total_draws;

    if (currentMileage < milestone) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient mileage' });
    }

    // 이미 받았는지 확인
    const [claimed]: any = await connection.query(
      'SELECT id FROM gacha_mileage_claims WHERE user_id = ? AND milestone = ?',
      [userId, milestone]
    );

    if (claimed.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // 포인트 지급
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [reward.points, userId]
    );

    // 팩 지급 (있는 경우)
    if (reward.pack) {
      await connection.query(
        `INSERT INTO user_packs (user_id, pack_type, quantity)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
        [userId, reward.pack]
      );
    }

    // 수령 기록
    await connection.query(
      'INSERT INTO gacha_mileage_claims (user_id, milestone, reward_type, reward_value) VALUES (?, ?, ?, ?)',
      [userId, milestone, reward.pack ? 'PACK' : 'POINTS', reward.points]
    );

    // 업데이트된 유저 정보 가져오기
    const [updatedUser]: any = await connection.query(
      'SELECT points, level, exp FROM users WHERE id = ?',
      [userId]
    );

    await connection.commit();

    // 실시간 포인트 업데이트
    if (updatedUser.length > 0) {
      emitPointUpdate(userId, updatedUser[0].points, updatedUser[0].level, updatedUser[0].exp);
    }

    res.json({
      success: true,
      data: {
        milestone,
        pointsReceived: reward.points,
        packReceived: reward.pack,
      },
      message: reward.pack
        ? `${reward.points.toLocaleString()}P와 ${reward.pack} 팩을 받았습니다!`
        : `${reward.points.toLocaleString()}P를 받았습니다!`,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim mileage reward error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 마일리지 리셋 (관리자 전용)
router.post('/reset', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // 관리자 확인
    const [users]: any = await connection.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // 전체 유저 마일리지 리셋 (gacha_history 삭제 + 수령 기록 삭제)
    await connection.query('DELETE FROM gacha_history WHERE cost > 0');
    await connection.query('DELETE FROM gacha_mileage_claims');

    await connection.commit();

    res.json({
      success: true,
      message: '모든 유저의 마일리지가 리셋되었습니다',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Reset mileage error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
