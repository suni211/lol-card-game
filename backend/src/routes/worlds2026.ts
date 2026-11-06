import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const SERIES = ['26 LIVE', '26WR', '26WRs'] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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
    if (nextOverall > 120) {
      await connection.rollback();
      return res.status(400).json({success:false,error:'최종 OVR은 120 이하여야 합니다.'});
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

// PNG / WebP photographs with transparent backgrounds may be uploaded in the admin UI.
// Only signature-validated images are written; no arbitrary file paths or remote URL fetch.
router.post('/photo/:playerId', async (req: AuthRequest, res: Response) => {
  const {dataUrl} = req.body;
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_IMAGE_BYTES*1.4+100 ||
      !/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    return res.status(400).json({success:false,error:'2MB 이하 PNG/WebP 파일만 등록할 수 있습니다.'});
  }
  const [players]:any = await pool.query(
    "SELECT id FROM players WHERE id=? AND season IN ('26 LIVE','26WR','26WRs')",[req.params.playerId]);
  if (!players.length) return res.status(404).json({success:false,error:'2026 선수를 찾을 수 없습니다.'});
  const [,kind,payload] = /^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)!;
  const data=Buffer.from(payload,'base64');
  const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp=data.subarray(0,4).toString()==='RIFF' && data.subarray(8,12).toString()==='WEBP';
  if (!data.length || data.length > MAX_IMAGE_BYTES || (kind==='png'&&!png) || (kind==='webp'&&!webp)) {
    return res.status(400).json({success:false,error:'이미지 형식 또는 크기가 올바르지 않습니다.'});
  }
  try {
    const dir=path.resolve(__dirname,'../../uploads/players');
    await fs.mkdir(dir,{recursive:true});
    const file=`2026-${Number(req.params.playerId)}.${kind}`;
    await fs.writeFile(path.join(dir,file),data);
    const imageUrl=`/player-images/${file}`;
    await pool.query('UPDATE players SET image_url=? WHERE id=?',[imageUrl,req.params.playerId]);
    res.json({success:true,data:{imageUrl}});
  } catch(error) {
    console.error('worlds2026 photo:',error);
    res.status(500).json({success:false,error:'사진 저장 실패'});
  }
});

export default router;
