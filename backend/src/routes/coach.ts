import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all coaches
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [coaches]: any = await pool.query(
      `SELECT * FROM coaches ORDER BY star_rating DESC, name ASC`
    );

    res.json({ success: true, data: coaches });
  } catch (error: any) {
    console.error('Get coaches error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user's owned coaches
router.get('/my-coaches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [userCoaches]: any = await pool.query(
      `SELECT
        uc.*,
        c.name,
        c.star_rating,
        c.buff_type,
        c.buff_value,
        c.buff_target,
        c.description,
        c.image_url,
        COALESCE(uc.current_buff_value, c.buff_value) as current_buff_value,
        COALESCE(uc.enhancement_level, 0) as enhancement_level
      FROM user_coaches uc
      JOIN coaches c ON uc.coach_id = c.id
      WHERE uc.user_id = ?
      ORDER BY c.star_rating DESC, c.name ASC`,
      [userId]
    );

    res.json({ success: true, data: userCoaches });
  } catch (error: any) {
    console.error('Get user coaches error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get active coach
router.get('/active', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [activeCoach]: any = await pool.query(
      `SELECT
        uc.*,
        c.name,
        c.star_rating,
        c.buff_type,
        c.buff_value,
        c.buff_target,
        c.description,
        c.image_url,
        COALESCE(uc.current_buff_value, c.buff_value) as current_buff_value,
        COALESCE(uc.enhancement_level, 0) as enhancement_level
      FROM user_coaches uc
      JOIN coaches c ON uc.coach_id = c.id
      WHERE uc.user_id = ? AND uc.is_active = TRUE
      LIMIT 1`,
      [userId]
    );

    res.json({
      success: true,
      data: activeCoach.length > 0 ? activeCoach[0] : null,
    });
  } catch (error: any) {
    console.error('Get active coach error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Activate a coach
router.post('/activate/:coachId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { coachId } = req.params;

    // Check if user owns this coach
    const [ownership]: any = await connection.query(
      'SELECT id FROM user_coaches WHERE user_id = ? AND coach_id = ?',
      [userId, coachId]
    );

    if (ownership.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '보유하지 않은 코치입니다.',
      });
    }

    // Deactivate all other coaches for this user
    await connection.query(
      'UPDATE user_coaches SET is_active = FALSE WHERE user_id = ?',
      [userId]
    );

    // Activate the selected coach
    await connection.query(
      'UPDATE user_coaches SET is_active = TRUE WHERE user_id = ? AND coach_id = ?',
      [userId, coachId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: '코치가 활성화되었습니다.',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Activate coach error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Deactivate current coach
router.post('/deactivate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    await pool.query(
      'UPDATE user_coaches SET is_active = FALSE WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '코치가 비활성화되었습니다.',
    });
  } catch (error: any) {
    console.error('Deactivate coach error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Enhance coach (코치 강화)
router.post('/enhance/:coachId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const userCoachId = parseInt(req.params.coachId);
    const { materialCoachIds } = req.body; // 재료로 사용할 코치들

    const MAX_ENHANCEMENT_LEVEL = 10;

    if (!materialCoachIds || !Array.isArray(materialCoachIds) || materialCoachIds.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '재료 코치를 선택해주세요.',
      });
    }

    // 대상 코치 확인
    const [targetCoaches]: any = await connection.query(
      `SELECT uc.*, c.name, c.star_rating, c.buff_type, c.buff_value, c.buff_target,
              COALESCE(uc.current_buff_value, c.buff_value) as current_buff,
              COALESCE(uc.enhancement_level, 0) as enhancement_level
       FROM user_coaches uc
       JOIN coaches c ON uc.coach_id = c.id
       WHERE uc.id = ? AND uc.user_id = ?`,
      [userCoachId, userId]
    );

    if (targetCoaches.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '코치를 찾을 수 없습니다.',
      });
    }

    const targetCoach = targetCoaches[0];

    // 최대 강화 레벨 체크
    if (targetCoach.enhancement_level >= MAX_ENHANCEMENT_LEVEL) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `코치가 이미 최대 강화 레벨입니다. (${MAX_ENHANCEMENT_LEVEL})`,
      });
    }

    // 재료 코치들 확인
    const [materialCoaches]: any = await connection.query(
      `SELECT uc.*, c.star_rating
       FROM user_coaches uc
       JOIN coaches c ON uc.coach_id = c.id
       WHERE uc.id IN (?) AND uc.user_id = ?`,
      [materialCoachIds, userId]
    );

    if (materialCoaches.length !== materialCoachIds.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '일부 재료 코치를 찾을 수 없습니다.',
      });
    }

    // 활성화된 코치는 재료로 사용 불가
    const activeMaterial = materialCoaches.find((c: any) => c.is_active);
    if (activeMaterial) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '활성화된 코치는 재료로 사용할 수 없습니다.',
      });
    }

    // 강화 레벨 및 버프 값 증가 계산 (star_rating / 5로 줄임)
    const buffIncrease = materialCoaches.reduce((sum: number, c: any) => sum + Math.floor(c.star_rating / 5), 0);
    const newEnhancementLevel = Math.min(targetCoach.enhancement_level + materialCoaches.length, MAX_ENHANCEMENT_LEVEL);
    const newBuffValue = targetCoach.current_buff + buffIncrease;

    // 대상 코치의 강화 레벨 및 버프 값 업데이트
    await connection.query(
      `UPDATE user_coaches
       SET enhancement_level = ?, current_buff_value = ?
       WHERE id = ?`,
      [newEnhancementLevel, newBuffValue, userCoachId]
    );

    // 재료 코치들 삭제
    await connection.query(
      'DELETE FROM user_coaches WHERE id IN (?)',
      [materialCoachIds]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `코치가 강화되었습니다! 레벨 +${newEnhancementLevel - targetCoach.enhancement_level}, 버프 +${buffIncrease}`,
      data: {
        buffIncrease,
        oldBuffValue: targetCoach.current_buff,
        newBuffValue,
        oldEnhancementLevel: targetCoach.enhancement_level,
        newEnhancementLevel,
        maxLevel: MAX_ENHANCEMENT_LEVEL,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Coach enhance error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
