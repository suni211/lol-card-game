import express, { Response } from 'express';
import pool from '../config/database';
import {authMiddleware,AuthRequest} from '../middleware/auth';
import {ownedTeam,parseRoster,teamScore,isStrategy,STRATEGY_KEYS,Strategy} from '../utils/competitiveStats';

const router=express.Router();
router.use(authMiddleware);
const parsed=(value:any,fallback:any=[])=>{
  if(value==null)return fallback;
  if(typeof value!=='string')return value;
  try{return JSON.parse(value);}catch{return fallback;}
};
const publicMatch=(s:any)=>s?{
  id:Number(s.id),mode:'AI' as const,
  playerPower:Number(s.player_power),opponentPower:Number(s.opponent_power),
  wins:Number(s.wins),losses:Number(s.losses),status:s.status,
  rounds:parsed(s.rounds_json),roster:parsed(s.roster_json),
  ratingDelta:0,pointsReward:Number(s.points_reward)
}:null;

router.get('/current',async(req:AuthRequest,res:Response)=>{
  try{
    const slot=Number(req.query.deckSlot || 1);
    const [games]:any=await pool.query(
      "SELECT * FROM ranked_bo3_series WHERE user_id=? AND mode='AI' AND status='ACTIVE' ORDER BY id DESC LIMIT 1",
      [req.user!.id]
    );
    let preview=null,teamError:string|null=null;
    try{
      const roster=await ownedTeam(pool,req.user!.id,Number.isInteger(slot)&&slot>=1&&slot<=5?slot:1);
      preview={players:roster,power:Math.round(teamScore(roster,'MACRO')),deckId:null};
    }catch(error:any){teamError=error?.message||'카드 5장을 확인해주세요.';}
    return res.json({success:true,data:{series:publicMatch(games[0]),preview,teamError}});
  }catch(error){console.error('AI match status:',error);
    return res.status(500).json({success:false,error:'AI 매치를 불러오지 못했습니다.'});
  }
});

router.post('/start',async(req:AuthRequest,res:Response)=>{
  const slot=Number(req.body?.deckSlot||1);
  if(req.body?.mode!=='AI'||!Number.isInteger(slot)||slot<1||slot>5){
    return res.status(400).json({success:false,error:'경쟁전은 실제 유저 매칭 화면에서 시작해주세요.'});
  }
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const id=req.user!.id;
    const [users]:any=await conn.query('SELECT id FROM users WHERE id=? FOR UPDATE',[id]);
    if(!users.length){await conn.rollback();return res.status(404).json({success:false,error:'유저를 찾을 수 없습니다.'});}
    const [active]:any=await conn.query(
      "SELECT * FROM ranked_bo3_series WHERE user_id=? AND mode='AI' AND status='ACTIVE' ORDER BY id DESC LIMIT 1 FOR UPDATE",[id]
    );
    if(active.length){await conn.commit();return res.json({success:true,resumed:true,data:publicMatch(active[0])});}
    const roster=await ownedTeam(conn,id,slot);
    const overallPower=Math.round(teamScore(roster,'MACRO'));
    const opponentPower=340+Math.floor(Math.random()*191);
    const [insert]:any=await conn.query(
      `INSERT INTO ranked_bo3_series (user_id,deck_id,mode,roster_json,player_power,opponent_power,rounds_json,status)
       VALUES (?,NULL,'AI',?,?,?,'[]','ACTIVE')`,
      [id,JSON.stringify(roster),overallPower,opponentPower]
    );
    const [games]:any=await conn.query('SELECT * FROM ranked_bo3_series WHERE id=?',[insert.insertId]);
    await conn.commit();
    return res.json({success:true,data:publicMatch(games[0])});
  }catch(error:any){
    await conn.rollback();console.error('AI match start:',error);
    return res.status(error?.message?.includes('카드 5장')?400:500).json({success:false,error:error?.message||'AI 매치 시작 실패'});
  }finally{conn.release();}
});

router.post('/:id/play',async(req:AuthRequest,res:Response)=>{
  const id=Number(req.params.id);
  const strategy=req.body?.strategy as Strategy;
  const round=Number(req.body?.round);
  if(!Number.isSafeInteger(id)||id<1||!isStrategy(strategy)||!Number.isSafeInteger(round)){
    return res.status(400).json({success:false,error:'전술과 라운드를 선택해주세요.'});
  }
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]:any=await conn.query(
      "SELECT * FROM ranked_bo3_series WHERE id=? AND user_id=? AND mode='AI' FOR UPDATE",
      [id,req.user!.id]
    );
    if(!rows.length){await conn.rollback();return res.status(404).json({success:false,error:'AI 매치를 찾을 수 없습니다.'});}
    const game=rows[0];
    const rounds=parsed(game.rounds_json);
    if(game.status!=='ACTIVE'||round!==rounds.length+1){
      await conn.rollback();return res.status(409).json({success:false,error:'이미 처리된 라운드입니다.'});
    }
    const opponentStrategy=STRATEGY_KEYS[Math.floor(Math.random()*STRATEGY_KEYS.length)];
    const playerScore=Math.round(teamScore(parseRoster(game.roster_json),strategy)*(0.98+Math.random()*.04));
    const multipliers:Record<Strategy,number>={MACRO:1.01,TEAMFIGHT:1.02,OBJECTIVE:1.0};
    const opponentScore=Math.round(Number(game.opponent_power)*multipliers[opponentStrategy]*(0.96+Math.random()*.08));
    const won=playerScore===opponentScore?Math.random()<.5:playerScore>opponentScore;
    rounds.push({round,choice:strategy,opponentChoice:opponentStrategy,
      playerScore,opponentScore,won});
    const wins=Number(game.wins)+(won?1:0);
    const losses=Number(game.losses)+(won?0:1);
    const finished=wins===2||losses===2;
    const pointsReward=finished?(wins===2?200:80):0;
    await conn.query(
      `UPDATE ranked_bo3_series SET rounds_json=?,wins=?,losses=?,status=?,points_reward=?,rating_delta=0 WHERE id=?`,
      [JSON.stringify(rounds),wins,losses,finished?(wins===2?'WIN':'LOSE'):'ACTIVE',pointsReward,id]
    );
    if(finished){
      await conn.query('UPDATE users SET points=points+? WHERE id=?',[pointsReward,req.user!.id]);
      await conn.query(
        `INSERT INTO user_stats (user_id,total_matches,wins,losses,current_streak,longest_win_streak)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE total_matches=total_matches+1,
         wins=wins+VALUES(wins),losses=losses+VALUES(losses),
         current_streak=IF(VALUES(wins)=1,current_streak+1,0),
         longest_win_streak=GREATEST(longest_win_streak,IF(VALUES(wins)=1,current_streak+1,0))`,
        [req.user!.id,1,wins===2?1:0,wins===2?0:1,wins===2?1:0,wins===2?1:0]
      );
    }
    const [updated]:any=await conn.query('SELECT * FROM ranked_bo3_series WHERE id=?',[id]);
    await conn.commit();
    return res.json({success:true,data:publicMatch(updated[0])});
  }catch(error){await conn.rollback();console.error('AI tactic:',error);
    return res.status(500).json({success:false,error:'AI 매치 판정 실패'});
  }finally{conn.release();}
});

router.get('/history',async(req:AuthRequest,res:Response)=>{
  try{
    const [rows]:any=await pool.query(
      "SELECT * FROM ranked_bo3_series WHERE user_id=? AND mode='AI' AND status<>'ACTIVE' ORDER BY id DESC LIMIT 15",
      [req.user!.id]
    );
    return res.json({success:true,data:rows.map(publicMatch)});
  }catch(error){console.error('AI history:',error);
    return res.status(500).json({success:false,error:'AI 기록 조회 실패'});
  }
});
export default router;
