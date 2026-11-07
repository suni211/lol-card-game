import express, {Response} from 'express';
import pool from '../config/database';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import {
  isStrategy, ownedTeam, parseRoster, teamScore, Strategy
} from '../utils/competitiveStats';

const router = express.Router();
router.use(authMiddleware);

const GET_MATCH = `SELECT m.*,u1.username AS player1_name,u2.username AS player2_name
  FROM competitive_matches_v2 m
  JOIN users u1 ON u1.id=m.player1_id
  JOIN users u2 ON u2.id=m.player2_id`;

function summarize(m:any, userId:number) {
  if(!m)return null;
  const first = Number(m.player1_id)===userId;
  const rounds = Array.isArray(m.rounds_json) ? m.rounds_json : JSON.parse(m.rounds_json || '[]');
  return {
    id:Number(m.id),opponentName:first?m.player2_name:m.player1_name,
    opponentId:first?Number(m.player2_id):Number(m.player1_id),
    ownWins:first?Number(m.wins1):Number(m.wins2),
    opponentWins:first?Number(m.wins2):Number(m.wins1),
    round:Number(m.round_number),status:m.status,
    ownSubmitted:!!(first?m.choice1:m.choice2),
    opponentSubmitted:!!(first?m.choice2:m.choice1),
    winnerId:m.winner_id===null?null:Number(m.winner_id),
    roster:parseRoster(first?m.roster1_json:m.roster2_json),
    rounds:rounds.map((r:any)=>({
      round:r.round, choice:first?r.choice1:r.choice2,
      opponentChoice:first?r.choice2:r.choice1,
      ownScore:first?r.score1:r.score2,
      opponentScore:first?r.score2:r.score1,
      won:first?r.winner==='P1':r.winner==='P2'
    }))
  };
}
async function activeMatch(userId:number) {
  const [rows]:any = await pool.query(
    GET_MATCH+` WHERE m.status='ACTIVE' AND (m.player1_id=? OR m.player2_id=?)
      ORDER BY m.id DESC LIMIT 1`,
    [userId,userId]
  );
  return rows[0] || null;
}
router.get('/status',async(req:AuthRequest,res:Response)=>{
  try {
    const id=req.user!.id;
    const match=await activeMatch(id);
    if(match)return res.json({success:true,data:{status:'MATCHED',match:summarize(match,id)}});
    // A waiting player must still be online to be eligible for pairing.
    await pool.query('UPDATE competitive_queue_v2 SET joined_at=NOW() WHERE user_id=?',[id]);
    const [waiting]:any=await pool.query(
      'SELECT user_id FROM competitive_queue_v2 WHERE user_id=?',[id]
    );
    return res.json({success:true,data:{status:waiting.length?'WAITING':'NONE',match:null}});
  }catch(error){console.error('Competitive status:',error);
    return res.status(500).json({success:false,error:'경쟁전 상태를 확인할 수 없습니다. 마이그레이션을 확인하세요.'});
  }
});

router.post('/queue',async(req:AuthRequest,res:Response)=>{
  const slot=Number(req.body?.deckSlot || 1);
  if(!Number.isInteger(slot)||slot<1||slot>5)
    return res.status(400).json({success:false,error:'덱 슬롯은 1~5여야 합니다.'});
  const conn=await pool.getConnection();
  let hasLock=false;
  try {
    // A single DB advisory lock serializes matchmaking across Node processes.
    const [[lock]]:any=await conn.query("SELECT GET_LOCK('lcg_competitive_pair',5) AS locked");
    if(!Number(lock?.locked)) return res.status(503).json({
      success:false,error:'매칭 서버가 혼잡합니다. 다시 시도해주세요.'
    });
    hasLock=true;
    await conn.beginTransaction();
    const id=req.user!.id;
    const [active]:any=await conn.query(
      GET_MATCH+" WHERE m.status='ACTIVE' AND (m.player1_id=? OR m.player2_id=?) ORDER BY m.id DESC LIMIT 1",
      [id,id]
    );
    if(active.length){
      await conn.commit();
      return res.json({success:true,data:{status:'MATCHED',match:summarize(active[0],id)}});
    }
    const roster=await ownedTeam(conn,id,slot);
    // Prevent matching disconnected or idle accounts.
    await conn.query(
      "DELETE FROM competitive_queue_v2 WHERE joined_at < DATE_SUB(NOW(), INTERVAL 45 SECOND)"
    );
    const [opponents]:any=await conn.query(
      'SELECT user_id,roster_json FROM competitive_queue_v2 WHERE user_id<>? ORDER BY joined_at ASC LIMIT 1 FOR UPDATE',
      [id]
    );
    if(opponents.length){
      const opponent=opponents[0];
      const enemyRoster=parseRoster(opponent.roster_json);
      if(enemyRoster.length!==5)throw new Error('상대 카드가 올바르지 않습니다.');
      await conn.query('DELETE FROM competitive_queue_v2 WHERE user_id IN (?,?)',[id,opponent.user_id]);
      const [insert]:any=await conn.query(
        `INSERT INTO competitive_matches_v2
          (player1_id,player2_id,roster1_json,roster2_json,rounds_json)
         VALUES (?,?,?,?,'[]')`,
        [Number(opponent.user_id),id,opponent.roster_json,JSON.stringify(roster)]
      );
      const [matches]:any=await conn.query(GET_MATCH+' WHERE m.id=?',[insert.insertId]);
      await conn.commit();
      return res.json({success:true,data:{status:'MATCHED',match:summarize(matches[0],id)}});
    }
    await conn.query(
      'INSERT INTO competitive_queue_v2 (user_id,roster_json,joined_at) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE roster_json=VALUES(roster_json),joined_at=NOW()',
      [id,JSON.stringify(roster)]
    );
    await conn.commit();
    return res.json({success:true,data:{status:'WAITING',match:null}});
  }catch(error:any){
    try{await conn.rollback();}catch{}
    console.error('Competitive queue:',error);
    return res.status(error?.message?.includes('카드 5장')?400:500).json({
      success:false,error:error?.message?.includes('카드 5장')?error.message:'경쟁전 매칭에 실패했습니다.'
    });
  }finally{
    if(hasLock){try{await conn.query("SELECT RELEASE_LOCK('lcg_competitive_pair')");}catch{}}
    conn.release();
  }
});
router.delete('/queue',async(req:AuthRequest,res:Response)=>{
  try {
    await pool.query('DELETE FROM competitive_queue_v2 WHERE user_id=?',[req.user!.id]);
    return res.json({success:true});
  }catch(error){console.error('Competitive leave:',error);
    return res.status(500).json({success:false,error:'매칭 취소에 실패했습니다.'});
  }
});

router.post('/:matchId/choice',async(req:AuthRequest,res:Response)=>{
  const matchId=Number(req.params.matchId);
  const strategy=req.body?.strategy as Strategy;
  const round=Number(req.body?.round);
  if(!Number.isSafeInteger(matchId)||matchId<1 || !isStrategy(strategy) || !Number.isInteger(round))
    return res.status(400).json({success:false,error:'전술 또는 라운드 번호가 올바르지 않습니다.'});
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userId=req.user!.id;
    const [rows]:any=await conn.query(
      GET_MATCH+' WHERE m.id=? AND (m.player1_id=? OR m.player2_id=?) FOR UPDATE',
      [matchId,userId,userId]
    );
    if(!rows.length){await conn.rollback();return res.status(404).json({success:false,error:'경기를 찾을 수 없습니다.'});}
    const match=rows[0];
    if(match.status!=='ACTIVE'||Number(match.round_number)!==round){
      await conn.rollback();return res.status(409).json({success:false,error:'이미 완료된 라운드입니다. 화면을 새로고침하세요.'});
    }
    const p1=Number(match.player1_id)===userId;
    if((p1?match.choice1:match.choice2)!==null){
      await conn.rollback();return res.status(409).json({success:false,error:'이번 판의 전술은 이미 제출했습니다.'});
    }
    const choice1=p1?strategy:match.choice1;
    const choice2=p1?match.choice2:strategy;
    let wins1=Number(match.wins1),wins2=Number(match.wins2),nextRound=round;
    let status='ACTIVE',winnerId:any=null;
    const completedRounds=Array.isArray(match.rounds_json)?match.rounds_json:JSON.parse(match.rounds_json||'[]');
    if(choice1 && choice2){
      const team1=parseRoster(match.roster1_json);
      const team2=parseRoster(match.roster2_json);
      const score1=Math.round(teamScore(team1,choice1)*(0.98+Math.random()*0.04));
      const score2=Math.round(teamScore(team2,choice2)*(0.98+Math.random()*0.04));
      const p1Wins=score1===score2 ? Math.random()<.5 : score1>score2;
      if(p1Wins)wins1++;else wins2++;
      completedRounds.push({round,choice1,choice2,score1,score2,winner:p1Wins?'P1':'P2'});
      if(wins1===2||wins2===2){
        status='COMPLETED';
        winnerId=wins1===2?Number(match.player1_id):Number(match.player2_id);
        const loserId=wins1===2?Number(match.player2_id):Number(match.player1_id);
        await conn.query('UPDATE users SET rating=rating+25,points=points+350 WHERE id=?',[winnerId]);
        await conn.query('UPDATE users SET rating=GREATEST(0,rating-20),points=points+100 WHERE id=?',[loserId]);
        await conn.query(
          `INSERT INTO user_stats (user_id,total_matches,wins,losses,current_streak,longest_win_streak)
           VALUES (?,1,1,0,1,1) ON DUPLICATE KEY UPDATE
             total_matches=total_matches+1,wins=wins+1,
             current_streak=current_streak+1,
             longest_win_streak=GREATEST(longest_win_streak,current_streak+1)`,
          [winnerId]
        );
        await conn.query(
          `INSERT INTO user_stats (user_id,total_matches,wins,losses,current_streak,longest_win_streak)
           VALUES (?,1,0,1,0,0) ON DUPLICATE KEY UPDATE
             total_matches=total_matches+1,losses=losses+1,current_streak=0`,
          [loserId]
        );
      }else nextRound++;
    }
    const reset=!!(choice1&&choice2);
    await conn.query(
      `UPDATE competitive_matches_v2
       SET choice1=?,choice2=?,wins1=?,wins2=?,round_number=?,rounds_json=?,status=?,winner_id=?
       WHERE id=?`,
      [reset?null:choice1,reset?null:choice2,wins1,wins2,nextRound,
        JSON.stringify(completedRounds),status,winnerId,matchId]
    );
    const [latest]:any=await conn.query(GET_MATCH+' WHERE m.id=?',[matchId]);
    await conn.commit();
    return res.json({success:true,data:summarize(latest[0],userId)});
  }catch(error){
    try{await conn.rollback();}catch{}
    console.error('Competitive tactics:',error);
    return res.status(500).json({success:false,error:'전술 판정 중 오류가 발생했습니다.'});
  }finally{conn.release();}
});

router.get('/history',async(req:AuthRequest,res:Response)=>{
  try{
    const [rows]:any=await pool.query(
      GET_MATCH+` WHERE m.status='COMPLETED' AND (m.player1_id=? OR m.player2_id=?)
       ORDER BY m.id DESC LIMIT 15`,[req.user!.id,req.user!.id]
    );
    return res.json({success:true,data:rows.map((m:any)=>summarize(m,req.user!.id))});
  }catch(error){
    console.error('Competitive history:',error);
    return res.status(500).json({success:false,error:'경쟁전 기록을 불러오지 못했습니다.'});
  }
});
export default router;
