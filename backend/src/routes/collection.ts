import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Preview cards to be culled
router.post('/cull-cards/preview', authMiddleware, async (req: AuthRequest, res) => {
  const { overallThreshold } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (typeof overallThreshold !== 'number' || overallThreshold < 0) {
    return res.status(400).json({ success: false, error: 'Invalid overall threshold' });
  }

  try {
    const [cardsToCull]: any = await pool.query(
      `SELECT COUNT(*) as count FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.user_id = ? AND p.overall < ?`,
      [userId, overallThreshold]
    );

    res.json({ success: true, data: { count: cardsToCull[0].count } });
  } catch (error) {
    console.error('Error previewing cards to cull:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Confirm and cull cards
router.post('/cull-cards/confirm', authMiddleware, async (req: AuthRequest, res) => {
  const { overallThreshold } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (typeof overallThreshold !== 'number' || overallThreshold < 0) {
    return res.status(400).json({ success: false, error: 'Invalid overall threshold' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get cards to be culled (for logging or potential refunds)
    const [culledCards]: any = await connection.query(
      `SELECT uc.id, p.name, p.overall FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.user_id = ? AND p.overall < ?`,
      [userId, overallThreshold]
    );

    if (culledCards.length === 0) {
      await connection.rollback();
      return res.json({ success: true, data: { count: 0, message: 'No cards to cull.' } });
    }

    // Delete the cards
    const cardIdsToDelete = culledCards.map((card: any) => card.id);
    await connection.query(
      `DELETE FROM user_cards WHERE id IN (?) AND user_id = ?`,
      [cardIdsToDelete, userId]
    );

    await connection.commit();
    res.json({ success: true, data: { count: culledCards.length, message: `${culledCards.length} cards culled successfully.` } });
  } catch (error) {
    await connection.rollback();
    console.error('Error culling cards:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;