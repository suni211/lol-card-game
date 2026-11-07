import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

type Mode = 'AI' | 'RANKED';
type Choice = 'ROCK' | 'PAPER' | 'SCISSORS';
const CHOICES: Choice[] = ['ROCK', 'PAPER', 'SCISSORS'];
const SLOTS = ['top_card_id', 'jungle_card_id', 'mid_card_id', 'adc_card_id', 'support_card_id'] as const;
const BATTLE_BONUS = 0.25;

const asJson = <T>(value: any, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

async function getTeam(connection: any, userId: number, deckSlot = 1) {
  // Prefer the saved deck, but automatically complete a five-player team
  // from owned cards. Original positions have no restrictions or penalties.
  const [decks]: any = await connection.query(
    'SELECT * FROM decks WHERE user_id=? AND deck_slot=? ORDER BY id LIMIT 1',
    [userId, deckSlot]
  );
  const selectedIds = decks.length ? SLOTS.map(slot => Number(decks[0][slot] || 0)) : [];
  const [cards]: any = await connection.query(
    `SELECT uc.id AS card_id,uc.player_id,uc.level,p.name,p.team,p.position,p.season,p.overall
     FROM user_cards uc JOIN players p ON p.id=uc.player_id
     WHERE uc.user_id=? ORDER BY p.overall DESC,uc.level DESC,uc.id ASC`,
    [userId]
  );
  const byCard = new Map<number, any>(cards.map((card: any) => [Number(card.card_id), card]));
  const result: any[] = [];
  const seenCardIds = new Set<number>();
  const add = (card: any) => {
    // Distinct owned card copies count separately; never reuse the same inventory ID.
    if (!card || seenCardIds.has(Number(card.card_id)) || result.length >= 5) return;
    seenCardIds.add(Number(card.card_id));
    result.push({
      cardId: Number(card.card_id), playerId: Number(card.player_id),
      name: card.name, team: card.team, position: card.position,
      season: card.season, overall: Number(card.overall),
      level: Number(card.level) || 0
    });
  };
  selectedIds.forEach(id => add(byCard.get(id)));
  cards.forEach(add);
  if (result.length !== 5) {
    throw new Error('보유 선수 카드 5장이 필요합니다. 팩을 개봉하고 다시 시도해주세요.');
  }
  const power = result.reduce((total, card) => total + card.overall + card.level * 2, 0);
  return { players: result, power, deckId: decks.length ? Number(decks[0].id) : null };
}

const present = (series: any) => series ? {
  id: Number(series.id), mode: series.mode as Mode,
  playerPower: Number(series.player_power), opponentPower: Number(series.opponent_power),
  wins: Number(series.wins), losses: Number(series.losses), status: series.status,
  rounds: asJson(series.rounds_json, []), roster: asJson(series.roster_json, []),
  ratingDelta: Number(series.rating_delta), pointsReward: Number(series.points_reward),
} : null;

router.get('/current', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const slot = Number(req.query.deckSlot || 1);
    const [existing]: any = await pool.query(
      "SELECT * FROM ranked_bo3_series WHERE user_id=? AND status='ACTIVE' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    let team = null;
    let teamError: string | null = null;
    try {
      team = await getTeam(pool, userId, Number.isInteger(slot) && slot >= 1 && slot <= 5 ? slot : 1);
    } catch (error: any) { teamError = String(error.message || error); }
    return res.json({ success: true, data: {
      series: present(existing[0]), preview: team, teamError
    }});
  } catch (error) {
    console.error('OVR match status error:', error);
    return res.status(500).json({ success: false, error: '경쟁전 상태를 불러오지 못했습니다. DB 마이그레이션을 확인하세요.' });
  }
});

router.post('/start', async (req: AuthRequest, res: Response) => {
  const mode: Mode = req.body?.mode;
  const deckSlot = Number(req.body?.deckSlot || 1);
  if (!['AI', 'RANKED'].includes(mode) || !Number.isInteger(deckSlot) || deckSlot < 1 || deckSlot > 5) {
    return res.status(400).json({ success: false, error: '경기 종류 또는 덱 슬롯이 올바르지 않습니다.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userId = req.user!.id;
    const [users]: any = await conn.query('SELECT id FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!users.length) {
      await conn.rollback();
      return res.status(404).json({success:false,error:'사용자를 찾을 수 없습니다.'});
    }
    const [active]: any = await conn.query(
      "SELECT * FROM ranked_bo3_series WHERE user_id=? AND status='ACTIVE' ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [userId]
    );
    if (active.length) {
      await conn.commit();
      return res.json({success:true,resumed:true,data:present(active[0])});
    }
    const team = await getTeam(conn, userId, deckSlot);
    // Random OVR opponents are generated without using any Python match engine.
    // A stronger five-player team has a measurable advantage.
    const opponentPower = mode === 'AI'
      ? 340 + Math.floor(Math.random() * 191)  // 340 .. 530
      : 370 + Math.floor(Math.random() * 211); // 370 .. 580
    const [result]: any = await conn.query(
      `INSERT INTO ranked_bo3_series
       (user_id,deck_id,mode,roster_json,player_power,opponent_power,rounds_json,status)
       VALUES (?,?,?,?,?,?,'[]','ACTIVE')`,
      [userId, team.deckId, mode, JSON.stringify(team.players), team.power, opponentPower]
    );
    const [rows]: any = await conn.query('SELECT * FROM ranked_bo3_series WHERE id=?', [result.insertId]);
    await conn.commit();
    return res.json({success:true,data:present(rows[0])});
  } catch (error: any) {
    await conn.rollback();
    console.error('OVR match start error:', error);
    return res.status(error?.message?.includes('선수 카드 5장') ? 400 : 500)
      .json({success:false,error:error.message || '경기 시작 실패'});
  } finally { conn.release(); }
});

router.post('/:id/play', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const choice: Choice = req.body?.choice;
  if (!Number.isSafeInteger(id) || id < 1 || !CHOICES.includes(choice)) {
    return res.status(400).json({success:false,error:'경기 번호와 가위·바위·보를 선택해주세요.'});
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]: any = await conn.query(
      'SELECT * FROM ranked_bo3_series WHERE id=? AND user_id=? FOR UPDATE',
      [id, req.user!.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({success:false,error:'경기를 찾을 수 없습니다.'});
    }
    const game = rows[0];
    if (game.status !== 'ACTIVE') {
      await conn.rollback();
      return res.status(409).json({success:false,error:'이미 종료된 경기입니다.'});
    }

    const opponent: Choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    const rps = choice === opponent ? 0
      : (choice === 'ROCK' && opponent === 'SCISSORS') ||
        (choice === 'SCISSORS' && opponent === 'PAPER') ||
        (choice === 'PAPER' && opponent === 'ROCK') ? 1 : -1;
    // RPS wins grant +25% OVR, losses -25%; ties use original OVR.
    // Both sides also roll a small independent round modifier (±5%).
    const rollPlayer = 0.95 + Math.random() * 0.1;
    const rollOpponent = 0.95 + Math.random() * 0.1;
    const playerScore = Math.round(Number(game.player_power) * (1 + rps * BATTLE_BONUS) * rollPlayer);
    const opponentScore = Math.round(Number(game.opponent_power) * (1 - rps * BATTLE_BONUS) * rollOpponent);
    const won = playerScore === opponentScore ? (rps > 0 ? true : rps < 0 ? false : Math.random() < 0.5)
      : playerScore > opponentScore;
    const rounds = asJson<any[]>(game.rounds_json, []);
    rounds.push({
      round: rounds.length + 1, choice, opponentChoice: opponent,
      rps: rps > 0 ? 'WIN' : rps < 0 ? 'LOSE' : 'TIE',
      playerScore, opponentScore, won
    });
    const wins = Number(game.wins) + (won ? 1 : 0);
    const losses = Number(game.losses) + (won ? 0 : 1);
    const finished = wins === 2 || losses === 2;
    const status = finished ? (wins === 2 ? 'WIN' : 'LOSE') : 'ACTIVE';
    const ranked = game.mode === 'RANKED';
    const ratingDelta = finished && ranked ? (wins === 2 ? 25 : -20) : 0;
    const pointsReward = finished ? (ranked ? (wins === 2 ? 350 : 100) : (wins === 2 ? 200 : 80)) : 0;

    await conn.query(
      `UPDATE ranked_bo3_series
       SET wins=?,losses=?,rounds_json=?,status=?,rating_delta=?,points_reward=? WHERE id=?`,
      [wins,losses,JSON.stringify(rounds),status,ratingDelta,pointsReward,id]
    );
    if (finished) {
      await conn.query(
        'UPDATE users SET points=points+?,rating=GREATEST(0,rating+?) WHERE id=?',
        [pointsReward,ratingDelta,req.user!.id]
      );
      await conn.query(
        `INSERT INTO user_stats (user_id,total_matches,wins,losses,current_streak,longest_win_streak)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE total_matches=total_matches+1,
           wins=wins+VALUES(wins),losses=losses+VALUES(losses),
           current_streak=IF(VALUES(wins)=1,current_streak+1,0),
           longest_win_streak=GREATEST(longest_win_streak,
             IF(VALUES(wins)=1,current_streak+1,0))`,
        [req.user!.id,1,wins===2?1:0,wins===2?0:1,wins===2?1:0,wins===2?1:0]
      );
    }
    const [latest]: any = await conn.query('SELECT * FROM ranked_bo3_series WHERE id=?',[id]);
    await conn.commit();
    return res.json({success:true,data:present(latest[0])});
  } catch(error) {
    await conn.rollback();
    console.error('OVR match round error:',error);
    return res.status(500).json({success:false,error:'경기 판정 실패'});
  } finally { conn.release(); }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT id,mode,player_power,opponent_power,wins,losses,status,rating_delta,points_reward,created_at FROM ranked_bo3_series WHERE user_id=? AND status<>'ACTIVE' ORDER BY id DESC LIMIT 15",
      [req.user!.id]
    );
    return res.json({success:true,data:rows});
  } catch(error) {
    console.error('OVR match history error:',error);
    return res.status(500).json({success:false,error:'전적을 불러오지 못했습니다.'});
  }
});

export default router;
