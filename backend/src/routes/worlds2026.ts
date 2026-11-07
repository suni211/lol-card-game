import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

const router = express.Router();
const SERIES = ['26 LIVE', '26WR', '26WRs'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Every endpoint enforces is_admin in the database: knowing a JWT is not sufficient.
router.use(authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const [rows]: any = await pool.query('SELECT is_admin FROM users WHERE id=?', [req.user!.id]);
    if (!rows.length || !rows[0].is_admin) return res.status(403).json({success:false,error:'관리자 전용 기능입니다.'});
    next();
  } catch (error) { next(error); }
});

router.get('/players', async (req, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT p.id,p.name,p.team,p.position,p.region,p.season,p.overall,p.image_url,p.nationality,
          COALESCE(b.base_overall,p.overall) AS base_overall,
          COALESCE(b.boost_amount,0) AS boost_amount,b.achievement,b.evidence_url
       FROM players p LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id
       WHERE p.season IN ('26 LIVE','26WR','26WRs')
       ORDER BY FIELD(p.season,'26WRs','26WR','26 LIVE'),p.team,p.position,p.name`);
    res.json({success:true,data:rows});
  } catch (error) {
    console.error('worlds2026 players:',error);
    res.status(500).json({success:false,error:'2026 DB 마이그레이션 적용 여부를 확인하세요.'});
  }
});

// Publish or retract a Worlds performance adjustment with an audit log.
// Updating players.overall updates owned cards automatically via player_id.
// A real nationality is a property of the player, shared by every 2026 card series.
router.post('/nationality/:playerId', async (req: AuthRequest, res: Response) => {
  const country=String(req.body.nationality || '').trim().toUpperCase();
  if(country && !/^[A-Z]{2}$/.test(country))
    return res.status(400).json({success:false,error:'국적은 ISO 두 글자 코드(KR, CN 등)로 입력해주세요.'});
  try {
    const [selected]:any=await pool.query(
      "SELECT name,team FROM players WHERE id=? AND season IN ('26 LIVE','26WR','26WRs')",
      [req.params.playerId]);
    if(!selected.length) return res.status(404).json({success:false,error:'2026 선수 카드를 찾을 수 없습니다.'});
    await pool.query(
      "UPDATE players SET nationality=? WHERE name=? AND team=? AND season IN ('26 LIVE','26WR','26WRs')",
      [country || null,selected[0].name,selected[0].team]);
    res.json({success:true,data:{nationality:country || null}});
  }catch(error) {
    console.error('Player nationality update failed:',error);
    res.status(500).json({success:false,error:'국적 저장 실패'});
  }
});

router.post('/boost/:playerId', async (req: AuthRequest, res: Response) => {
  const {playerId} = req.params;
  const {boost,achievement,evidenceUrl} = req.body;
  if (!Number.isInteger(boost) || boost < 0 || boost > 15 ||
      typeof achievement !== 'string' || achievement.length > 255 ||
      (boost > 0 && achievement.trim().length < 3) ||
      (evidenceUrl && (typeof evidenceUrl !== 'string' || evidenceUrl.length > 500 || !/^https:\/\//.test(evidenceUrl)))) {
    return res.status(400).json({success:false,error:'부스트 0~15, 근거 설명과 HTTPS 자료 URL을 확인하세요.'});
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows]:any = await connection.query(
      `SELECT p.id,p.season,p.overall,b.base_overall,b.boost_amount
       FROM players p LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id
       WHERE p.id=? FOR UPDATE`,[playerId]);
    if (!rows.length || rows[0].season !== '26WRs') {
      await connection.rollback();
      return res.status(400).json({success:false,error:'26WRs 카드에만 라이브 부스트를 적용할 수 있습니다.'});
    }
    const row=rows[0];
    const base=Number(row.base_overall ?? row.overall);
    const nextOverall=base+boost;
    if (nextOverall > 130) {
      await connection.rollback();
      return res.status(400).json({success:false,error:'최종 OVR은 130 이하여야 합니다.'});
    }
    await connection.query(
      `INSERT INTO worlds2026_live_boosts
       (player_id,base_overall,boost_amount,achievement,evidence_url,updated_by)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE boost_amount=VALUES(boost_amount),
          achievement=VALUES(achievement),evidence_url=VALUES(evidence_url),
          updated_by=VALUES(updated_by)`,
      [row.id,base,boost,achievement.trim(),evidenceUrl || null,req.user!.id]);
    await connection.query('UPDATE players SET overall=? WHERE id=?',[nextOverall,row.id]);
    await connection.query(
      `INSERT INTO worlds2026_boost_history
       (player_id,previous_boost,new_boost,previous_overall,new_overall,achievement,evidence_url,changed_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [row.id,Number(row.boost_amount||0),boost,row.overall,nextOverall,achievement.trim() || '부스트 해제',evidenceUrl || null,req.user!.id]);
    await connection.commit();
    res.json({success:true,data:{id:row.id,overall:nextOverall,boost}});
  } catch(error) {
    await connection.rollback();
    console.error('worlds2026 boost:',error);
    res.status(500).json({success:false,error:'라이브 부스트 저장 실패'});
  } finally {connection.release();}
});

// Only authenticated administrators may trigger the protected local import job.
// It runs on this server and writes assets/DB using the same non-root process
// identity as the API. Repeated starts cannot fork duplicate import processes.
type AutoPhotoJob = {
  running:boolean; startedAt:string|null; finishedAt:string|null;
  saved:number; skipped:number; failed:number; last:string; error:string|null;
};
let autoPhotoJob:AutoPhotoJob = {
  running:false,startedAt:null,finishedAt:null,
  saved:0,skipped:0,failed:0,last:'',error:null
};
router.get('/photos/auto-status', (_req:AuthRequest,res:Response)=>{
  return res.json({success:true,data:autoPhotoJob});
});
router.post('/photos/auto-import', async (_req:AuthRequest,res:Response)=>{
  if(autoPhotoJob.running){
    return res.status(409).json({success:false,error:'선수 사진 자동 등록이 이미 진행 중입니다.',data:autoPhotoJob});
  }
  const script=path.resolve(__dirname,'../../scripts/fetch-namuwiki-portraits.cjs');
  try{
    await fs.access(script);
  }catch{
    return res.status(500).json({success:false,error:'사진 자동 등록 스크립트가 없습니다. 최신 코드를 배포하세요.'});
  }
  autoPhotoJob={
    running:true,startedAt:new Date().toISOString(),finishedAt:null,
    saved:0,skipped:0,failed:0,last:'시작 중',error:null
  };
  try{
    const child=spawn(process.execPath,[script,'--apply'],{
      cwd:path.resolve(__dirname,'../..'),env:process.env,
      stdio:['ignore','pipe','pipe']
    });
    let pending='';
    child.stdout?.on('data',(buf:Buffer)=>{
      pending+=buf.toString('utf8');
      const lines=pending.split('\n');pending=lines.pop()||'';
      for(const raw of lines){
        const line=raw.trim().slice(0,200);
        if(!line)continue;
        if(line.startsWith('SAVED '))autoPhotoJob.saved++;
        else if(line.startsWith('SKIP '))autoPhotoJob.skipped++;
        else if(line.startsWith('FAILED '))autoPhotoJob.failed++;
        autoPhotoJob.last=line;
      }
    });
    child.stderr?.on('data',(buf:Buffer)=>{
      const msg=buf.toString('utf8').trim();
      if(msg)autoPhotoJob.error=msg.slice(-500);
    });
    child.on('error',(error:Error)=>{
      autoPhotoJob.running=false;
      autoPhotoJob.finishedAt=new Date().toISOString();
      autoPhotoJob.error=error.message;
    });
    child.on('close',(code:number|null)=>{
      autoPhotoJob.running=false;
      autoPhotoJob.finishedAt=new Date().toISOString();
      if(code!==0 && !autoPhotoJob.error){
        autoPhotoJob.error='자동 수집 종료 코드: '+code;
      }
    });
    return res.json({success:true,message:'선수 사진 자동 등록을 시작했습니다.',data:autoPhotoJob});
  }catch(error:any){
    autoPhotoJob.running=false;
    autoPhotoJob.error=error.message||'실행 실패';
    return res.status(500).json({success:false,error:'선수 사진 자동 등록을 실행할 수 없습니다.'});
  }
});

// Upload binary PNG, JPEG or WebP directly. Base64 JSON previously hit the global
// 3MB Express body limit and /player-images was not necessarily routed by Nginx.
const uploadParser = express.raw({
  type: ['image/png','image/jpeg','image/webp','application/octet-stream'],
  limit: '6mb'
});
router.post('/photo/:playerId', uploadParser, async (req: AuthRequest, res: Response) => {
  const playerId = Number(req.params.playerId);
  if (!Number.isSafeInteger(playerId) || playerId < 1) {
    return res.status(400).json({ success: false, error: '올바른 선수 ID가 아닙니다.' });
  }
  let data: Buffer;
  if (Buffer.isBuffer(req.body)) {
    data = req.body;
  } else if (typeof req.body?.dataUrl === 'string' &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(req.body.dataUrl)) {
    // Compatibility with already-open old admin browser tabs.
    data = Buffer.from(req.body.dataUrl.split(',')[1], 'base64');
  } else {
    return res.status(400).json({
      success: false, error: 'PNG / JPG / WebP 이미지를 선택해 업로드하세요.'
    });
  }
  const png = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = data.subarray(0,4).toString()==='RIFF' && data.subarray(8,12).toString()==='WEBP';
  const jpeg = data.length > 4 && data[0]===0xff && data[1]===0xd8 &&
    data[data.length-2]===0xff && data[data.length-1]===0xd9;
  if (!data.length || data.length > MAX_IMAGE_BYTES || (!png && !webp && !jpeg)) {
    return res.status(400).json({
      success: false, error: '5MB 이하의 올바른 PNG / JPG / WebP 이미지만 등록할 수 있습니다.'
    });
  }
  const extension = png ? 'png' : webp ? 'webp' : 'jpg';
  try {
    const [players]:any = await pool.query(
      'SELECT id,name,team,position FROM players WHERE id=?', [playerId]
    );
    if (!players.length) return res.status(404).json({
      success: false, error: '선수를 찾을 수 없습니다.'
    });
    const dir = path.resolve(__dirname,'../../uploads/players');
    await fs.mkdir(dir,{recursive:true});
    const filename = `2026-${playerId}.${extension}`;
    await fs.writeFile(path.join(dir,filename),data);
    // /api/ is already reverse proxied to this Express backend by Nginx.
    // A versioned path busts browser cache after replacing the same image.
    const imageUrl = `/api/player-images/${filename}?v=${Date.now()}`;
    const applyAllSeasons = req.query.all === '1';
    if (applyAllSeasons) {
      await pool.query(
        "UPDATE players SET image_url=? WHERE name=? AND team=? AND position=? AND season IN ('26 LIVE','26WR','26WRs')",
        [imageUrl, players[0].name, players[0].team, players[0].position]
      );
    } else {
      await pool.query('UPDATE players SET image_url=? WHERE id=?',[imageUrl,playerId]);
    }
    return res.json({success:true,data:{imageUrl,applyAllSeasons}});
  } catch(error:any) {
    console.error('worlds2026 photo save:',error);
    return res.status(500).json({
      success:false,error: error?.code === 'EACCES'
        ? '사진 저장 폴더 접근 권한이 없습니다. backend/uploads/players 소유권을 확인하세요.'
        : '사진 저장 실패. 서버 로그를 확인해주세요.'
    });
  }
});

export default router;
