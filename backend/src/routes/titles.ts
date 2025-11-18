import express from 'express';
import pool from '../config/database';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all titles
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [titles]: any = await pool.query(`
      SELECT
        id,
        name,
        description,
        color,
        icon,
        rarity,
        created_at
      FROM titles
      ORDER BY
        CASE rarity
          WHEN 'SPECIAL' THEN 5
          WHEN 'LEGENDARY' THEN 4
          WHEN 'EPIC' THEN 3
          WHEN 'RARE' THEN 2
          WHEN 'COMMON' THEN 1
        END DESC,
        name ASC
    `);

    res.json({ success: true, data: titles });
  } catch (error: any) {
    console.error('Get all titles error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get my titles
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [titles]: any = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.description,
        t.color,
        t.icon,
        t.rarity,
        ut.equipped,
        ut.acquired_at
      FROM user_titles ut
      JOIN titles t ON ut.title_id = t.id
      WHERE ut.user_id = ?
      ORDER BY
        ut.equipped DESC,
        CASE t.rarity
          WHEN 'SPECIAL' THEN 5
          WHEN 'LEGENDARY' THEN 4
          WHEN 'EPIC' THEN 3
          WHEN 'RARE' THEN 2
          WHEN 'COMMON' THEN 1
        END DESC,
        t.name ASC
    `, [userId]);

    res.json({ success: true, data: titles });
  } catch (error: any) {
    console.error('Get my titles error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Equip title
router.post('/:id/equip', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const titleId = parseInt(req.params.id);

    // Check if user owns this title
    const [userTitles]: any = await connection.query(
      'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?',
      [userId, titleId]
    );

    if (userTitles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '보유하지 않은 칭호입니다.' });
    }

    // Unequip all titles
    await connection.query(
      'UPDATE user_titles SET equipped = FALSE WHERE user_id = ?',
      [userId]
    );

    // Equip selected title
    await connection.query(
      'UPDATE user_titles SET equipped = TRUE WHERE user_id = ? AND title_id = ?',
      [userId, titleId]
    );

    // Update user's equipped_title_id
    await connection.query(
      'UPDATE users SET equipped_title_id = ? WHERE id = ?',
      [titleId, userId]
    );

    await connection.commit();

    res.json({ success: true, message: '칭호를 장착했습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Equip title error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Unequip title
router.post('/unequip', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Unequip all titles
    await connection.query(
      'UPDATE user_titles SET equipped = FALSE WHERE user_id = ?',
      [userId]
    );

    // Update user's equipped_title_id to NULL
    await connection.query(
      'UPDATE users SET equipped_title_id = NULL WHERE id = ?',
      [userId]
    );

    await connection.commit();

    res.json({ success: true, message: '칭호를 해제했습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Unequip title error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Create new title (admin only)
router.post('/admin/create', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, color, icon, rarity } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, error: '칭호 이름과 설명을 입력해주세요.' });
    }

    const validRarities = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SPECIAL'];
    if (rarity && !validRarities.includes(rarity)) {
      return res.status(400).json({ success: false, error: '올바른 희귀도를 선택해주세요.' });
    }

    const [result]: any = await pool.query(
      'INSERT INTO titles (name, description, color, icon, rarity) VALUES (?, ?, ?, ?, ?)',
      [name, description, color || '#3B82F6', icon || null, rarity || 'COMMON']
    );

    res.json({ success: true, message: '칭호가 생성되었습니다.', data: { id: result.insertId } });
  } catch (error: any) {
    console.error('Create title error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: '이미 존재하는 칭호 이름입니다.' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Grant title to user (admin only)
router.post('/admin/grant', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, titleId } = req.body;

    if (!userId || !titleId) {
      return res.status(400).json({ success: false, error: '사용자와 칭호를 선택해주세요.' });
    }

    // Check if user exists
    const [users]: any = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    // Check if title exists
    const [titles]: any = await pool.query('SELECT id, name FROM titles WHERE id = ?', [titleId]);
    if (titles.length === 0) {
      return res.status(404).json({ success: false, error: '칭호를 찾을 수 없습니다.' });
    }

    // Check if user already has this title
    const [existing]: any = await pool.query(
      'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?',
      [userId, titleId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: '이미 보유한 칭호입니다.' });
    }

    // Grant title
    await pool.query(
      'INSERT INTO user_titles (user_id, title_id) VALUES (?, ?)',
      [userId, titleId]
    );

    res.json({
      success: true,
      message: `${users[0].username}님에게 "${titles[0].name}" 칭호를 부여했습니다.`
    });
  } catch (error: any) {
    console.error('Grant title error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete title (admin only)
router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const titleId = parseInt(req.params.id);

    // Check if title exists
    const [titles]: any = await connection.query('SELECT id, name FROM titles WHERE id = ?', [titleId]);
    if (titles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '칭호를 찾을 수 없습니다.' });
    }

    // Unequip this title from all users
    await connection.query(
      'UPDATE users SET equipped_title_id = NULL WHERE equipped_title_id = ?',
      [titleId]
    );

    // Delete user_titles records (will cascade automatically, but we do it explicitly)
    await connection.query('DELETE FROM user_titles WHERE title_id = ?', [titleId]);

    // Delete title
    await connection.query('DELETE FROM titles WHERE id = ?', [titleId]);

    await connection.commit();

    res.json({ success: true, message: `"${titles[0].name}" 칭호가 삭제되었습니다.` });
  } catch (error: any) {
    await connection.rollback();
    console.error('Delete title error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Update title (admin only)
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const titleId = parseInt(req.params.id);
    const { name, description, color, icon, rarity } = req.body;

    // Check if title exists
    const [titles]: any = await pool.query('SELECT id FROM titles WHERE id = ?', [titleId]);
    if (titles.length === 0) {
      return res.status(404).json({ success: false, error: '칭호를 찾을 수 없습니다.' });
    }

    const validRarities = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SPECIAL'];
    if (rarity && !validRarities.includes(rarity)) {
      return res.status(400).json({ success: false, error: '올바른 희귀도를 선택해주세요.' });
    }

    await pool.query(
      'UPDATE titles SET name = ?, description = ?, color = ?, icon = ?, rarity = ? WHERE id = ?',
      [name, description, color, icon, rarity, titleId]
    );

    res.json({ success: true, message: '칭호가 수정되었습니다.' });
  } catch (error: any) {
    console.error('Update title error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: '이미 존재하는 칭호 이름입니다.' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
