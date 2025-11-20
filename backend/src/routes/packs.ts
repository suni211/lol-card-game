import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 내 팩 인벤토리 조회
router.get('/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [packs]: any = await pool.query(
      `SELECT pack_type, quantity, received_at
       FROM user_packs
       WHERE user_id = ? AND quantity > 0
       ORDER BY received_at DESC`,
      [userId]
    );

    res.json({ success: true, data: packs });
  } catch (error: any) {
    console.error('Get pack inventory error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 팩 개봉
router.post('/open', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { packType, count = 1 } = req.body;

    if (!packType || count < 1) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid pack type or count' });
    }

    // Check if user has enough packs
    const [userPacks]: any = await connection.query(
      'SELECT quantity FROM user_packs WHERE user_id = ? AND pack_type = ?',
      [userId, packType]
    );

    if (userPacks.length === 0 || userPacks[0].quantity < count) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Not enough packs' });
    }

    // Reduce pack quantity
    await connection.query(
      'UPDATE user_packs SET quantity = quantity - ? WHERE user_id = ? AND pack_type = ?',
      [count, userId, packType]
    );

    // Open packs and get cards based on pack type
    const cards = [];
    const packConfig = getPackConfig(packType);

    for (let i = 0; i < count; i++) {
      const packCards = await openSinglePack(connection, userId, packConfig);
      cards.push(...packCards);
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        cards,
        totalCards: cards.length,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Open pack error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Pack configuration
function getPackConfig(packType: string) {
  const configs: any = {
    STANDARD: {
      cardCount: 5,
      minOverall: 50,
      maxOverall: 90,
      guaranteedRare: false,
    },
    PREMIUM: {
      cardCount: 5,
      minOverall: 70,
      maxOverall: 100,
      guaranteedRare: true,
    },
    LEGENDARY: {
      cardCount: 5,
      minOverall: 100,
      maxOverall: 999,
      guaranteedEpic: true,
    },
    ICON: {
      cardCount: 1,
      iconOnly: true,
    },
  };

  return configs[packType] || configs.STANDARD;
}

// Open a single pack
async function openSinglePack(connection: any, userId: number, config: any) {
  const cards = [];

  for (let i = 0; i < config.cardCount; i++) {
    let players: any;

    // ICON pack - get random ICON card
    if (config.iconOnly) {
      [players] = await connection.query(
        `SELECT * FROM players
         WHERE season = 'ICON'
         ORDER BY RAND()
         LIMIT 1`
      );
    } else {
      let minOverall = config.minOverall;
      let maxOverall = config.maxOverall;

      // Guarantee specific tier on certain cards
      if (i === 0 && config.guaranteedEpic) {
        minOverall = 91;
        maxOverall = 999;
      } else if (i === 0 && config.guaranteedRare) {
        minOverall = 81;
        maxOverall = 100;
      }

      // Get random card
      [players] = await connection.query(
        `SELECT * FROM players
         WHERE overall >= ?
           AND overall <= ?
           AND season != 'ICON'
           AND name NOT LIKE 'ICON%'
           AND name NOT LIKE '17SSG%'
           AND name NOT LIKE '25WW%'
           AND name NOT LIKE '25WUD%'
         ORDER BY RAND()
         LIMIT 1`,
        [minOverall, maxOverall]
      );
    }

    if (players.length > 0) {
      const player = players[0];

      // Add card to user
      const [result]: any = await connection.query(
        'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
        [userId, player.id]
      );

      cards.push({
        id: result.insertId,
        player_id: player.id,
        name: player.name,
        team: player.team,
        position: player.position,
        overall: player.overall,
        season: player.season,
        salary: player.salary,
        tier: calculateTier(player.overall, player.season),
        level: 0,
      });
    }
  }

  return cards;
}

// Calculate tier based on overall and season
function calculateTier(overall: number, season: string): string {
  if (season === 'ICON' || (season && season.startsWith('ICON'))) {
    return 'ICON';
  }
  if (overall >= 101) return 'LEGENDARY';
  if (overall >= 91) return 'EPIC';
  if (overall >= 81) return 'RARE';
  return 'COMMON';
}

export default router;
