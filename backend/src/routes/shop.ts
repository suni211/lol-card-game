import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

const router = express.Router();
let io: Server;

export const setSocketIOForShop = (socketIO: Server) => {
  io = socketIO;
};

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
    const [result]: any = await connection.query(
      'INSERT INTO global_messages (user_id, username, message, expires_at) VALUES (?, ?, ?, ?)',
      [userId, users[0].username, message.trim(), expiresAt]
    );

    // 업데이트된 확성기 개수
    const [updatedMegaphones]: any = await connection.query(
      'SELECT count FROM user_megaphones WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    // 모든 유저에게 실시간 전송
    const messageData = {
      id: result.insertId,
      username: users[0].username,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    if (io) {
      io.emit('global_message', messageData);
    }

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

// ==========================================
// POINT SHOP SYSTEM
// ==========================================

// Get all available shop items
router.get('/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [items]: any = await pool.query(`
      SELECT
        id,
        name,
        description,
        price,
        item_type,
        effect_type,
        effect_value,
        duration_minutes,
        stock_limit,
        is_active
      FROM shop_items
      WHERE is_active = TRUE
      ORDER BY price DESC
    `);

    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get shop items error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user's inventory
router.get('/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [inventory]: any = await pool.query(`
      SELECT
        ui.id,
        ui.quantity,
        ui.purchased_at,
        si.name,
        si.description,
        si.item_type,
        si.effect_type,
        si.effect_value,
        si.duration_minutes
      FROM user_items ui
      JOIN shop_items si ON ui.item_id = si.id
      WHERE ui.user_id = ? AND ui.quantity > 0
      ORDER BY ui.purchased_at DESC
    `, [userId]);

    res.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user's active effects
router.get('/active-effects', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [effects]: any = await pool.query(`
      SELECT
        iul.id,
        iul.used_at,
        iul.effect_expires_at,
        si.name,
        si.effect_type,
        si.effect_value,
        si.duration_minutes
      FROM item_usage_log iul
      JOIN shop_items si ON iul.item_id = si.id
      WHERE iul.user_id = ?
        AND iul.effect_expires_at > NOW()
      ORDER BY iul.effect_expires_at ASC
    `, [userId]);

    res.json({ success: true, data: effects });
  } catch (error: any) {
    console.error('Get active effects error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Purchase an item
router.post('/purchase', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { itemId } = req.body;

    if (!itemId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '아이템을 선택해주세요.' });
    }

    // Get item details
    const [items]: any = await connection.query(
      'SELECT * FROM shop_items WHERE id = ? AND is_active = TRUE',
      [itemId]
    );

    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '아이템을 찾을 수 없습니다.' });
    }

    const item = items[0];

    // Get user's current points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    const userPoints = users[0].points;

    if (userPoints < item.price) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '포인트가 부족합니다.' });
    }

    // Deduct points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [item.price, userId]
    );

    // Add item to user's inventory
    const [existing]: any = await connection.query(
      'SELECT id, quantity FROM user_items WHERE user_id = ? AND item_id = ?',
      [userId, itemId]
    );

    if (existing.length > 0) {
      // Update quantity
      await connection.query(
        'UPDATE user_items SET quantity = quantity + 1 WHERE id = ?',
        [existing[0].id]
      );
    } else {
      // Insert new
      await connection.query(
        'INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, 1)',
        [userId, itemId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${item.name}을(를) 구매했습니다!`,
      data: {
        remainingPoints: userPoints - item.price
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Purchase item error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Use an item
router.post('/use', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { userItemId } = req.body;

    if (!userItemId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '아이템을 선택해주세요.' });
    }

    // Get user item details
    const [userItems]: any = await connection.query(`
      SELECT ui.*, si.*
      FROM user_items ui
      JOIN shop_items si ON ui.item_id = si.id
      WHERE ui.id = ? AND ui.user_id = ?
    `, [userItemId, userId]);

    if (userItems.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '아이템을 찾을 수 없습니다.' });
    }

    const userItem = userItems[0];

    if (userItem.quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '아이템이 부족합니다.' });
    }

    // Decrease quantity
    await connection.query(
      'UPDATE user_items SET quantity = quantity - 1 WHERE id = ?',
      [userItemId]
    );

    // Log usage and apply effect
    let effectExpiresAt = null;
    if (userItem.duration_minutes > 0) {
      effectExpiresAt = new Date(Date.now() + userItem.duration_minutes * 60000);
    }

    await connection.query(
      'INSERT INTO item_usage_log (user_id, item_id, effect_expires_at) VALUES (?, ?, ?)',
      [userId, userItem.item_id, effectExpiresAt]
    );

    // Apply specific effects based on item type
    let message = `${userItem.name}을(를) 사용했습니다!`;

    if (userItem.effect_type === 'deck_slot') {
      // Check current deck slots
      const [deckCount]: any = await connection.query(
        'SELECT COUNT(*) as count FROM decks WHERE user_id = ?',
        [userId]
      );

      if (deckCount[0].count >= 10) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '덱 슬롯이 이미 최대입니다 (10개).' });
      }

      message = '덱 슬롯이 1개 증가했습니다!';
    } else if (userItem.effect_type === 'random_reward') {
      // Random reward logic
      const rewardType = Math.random();
      let rewardMessage = '';

      if (rewardType < 0.5) {
        // Points
        const points = Math.floor(Math.random() * 20000) + 10000; // 10k-30k
        await connection.query(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [points, userId]
        );
        rewardMessage = `${points.toLocaleString()} 포인트 획득!`;
      } else {
        rewardMessage = '아이템 획득! (구현 예정)';
      }

      message = `프리미엄 랜덤 박스: ${rewardMessage}`;
    } else if (userItem.effect_type === 'name_change') {
      message = '이름 변경권을 사용했습니다. 새 이름을 입력해주세요.';
    } else if (userItem.effect_type === 'guaranteed_card') {
      message = `${userItem.effect_value} 등급 카드를 획득했습니다! (구현 예정)`;
    }

    await connection.commit();

    res.json({
      success: true,
      message,
      data: {
        effectType: userItem.effect_type,
        effectValue: userItem.effect_value,
        effectExpiresAt,
        requiresInput: userItem.effect_type === 'name_change'
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Use item error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Change username (after using name change ticket)
router.post('/change-name', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { newName } = req.body;

    if (!newName || newName.length < 2 || newName.length > 20) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이름은 2-20자여야 합니다.' });
    }

    // Check if name is already taken
    const [existing]: any = await connection.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [newName, userId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이미 사용 중인 이름입니다.' });
    }

    // Check if user has active name change effect
    const [effects]: any = await connection.query(`
      SELECT iul.id
      FROM item_usage_log iul
      JOIN shop_items si ON iul.item_id = si.id
      WHERE iul.user_id = ? AND si.effect_type = 'name_change'
      ORDER BY iul.used_at DESC
      LIMIT 1
    `, [userId]);

    if (effects.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이름 변경권이 없습니다.' });
    }

    // Update username
    await connection.query(
      'UPDATE users SET username = ? WHERE id = ?',
      [newName, userId]
    );

    // Delete the used effect
    await connection.query(
      'DELETE FROM item_usage_log WHERE id = ?',
      [effects[0].id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `이름이 "${newName}"(으)로 변경되었습니다!`
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Change name error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
