import express from 'express';
import pool from '../config/database';
import {updateMissionProgress} from '../utils/missionTracker';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 내 팩 인벤토리 조회
router.get('/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [packs]: any = await pool.query(
      `SELECT pack_type, quantity, received_at
       FROM user_packs
       WHERE user_id = ? AND quantity > 0 AND pack_type IN ('STANDARD','PREMIUM','EPIC','LEGENDARY')
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

    if (!['STANDARD','PREMIUM','EPIC','LEGENDARY'].includes(packType) || !Number.isSafeInteger(count) || count < 1 || count > 10) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid pack type or count' });
    }

    // Check if user has enough packs
    const [userPacks]: any = await connection.query(
      'SELECT quantity FROM user_packs WHERE user_id = ? AND pack_type = ? FOR UPDATE',
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
    await updateMissionProgress(userId,'pack_open',count).catch(e=>console.error('Pack mission:',e));
    // Card-collect missions receive the actual number of cards opened.
    // pack_open dispatches one collect event per opened pack, so award extras here.
    if(cards.length>count) await updateMissionProgress(userId,'card_collect',cards.length-count)
      .catch(e=>console.error('Card collection mission:',e));
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
    EPIC: {
      cardCount: 5,
      minOverall: 85,
      maxOverall: 105,
      guaranteedEpic: true,
    },
  };

  return configs[packType];
}

// Open a single pack
async function openSinglePack(connection: any, userId: number, config: any) {
  const cards = [];
  const drawnPlayers: number[] = [];
  const validSeasons = ['26 LIVE','26WR','26WRs'];
  for (let i = 0; i < config.cardCount; i++) {
    let minOverall = config.minOverall;
    let maxOverall = config.maxOverall;
    if (i === 0 && config.guaranteedEpic) { minOverall=91; maxOverall=999; }
    else if (i === 0 && config.guaranteedRare) { minOverall=81; maxOverall=100; }

    // Prefer the advertised OVR interval and unique players within one pack.
    const search = async (bounded: boolean, unique: boolean) => {
      const conditions = ["season IN ('26 LIVE','26WR','26WRs')"];
      const params: any[] = [];
      if (bounded) {
        conditions.push('overall>=? AND overall<=?');
        params.push(minOverall,maxOverall);
      }
      if (unique && drawnPlayers.length) {
        conditions.push('id NOT IN (?)');
        params.push(drawnPlayers);
      }
      const [rows]: any = await connection.query(
        `SELECT * FROM players WHERE ${conditions.join(' AND ')} ORDER BY RAND() LIMIT 1`,params
      );
      return rows;
    };
    let players = await search(true,true);
    if (!players.length) players = await search(false,true);
    if (!players.length) players = await search(true,false);
    if (!players.length) players = await search(false,false);
    if (!players.length) {
      throw new Error('26 시즌 팩에서 뽑을 선수 정보가 없습니다. 선수 DB를 확인해주세요.');
    }
    const player=players[0];
    drawnPlayers.push(Number(player.id));
    const [result]: any = await connection.query(
      'INSERT INTO user_cards (user_id,player_id,level) VALUES (?,?,0)',
      [userId,player.id]
    );
    await connection.query(
      `INSERT INTO user_collected_cards (user_id,player_id,total_obtained) VALUES (?,?,1)
       ON DUPLICATE KEY UPDATE total_obtained=total_obtained+1`,
      [userId,player.id]
    );
    cards.push({
      id:result.insertId,player_id:player.id,name:player.name,team:player.team,
      position:player.position,overall:player.overall,season:player.season,
      nationality: player.nationality || null,
      imageUrl: player.image_url || null,
      salary:player.salary,tier:calculateTier(player.overall,player.season),level:0
    });
  }
  return cards;
}

// Calculate tier based on overall and season
function calculateTier(overall: number, season: string): string {
  if (overall >= 101) return 'LEGENDARY';
  if (overall >= 91) return 'EPIC';
  if (overall >= 81) return 'RARE';
  return 'COMMON';
}

export default router;
