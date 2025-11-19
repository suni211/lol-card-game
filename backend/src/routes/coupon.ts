import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

const router = express.Router();
let io: Server;

export const setSocketIOForCoupon = (socketIO: Server) => {
  io = socketIO;
};

// 쿠폰 코드 생성 함수
function generateCouponCode(prefix: string = 'LOL'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 관리자 전용: 쿠폰 생성
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user!.id;

    // 관리자 확인
    const [users]: any = await connection.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const {
      type,
      rewardValue,
      rewardPlayerId,
      rewardPackType,
      rewardPackCount,
      maxUses,
      maxUsers,
      expiresAt,
      description,
      customCode,
    } = req.body;

    // Validate type
    if (!['POINTS', 'CARD', 'PACK'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid coupon type' });
    }

    // Generate or use custom code
    let code = customCode || generateCouponCode();

    // Check if code already exists
    const [existing]: any = await connection.query(
      'SELECT id FROM coupons WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }

    // Format expires_at for MySQL (YYYY-MM-DD HH:MM:SS)
    let formattedExpiresAt = null;
    if (expiresAt) {
      const date = new Date(expiresAt);
      formattedExpiresAt = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Create coupon
    await connection.query(
      `INSERT INTO coupons
       (code, type, reward_value, reward_player_id, reward_pack_type, reward_pack_count,
        max_uses, max_users, expires_at, created_by, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        type,
        rewardValue || null,
        rewardPlayerId || null,
        rewardPackType || null,
        rewardPackCount || 1,
        maxUses || 1,
        maxUsers || null,
        formattedExpiresAt,
        userId,
        description || null,
      ]
    );

    res.json({
      success: true,
      data: {
        code,
        type,
        description,
        maxUses: maxUses || 1,
      },
    });
  } catch (error: any) {
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 쿠폰 사용
router.post('/redeem', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    // Get coupon
    const [coupons]: any = await connection.query(
      'SELECT * FROM coupons WHERE code = ? AND is_active = TRUE',
      [code.toUpperCase()]
    );

    if (coupons.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Invalid or inactive coupon code' });
    }

    const coupon = coupons[0];

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Coupon has expired' });
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Coupon has reached maximum uses' });
    }

    // Check max users (unique user count)
    if (coupon.max_users) {
      const [userCount]: any = await connection.query(
        'SELECT COUNT(DISTINCT user_id) as unique_users FROM coupon_redemptions WHERE coupon_id = ?',
        [coupon.id]
      );
      if (userCount[0].unique_users >= coupon.max_users) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Coupon has reached maximum user limit' });
      }
    }

    // Check if user already used this coupon
    const [redemptions]: any = await connection.query(
      'SELECT id FROM coupon_redemptions WHERE user_id = ? AND coupon_id = ?',
      [userId, coupon.id]
    );

    if (redemptions.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'You have already used this coupon' });
    }

    let rewardDetails: any = {};

    // Apply reward based on type
    switch (coupon.type) {
      case 'POINTS':
        await connection.query(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [coupon.reward_value, userId]
        );
        rewardDetails = { points: coupon.reward_value };

        // Get updated user points for real-time update
        const [updatedUser]: any = await connection.query(
          'SELECT points FROM users WHERE id = ?',
          [userId]
        );

        // Send real-time update via Socket.IO
        if (io) {
          io.to(`user_${userId}`).emit('pointsUpdate', {
            points: updatedUser[0].points
          });
        }
        break;

      case 'CARD':
        // Get player info
        const [players]: any = await connection.query(
          'SELECT * FROM players WHERE id = ?',
          [coupon.reward_player_id]
        );

        if (players.length === 0) {
          await connection.rollback();
          return res.status(500).json({ success: false, error: 'Reward player not found' });
        }

        // Add card to user
        await connection.query(
          'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
          [userId, coupon.reward_player_id]
        );

        rewardDetails = { player: players[0].name, tier: players[0].tier };
        break;

      case 'PACK':
        // Add pack to user inventory
        const packType = coupon.reward_pack_type || 'STANDARD';
        const packCount = coupon.reward_pack_count || 1;

        // Check if user already has this pack type
        const [existingPacks]: any = await connection.query(
          'SELECT id, quantity FROM user_packs WHERE user_id = ? AND pack_type = ?',
          [userId, packType]
        );

        if (existingPacks.length > 0) {
          // Update existing pack quantity
          await connection.query(
            'UPDATE user_packs SET quantity = quantity + ? WHERE user_id = ? AND pack_type = ?',
            [packCount, userId, packType]
          );
        } else {
          // Insert new pack
          await connection.query(
            'INSERT INTO user_packs (user_id, pack_type, quantity) VALUES (?, ?, ?)',
            [userId, packType, packCount]
          );
        }

        rewardDetails = { packType, count: packCount };
        break;
    }

    // Record redemption
    await connection.query(
      'INSERT INTO coupon_redemptions (coupon_id, user_id, reward_type, reward_details) VALUES (?, ?, ?, ?)',
      [coupon.id, userId, coupon.type, JSON.stringify(rewardDetails)]
    );

    // Update coupon usage count
    await connection.query(
      'UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?',
      [coupon.id]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        type: coupon.type,
        reward: rewardDetails,
        description: coupon.description,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Redeem coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 관리자 전용: 모든 쿠폰 조회
router.get('/admin/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // 관리자 확인
    const [users]: any = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const [coupons]: any = await pool.query(`
      SELECT
        c.*,
        u.username as created_by_username,
        p.name as reward_player_name,
        (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = c.id) as redemption_count,
        (SELECT COUNT(DISTINCT user_id) FROM coupon_redemptions WHERE coupon_id = c.id) as unique_user_count
      FROM coupons c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN players p ON c.reward_player_id = p.id
      ORDER BY c.created_at DESC
    `);

    res.json({ success: true, data: coupons });
  } catch (error: any) {
    console.error('List coupons error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 관리자 전용: 쿠폰 비활성화
router.post('/admin/deactivate/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const couponId = parseInt(req.params.id);

    // 관리자 확인
    const [users]: any = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await pool.query(
      'UPDATE coupons SET is_active = FALSE WHERE id = ?',
      [couponId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Deactivate coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 내가 사용한 쿠폰 조회
router.get('/my-redemptions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [redemptions]: any = await pool.query(`
      SELECT
        cr.*,
        c.code,
        c.type,
        c.description
      FROM coupon_redemptions cr
      JOIN coupons c ON cr.coupon_id = c.id
      WHERE cr.user_id = ?
      ORDER BY cr.redeemed_at DESC
    `, [userId]);

    res.json({ success: true, data: redemptions });
  } catch (error: any) {
    console.error('Get my redemptions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
