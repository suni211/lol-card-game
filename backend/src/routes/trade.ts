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
        u.rating as sender_rating,
        p1.id as sender_player_id,
        p1.name as sender_player_name,
        p1.team as sender_player_team,
        p1.position as sender_player_position,
        p1.overall as sender_player_overall,
        p1.region as sender_player_region,
        p1.tier as sender_player_tier,
        uc1.level as sender_card_level,
        p2.id as receiver_player_id,
        p2.name as receiver_player_name,
        p2.team as receiver_player_team,
        p2.position as receiver_player_position,
        p2.overall as receiver_player_overall,
        p2.region as receiver_player_region,
        p2.tier as receiver_player_tier,
        uc2.level as receiver_card_level
      FROM trades t
      JOIN users u ON t.sender_id = u.id
      JOIN user_cards uc1 ON t.sender_card_id = uc1.id
      JOIN players p1 ON uc1.player_id = p1.id
      JOIN user_cards uc2 ON t.receiver_card_id = uc2.id
      JOIN players p2 ON uc2.player_id = p2.id
      WHERE t.receiver_id = ? AND t.status = 'PENDING'
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json({ success: true, data: trades });
  } catch (error: any) {
    console.error('Get received trades error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get sent trades
router.get('/sent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [trades]: any = await pool.query(`
      SELECT
        t.id,
        t.receiver_id,
        t.sender_card_id,
        t.receiver_card_id,
        t.status,
        t.created_at,
        u.username as receiver_username,
        u.tier as receiver_tier,
        u.rating as receiver_rating,
        p1.id as sender_player_id,
        p1.name as sender_player_name,
        p1.team as sender_player_team,
        p1.position as sender_player_position,
        p1.overall as sender_player_overall,
        p1.region as sender_player_region,
        p1.tier as sender_player_tier,
        uc1.level as sender_card_level,
        p2.id as receiver_player_id,
        p2.name as receiver_player_name,
        p2.team as receiver_player_team,
        p2.position as receiver_player_position,
        p2.overall as receiver_player_overall,
        p2.region as receiver_player_region,
        p2.tier as receiver_player_tier,
        uc2.level as receiver_card_level
      FROM trades t
      JOIN users u ON t.receiver_id = u.id
      JOIN user_cards uc1 ON t.sender_card_id = uc1.id
      JOIN players p1 ON uc1.player_id = p1.id
      JOIN user_cards uc2 ON t.receiver_card_id = uc2.id
      JOIN players p2 ON uc2.player_id = p2.id
      WHERE t.sender_id = ? AND t.status = 'PENDING'
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json({ success: true, data: trades });
  } catch (error: any) {
    console.error('Get sent trades error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get trade history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [trades]: any = await pool.query(`
      SELECT
        t.id,
        t.sender_id,
        t.receiver_id,
        t.sender_card_id,
        t.receiver_card_id,
        t.status,
        t.created_at,
        t.updated_at,
        u1.username as sender_username,
        u2.username as receiver_username,
        p1.id as sender_player_id,
        p1.name as sender_player_name,
        p1.team as sender_player_team,
        p1.position as sender_player_position,
        p1.overall as sender_player_overall,
        p1.tier as sender_player_tier,
        p2.id as receiver_player_id,
        p2.name as receiver_player_name,
        p2.team as receiver_player_team,
        p2.position as receiver_player_position,
        p2.overall as receiver_player_overall,
        p2.tier as receiver_player_tier
      FROM trades t
      JOIN users u1 ON t.sender_id = u1.id
      JOIN users u2 ON t.receiver_id = u2.id
      JOIN user_cards uc1 ON t.sender_card_id = uc1.id
      JOIN players p1 ON uc1.player_id = p1.id
      JOIN user_cards uc2 ON t.receiver_card_id = uc2.id
      JOIN players p2 ON uc2.player_id = p2.id
      WHERE (t.sender_id = ? OR t.receiver_id = ?) AND t.status IN ('ACCEPTED', 'REJECTED', 'CANCELLED')
      ORDER BY t.updated_at DESC
      LIMIT 50
    `, [userId, userId]);

    res.json({ success: true, data: trades });
  } catch (error: any) {
    console.error('Get trade history error:', error);
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

// Cancel trade (sender only)
router.post('/:tradeId/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const tradeId = parseInt(req.params.tradeId);

    const [result]: any = await pool.query(
      'UPDATE trades SET status = "CANCELLED" WHERE id = ? AND sender_id = ? AND status = "PENDING"',
      [tradeId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Trade not found or already processed' });
    }

    res.json({ success: true, message: 'Trade cancelled' });
  } catch (error: any) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
