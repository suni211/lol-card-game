import express from 'express';
import pool from '../config/database';
import {authMiddleware,AuthRequest} from '../middleware/auth';

const router=express.Router();
router.use(authMiddleware);
const asInt=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=min&&n<=max?n:fallback;
};
const fmtSeason=(x:unknown)=>typeof x==='string'?x.trim().slice(0,35):'';
const fmtSearch=(x:unknown)=>typeof x==='string'?x.trim().slice(0,70):'';

router.get('/teams',async(_req,res)=>{
  try{
    const [rows]:any=await pool.query(
      `SELECT team,COUNT(*) AS cards FROM players
       WHERE season IN ('26 LIVE','26WR','26WRs')
       GROUP BY team ORDER BY team ASC`);
    return res.json({success:true,data:rows});
  }catch(e){console.error('Market teams:',e);return res.status(500).json({success:false,error:'팀컬러 목록 조회 실패'});}
});

router.get('/popular',async(_req,res)=>{
  try{
    // Count real completed purchases; listing activity is a secondary tie break.
    // Never invent purchase volume for players with no trades.
    const [rows]:any=await pool.query(
      `SELECT p.id AS player_id,p.name,p.team,p.position,p.season,p.overall,p.image_url,
        COUNT(DISTINCT CASE WHEN mt.status='SOLD' THEN mt.id END) AS sold_count,
        COUNT(DISTINCT CASE WHEN mt.status='LISTED' THEN mt.id END) AS listing_count,
        COALESCE(MAX(CASE WHEN mt.status='SOLD' THEN mt.sold_at END),NULL) AS last_sold_at
       FROM players p INNER JOIN market_transactions mt ON mt.player_id=p.id
       GROUP BY p.id,p.name,p.team,p.position,p.season,p.overall,p.image_url
       ORDER BY sold_count DESC,listing_count DESC,last_sold_at DESC,p.id ASC
       LIMIT 3`);
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:rows});
  }catch(e){console.error('Market popular:',e);return res.status(500).json({success:false,error:'인기 선수 조회 실패'});}
});

router.get('/browse',async(req:AuthRequest,res)=>{
  const name=fmtSearch(req.query.name),team=fmtSearch(req.query.team),season=fmtSeason(req.query.season);
  const grade=asInt(req.query.grade,0,10,0),limit=asInt(req.query.limit,1,100,60);
  const offset=asInt(req.query.offset,0,100000,0);
  const allowedSort=new Set(['recent','overall','price_asc','price_desc','name','sold']);
  const sort=typeof req.query.sort==='string'&&allowedSort.has(req.query.sort)?req.query.sort:'overall';
  const where=["p.season IN ('26 LIVE','26WR','26WRs')"];
  const args:any[]=[grade,grade];
  if(name){where.push('(p.name LIKE ? OR p.team LIKE ?)');args.push('%'+name+'%','%'+name+'%');}
  if(team){where.push('p.team=?');args.push(team);}
  if(season){where.push('p.season=?');args.push(season);}
  const order:Record<string,string>={
    recent:'p.id DESC',overall:'p.overall DESC,p.name ASC',name:'p.name ASC',
    price_asc:'lowest_price IS NULL,lowest_price ASC,p.name ASC',
    price_desc:'lowest_price IS NULL,lowest_price DESC,p.name ASC',
    sold:'sold_count DESC,p.overall DESC'
  };
  try{
    const [rows]:any=await pool.query(
      `SELECT p.id,p.name,p.team,p.position,p.season,p.overall,p.image_url,
          COALESCE(b.boost_amount,0) AS live_boost,
          (SELECT MIN(mt.listing_price) FROM market_transactions mt
           JOIN user_cards uc ON uc.id=mt.card_id
           WHERE mt.player_id=p.id AND mt.status='LISTED' AND uc.level=?) AS lowest_price,
          (SELECT COUNT(*) FROM market_transactions mt
           JOIN user_cards uc ON uc.id=mt.card_id
           WHERE mt.player_id=p.id AND mt.status='LISTED' AND uc.level=?) AS listing_count,
          (SELECT COUNT(*) FROM market_transactions mt
           WHERE mt.player_id=p.id AND mt.status='SOLD') AS sold_count
       FROM players p
       LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id
       WHERE ${where.join(' AND ')}
       ORDER BY ${order[sort]} LIMIT ? OFFSET ?`,
      [...args,limit,offset]);
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:rows,grade,hasMore:rows.length===limit});
  }catch(e){console.error('Market browse:',e);return res.status(500).json({success:false,error:'선수 검색 실패'});}
});

router.get('/autocomplete',async(req,res)=>{
  const q=fmtSearch(req.query.q);
  if(q.length<1)return res.json({success:true,data:[]});
  try{
    const [rows]:any=await pool.query(
      `SELECT name,team,season,MIN(id) AS player_id
       FROM players WHERE season IN ('26 LIVE','26WR','26WRs')
         AND (name LIKE ? OR team LIKE ?)
       GROUP BY name,team,season ORDER BY
         CASE WHEN LOWER(name)=LOWER(?) THEN 0 WHEN LOWER(name) LIKE LOWER(?) THEN 1 ELSE 2 END,
         name ASC LIMIT 12`,
      ['%'+q+'%','%'+q+'%',q,q+'%']);
    return res.json({success:true,data:rows});
  }catch(e){console.error('Market autocomplete:',e);return res.status(500).json({success:false,error:'자동완성 조회 실패'});}
});

router.get('/favorites',async(req:AuthRequest,res)=>{
  try{
    const [rows]:any=await pool.query(
      `SELECT f.player_id,f.enhancement_level,f.created_at,
        p.name,p.team,p.position,p.overall,p.season,p.image_url
       FROM market_favorites f JOIN players p ON p.id=f.player_id
       WHERE f.user_id=? ORDER BY f.created_at DESC,f.id DESC LIMIT 300`,[req.user!.id]);
    return res.json({success:true,data:rows});
  }catch(e){console.error('Market favorites:',e);return res.status(500).json({success:false,error:'관심 선수 조회 실패. DB 마이그레이션을 확인하세요.'});}
});
router.post('/favorites',async(req:AuthRequest,res)=>{
  const playerId=asInt(req.body?.playerId,1,100000000,0);
  const grade=asInt(req.body?.grade,0,10,-1);
  if(!playerId||grade<0)return res.status(400).json({success:false,error:'선수와 강화 등급을 확인하세요.'});
  try{
    const [exists]:any=await pool.query('SELECT id FROM players WHERE id=?',[playerId]);
    if(!exists.length)return res.status(404).json({success:false,error:'선수가 존재하지 않습니다.'});
    await pool.query(
      `INSERT IGNORE INTO market_favorites (user_id,player_id,enhancement_level)
       VALUES (?,?,?)`,[req.user!.id,playerId,grade]);
    return res.json({success:true});
  }catch(e){console.error('Market favorite add:',e);return res.status(500).json({success:false,error:'관심 선수 등록 실패'});}
});
router.delete('/favorites/:playerId/:grade',async(req:AuthRequest,res)=>{
  const playerId=asInt(req.params.playerId,1,100000000,0),grade=asInt(req.params.grade,0,10,-1);
  if(!playerId||grade<0)return res.status(400).json({success:false,error:'관심 선수 정보를 확인하세요.'});
  try{
    await pool.query('DELETE FROM market_favorites WHERE user_id=? AND player_id=? AND enhancement_level=?',[req.user!.id,playerId,grade]);
    return res.json({success:true});
  }catch(e){console.error('Market favorite delete:',e);return res.status(500).json({success:false,error:'관심 선수 삭제 실패'});}
});

router.get('/grade/:playerId/:grade',async(req:AuthRequest,res)=>{
  const playerId=asInt(req.params.playerId,1,100000000,0),grade=asInt(req.params.grade,0,10,-1);
  if(!playerId||grade<0)return res.status(400).json({success:false,error:'올바른 선수 또는 등급이 아닙니다.'});
  try{
    const [players]:any=await pool.query(
      `SELECT p.id,p.name,p.team,p.position,p.season,p.overall,p.image_url,
        COALESCE(b.boost_amount,0) AS live_boost
       FROM players p LEFT JOIN worlds2026_live_boosts b ON b.player_id=p.id WHERE p.id=?`,[playerId]);
    if(!players.length)return res.status(404).json({success:false,error:'선수를 찾을 수 없습니다.'});
    const [listings]:any=await pool.query(
      `SELECT mt.id AS listing_id,mt.seller_id,mt.listing_price,mt.listed_at,
        uc.level,u.username AS seller_username
       FROM market_transactions mt JOIN user_cards uc ON uc.id=mt.card_id
       JOIN users u ON u.id=mt.seller_id
       WHERE mt.player_id=? AND mt.status='LISTED' AND uc.level=?
       ORDER BY mt.listing_price ASC,mt.id ASC LIMIT 70`,[playerId,grade]);
    const [history]:any=await pool.query(
      `SELECT mt.sold_price AS price,mt.sold_at AS date,mt.id
       FROM market_transactions mt
       WHERE mt.player_id=? AND mt.status='SOLD'
         AND COALESCE(mt.enhancement_level,(
           SELECT uc.level FROM user_cards uc WHERE uc.id=mt.card_id
         ))=?
       ORDER BY mt.sold_at DESC,mt.id DESC LIMIT 40`,[playerId,grade]);
    const sold=history.map((x:any)=>({price:Number(x.price),date:x.date,id:x.id})).reverse();
    return res.json({success:true,data:{
      player:players[0],grade,listings,history:sold,
      lowestPrice:listings.length?Number(listings[0].listing_price):null,
      latestSold:sold.length?sold[sold.length-1].price:null
    }});
  }catch(e){console.error('Market by grade:',e);return res.status(500).json({success:false,error:'강화 등급별 시세 조회 실패'});}
});

router.get('/transactions',async(req:AuthRequest,res)=>{
  const status=typeof req.query.status==='string'?req.query.status.toUpperCase():'ALL';
  if(!['ALL','SOLD','LISTED','CANCELLED'].includes(status))return res.status(400).json({success:false,error:'거래 상태 필터가 잘못되었습니다.'});
  try{
    const [rows]:any=await pool.query(
      `SELECT mt.id,mt.player_id,p.name,p.team,p.season,p.overall,
        mt.seller_id,mt.buyer_id,mt.listing_price,mt.sold_price,mt.status,
        mt.listed_at,mt.sold_at,
        COALESCE(mt.enhancement_level,uc.level) AS enhancement_level,
        seller.username AS seller_username,buyer.username AS buyer_username
       FROM market_transactions mt JOIN players p ON p.id=mt.player_id
       LEFT JOIN user_cards uc ON uc.id=mt.card_id
       JOIN users seller ON seller.id=mt.seller_id
       LEFT JOIN users buyer ON buyer.id=mt.buyer_id
       WHERE (mt.seller_id=? OR mt.buyer_id=?)
         AND (?='ALL' OR mt.status=?)
       ORDER BY mt.id DESC LIMIT 200`,
      [req.user!.id,req.user!.id,status,status]);
    res.setHeader('Cache-Control','no-store');
    return res.json({success:true,data:rows});
  }catch(e){console.error('Market transactions:',e);return res.status(500).json({success:false,error:'거래 내역 조회 실패'});}
});
export default router;
