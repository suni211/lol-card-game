import express, { Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

const ENGINE_DIR = process.env.RIFT_ENGINE_DIR || path.resolve(__dirname, '../../rift-engine');
const PYTHON = process.env.RIFT_PYTHON || 'python3';
const WORKERS = Math.max(1, Math.min(2, Number(process.env.RIFT_MAX_WORKERS || 1)));
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
const PLAN_DEFAULT = { laning: 'SAFE', teamfight: 'PROTECT', macro: 'OBJECTIVE' };
type Plan = { laning: string; teamfight: string; macro: string };
let running = 0;

function decode<T>(data: any, fallback: T): T {
  if (data == null) return fallback;
  if (typeof data !== 'string') return data as T;
  try { return JSON.parse(data) as T; } catch { return fallback; }
}
function planValid(plan: any): plan is Plan {
  return plan && typeof plan === 'object'
    && ['AGGRESSIVE', 'SAFE', 'SCALING'].includes(plan.laning)
    && ['ENGAGE', 'PROTECT', 'KITE'].includes(plan.teamfight)
    && ['OBJECTIVE', 'VISION', 'SPLITPUSH'].includes(plan.macro);
}
function validSlot(raw: unknown): number | null {
  const slot = Number(raw);
  return Number.isInteger(slot) && slot >= 1 && slot <= 5 ? slot : null;
}
function engine(input: object, maxMs = 20000): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, ['-u', path.join(ENGINE_DIR, 'bridge.py')], {
      cwd: ENGINE_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
    let stdout = '', stderr = '', settled = false;
    const done = (error?: Error, data?: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error); else resolve(data);
    };
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      done(new Error('RIFT 매치 엔진 타임아웃'));
    }, maxMs);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += String(chunk);
      if (stdout.length > 2_000_000) child.kill('SIGKILL');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + String(chunk)).slice(-4000);
    });
    child.on('error', (err: Error) => done(err));
    child.on('close', (code: number | null) => {
      if (code !== 0) return done(new Error(stderr || stdout.slice(0, 600) || '엔진 실패'));
      try {
        const result = JSON.parse(stdout);
        if (!result.success) throw new Error(result.error || '엔진 오류');
        done(undefined, result.data);
      } catch (e) { done(e as Error); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(input));
  });
}

async function ownedDeckCards(userId: number, slot: number): Promise<any[]> {
  const [decks]: any = await pool.query(
    'SELECT * FROM decks WHERE user_id=? AND deck_slot=? LIMIT 1', [userId, slot]);
  if (!decks.length) throw new Error('덱이 없습니다.');
  const cards: any[] = [];
  for (const role of ROLES) {
    const id = decks[0][role.toLowerCase() + '_card_id'];
    if (!id) throw new Error('5개 포지션을 모두 채워야 합니다.');
    const [rows]: any = await pool.query(
      'SELECT p.id,p.name,p.position,p.overall FROM user_cards uc JOIN players p ON uc.player_id=p.id WHERE uc.id=? AND uc.user_id=? AND p.position=? LIMIT 1',
      [id, userId, role]);
    if (!rows.length) throw new Error(role + ' 선수 카드 소유권이나 포지션을 확인하세요.');
    cards.push(rows[0]);
  }
  return cards;
}
async function opponentCards(): Promise<any[]> {
  const result = [];
  for (const position of ROLES) {
    const [rows]: any = await pool.query(
      "SELECT id,name,position,overall FROM players WHERE season='26 LIVE' AND position=? ORDER BY RAND() LIMIT 1",
      [position]);
    if (!rows.length) throw new Error('26 LIVE 선수 DB를 먼저 설치하세요.');
    result.push(rows[0]);
  }
  return result;
}
async function findSession(id: string, userId: number) {
  if (!/^\d+$/.test(id)) throw new Error('잘못된 경기 번호');
  const [rows]: any = await pool.query('SELECT * FROM rift_games WHERE id=? LIMIT 1', [id]);
  if (!rows.length) throw new Error('경기를 찾을 수 없습니다.');
  const game = rows[0];
  if (Number(game.owner_id) !== userId && Number(game.opponent_id) !== userId) {
    throw new Error('경기 접근 권한이 없습니다.');
  }
  return game;
}
async function pump(): Promise<void> {
  if (running >= WORKERS) return;
  let rows: any;
  try {
    [rows] = await pool.query("SELECT id FROM rift_games WHERE status='QUEUED' ORDER BY id LIMIT 1");
    if (!rows.length) return;
  } catch { return; }
  const id = Number(rows[0].id);
  const [claimed]: any = await pool.query(
    "UPDATE rift_games SET status='RUNNING' WHERE id=? AND status='QUEUED'", [id]);
  if (!claimed.affectedRows) return;
  running++;
  try {
    const [sessions]: any = await pool.query('SELECT * FROM rift_games WHERE id=?', [id]);
    const game = sessions[0];
    const result = await engine({
      operation: 'simulate',
      roster: decode(game.roster_json, null),
      teams: decode(game.teams_json, []),
      strategies: decode(game.strategies_json, []),
      seed: id * 37 + 17,
    }, 360000);
    if (!result.finished || (result.winnerTeam !== 0 && result.winnerTeam !== 1)) {
      throw new Error('넥서스가 파괴되지 않은 경기는 승패로 처리하지 않습니다.');
    }
    const cx = await pool.getConnection();
    try {
      await cx.beginTransaction();
      const [locked]: any = await cx.query('SELECT status FROM rift_games WHERE id=? FOR UPDATE', [id]);
      if (locked[0]?.status !== 'RUNNING') { await cx.rollback(); return; }
      await cx.query(
        "UPDATE rift_games SET status='FINISHED',result_json=?,winner_team=?,finished_at=NOW() WHERE id=?",
        [JSON.stringify(result), result.winnerTeam, id]);
      const users = [game.owner_id, game.opponent_id];
      for (let team = 0; team < 2; team++) {
        const uid = users[team];
        if (!uid) continue;
        const won = team === result.winnerTeam;
        const prize = won ? 100 : 50;
        const rating = game.mode === 'PVP' ? (won ? 15 : -15) : 0;
        await cx.query(
          `INSERT INTO user_stats (user_id,total_matches,wins,losses,current_streak,longest_win_streak)
             VALUES (?,?,?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE total_matches=total_matches+1,
               wins=wins+VALUES(wins),losses=losses+VALUES(losses),
               current_streak=IF(VALUES(wins)=1,current_streak+1,0),
               longest_win_streak=GREATEST(longest_win_streak,IF(VALUES(wins)=1,current_streak+1,0))`,
          [uid,1,won?1:0,won?0:1,won?1:0,won?1:0]);
        await cx.query('UPDATE users SET points=points+?,rating=GREATEST(0,rating+?) WHERE id=?',
          [prize,rating,uid]);
        if (game.mode === 'AI') {
          await cx.query(
            "INSERT INTO user_stats_history (user_id,battle_type,result,points_change,ai_difficulty) VALUES (?,'AI',?,?,?)",
            [uid,won?'WIN':'LOSE',prize,80]);
        }
      }
      await cx.commit();
    } catch (error) { await cx.rollback(); throw error; }
    finally { cx.release(); }
  } catch (error: any) {
    console.error('[RIFT] match failed', id, error);
    await pool.query(
      "UPDATE rift_games SET status='FAILED',error_message=? WHERE id=? AND status='RUNNING'",
      [String(error.message || error).slice(0,500), id]).catch(console.error);
  } finally {
    running--;
    void pump();
  }
}
setTimeout(() => {
  void pool.query(
    "UPDATE rift_games SET status='QUEUED' WHERE status='RUNNING' AND updated_at < DATE_SUB(NOW(),INTERVAL 10 MINUTE)"
  ).catch(() => {});
  void pump();
}, 5000).unref();
setInterval(() => { void pump(); }, 10000).unref();

router.get('/health', async (_req, res) => {
  try {
    const draft = await engine({ operation: 'draft', mode: 'AI', actions: [] });
    res.json({ success: true, ready: true, champions: draft.champions.length, workers: WORKERS });
  } catch (error: any) {
    res.status(503).json({ success: false, ready: false, error: error.message });
  }
});
router.post('/sessions', async (req: AuthRequest, res: Response) => {
  const owner = req.user!.id;
  const mode = req.body.mode;
  const slot = validSlot(req.body.deckSlot);
  const plan = req.body.plan || PLAN_DEFAULT;
  if (!['AI', 'PVP'].includes(mode) || slot === null || !planValid(plan)) {
    return res.status(400).json({ success: false, error: '대전 방식, 덱, 전략을 확인하세요.' });
  }
  try {
    const ownerCards = await ownedDeckCards(owner, slot);
    const aiCards = mode === 'AI' ? await opponentCards() : null;
    const [r]: any = await pool.query(
      `INSERT INTO rift_games
       (mode,status,owner_id,owner_deck_slot,actions_json,strategies_json,teams_json)
       VALUES (?,?,?,?,?,?,?)`,
      [mode, mode === 'AI' ? 'DRAFT' : 'WAITING', owner, slot,
        '[]', JSON.stringify([plan, mode === 'AI' ? PLAN_DEFAULT : null]),
        JSON.stringify([ownerCards, aiCards])]);
    const id = Number(r.insertId);
    res.json({ success: true, data: { id, mode, status: mode === 'AI' ? 'DRAFT' : 'WAITING' } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
router.get('/sessions/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    if (!/^\d+$/.test(req.params.id)) throw new Error('Invalid session');
    const [r]: any = await pool.query(
      "SELECT id, mode, status, owner_id FROM rift_games WHERE id=? LIMIT 1", [req.params.id]);
    if (!r.length || r[0].mode !== 'PVP' || r[0].status !== 'WAITING') {
      return res.status(404).json({ success: false, error: '초대가 종료되었습니다.' });
    }
    res.json({ success: true, data: { id: Number(r[0].id), ownerId: Number(r[0].owner_id), status: r[0].status } });
  } catch (error: any) { res.status(400).json({success:false,error:error.message}); }
});
router.post('/sessions/:id/join', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const slot = validSlot(req.body.deckSlot);
  const plan = req.body.plan || PLAN_DEFAULT;
  if (slot === null || !planValid(plan)) return res.status(400).json({ success: false, error: '덱과 전략을 확인하세요.' });
  try {
    const cards = await ownedDeckCards(userId, slot);
    const cx = await pool.getConnection();
    try {
      await cx.beginTransaction();
      const [rows]: any = await cx.query('SELECT * FROM rift_games WHERE id=? FOR UPDATE', [req.params.id]);
      const g = rows[0];
      if (!g || g.mode !== 'PVP' || g.status !== 'WAITING' || Number(g.owner_id) === userId) {
        await cx.rollback();
        return res.status(400).json({ success: false, error: '참가할 수 없는 경기입니다.' });
      }
      const plans = decode(g.strategies_json, [PLAN_DEFAULT, null]);
      const teams = decode<Array<any[] | null>>(g.teams_json, [[], null]);
      plans[1] = plan; teams[1] = cards;
      await cx.query(
        "UPDATE rift_games SET opponent_id=?,opponent_deck_slot=?,status='DRAFT',strategies_json=?,teams_json=? WHERE id=?",
        [userId,slot,JSON.stringify(plans),JSON.stringify(teams),g.id]);
      await cx.commit();
      res.json({ success: true, data: { id: Number(g.id), status: 'DRAFT' } });
    } catch (error) { await cx.rollback(); throw error; }
    finally { cx.release(); }
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});
router.post('/sessions/:id/plan', async (req: AuthRequest, res: Response) => {
  const plan = req.body.plan;
  if (!planValid(plan)) return res.status(400).json({ success: false, error: '지원하지 않는 전략입니다.' });
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const [rows]: any = await cx.query('SELECT * FROM rift_games WHERE id=? FOR UPDATE', [req.params.id]);
    const g = rows[0], uid = req.user!.id;
    if (!g || !['WAITING','DRAFT'].includes(g.status)
      || (Number(g.owner_id) !== uid && Number(g.opponent_id) !== uid)) {
      await cx.rollback();
      return res.status(403).json({ success: false, error: '전략을 수정할 수 없는 경기입니다.' });
    }
    const plans = decode(g.strategies_json, [PLAN_DEFAULT,null]);
    plans[Number(g.owner_id) === uid ? 0 : 1] = plan;
    await cx.query('UPDATE rift_games SET strategies_json=? WHERE id=?', [JSON.stringify(plans),g.id]);
    await cx.commit();
    res.json({ success: true });
  } catch (error: any) {
    await cx.rollback(); res.status(500).json({ success: false, error: error.message });
  } finally { cx.release(); }
});
router.get('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const g = await findSession(req.params.id, req.user!.id);
    const draft = await engine({
      operation: 'draft',mode: g.mode,actions: decode(g.actions_json, []),
    });
    res.json({
      success: true,
      data: {
        id: Number(g.id), mode: g.mode, status: g.status,
        ownerId: Number(g.owner_id), opponentId: g.opponent_id ? Number(g.opponent_id) : null,
        you: Number(g.owner_id) === req.user!.id ? 0 : 1,
        draft, result: decode(g.result_json, null), error: g.error_message,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
router.post('/sessions/:id/choose', async (req: AuthRequest, res: Response) => {
  const champion = req.body.champion;
  if (typeof champion !== 'string' || champion.length > 40) {
    return res.status(400).json({ success: false, error: '챔피언을 선택하세요.' });
  }
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const [rows]: any = await cx.query('SELECT * FROM rift_games WHERE id=? FOR UPDATE', [req.params.id]);
    const g = rows[0];
    const uid = req.user!.id;
    if (!g || g.status !== 'DRAFT' ||
      (Number(g.owner_id) !== uid && Number(g.opponent_id) !== uid)) {
      await cx.rollback();
      return res.status(403).json({ success: false, error: '밴픽 권한이 없습니다.' });
    }
    const actions = decode<string[]>(g.actions_json, []);
    const before = await engine({ operation: 'draft', mode: g.mode, actions });
    const turn = before.turn;
    if (!turn || turn.team !== (Number(g.owner_id) === uid ? 0 : 1)) {
      await cx.rollback();
      return res.status(400).json({ success: false, error: '상대 선택 차례입니다.' });
    }
    const after = await engine({
      operation: 'draft', mode: g.mode, actions, choice: champion,
    });
    const nextStatus = after.done ? 'QUEUED' : 'DRAFT';
    await cx.query(
      'UPDATE rift_games SET actions_json=?,roster_json=?,status=? WHERE id=?',
      [JSON.stringify(after.actions), after.done ? JSON.stringify(after.roster) : null, nextStatus, g.id]);
    await cx.commit();
    if (after.done) void pump();
    res.json({ success: true, data: { draft: after, status: nextStatus } });
  } catch (error: any) {
    await cx.rollback();
    res.status(400).json({ success: false, error: error.message });
  } finally { cx.release(); }
});
export default router;
