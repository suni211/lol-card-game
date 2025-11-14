import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all suggestions (admin can see all, users see only their own)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user is admin
    const [users]: any = await pool.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    const isAdmin = users[0]?.is_admin;

    let query: string;
    let params: any[];

    if (isAdmin) {
      // Admin sees all suggestions
      query = `
        SELECT s.*, u.username
        FROM suggestions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `;
      params = [];
    } else {
      // Users see only their own
      query = `
        SELECT s.*, u.username
        FROM suggestions s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `;
      params = [userId];
    }

    const [suggestions]: any = await pool.query(query, params);

    res.json({ success: true, data: suggestions, isAdmin });
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create new suggestion
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const validCategories = ['BUG', 'FEATURE', 'BALANCE', 'UI', 'OTHER'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    const [result]: any = await pool.query(
      'INSERT INTO suggestions (user_id, title, content, category) VALUES (?, ?, ?, ?)',
      [userId, title, content, category || 'OTHER']
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        message: '건의사항이 등록되었습니다',
      },
    });
  } catch (error: any) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update suggestion status (admin only)
router.put('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const suggestionId = req.params.id;
    const { status, adminReply } = req.body;

    // Check if user is admin
    const [users]: any = await pool.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    if (!users[0]?.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const validStatuses = ['PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    await pool.query(
      'UPDATE suggestions SET status = ?, admin_reply = ? WHERE id = ?',
      [status, adminReply || null, suggestionId]
    );

    res.json({ success: true, message: '건의사항 상태가 업데이트되었습니다' });
  } catch (error: any) {
    console.error('Update suggestion status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete suggestion (user can delete their own, admin can delete any)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const suggestionId = req.params.id;

    // Check if user is admin
    const [users]: any = await pool.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    const isAdmin = users[0]?.is_admin;

    if (isAdmin) {
      // Admin can delete any
      await pool.query('DELETE FROM suggestions WHERE id = ?', [suggestionId]);
    } else {
      // User can only delete their own
      await pool.query('DELETE FROM suggestions WHERE id = ? AND user_id = ?', [suggestionId, userId]);
    }

    res.json({ success: true, message: '건의사항이 삭제되었습니다' });
  } catch (error: any) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
