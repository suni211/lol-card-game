import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 확성기 구매
router.post('/megaphone/purchase', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { quantity = 1 } = req.body;

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({ error: '1~100개까지 구매 가능합니다' });
    }

    const totalCost = 1000 * quantity;

    // 유저 포인트 확인
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '유저를 찾을 수 없습니다' });
    }

    if (users[0].points < totalCost) {
      await connection.rollback();
      return res.status(400).json({ error: '포인트가 부족합니다' });
    }

    // 포인트 차감
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [totalCost, userId]
    );

    // 확성기 추가
    await connection.query(
      `INSERT INTO user_megaphones (user_id, count)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE count = count + ?`,
      [userId, quantity, quantity]
    );

    // 업데이트된 정보 조회
    const [updatedUser]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    const [megaphones]: any = await connection.query(
      'SELECT count FROM user_megaphones WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      points: updatedUser[0].points,
      megaphones: megaphones[0]?.count || 0,
      purchased: quantity
    });

  } catch (error) {
    await connection.rollback();
    console.error('확성기 구매 오류:', error);
    res.status(500).json({ error: '확성기 구매 중 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
});

// 확성기 개수 조회
router.get('/megaphone', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [megaphones]: any = await pool.query(
      'SELECT count FROM user_megaphones WHERE user_id = ?',
      [userId]
    );

    res.json({
      count: megaphones[0]?.count || 0
    });

  } catch (error) {
    console.error('확성기 조회 오류:', error);
    res.status(500).json({ error: '확성기 조회 중 오류가 발생했습니다' });
  }
});

// 전체 메시지 전송
router.post('/megaphone/broadcast', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    if (message.length > 200) {
      return res.status(400).json({ error: '메시지는 200자 이하로 입력해주세요' });
    }

    // 확성기 개수 확인
    const [megaphones]: any = await connection.query(
      'SELECT count FROM user_megaphones WHERE user_id = ?',
      [userId]
    );

    if (!megaphones[0] || megaphones[0].count < 1) {
      await connection.rollback();
      return res.status(400).json({ error: '확성기가 부족합니다' });
    }

    // 유저명 조회
    const [users]: any = await connection.query(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );

    // 확성기 차감
    await connection.query(
      'UPDATE user_megaphones SET count = count - 1 WHERE user_id = ?',
      [userId]
    );

    // 메시지 저장 (30분 동안 유지)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await connection.query(
      'INSERT INTO global_messages (user_id, username, message, expires_at) VALUES (?, ?, ?, ?)',
      [userId, users[0].username, message.trim(), expiresAt]
    );

    // 업데이트된 확성기 개수
    const [updatedMegaphones]: any = await connection.query(
      'SELECT count FROM user_megaphones WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      megaphones: updatedMegaphones[0]?.count || 0
    });

  } catch (error) {
    await connection.rollback();
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
});

// 전체 메시지 조회 (최근 50개, 만료되지 않은 것만)
router.get('/megaphone/messages', async (req, res) => {
  try {
    const [messages]: any = await pool.query(
      `SELECT id, username, message, created_at
       FROM global_messages
       WHERE expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 50`
    );

    res.json(messages);

  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다' });
  }
});

export default router;
