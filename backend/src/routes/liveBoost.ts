import express from 'express';
import pool from '../config/database';
import {authMiddleware,AuthRequest} from '../middleware/auth';

const router=express.Router();
router.use(authMiddleware);

// Read-only series history for public collection and transfer-market graphs.
// Values are historical facts from admin changes, not projected future OVR.
router.get('/:playerId',async(req:AuthRequest,res)=>{
  const id=Number(req.params.playerId);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({success:false,error:'올바른 선수 ID가 아닙니다.'});
  try{
    const [players]:any=await pool.query(
      `SELECT p.id,p.name,p.team,p.season,p.overall,
        (p.overall - COALESCE(b.boost_amount,0)) AS base_overall,
        COALESCE(b.boost_amount,0) AS boost_amount,
        b.achievement,b.evidence_url,b.updated_at
       FROM players p
       LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id
       WHERE p.id=?`,[id]);
    if(!players.length)return res.status(404).json({success:false,error:'선수 정보가 없습니다.'});
    const p=players[0];
    if(p.season!=='26WRs')return res.json({success:true,data:{
      playerId:id,season:p.season,baseOverall:Number(p.overall),
      overall:Number(p.overall),boost:0,history:[]
    }});
    const [history]:any=await pool.query(
      `SELECT id,previous_overall,new_overall,previous_boost,new_boost,
        achievement,evidence_url,changed_at
       FROM worlds2026_boost_history WHERE player_id=?
       ORDER BY changed_at ASC,id ASC LIMIT 200`,[id]);
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:{
      playerId:id,name:p.name,team:p.team,season:p.season,
      baseOverall:Number(p.base_overall),overall:Number(p.overall),
      boost:Number(p.boost_amount),achievement:p.achievement||null,
      evidenceUrl:p.evidence_url||null,updatedAt:p.updated_at||null,
      history:history.map((h:any)=>({
        id:Number(h.id),before:Number(h.previous_overall),after:Number(h.new_overall),
        previousBoost:Number(h.previous_boost),newBoost:Number(h.new_boost),
        delta:Number(h.new_overall)-Number(h.previous_overall),
        reason:h.achievement,date:h.changed_at,evidenceUrl:h.evidence_url
      }))
    }});
  }catch(error){console.error('Live OVR history:',error);
    return res.status(500).json({success:false,error:'라이브 OVR 기록을 불러오지 못했습니다.'});
  }
});
export default router;
