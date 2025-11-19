import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Calculate enhancement bonus
function calculateEnhancementBonus(level: number): number {
  if (level <= 0) return 0;
  if (level <= 4) return level; // 1~4강: +1씩
  if (level <= 7) return 4 + (level - 4) * 2; // 5~7강: +2씩
  return 10 + (level - 7) * 5; // 8~10강: +5씩
}

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
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
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
      // Filter by tier based on overall ranges
      if (tier === 'ICON') {
        query += " AND p.name LIKE 'ICON%'";
      } else if (tier === 'COMMON') {
        query += " AND p.overall <= 80 AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'RARE') {
        query += " AND p.overall > 80 AND p.overall <= 90 AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'EPIC') {
        query += " AND p.overall > 90 AND p.overall <= 100 AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'LEGENDARY') {
        query += " AND p.overall > 100 AND p.name NOT LIKE 'ICON%'";
      }
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
    const level = parseInt(req.query.level as string) || 0;

    // Get player price info
    const [priceInfo]: any = await pool.query(
      `SELECT
        pmp.*,
        p.name,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.team,
        p.position,
        p.overall
      FROM player_market_prices pmp
      JOIN players p ON pmp.player_id = p.id
      WHERE pmp.player_id = ?`,
      [playerId]
    );

    if (priceInfo.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Adjust price range based on enhancement level
    const enhancementBonus = calculateEnhancementBonus(level);
    const baseOverall = priceInfo[0].overall;
    const enhancedOverall = baseOverall + enhancementBonus;
    const priceMultiplier = enhancedOverall / baseOverall;

    const adjustedPriceInfo = {
      ...priceInfo[0],
      price_floor: Math.floor(priceInfo[0].price_floor * priceMultiplier),
      price_ceiling: Math.floor(priceInfo[0].price_ceiling * priceMultiplier),
      current_price: Math.floor(priceInfo[0].current_price * priceMultiplier),
    };

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
        priceInfo: adjustedPriceInfo,
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
      `SELECT uc.*, p.id as player_id, p.name as player_name,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.overall
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

    // Adjust price range based on enhancement level
    const enhancementBonus = calculateEnhancementBonus(card.level);
    const baseOverall = card.overall;
    const enhancedOverall = baseOverall + enhancementBonus;
    const priceMultiplier = enhancedOverall / baseOverall;

    const price_floor = Math.floor(priceInfo[0].price_floor * priceMultiplier);
    const price_ceiling = Math.floor(priceInfo[0].price_ceiling * priceMultiplier);

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
      'SELECT id FROM decks WHERE user_id = ? AND (top_card_id = ? OR jungle_card_id = ? OR mid_card_id = ? OR adc_card_id = ? OR support_card_id = ?)',
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
    const [result]: any = await connection.query(
      `INSERT INTO market_transactions (player_id, seller_id, card_id, listing_price)
      VALUES (?, ?, ?, ?)`,
      [card.player_id, userId, cardId, price]
    );

    const listingId = result.insertId;

    // Check for price alerts and auto-purchase
    const [priceAlerts]: any = await connection.query(
      `SELECT pa.*, u.points, u.username
      FROM price_alerts pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.player_id = ? AND pa.is_active = TRUE AND pa.max_price >= ?
      ORDER BY pa.created_at ASC
      LIMIT 1`,
      [card.player_id, price]
    );

    let autoSold = false;
    let buyerUsername = null;

    if (priceAlerts.length > 0) {
      const alert = priceAlerts[0];

      // Check if buyer has enough points and is not the seller
      if (alert.user_id !== userId && alert.points >= price) {
        // Transfer card ownership
        await connection.query(
          'UPDATE user_cards SET user_id = ? WHERE id = ?',
          [alert.user_id, cardId]
        );

        // Calculate fee (30%)
        const fee = Math.floor(price * 0.3);
        const sellerReceives = price - fee;

        // Update buyer points
        await connection.query(
          'UPDATE users SET points = points - ? WHERE id = ?',
          [price, alert.user_id]
        );

        // Update seller points
        await connection.query(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [sellerReceives, userId]
        );

        // Update listing status
        await connection.query(
          `UPDATE market_transactions
          SET status = 'SOLD', buyer_id = ?, sold_price = ?, sold_at = NOW()
          WHERE id = ?`,
          [alert.user_id, price, listingId]
        );

        // Update player market price
        const [recentTrades]: any = await connection.query(
          `SELECT sold_price, sold_at FROM market_transactions
          WHERE player_id = ? AND status = 'SOLD'
          ORDER BY sold_at DESC
          LIMIT 10`,
          [card.player_id]
        );

        if (recentTrades.length > 0) {
          let weightedSum = 0;
          let weightSum = 0;
          recentTrades.forEach((trade: any, index: number) => {
            const weight = 10 - index;
            weightedSum += trade.sold_price * weight;
            weightSum += weight;
          });
          const weightedAvgPrice = Math.round(weightedSum / weightSum);

          const [currentPriceInfo]: any = await connection.query(
            'SELECT current_price, price_floor, price_ceiling FROM player_market_prices WHERE player_id = ?',
            [card.player_id]
          );

          if (currentPriceInfo.length > 0) {
            const currentPrice = currentPriceInfo[0].current_price;
            const priceFloor = currentPriceInfo[0].price_floor;
            const priceCeiling = currentPriceInfo[0].price_ceiling;

            const maxIncrease = Math.round(currentPrice * 1.2);
            const maxDecrease = Math.round(currentPrice * 0.8);

            let newPrice = Math.min(maxIncrease, Math.max(maxDecrease, weightedAvgPrice));
            newPrice = Math.min(priceCeiling, Math.max(priceFloor, newPrice));

            await connection.query(
              `UPDATE player_market_prices
              SET current_price = ?, total_volume = total_volume + 1, last_traded_price = ?, last_traded_at = NOW()
              WHERE player_id = ?`,
              [newPrice, price, card.player_id]
            );

            await connection.query(
              'INSERT INTO price_history (player_id, price, transaction_id) VALUES (?, ?, ?)',
              [card.player_id, newPrice, listingId]
            );
          }
        }

        // Deactivate the price alert after successful purchase
        await connection.query(
          'UPDATE price_alerts SET is_active = FALSE WHERE id = ?',
          [alert.id]
        );

        autoSold = true;
        buyerUsername = alert.username;

        console.log(`Auto-purchased: ${card.player_name} by ${alert.username} at ${price}P (price alert)`);
      }
    }

    await connection.commit();

    if (autoSold) {
      res.json({
        success: true,
        message: `카드가 즉시 판매되었습니다! (구매자: ${buyerUsername})`,
        autoSold: true,
      });
    } else {
      res.json({
        success: true,
        message: '카드가 성공적으로 등록되었습니다.',
      });
    }
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
      `SELECT mt.*,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.name as player_name
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

    // Calculate fee (30%)
    const fee = Math.floor(listing.listing_price * 0.3);
    const sellerReceives = listing.listing_price - fee;

    // Update buyer points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [listing.listing_price, userId]
    );

    // Update seller points (price - 30% fee)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [sellerReceives, listing.seller_id]
    );

    // Update listing status
    await connection.query(
      `UPDATE market_transactions
      SET status = 'SOLD', buyer_id = ?, sold_price = ?, sold_at = NOW()
      WHERE id = ?`,
      [userId, listing.listing_price, listingId]
    );

    // Update player market price based on actual trades
    const [recentTrades]: any = await connection.query(
      `SELECT sold_price, sold_at FROM market_transactions
      WHERE player_id = ? AND status = 'SOLD'
      ORDER BY sold_at DESC
      LIMIT 10`,
      [listing.player_id]
    );

    let priceUpdateInfo: any = null;

    if (recentTrades.length > 0) {
      // 최근 거래가 가중 평균 (최신 거래에 더 높은 가중치)
      let weightedSum = 0;
      let weightSum = 0;
      recentTrades.forEach((trade: any, index: number) => {
        const weight = 10 - index; // 최신 거래일수록 높은 가중치 (10, 9, 8, ...)
        weightedSum += trade.sold_price * weight;
        weightSum += weight;
      });
      const weightedAvgPrice = Math.round(weightedSum / weightSum);

      // Get current price and limits
      const [priceInfo]: any = await connection.query(
        'SELECT current_price, price_floor, price_ceiling FROM player_market_prices WHERE player_id = ?',
        [listing.player_id]
      );

      const currentPrice = priceInfo[0].current_price;
      const priceFloor = priceInfo[0].price_floor;
      const priceCeiling = priceInfo[0].price_ceiling;

      // 가격 변동폭 제한 (한 번에 ±20% 이상 변동 불가)
      const maxIncrease = Math.round(currentPrice * 1.2);
      const maxDecrease = Math.round(currentPrice * 0.8);

      let newPrice = Math.min(maxIncrease, Math.max(maxDecrease, weightedAvgPrice));

      // 상한가/하한가 적용
      newPrice = Math.min(priceCeiling, Math.max(priceFloor, newPrice));

      // 가격 변동률 계산
      const priceChange = ((newPrice - currentPrice) / currentPrice * 100).toFixed(2);
      const isUpperLimit = newPrice >= priceCeiling;
      const isLowerLimit = newPrice <= priceFloor;

      await connection.query(
        `UPDATE player_market_prices
        SET current_price = ?, total_volume = total_volume + 1, last_traded_price = ?, last_traded_at = NOW()
        WHERE player_id = ?`,
        [newPrice, listing.listing_price, listing.player_id]
      );

      // Record price history with metadata
      await connection.query(
        'INSERT INTO price_history (player_id, price, transaction_id) VALUES (?, ?, ?)',
        [listing.player_id, newPrice, listingId]
      );

      console.log(`Price updated for player ${listing.player_id}: ${currentPrice} -> ${newPrice} (${priceChange}%)${isUpperLimit ? ' [상한가]' : isLowerLimit ? ' [하한가]' : ''}`);

      priceUpdateInfo = {
        oldPrice: currentPrice,
        newPrice: newPrice,
        change: priceChange,
        isUpperLimit: isUpperLimit,
        isLowerLimit: isLowerLimit,
      };
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${listing.player_name} 카드를 구매했습니다!`,
      data: {
        price: listing.listing_price,
        priceUpdate: priceUpdateInfo,
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
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
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

// Search all players with market info
router.get('/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      team,
      position,
      tier,
      season,
      minOverall,
      maxOverall,
      sortBy = 'overall_desc',
      limit = '50',
      offset = '0'
    } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.salary,
        p.region,
        p.season,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        pmp.current_price,
        pmp.price_floor,
        pmp.price_ceiling,
        pmp.total_volume,
        pmp.last_traded_price,
        pmp.last_traded_at,
        (SELECT MIN(listing_price) FROM market_transactions WHERE player_id = p.id AND status = 'LISTED') as lowest_price,
        (SELECT COUNT(*) FROM market_transactions WHERE player_id = p.id AND status = 'LISTED') as listing_count
      FROM players p
      LEFT JOIN player_market_prices pmp ON p.id = pmp.player_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Name filter
    if (name) {
      query += ' AND p.name LIKE ?';
      params.push(`%${name}%`);
    }

    // Team filter
    if (team && team !== 'ALL') {
      query += ' AND p.team = ?';
      params.push(team);
    }

    // Position filter
    if (position && position !== 'ALL') {
      query += ' AND p.position = ?';
      params.push(position);
    }

    // Tier filter
    if (tier && tier !== 'ALL') {
      if (tier === 'ICON') {
        query += " AND (p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%')";
      } else if (tier === 'COMMON') {
        query += " AND p.overall <= 80 AND p.season != 'ICON' AND p.team != 'ICON' AND p.name NOT LIKE '[ICON]%' AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'RARE') {
        query += " AND p.overall > 80 AND p.overall <= 90 AND p.season != 'ICON' AND p.team != 'ICON' AND p.name NOT LIKE '[ICON]%' AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'EPIC') {
        query += " AND p.overall > 90 AND p.overall <= 100 AND p.season != 'ICON' AND p.team != 'ICON' AND p.name NOT LIKE '[ICON]%' AND p.name NOT LIKE 'ICON%'";
      } else if (tier === 'LEGENDARY') {
        query += " AND p.overall > 100 AND p.season != 'ICON' AND p.team != 'ICON' AND p.name NOT LIKE '[ICON]%' AND p.name NOT LIKE 'ICON%'";
      }
    }

    // Season filter
    if (season && season !== 'ALL') {
      query += ' AND p.season = ?';
      params.push(season);
    }

    // Overall range filter
    if (minOverall) {
      query += ' AND p.overall >= ?';
      params.push(parseInt(minOverall as string));
    }
    if (maxOverall) {
      query += ' AND p.overall <= ?';
      params.push(parseInt(maxOverall as string));
    }

    // Sorting
    switch (sortBy) {
      case 'overall_desc':
        query += ' ORDER BY p.overall DESC';
        break;
      case 'overall_asc':
        query += ' ORDER BY p.overall ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY pmp.current_price IS NULL, pmp.current_price DESC';
        break;
      case 'price_asc':
        query += ' ORDER BY pmp.current_price IS NULL, pmp.current_price ASC';
        break;
      case 'listing_count':
        query += ' ORDER BY listing_count DESC';
        break;
      case 'latest':
        query += ' ORDER BY p.id DESC';
        break;
      default:
        query += ' ORDER BY p.overall DESC';
    }

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const [players]: any = await pool.query(query, params);

    res.json({ success: true, data: players });
  } catch (error: any) {
    console.error('Search players error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// Register price alert
router.post('/price-alert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { playerId, maxPrice } = req.body;

    if (!playerId || !maxPrice || maxPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 입력입니다.',
      });
    }

    // Check if player exists
    const [players]: any = await pool.query(
      'SELECT id FROM players WHERE id = ?',
      [playerId]
    );

    if (players.length === 0) {
      return res.status(404).json({
        success: false,
        error: '선수를 찾을 수 없습니다.',
      });
    }

    // Insert or update price alert
    await pool.query(
      `INSERT INTO price_alerts (user_id, player_id, max_price, is_active)
      VALUES (?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE max_price = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [userId, playerId, maxPrice, maxPrice]
    );

    res.json({
      success: true,
      message: '상한가 예약이 등록되었습니다.',
    });
  } catch (error: any) {
    console.error('Register price alert error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get my price alerts
router.get('/price-alerts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [alerts]: any = await pool.query(
      `SELECT
        pa.id,
        pa.player_id,
        pa.max_price,
        pa.is_active,
        pa.created_at,
        p.name,
        p.team,
        p.position,
        p.overall,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.season,
        pmp.current_price,
        (SELECT MIN(listing_price) FROM market_transactions WHERE player_id = p.id AND status = 'LISTED') as lowest_price
      FROM price_alerts pa
      JOIN players p ON pa.player_id = p.id
      LEFT JOIN player_market_prices pmp ON p.id = pmp.player_id
      WHERE pa.user_id = ?
      ORDER BY pa.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    console.error('Get price alerts error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete price alert
router.delete('/price-alert/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const [alerts]: any = await pool.query(
      'SELECT id FROM price_alerts WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (alerts.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.',
      });
    }

    // Delete alert
    await pool.query('DELETE FROM price_alerts WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '상한가 예약이 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete price alert error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Toggle price alert
router.patch('/price-alert/:id/toggle', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const [alerts]: any = await pool.query(
      'SELECT id, is_active FROM price_alerts WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (alerts.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.',
      });
    }

    // Toggle active status
    const newStatus = !alerts[0].is_active;
    await pool.query(
      'UPDATE price_alerts SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: newStatus ? '예약이 활성화되었습니다.' : '예약이 비활성화되었습니다.',
      data: { is_active: newStatus },
    });
  } catch (error: any) {
    console.error('Toggle price alert error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
