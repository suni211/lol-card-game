import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Preview cards to be culled
router.post('/cull-cards/preview', authMiddleware, async (req: AuthRequest, res) => {
  const { overallThreshold } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (typeof overallThreshold !== 'number' || overallThreshold < 0) {
    return res.status(400).json({ success: false, error: 'Invalid overall threshold' });
  }

  try {
    const [cardsToCull]: any = await pool.query(
      `SELECT COUNT(*) as count FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.user_id = ? AND p.overall < ?`,
      [userId, overallThreshold]
    );

    res.json({ success: true, data: { count: cardsToCull[0].count } });
  } catch (error) {
    console.error('Error previewing cards to cull:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Confirm and cull cards
router.post('/cull-cards/confirm', authMiddleware, async (req: AuthRequest, res) => {
  const { overallThreshold } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (typeof overallThreshold !== 'number' || overallThreshold < 0) {
    return res.status(400).json({ success: false, error: 'Invalid overall threshold' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get cards to be culled (for logging or potential refunds)
    const [culledCards]: any = await connection.query(
      `SELECT uc.id, p.name, p.overall FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.user_id = ? AND p.overall < ?`,
      [userId, overallThreshold]
    );

    if (culledCards.length === 0) {
      await connection.rollback();
      return res.json({ success: true, data: { count: 0, message: 'No cards to cull.' } });
    }

    // Delete the cards
    const cardIdsToDelete = culledCards.map((card: any) => card.id);
    await connection.query(
      `DELETE FROM user_cards WHERE id IN (?) AND user_id = ?`,
      [cardIdsToDelete, userId]
    );

    await connection.commit();
    res.json({ success: true, data: { count: culledCards.length, message: `${culledCards.length} cards culled successfully.` } });
  } catch (error) {
    await connection.rollback();
    console.error('Error culling cards:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});


router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.user!.id;
    const filters: string[] = [];
    const args: any[] = [id];
    for (const key of ['tier', 'season', 'team', 'position'] as const) {
      const value = req.query[key];
      if (typeof value === 'string' && value.trim()) {
        filters.push('p.' + key + ' = ?');
        args.push(value.trim().slice(0, 70));
      }
    }
    const search = req.query.search;
    if (typeof search === 'string' && search.trim()) {
      filters.push('(p.name LIKE ? OR p.team LIKE ?)');
      const term = '%' + search.trim().slice(0, 70) + '%';
      args.push(term, term);
    }
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const [cards]: any = await pool.query(
      `SELECT p.id,p.name,p.team,p.position,p.overall,p.tier,p.season,p.image_url,
        (uc.player_id IS NOT NULL) AS collected,uc.first_obtained_at,
        COALESCE(uc.total_obtained,0) AS total_obtained
        FROM players p LEFT JOIN user_collected_cards uc
          ON uc.player_id=p.id AND uc.user_id=?
        ${where} ORDER BY p.overall DESC,p.name ASC`, args);
    const [[total]]: any = await pool.query('SELECT COUNT(*) AS n FROM players');
    const [[owned]]: any = await pool.query(
      'SELECT COUNT(DISTINCT player_id) AS n FROM user_collected_cards WHERE user_id=?',[id]);
    res.json({success:true,data:{
      cards:cards.map((c:any)=>({...c,collected:Boolean(c.collected)})),
      stats:{total_count:total.n,collected_count:owned.n}
    }});
  } catch (error) {
    console.error('Collection list error:',error);
    res.status(500).json({success:false,error:'도감 목록 조회 실패'});
  }
});

router.get('/progress', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT p.tier,COUNT(*) AS total,COUNT(uc.player_id) AS collected
       FROM players p LEFT JOIN user_collected_cards uc
         ON uc.player_id=p.id AND uc.user_id=?
       GROUP BY p.tier ORDER BY p.tier`,[req.user!.id]);
    res.json({success:true,data:{tierProgress:rows}});
  } catch (error) {
    console.error('Collection progress error:',error);
    res.status(500).json({success:false,error:'도감 진행도 조회 실패'});
  }
});

router.get('/milestones', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT m.*, (um.milestone_id IS NOT NULL) AS claimed
       FROM collection_milestones m
       LEFT JOIN user_collection_milestones um
        ON um.milestone_id=m.id AND um.user_id=?
       ORDER BY m.required_cards,m.id`,[req.user!.id]);
    res.json({success:true,data:rows.map((m:any)=>({...m,claimed:Boolean(m.claimed)}))});
  } catch (error) {
    console.error('Collection milestones error:',error);
    res.status(500).json({success:false,error:'도감 보상 조회 실패'});
  }
});

router.post('/milestones/claim', authMiddleware, async (req: AuthRequest, res) => {
  const milestoneId=Number(req.body?.milestoneId);
  if(!Number.isSafeInteger(milestoneId)||milestoneId<1) {
    return res.status(400).json({success:false,error:'올바르지 않은 보상입니다.'});
  }
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ms]:any=await conn.query('SELECT * FROM collection_milestones WHERE id=?',[milestoneId]);
    if(!ms.length){await conn.rollback();return res.status(404).json({success:false,error:'보상이 없습니다.'});}
    const m=ms[0];
    if(m.milestone_type!=='TOTAL'){await conn.rollback();return res.status(400).json({success:false,error:'해당 보상 유형은 준비 중입니다.'});}
    const [[owned]]:any=await conn.query('SELECT COUNT(DISTINCT player_id) AS n FROM user_collected_cards WHERE user_id=?',[req.user!.id]);
    if(owned.n<m.required_cards){await conn.rollback();return res.status(400).json({success:false,error:'수집 조건을 충족하지 못했습니다.'});}
    const [insert]:any=await conn.query('INSERT IGNORE INTO user_collection_milestones (user_id,milestone_id) VALUES (?,?)',[req.user!.id,milestoneId]);
    if(!insert.affectedRows){await conn.rollback();return res.status(409).json({success:false,error:'이미 수령했습니다.'});}
    await conn.query('UPDATE users SET points=points+? WHERE id=?',[m.reward_points,req.user!.id]);
    await conn.commit();
    res.json({success:true,message:`도감 보상 ${m.reward_points}P 지급 완료`});
  } catch(error){await conn.rollback();console.error('Milestone claim error:',error);res.status(500).json({success:false,error:'보상 지급 실패'});}
  finally{conn.release();}
});

export default router;