import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get market listings
router.get('/listings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { playerId, tier, position, sort = 'price_asc' } = req.query;

    let query = `
      SELECT
        mt.id as listing_id,
        mt.player_id,
        mt.seller_id,
        mt.card_id,
        mt.listing_price,
        mt.listed_at,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.tier,
        p.region,
        p.season,
        uc.level,
        u.username as seller_username,
        pmp.current_price as market_price
      FROM market_transactions mt
      JOIN players p ON mt.player_id = p.id
      JOIN user_cards uc ON mt.card_id = uc.id
      JOIN users u ON mt.seller_id = u.id
      LEFT JOIN player_market_prices pmp ON p.id = pmp.player_id
      WHERE mt.status = 'LISTED'
    `;

    const params: any[] = [];

    if (playerId) {
      query += ' AND mt.player_id = ?';
      params.push(playerId);
    }

    if (tier) {
      query += ' AND p.tier = ?';
      params.push(tier);
    }

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY mt.listing_price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY mt.listing_price DESC';
    } else if (sort === 'date_desc') {
      query += ' ORDER BY mt.listed_at DESC';
    } else {
      query += ' ORDER BY mt.listed_at DESC';
    }

    query += ' LIMIT 100';

    const [listings]: any = await pool.query(query, params);

    res.json({ success: true, data: listings });
  } catch (error: any) {
    console.error('Get market listings error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get player market info
router.get('/player/:playerId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { playerId } = req.params;

    // Get player price info
    const [priceInfo]: any = await pool.query(
      `SELECT
        pmp.*,
        p.name,
        p.tier,
        p.team,
        p.position
      FROM player_market_prices pmp
      JOIN players p ON pmp.player_id = p.id
      WHERE pmp.player_id = ?`,
      [playerId]
    );

    if (priceInfo.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Get recent transactions
    const [recentTransactions]: any = await pool.query(
      `SELECT sold_price, sold_at
      FROM market_transactions
      WHERE player_id = ? AND status = 'SOLD'
      ORDER BY sold_at DESC
      LIMIT 10`,
      [playerId]
    );

    // Get price history (last 30 days)
    const [priceHistory]: any = await pool.query(
      `SELECT price, recorded_at
      FROM price_history
      WHERE player_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY recorded_at ASC`,
      [playerId]
    );

    res.json({
      success: true,
      data: {
        priceInfo: priceInfo[0],
        recentTransactions,
        priceHistory,
      },
    });
  } catch (error: any) {
    console.error('Get player market info error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// List card for sale
router.post('/list', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { cardId, price } = req.body;

    if (!cardId || !price || price < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 입력입니다.',
      });
    }

    // Get card info
    const [cards]: any = await connection.query(
      `SELECT uc.*, p.id as player_id, p.tier
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id = ? AND uc.user_id = ?`,
      [cardId, userId]
    );

    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '카드를 찾을 수 없습니다.',
      });
    }

    const card = cards[0];

    // Get price limits
    const [priceInfo]: any = await connection.query(
      'SELECT price_floor, price_ceiling FROM player_market_prices WHERE player_id = ?',
      [card.player_id]
    );

    if (priceInfo.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '시세 정보를 찾을 수 없습니다.',
      });
    }

    const { price_floor, price_ceiling } = priceInfo[0];

    // Validate price range
    if (price < price_floor || price > price_ceiling) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `가격은 ${price_floor}P ~ ${price_ceiling}P 사이여야 합니다.`,
      });
    }

    // Check if card is already listed
    const [existing]: any = await connection.query(
      'SELECT id FROM market_transactions WHERE card_id = ? AND status = "LISTED"',
      [cardId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 등록된 카드입니다.',
      });
    }

    // Check if card is in deck
    const [inDeck]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND (top_id = ? OR jungle_id = ? OR mid_id = ? OR adc_id = ? OR support_id = ?)',
      [userId, cardId, cardId, cardId, cardId, cardId]
    );

    if (inDeck.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '덱에 포함된 카드는 판매할 수 없습니다.',
      });
    }

    // Create listing
    await connection.query(
      `INSERT INTO market_transactions (player_id, seller_id, card_id, listing_price)
      VALUES (?, ?, ?, ?)`,
      [card.player_id, userId, cardId, price]
    );

    await connection.commit();

    res.json({
      success: true,
      message: '카드가 성공적으로 등록되었습니다.',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('List card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Buy card from market
router.post('/buy/:listingId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { listingId } = req.params;

    // Get listing info
    const [listings]: any = await connection.query(
      `SELECT mt.*, p.tier, p.name as player_name
      FROM market_transactions mt
      JOIN players p ON mt.player_id = p.id
      WHERE mt.id = ? AND mt.status = 'LISTED'
      FOR UPDATE`,
      [listingId]
    );

    if (listings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '매물을 찾을 수 없습니다.',
      });
    }

    const listing = listings[0];

    // Can't buy own listing
    if (listing.seller_id === userId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '자신이 등록한 카드는 구매할 수 없습니다.',
      });
    }

    // Check buyer points
    const [buyers]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (buyers.length === 0 || buyers[0].points < listing.listing_price) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '포인트가 부족합니다.',
      });
    }

    // Transfer card ownership
    await connection.query(
      'UPDATE user_cards SET user_id = ? WHERE id = ?',
      [userId, listing.card_id]
    );

    // Update buyer points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [listing.listing_price, userId]
    );

    // Update seller points
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [listing.listing_price, listing.seller_id]
    );

    // Update listing status
    await connection.query(
      `UPDATE market_transactions
      SET status = 'SOLD', buyer_id = ?, sold_price = ?, sold_at = NOW()
      WHERE id = ?`,
      [userId, listing.listing_price, listingId]
    );

    // Update player market price (weighted average of recent trades)
    const [recentTrades]: any = await connection.query(
      `SELECT sold_price FROM market_transactions
      WHERE player_id = ? AND status = 'SOLD'
      ORDER BY sold_at DESC
      LIMIT 10`,
      [listing.player_id]
    );

    if (recentTrades.length > 0) {
      const avgPrice = Math.round(
        recentTrades.reduce((sum: number, t: any) => sum + t.sold_price, 0) / recentTrades.length
      );

      // Get price limits
      const [priceInfo]: any = await connection.query(
        'SELECT price_floor, price_ceiling FROM player_market_prices WHERE player_id = ?',
        [listing.player_id]
      );

      const newPrice = Math.min(
        priceInfo[0].price_ceiling,
        Math.max(priceInfo[0].price_floor, avgPrice)
      );

      await connection.query(
        `UPDATE player_market_prices
        SET current_price = ?, total_volume = total_volume + 1, last_traded_price = ?, last_traded_at = NOW()
        WHERE player_id = ?`,
        [newPrice, listing.listing_price, listing.player_id]
      );

      // Record price history
      await connection.query(
        'INSERT INTO price_history (player_id, price, transaction_id) VALUES (?, ?, ?)',
        [listing.player_id, newPrice, listingId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${listing.player_name} 카드를 구매했습니다!`,
      data: {
        price: listing.listing_price,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Buy card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Cancel listing
router.delete('/listing/:listingId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { listingId } = req.params;

    // Get listing info
    const [listings]: any = await connection.query(
      'SELECT * FROM market_transactions WHERE id = ? AND status = "LISTED" FOR UPDATE',
      [listingId]
    );

    if (listings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '매물을 찾을 수 없습니다.',
      });
    }

    const listing = listings[0];

    // Check ownership
    if (listing.seller_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.',
      });
    }

    // Cancel listing
    await connection.query(
      'UPDATE market_transactions SET status = "CANCELLED" WHERE id = ?',
      [listingId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: '매물이 취소되었습니다.',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Cancel listing error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get my listings
router.get('/my-listings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [listings]: any = await pool.query(
      `SELECT
        mt.id as listing_id,
        mt.player_id,
        mt.card_id,
        mt.listing_price,
        mt.status,
        mt.listed_at,
        mt.sold_at,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.tier,
        uc.level,
        CASE WHEN mt.buyer_id IS NOT NULL THEN u.username ELSE NULL END as buyer_username
      FROM market_transactions mt
      JOIN players p ON mt.player_id = p.id
      JOIN user_cards uc ON mt.card_id = uc.id
      LEFT JOIN users u ON mt.buyer_id = u.id
      WHERE mt.seller_id = ?
      ORDER BY mt.listed_at DESC
      LIMIT 50`,
      [userId]
    );

    res.json({ success: true, data: listings });
  } catch (error: any) {
    console.error('Get my listings error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
