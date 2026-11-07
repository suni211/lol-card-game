import express from 'express';
import pool from '../config/database';
import {authMiddleware,AuthRequest} from '../middleware/auth';
import {MissionPeriod,periodEnd,periodExpiryIso} from '../utils/missionPeriod';
const router=express.Router();
router.use(authMiddleware);

router.get('/',async(req:AuthRequest,res)=>{
  try{
    const now=new Date();
    const d=periodEnd('DAILY',now),w=periodEnd('WEEKLY',now),m=periodEnd('MONTHLY',now);
    const [rows]:any=await pool.query(
      `SELECT mission.id,mission.title,mission.description,mission.type,
              mission.requirement,mission.reward,
              COALESCE(um.progress,0) AS progress,
              COALESCE(um.is_completed,0) AS is_completed,
              COALESCE(um.is_claimed,0) AS is_claimed
       FROM missions mission
       LEFT JOIN user_missions um ON
         um.mission_id=mission.id AND um.user_id=?
         AND um.expires_at=CASE mission.type
           WHEN 'DAILY' THEN ? WHEN 'WEEKLY' THEN ? ELSE ? END
       WHERE mission.is_active=1
       ORDER BY FIELD(mission.type,'DAILY','WEEKLY','MONTHLY'),mission.id`,
      [req.user!.id,d,w,m]
    );
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:rows.map((r:any)=>({
      id:Number(r.id),title:r.title,description:r.description,type:r.type,
      requirement:Number(r.requirement),reward:Number(r.reward),
      progress:Math.min(Number(r.requirement),Number(r.progress)||0),
      isCompleted:!!r.is_claimed,isClaimed:!!r.is_claimed,
      isReady:!!r.is_completed&&!r.is_claimed,
      expiresAt:periodExpiryIso(r.type as MissionPeriod,now)
    }))});
  }catch(error){
    console.error('Fetch missions:',error);
    return res.status(500).json({success:false,error:'미션 정보를 불러오지 못했습니다. 미션 DB 업데이트를 확인해주세요.'});
  }
});

router.post('/claim',async(req:AuthRequest,res)=>{
  const missionId=Number(req.body?.missionId);
  if(!Number.isSafeInteger(missionId)||missionId<1)
    return res.status(400).json({success:false,error:'올바른 미션을 선택해주세요.'});
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [missions]:any=await conn.query(
      'SELECT id,type,requirement,reward FROM missions WHERE id=? AND is_active=1',
      [missionId]
    );
    if(!missions.length){
      await conn.rollback();
      return res.status(404).json({success:false,error:'활성화된 미션이 아닙니다.'});
    }
    const mission=missions[0];
    const end=periodEnd(mission.type as MissionPeriod);
    const [rows]:any=await conn.query(
      `SELECT id,progress,is_completed,is_claimed FROM user_missions
       WHERE user_id=? AND mission_id=? AND expires_at=? FOR UPDATE`,
      [req.user!.id,missionId,end]
    );
    if(!rows.length||Number(rows[0].progress)<Number(mission.requirement)||!rows[0].is_completed){
      await conn.rollback();
      return res.status(400).json({success:false,error:'아직 완료하지 않은 미션입니다.'});
    }
    if(rows[0].is_claimed){
      await conn.rollback();
      return res.status(409).json({success:false,error:'이번 기간에는 이미 보상을 받았습니다.'});
    }
    await conn.query(
      'UPDATE user_missions SET is_claimed=TRUE WHERE id=?',[rows[0].id]
    );
    await conn.query(
      'UPDATE users SET points=points+? WHERE id=?',
      [mission.reward,req.user!.id]
    );
    await conn.commit();
    return res.json({success:true,data:{reward:Number(mission.reward)}});
  }catch(error){
    try{await conn.rollback();}catch{}
    console.error('Claim mission:',error);
    return res.status(500).json({success:false,error:'미션 보상 수령 중 오류가 발생했습니다.'});
  }finally{conn.release();}
});
export default router;
