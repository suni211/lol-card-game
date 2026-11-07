import pool from '../config/database';
import {MissionPeriod,periodEnd} from './missionPeriod';

export type MissionEvent =
  'gacha'|'card_collect'|'pack_open'|
  'ai_round'|'ai_battle'|'ai_win'|
  'rank_round'|'rank_match'|'rank_win'|
  'deck_save'|'market_list'|'market_buy'|'market_sell'|
  'enhance_attempt'|'enhance_success'|'trade_complete';

// Every event is awarded only after a committed server-side action.
// The unique (user_id,mission_id,expires_at) index makes this safe against
// concurrent game results, and is_claimed stops post-claim progress edits.
export async function updateMissionProgress(
  userId:number,missionType:MissionEvent,increment:number=1
):Promise<void>{
  if(!Number.isSafeInteger(userId)||userId<1||
     !Number.isSafeInteger(increment)||increment<1||increment>500)return;
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const events:MissionEvent[]=missionType==='gacha'
      ?['gacha','card_collect']
      :missionType==='pack_open'
      ?['pack_open','card_collect']
      :[missionType];
    const keys=events.map(()=>'?').join(',');
    const [missions]:any=await conn.query(
      `SELECT id,type,requirement FROM missions
       WHERE is_active=1 AND mission_type IN (${keys})`,events
    );
    const now=new Date();
    for(const m of missions){
      const end=periodEnd(m.type as MissionPeriod,now);
      const goal=Number(m.requirement);
      const step=Math.min(goal,increment);
      await conn.query(
        `INSERT INTO user_missions
          (user_id,mission_id,progress,is_completed,is_claimed,expires_at)
         VALUES (?,?,?,?,FALSE,?)
         ON DUPLICATE KEY UPDATE
           progress=IF(is_claimed,progress,LEAST(?,progress+?)),
           is_completed=IF(is_claimed,is_completed,IF(progress>=?,TRUE,FALSE))`,
        [userId,m.id,step,step>=goal,end,goal,increment,goal]
      );
    }
    await conn.commit();
  }catch(error){
    await conn.rollback();
    console.error('Mission progress tracking error:',error);
    throw error;
  }finally{conn.release();}
}
