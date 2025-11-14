import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Send trade request
router.post('/send', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const senderId = req.user!.id;
    const { receiverUsername, senderCardId, receiverCardId } = req.body;

    // Get receiver
    const [receivers]: any = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [receiverUsername]
    );

    if (receivers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const receiverId = receivers[0].id;

    if (senderId === receiverId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot trade with yourself' });
    }

    // Verify sender owns sender card
    const [senderCards]: any = await connection.query(
      'SELECT id FROM user_cards WHERE id = ? AND user_id = ?',
      [senderCardId, senderId]
    );

    if (senderCards.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'You do not own this card' });
    }

    // Verify receiver owns receiver card
    const [receiverCards]: any = await connection.query(
      'SELECT id FROM user_cards WHERE id = ? AND user_id = ?',
      [receiverCardId, receiverId]
    );

    if (receiverCards.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Receiver does not own that card' });
    }

    // Create trade
    const [result]: any = await connection.query(`
      INSERT INTO trades (sender_id, receiver_id, sender_card_id, receiver_card_id, status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `, [senderId, receiverId, senderCardId, receiverCardId]);

    await connection.commit();

    res.json({ success: true, data: { tradeId: result.insertId } });
  } catch (error: any) {
    await connection.rollback();
    console.error('Send trade error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get pending trades (received)
router.get('/received', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [trades]: any = await pool.query(`
      SELECT
        t.id,
        t.sender_id,
        t.sender_card_id,
        t.receiver_card_id,
        t.status,
        t.created_at,
        u.username as sender_username,
        u.tier as sender_tier,
        u.rating as sender_rating
      FROM trades t
      JOIN users u ON t.sender_id = u.id
      WHERE t.receiver_id = ? AND t.status = 'PENDING'
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json({ success: true, data: trades });
  } catch (error: any) {
    console.error('Get received trades error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Accept trade
router.post('/:tradeId/accept', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const tradeId = parseInt(req.params.tradeId);

    // Get trade
    const [trades]: any = await connection.query(
      'SELECT * FROM trades WHERE id = ? AND receiver_id = ? AND status = "PENDING"',
      [tradeId, userId]
    );

    if (trades.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    const trade = trades[0];

    // Swap card ownership
    await connection.query(
      'UPDATE user_cards SET user_id = ? WHERE id = ?',
      [trade.receiver_id, trade.sender_card_id]
    );

    await connection.query(
      'UPDATE user_cards SET user_id = ? WHERE id = ?',
      [trade.sender_id, trade.receiver_card_id]
    );

    // Update trade status
    await connection.query(
      'UPDATE trades SET status = "ACCEPTED" WHERE id = ?',
      [tradeId]
    );

    await connection.commit();

    res.json({ success: true, message: 'Trade accepted' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Accept trade error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Reject trade
router.post('/:tradeId/reject', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const tradeId = parseInt(req.params.tradeId);

    const [result]: any = await pool.query(
      'UPDATE trades SET status = "REJECTED" WHERE id = ? AND receiver_id = ? AND status = "PENDING"',
      [tradeId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    res.json({ success: true, message: 'Trade rejected' });
  } catch (error: any) {
    console.error('Reject trade error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
