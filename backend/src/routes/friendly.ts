import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (for inviting)
router.get('/users', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    let query = `
      SELECT
        u.id,
        u.username,
        u.rating,
        u.level,
        u.points,
        t.name as title_name,
        t.color as title_color,
        t.rarity as title_rarity
      FROM users u
      LEFT JOIN titles t ON u.equipped_title_id = t.id
      WHERE u.id != ?
    `;

    const params: any[] = [userId];

    // Search by username
    if (search && typeof search === 'string') {
      query += ' AND u.username LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY u.rating DESC LIMIT 50';

    const [users]: any = await pool.query(query, params);

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Send friendly invite
router.post('/invite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, error: '상대방을 선택해주세요.' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, error: '자기 자신에게 초대를 보낼 수 없습니다.' });
    }

    // Check if receiver exists
    const [receivers]: any = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [receiverId]
    );

    if (receivers.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    // Check if there's already a pending invite
    const [existingInvites]: any = await pool.query(
      'SELECT id FROM friendly_invites WHERE sender_id = ? AND receiver_id = ? AND status = "PENDING"',
      [senderId, receiverId]
    );

    if (existingInvites.length > 0) {
      return res.status(400).json({ success: false, error: '이미 초대를 보냈습니다.' });
    }

    // Create invite
    const [result]: any = await pool.query(
      'INSERT INTO friendly_invites (sender_id, receiver_id, status) VALUES (?, ?, "PENDING")',
      [senderId, receiverId]
    );

    // Get sender info for notification
    const [senders]: any = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [senderId]
    );

    res.json({
      success: true,
      message: `${receivers[0].username}님에게 초대를 보냈습니다.`,
      data: { id: result.insertId, sender: senders[0], receiver: receivers[0] }
    });
  } catch (error: any) {
    console.error('Send invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get received invites
router.get('/invites', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [invites]: any = await pool.query(`
      SELECT
        fi.id,
        fi.sender_id,
        fi.status,
        fi.created_at,
        u.username as sender_username,
        u.rating as sender_rating,
        u.level as sender_level,
        t.name as sender_title_name,
        t.color as sender_title_color
      FROM friendly_invites fi
      JOIN users u ON fi.sender_id = u.id
      LEFT JOIN titles t ON u.equipped_title_id = t.id
      WHERE fi.receiver_id = ? AND fi.status = "PENDING"
      ORDER BY fi.created_at DESC
    `, [userId]);

    res.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Get invites error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Accept invite
router.post('/accept/:id', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const inviteId = parseInt(req.params.id);

    // Get invite
    const [invites]: any = await connection.query(
      'SELECT id, sender_id, receiver_id, status FROM friendly_invites WHERE id = ?',
      [inviteId]
    );

    if (invites.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '초대를 찾을 수 없습니다.' });
    }

    const invite = invites[0];

    if (invite.receiver_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: '권한이 없습니다.' });
    }

    if (invite.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이미 처리된 초대입니다.' });
    }

    // Update invite status
    await connection.query(
      'UPDATE friendly_invites SET status = "ACCEPTED" WHERE id = ?',
      [inviteId]
    );

    // Create match (using existing matches table)
    // Get both players' active decks
    const [player1Deck]: any = await connection.query(
      'SELECT * FROM decks WHERE user_id = ? AND is_active = TRUE',
      [invite.sender_id]
    );

    const [player2Deck]: any = await connection.query(
      'SELECT * FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (player1Deck.length === 0 || player2Deck.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '한 명 이상의 플레이어가 활성 덱이 없습니다.' });
    }

    // Create match
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, status, is_friendly)
      VALUES (?, ?, 'PENDING', TRUE)
    `, [invite.sender_id, userId]);

    const matchId = matchResult.insertId;

    await connection.commit();

    res.json({
      success: true,
      message: '매치가 생성되었습니다.',
      data: { matchId }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Accept invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Decline/Cancel invite
router.delete('/invite/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const inviteId = parseInt(req.params.id);

    // Get invite
    const [invites]: any = await pool.query(
      'SELECT id, sender_id, receiver_id FROM friendly_invites WHERE id = ?',
      [inviteId]
    );

    if (invites.length === 0) {
      return res.status(404).json({ success: false, error: '초대를 찾을 수 없습니다.' });
    }

    const invite = invites[0];

    // Can only delete if you're sender or receiver
    if (invite.sender_id !== userId && invite.receiver_id !== userId) {
      return res.status(403).json({ success: false, error: '권한이 없습니다.' });
    }

    // Delete invite
    await pool.query('DELETE FROM friendly_invites WHERE id = ?', [inviteId]);

    const message = invite.sender_id === userId ? '초대를 취소했습니다.' : '초대를 거절했습니다.';

    res.json({ success: true, message });
  } catch (error: any) {
    console.error('Delete invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get sent invites
router.get('/invites/sent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [invites]: any = await pool.query(`
      SELECT
        fi.id,
        fi.receiver_id,
        fi.status,
        fi.created_at,
        u.username as receiver_username,
        u.rating as receiver_rating,
        u.level as receiver_level
      FROM friendly_invites fi
      JOIN users u ON fi.receiver_id = u.id
      WHERE fi.sender_id = ? AND fi.status = "PENDING"
      ORDER BY fi.created_at DESC
    `, [userId]);

    res.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Get sent invites error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
