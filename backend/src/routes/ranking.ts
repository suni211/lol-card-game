import express from 'express';
import pool from '../config/database';
import {authMiddleware,AuthRequest} from '../middleware/auth';
import { calculateTier } from '../utils/rankTier';

const router = express.Router();

// Competitive leaderboard: wins/losses come exclusively from completed real PvP
// matches. Ranked rating is the users.rating value updated by PvP results.
// AI and campaign matches do not count toward the competitive win percentage.
const pvpStatsJoin = `
  LEFT JOIN (
    SELECT records.user_id,
           SUM(records.is_win) AS wins,
           COUNT(*) - SUM(records.is_win) AS losses,
           COUNT(*) AS total_matches
    FROM (
      SELECT player1_id AS user_id,
             IF(winner_id=player1_id,1,0) AS is_win
      FROM competitive_matches_v2 WHERE status='COMPLETED'
      UNION ALL
      SELECT player2_id AS user_id,
             IF(winner_id=player2_id,1,0) AS is_win
      FROM competitive_matches_v2 WHERE status='COMPLETED'
    ) records
    GROUP BY records.user_id
  ) pvp ON pvp.user_id=u.id
`;

// Get live player rankings.
router.get('/', async (req, res) => {
  try {
    const requested = Number.parseInt(String(req.query.limit || '100'),10);
    const limit = Math.max(1, Math.min(Number.isFinite(requested)?requested:100,100));

    const [users]: any = await pool.query(`
      SELECT
        u.id,u.username,u.tier,u.rating,
        t.id AS title_id,t.name AS title_name,t.color AS title_color,
        t.icon AS title_icon,t.rarity AS title_rarity,
        COALESCE(pvp.wins,0) AS wins,
        COALESCE(pvp.losses,0) AS losses,
        COALESCE(pvp.total_matches,0) AS total_matches,
        ROUND(100 * COALESCE(pvp.wins,0) /
          NULLIF(COALESCE(pvp.total_matches,0),0),1) AS win_rate,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id=u.id) AS total_cards,
        (SELECT COUNT(*) FROM user_cards uc JOIN players p ON uc.player_id=p.id
         WHERE uc.user_id=u.id AND p.season<>'ICON' AND p.overall>100) AS legendary_cards
      FROM users u
      LEFT JOIN titles t ON u.equipped_title_id=t.id
      ${pvpStatsJoin}
      WHERE u.is_admin=FALSE AND u.is_active=TRUE AND u.username NOT LIKE 'AI_%'
      ORDER BY u.rating DESC,u.id ASC
      LIMIT ?`,[limit]);

    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:users.map((user:any,index:number)=>({
      rank:index+1,userId:Number(user.id),username:user.username,
      tier:calculateTier(Number(user.rating)),rating:Number(user.rating),
      wins:Number(user.wins)||0,losses:Number(user.losses)||0,
      totalMatches:Number(user.total_matches)||0,
      winRate:Number(user.win_rate)||0,
      currentStreak:0,longestWinStreak:0,
      totalCards:Number(user.total_cards)||0,
      legendaryCards:Number(user.legendary_cards)||0,
      title_id:user.title_id||null,title_name:user.title_name||null,
      title_color:user.title_color||null,title_icon:user.title_icon||null,
      title_rarity:user.title_rarity||null
    }))});
  }catch(error:any){
    console.error('Competitive leaderboard error:',error);
    return res.status(500).json({success:false,error:'플레이어 랭킹을 불러올 수 없습니다. PvP DB 마이그레이션을 확인해주세요.'});
  }
});

// Current user's leaderboard position, including users outside the top 100.
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id=req.user!.id;
    const [rows]:any=await pool.query(
      `SELECT u.id,u.rating,COALESCE(pvp.wins,0) AS wins,
              COALESCE(pvp.losses,0) AS losses
       FROM users u ${pvpStatsJoin} WHERE u.id=? AND u.is_active=TRUE`,
      [id]
    );
    if(!rows.length)return res.status(404).json({success:false,error:'사용자를 찾을 수 없습니다.'});
    const user=rows[0];
    // The same deterministic ordering as /ranking: rating DESC, user id ASC.
    const [[rank]]:any=await pool.query(
      `SELECT COUNT(*)+1 AS rank FROM users
       WHERE is_admin=FALSE AND is_active=TRUE AND username NOT LIKE 'AI_%'
         AND (rating>? OR (rating=? AND id<?))`,
      [user.rating,user.rating,id]
    );
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:{
      rank:Number(rank.rank),rating:Number(user.rating),
      tier:calculateTier(Number(user.rating)),wins:Number(user.wins)||0,
      losses:Number(user.losses)||0
    }});
  }catch(error){
    console.error('Own competitive rank error:',error);
    return res.status(500).json({success:false,error:'내 경쟁전 순위를 불러올 수 없습니다.'});
  }
});

// Get most used cards
router.get('/popular-cards', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [cards]: any = await pool.query(`
      SELECT
        p.id,
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
        p.region,
        COUNT(DISTINCT d.user_id) as usage_count,
        COUNT(DISTINCT d.id) as deck_count
      FROM players p
      JOIN (
        SELECT user_id, top_card_id as card_id, id FROM decks WHERE top_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, jungle_card_id as card_id, id FROM decks WHERE jungle_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, mid_card_id as card_id, id FROM decks WHERE mid_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, adc_card_id as card_id, id FROM decks WHERE adc_card_id IS NOT NULL
        UNION ALL
        SELECT user_id, support_card_id as card_id, id FROM decks WHERE support_card_id IS NOT NULL
      ) d ON p.id IN (
        SELECT player_id FROM user_cards WHERE id = d.card_id
      )
      GROUP BY p.id, p.name, p.team, p.position, p.overall, tier, p.season, p.region
      ORDER BY usage_count DESC, deck_count DESC
      LIMIT ?
    `, [parseInt(limit as string)]);

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('Get popular cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get most used cards by position
router.get('/popular-cards/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const { limit = 10 } = req.query;

    const validPositions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    if (!validPositions.includes(position.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Invalid position' });
    }

    let cardIdField = '';
    switch (position.toUpperCase()) {
      case 'TOP': cardIdField = 'top_card_id'; break;
      case 'JUNGLE': cardIdField = 'jungle_card_id'; break;
      case 'MID': cardIdField = 'mid_card_id'; break;
      case 'ADC': cardIdField = 'adc_card_id'; break;
      case 'SUPPORT': cardIdField = 'support_card_id'; break;
    }

    const [cards]: any = await pool.query(`
      SELECT
        p.id,
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
        p.region,
        COUNT(DISTINCT d.user_id) as usage_count,
        COUNT(d.id) as deck_count
      FROM players p
      JOIN user_cards uc ON p.id = uc.player_id
      JOIN decks d ON uc.id = d.${cardIdField}
      WHERE p.position = ?
      GROUP BY p.id, p.name, p.team, p.position, p.overall, tier, p.season, p.region
      ORDER BY usage_count DESC, deck_count DESC
      LIMIT ?
    `, [position.toUpperCase(), parseInt(limit as string)]);

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('Get popular cards by position error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get top rated decks
router.get('/top-decks', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [decks]: any = await pool.query(`
      SELECT
        d.id as deck_id,
        d.user_id,
        u.username,
        u.rating,
        u.tier,
        d.laning_strategy,
        d.teamfight_strategy,
        d.macro_strategy,
        top_p.name as top_name,
        top_p.team as top_team,
        top_p.overall as top_overall,
        CASE
          WHEN top_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN top_p.overall <= 80 THEN 'COMMON'
          WHEN top_p.overall <= 90 THEN 'RARE'
          WHEN top_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as top_tier,
        jungle_p.name as jungle_name,
        jungle_p.team as jungle_team,
        jungle_p.overall as jungle_overall,
        CASE
          WHEN jungle_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN jungle_p.overall <= 80 THEN 'COMMON'
          WHEN jungle_p.overall <= 90 THEN 'RARE'
          WHEN jungle_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as jungle_tier,
        mid_p.name as mid_name,
        mid_p.team as mid_team,
        mid_p.overall as mid_overall,
        CASE
          WHEN mid_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN mid_p.overall <= 80 THEN 'COMMON'
          WHEN mid_p.overall <= 90 THEN 'RARE'
          WHEN mid_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as mid_tier,
        adc_p.name as adc_name,
        adc_p.team as adc_team,
        adc_p.overall as adc_overall,
        CASE
          WHEN adc_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN adc_p.overall <= 80 THEN 'COMMON'
          WHEN adc_p.overall <= 90 THEN 'RARE'
          WHEN adc_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as adc_tier,
        support_p.name as support_name,
        support_p.team as support_team,
        support_p.overall as support_overall,
        CASE
          WHEN support_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN support_p.overall <= 80 THEN 'COMMON'
          WHEN support_p.overall <= 90 THEN 'RARE'
          WHEN support_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as support_tier
      FROM decks d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN user_cards top_uc ON d.top_card_id = top_uc.id
      LEFT JOIN players top_p ON top_uc.player_id = top_p.id
      LEFT JOIN user_cards jungle_uc ON d.jungle_card_id = jungle_uc.id
      LEFT JOIN players jungle_p ON jungle_uc.player_id = jungle_p.id
      LEFT JOIN user_cards mid_uc ON d.mid_card_id = mid_uc.id
      LEFT JOIN players mid_p ON mid_uc.player_id = mid_p.id
      LEFT JOIN user_cards adc_uc ON d.adc_card_id = adc_uc.id
      LEFT JOIN players adc_p ON adc_uc.player_id = adc_p.id
      LEFT JOIN user_cards support_uc ON d.support_card_id = support_uc.id
      LEFT JOIN players support_p ON support_uc.player_id = support_p.id
      WHERE u.is_admin = FALSE AND u.is_active = TRUE
        AND d.top_card_id IS NOT NULL
        AND d.jungle_card_id IS NOT NULL
        AND d.mid_card_id IS NOT NULL
        AND d.adc_card_id IS NOT NULL
        AND d.support_card_id IS NOT NULL
      ORDER BY u.rating DESC
      LIMIT ?
    `, [parseInt(limit as string)]);

    const formattedDecks = decks.map((deck: any, index: number) => ({
      rank: index + 1,
      deckId: deck.deck_id,
      username: deck.username,
      rating: deck.rating,
      tier: deck.tier,
      deckName: deck.deck_name,
      strategies: {
        laning: deck.laning_strategy,
        teamfight: deck.teamfight_strategy,
        macro: deck.macro_strategy,
      },
      cards: {
        top: { name: deck.top_name, team: deck.top_team, overall: deck.top_overall, tier: deck.top_tier },
        jungle: { name: deck.jungle_name, team: deck.jungle_team, overall: deck.jungle_overall, tier: deck.jungle_tier },
        mid: { name: deck.mid_name, team: deck.mid_team, overall: deck.mid_overall, tier: deck.mid_tier },
        adc: { name: deck.adc_name, team: deck.adc_team, overall: deck.adc_overall, tier: deck.adc_tier },
        support: { name: deck.support_name, team: deck.support_team, overall: deck.support_overall, tier: deck.support_tier },
      },
    }));

    res.json({ success: true, data: formattedDecks });
  } catch (error: any) {
    console.error('Get top decks error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
