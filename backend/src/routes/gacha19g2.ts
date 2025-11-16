import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Admin check middleware
const adminMiddleware = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.user!.id;
    const [users]: any = await pool.query('SELECT isAdmin FROM users WHERE id = ?', [userId]);

    if (!users[0] || !users[0].isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다' });
  }
};

// 19G2 Light Pack (500P) - 일반 등급 포함, 19G2 카드 0.02% 확률
router.post('/light', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const packPrice = 500;

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users[0].points < packPrice) {
      await connection.rollback();
      return res.status(400).json({ error: '포인트가 부족합니다' });
    }

    // Deduct points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [packPrice, userId]
    );

    // 19G2 카드 확률: 0.02%
    const is19G2 = Math.random() < 0.0002;

    let player;
    if (is19G2) {
      // 19G2 선수 중 랜덤
      const [g2Players]: any = await connection.query(
        'SELECT * FROM players WHERE season = ? ORDER BY RAND() LIMIT 1',
        ['19G2']
      );
      player = g2Players[0];
    } else {
      // 일반 가챠 로직 (기존 시스템)
      const tierRoll = Math.random();
      let tier;
      if (tierRoll < 0.6) tier = 'COMMON';
      else if (tierRoll < 0.85) tier = 'RARE';
      else if (tierRoll < 0.97) tier = 'EPIC';
      else tier = 'LEGENDARY';

      const [players]: any = await connection.query(
        'SELECT * FROM players WHERE tier = ? AND season != ? ORDER BY RAND() LIMIT 1',
        [tier, '19G2']
      );
      player = players[0];
    }

    // Add card to user
    const [result]: any = await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    await connection.commit();

    res.json({
      success: true,
      card: {
        id: result.insertId,
        player,
        level: 0,
        is19G2,
      },
    });

  } catch (error) {
    await connection.rollback();
    console.error('19G2 Light Pack error:', error);
    res.status(500).json({ error: '가챠 구매 중 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
});

// 19G2 Premium Pack (15000P) - 에픽 이상 확정, 19G2 카드 0.132%, 50회 천장
router.post('/premium', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const packPrice = 15000;

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users[0].points < packPrice) {
      await connection.rollback();
      return res.status(400).json({ error: '포인트가 부족합니다' });
    }

    // Get pity counter
    const [pityData]: any = await connection.query(
      'SELECT pull_count FROM user_gacha_pity WHERE user_id = ? AND pack_type = ?',
      [userId, '19G2_PREMIUM']
    );

    let pullCount = pityData[0]?.pull_count || 0;
    pullCount += 1;

    // Deduct points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [packPrice, userId]
    );

    // 50회 천장 도달 시 무조건 19G2
    const is19G2Guaranteed = pullCount >= 50;

    // 19G2 카드 확률: 0.132% (천장 전)
    const is19G2 = is19G2Guaranteed || Math.random() < 0.00132;

    let player;
    if (is19G2) {
      // 19G2 선수 중 랜덤
      const [g2Players]: any = await connection.query(
        'SELECT * FROM players WHERE season = ? ORDER BY RAND() LIMIT 1',
        ['19G2']
      );
      player = g2Players[0];

      // Reset pity counter
      pullCount = 0;
    } else {
      // 에픽 이상 확정 + 아이콘 0.025%
      const tierRoll = Math.random();
      let tier;
      if (tierRoll < 0.00025) {
        tier = 'ICON';
      } else if (tierRoll < 0.69975) {
        tier = 'EPIC';
      } else {
        tier = 'LEGENDARY';
      }

      const [players]: any = await connection.query(
        'SELECT * FROM players WHERE tier = ? AND season != ? ORDER BY RAND() LIMIT 1',
        [tier, '19G2']
      );

      if (players.length === 0) {
        // Fallback to EPIC if no players found
        const [fallbackPlayers]: any = await connection.query(
          'SELECT * FROM players WHERE tier = ? AND season != ? ORDER BY RAND() LIMIT 1',
          ['EPIC', '19G2']
        );
        player = fallbackPlayers[0];
      } else {
        player = players[0];
      }
    }

    // Update pity counter
    await connection.query(
      `INSERT INTO user_gacha_pity (user_id, pack_type, pull_count)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE pull_count = ?, last_reset = CURRENT_TIMESTAMP`,
      [userId, '19G2_PREMIUM', pullCount, pullCount]
    );

    // Add card to user
    const [result]: any = await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    await connection.commit();

    res.json({
      success: true,
      card: {
        id: result.insertId,
        player,
        level: 0,
        is19G2,
        isGuaranteed: is19G2Guaranteed,
      },
      pityCount: pullCount,
      nextGuaranteed: 50 - pullCount,
    });

  } catch (error) {
    await connection.rollback();
    console.error('19G2 Premium Pack error:', error);
    res.status(500).json({ error: '가챠 구매 중 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
});

// Get pity counter
router.get('/pity', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [pityData]: any = await pool.query(
      'SELECT pull_count FROM user_gacha_pity WHERE user_id = ? AND pack_type = ?',
      [userId, '19G2_PREMIUM']
    );

    const pullCount = pityData[0]?.pull_count || 0;

    res.json({
      pullCount,
      nextGuaranteed: 50 - pullCount,
    });

  } catch (error) {
    console.error('Get pity error:', error);
    res.status(500).json({ error: '천장 정보 조회 중 오류가 발생했습니다' });
  }
});

// 19G2 Test Pack (Admin Only) - 100% 19G2 guaranteed
router.post('/test', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get random 19G2 player
    const [g2Players]: any = await connection.query(
      'SELECT * FROM players WHERE season = ? ORDER BY RAND() LIMIT 1',
      ['19G2']
    );

    if (g2Players.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '19G2 카드를 찾을 수 없습니다' });
    }

    const player = g2Players[0];

    // Add card to user
    const [result]: any = await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    await connection.commit();

    res.json({
      success: true,
      card: {
        id: result.insertId,
        player,
        level: 0,
        is19G2: true,
        isGuaranteed: true,
      },
    });

  } catch (error) {
    await connection.rollback();
    console.error('19G2 Test Pack error:', error);
    res.status(500).json({ error: '가챠 구매 중 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
});

export default router;
