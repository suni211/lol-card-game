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
        c.image_url
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
        c.image_url
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

export default router;
