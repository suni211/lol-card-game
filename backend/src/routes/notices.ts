import express from 'express';
import pool from '../config/database';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Import io for broadcasting
let io: any;
export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

// Get all notices
router.get('/', async (req, res) => {
  try {
    const [notices]: any = await pool.query(`
      SELECT * FROM notices
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 50
    `);

    res.json({ success: true, data: notices });
  } catch (error: any) {
    console.error('Get notices error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get single notice
router.get('/:id', async (req, res) => {
  try {
    const [notices]: any = await pool.query(
      'SELECT * FROM notices WHERE id = ?',
      [req.params.id]
    );

    if (notices.length === 0) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    res.json({ success: true, data: notices[0] });
  } catch (error: any) {
    console.error('Get notice error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create notice (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, content, type, isPinned } = req.body;

    const [result]: any = await pool.query(`
      INSERT INTO notices (title, content, type, is_pinned)
      VALUES (?, ?, ?, ?)
    `, [title, content, type || 'NOTICE', isPinned || false]);

    const noticeId = result.insertId;

    // Broadcast new notice to all connected clients
    if (io) {
      io.emit('new_notice', {
        id: noticeId,
        title,
        content,
        type: type || 'NOTICE',
        isPinned: isPinned || false,
      });
      console.log('Broadcasted new notice to all clients:', title);
    }

    res.status(201).json({ success: true, data: { id: noticeId } });
  } catch (error: any) {
    console.error('Create notice error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update notice (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, content, type, isPinned } = req.body;

    const [result]: any = await pool.query(`
      UPDATE notices
      SET title = ?, content = ?, type = ?, is_pinned = ?
      WHERE id = ?
    `, [title, content, type, isPinned, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    res.json({ success: true, message: 'Notice updated' });
  } catch (error: any) {
    console.error('Update notice error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete notice (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const [result]: any = await pool.query(
      'DELETE FROM notices WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    res.json({ success: true, message: 'Notice deleted' });
  } catch (error: any) {
    console.error('Delete notice error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
