import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';
import { triggerHotTimeEvent } from '../scheduler/hotTimeEvent';

const router = express.Router();
let io: Server;

export const setSocketIOForAdmin = (socketIO: Server) => {
  io = socketIO;
};

// Admin middleware - 특정 사용자만 관리자 권한 부여
const adminMiddleware = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const userId = req.user!.id;

    // 관리자 확인 (users 테이블에 is_admin 컬럼 필요)
    const [users]: any = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.',
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// 포인트 지급
router.post('/give-points', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { username, points, reason } = req.body;

    if (!username || !points) {
      return res.status(400).json({
        success: false,
        error: '유저명과 포인트를 입력해주세요.',
      });
    }

    if (points < 0 || points > 1000000) {
      return res.status(400).json({
        success: false,
        error: '포인트는 0~1,000,000 사이로 입력해주세요.',
      });
    }

    // 유저 찾기
    const [users]: any = await connection.query(
      'SELECT id, username, points FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '해당 유저를 찾을 수 없습니다.',
      });
    }

    const targetUser = users[0];

    // 포인트 지급
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [points, targetUser.id]
    );

    // 관리자 로그 기록
    await connection.query(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user!.id, 'GIVE_POINTS', targetUser.id, JSON.stringify({ points, reason: reason || '없음', previousPoints: targetUser.points })]
    );

    await connection.commit();

    // Get updated user points for real-time update
    const [updatedUser]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [targetUser.id]
    );

    // Send real-time update via Socket.IO
    if (io) {
      io.to(`user_${targetUser.id}`).emit('pointsUpdate', {
        points: updatedUser[0].points
      });
    }

    res.json({
      success: true,
      message: `${username}님에게 ${points}P를 지급했습니다.`,
      data: {
        username: targetUser.username,
        previousPoints: targetUser.points,
        newPoints: targetUser.points + points,
        pointsGiven: points,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Give points error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  } finally {
    connection.release();
  }
});

// 포인트 차감
router.post('/deduct-points', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { username, points, reason } = req.body;

    if (!username || !points) {
      return res.status(400).json({
        success: false,
        error: '유저명과 포인트를 입력해주세요.',
      });
    }

    if (points < 0 || points > 1000000) {
      return res.status(400).json({
        success: false,
        error: '포인트는 0~1,000,000 사이로 입력해주세요.',
      });
    }

    // 유저 찾기
    const [users]: any = await connection.query(
      'SELECT id, username, points FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '해당 유저를 찾을 수 없습니다.',
      });
    }

    const targetUser = users[0];

    // 포인트 차감 (0 미만으로 내려가지 않도록)
    await connection.query(
      'UPDATE users SET points = GREATEST(0, points - ?) WHERE id = ?',
      [points, targetUser.id]
    );

    // 관리자 로그 기록
    await connection.query(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user!.id, 'DEDUCT_POINTS', targetUser.id, JSON.stringify({ points, reason: reason || '없음', previousPoints: targetUser.points })]
    );

    await connection.commit();

    const newPoints = Math.max(0, targetUser.points - points);

    // Get updated user points for real-time update
    const [updatedUser]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [targetUser.id]
    );

    // Send real-time update via Socket.IO
    if (io) {
      io.to(`user_${targetUser.id}`).emit('pointsUpdate', {
        points: updatedUser[0].points
      });
    }

    res.json({
      success: true,
      message: `${username}님의 포인트 ${points}P를 차감했습니다.`,
      data: {
        username: targetUser.username,
        previousPoints: targetUser.points,
        newPoints,
        pointsDeducted: points,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Deduct points error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  } finally {
    connection.release();
  }
});

// 선수 검색 (자동완성용)
router.get('/search-players', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // 선수 검색 (이름만, 최대 20개)
    const [players]: any = await pool.query(
      `SELECT id, name, team, position, overall, region, season, nationality,
              CASE
                WHEN name LIKE 'ICON%' THEN 'ICON'
                WHEN overall <= 80 THEN 'COMMON'
                WHEN overall <= 90 THEN 'RARE'
                WHEN overall <= 100 THEN 'EPIC'
                ELSE 'LEGENDARY'
              END as tier
       FROM players
       WHERE name LIKE ?
       ORDER BY overall DESC
       LIMIT 20`,
      [`%${query}%`]
    );

    res.json({
      success: true,
      data: players,
    });
  } catch (error: any) {
    console.error('Search players error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// Complete player directory for the separate admin card editor.
// Every row is one exact player-series card; edits never mutate other OVRs.
router.get('/player-directory', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page || '1'),10) || 1));
    const limit = Math.max(10, Math.min(100, Number.parseInt(String(req.query.limit || '50'),10) || 50));
    const query = String(req.query.q || '').trim().slice(0,100);
    const season = String(req.query.season || 'ALL');
    const region = String(req.query.region || 'ALL');
    const missingOnly = req.query.missing === '1';
    const missingPhotoOnly = req.query.missingPhoto === '1';
    if (!['ALL','26 LIVE','26WR','26WRs'].includes(season)) {
      return res.status(400).json({success:false,error:'시즌 필터가 잘못되었습니다.'});
    }
    if (!['ALL','LCK','LPL','LEC','LCS','CBLOL','LCP','LTA'].includes(region)) {
      return res.status(400).json({success:false,error:'지역 필터가 잘못되었습니다.'});
    }
    const where: string[] = [];
    const params: any[] = [];
    if (season !== 'ALL') { where.push('p.season=?'); params.push(season); }
    if (region !== 'ALL') { where.push('p.region=?'); params.push(region); }
    if (query) {
      where.push('(p.name LIKE ? OR p.team LIKE ? OR CAST(p.id AS CHAR)=?)');
      params.push('%'+query+'%','%'+query+'%',query);
    }
    if (missingOnly) where.push("(p.nationality IS NULL OR p.nationality='')");
    if (missingPhotoOnly) where.push("(p.image_url IS NULL OR p.image_url='')");
    const filter = where.length ? 'WHERE '+where.join(' AND ') : '';
    const [count]:any = await pool.query(
      `SELECT COUNT(*) as total FROM players p ${filter}`,params
    );
    const total = Number(count[0].total);
    const [rows]:any = await pool.query(
      `SELECT p.id,p.name,p.team,p.position,p.region,p.season,
              p.overall,p.nationality,p.image_url,
              COALESCE(ps.cs,p.overall) AS cs,
              COALESCE(ps.teamfight,p.overall) AS teamfight,
              COALESCE(ps.laning,p.overall) AS laning,
              COALESCE(ps.shotcalling,p.overall) AS shotcalling,
              COALESCE(ps.mental,p.overall) AS mental,
              COALESCE(ps.clutch,p.overall) AS clutch
       FROM players p LEFT JOIN player_stats ps ON ps.player_id=p.id ${filter}
       ORDER BY FIELD(p.season,'26WRs','26WR','26 LIVE') DESC,
                p.region,p.team,p.name,p.position,p.id
       LIMIT ? OFFSET ?`,
      [...params,limit,(page-1)*limit]
    );
    const [missing]:any = await pool.query(
      "SELECT COUNT(*) AS total FROM players WHERE nationality IS NULL OR nationality=''"
    );
    const [missingPhoto]:any = await pool.query(
      "SELECT COUNT(*) AS total FROM players WHERE season IN ('26 LIVE','26WR','26WRs') AND (image_url IS NULL OR image_url='')"
    );
    return res.json({success:true,data:{
      players:rows,page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit)),
      missingCount:Number(missing[0].total),
      missingPhotoCount:Number(missingPhoto[0].total)
    }});
  } catch(error) {
    console.error('Player directory error:',error);
    return res.status(500).json({success:false,error:'선수 목록 조회 실패. 국적 컬럼 마이그레이션을 확인하세요.'});
  }
});

// Update exactly six player stats. OVR is saved separately per series.
router.put('/player-six-stats/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const playerId=Number(req.params.id);
  const fields=['cs','teamfight','laning','shotcalling','mental','clutch'] as const;
  const values=fields.map(key => Number(req.body?.[key]));
  if(!Number.isSafeInteger(playerId)||playerId<1 ||
    values.some(value=>!Number.isSafeInteger(value)||value<0||value>100)) {
    return res.status(400).json({
      success:false,error:'CS·한타·라인전·오더·멘탈·클러치 6개를 0~100의 정수로 입력해주세요.'
    });
  }
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [players]:any=await conn.query(
      'SELECT id,name,team,season FROM players WHERE id=? FOR UPDATE',[playerId]
    );
    if(!players.length){
      await conn.rollback();
      return res.status(404).json({success:false,error:'선수 카드를 찾을 수 없습니다.'});
    }
    await conn.query(
      `INSERT INTO player_stats (player_id,cs,teamfight,laning,shotcalling,mental,clutch)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE cs=VALUES(cs),teamfight=VALUES(teamfight),
         laning=VALUES(laning),shotcalling=VALUES(shotcalling),
         mental=VALUES(mental),clutch=VALUES(clutch)`,
      [playerId,...values]
    );
    await conn.query(
      'INSERT INTO admin_logs (admin_id,action,target_user_id,details) VALUES (?,?,NULL,?)',
      [req.user!.id,'UPDATE_PLAYER_SIX_STATS',
        JSON.stringify({playerId,season:players[0].season,
          stats:Object.fromEntries(fields.map((key,i)=>[key,values[i]]))})]
    );
    await conn.commit();
    return res.json({success:true,message:`${players[0].name} 선수 능력치 저장 완료`});
  }catch(error){
    await conn.rollback();
    console.error('Admin six-stat update:',error);
    return res.status(500).json({success:false,error:'능력치 저장 실패. 2026_competitive_pvp_six_stats.sql 적용 여부를 확인하세요.'});
  }finally{conn.release();}
});

// Update the OVR of one exact player card series. Never modify a whole name across seasons.
router.put('/player-overall/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const playerId = Number(req.params.id);
  const overall = Number(req.body?.overall);
  if (!Number.isSafeInteger(playerId) || playerId < 1 ||
      !Number.isSafeInteger(overall) || overall < 50 || overall > 160) {
    return res.status(400).json({success:false,error:'선수 ID 또는 OVR이 올바르지 않습니다. (50~160)'});
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [players]:any = await connection.query(
      'SELECT id,name,team,season,overall FROM players WHERE id=? FOR UPDATE',
      [playerId]
    );
    if (!players.length) {
      await connection.rollback();
      return res.status(404).json({success:false,error:'선수 카드를 찾을 수 없습니다.'});
    }
    await connection.query('UPDATE players SET overall=? WHERE id=?',[overall,playerId]);
    await connection.query(
      'INSERT INTO admin_logs (admin_id,action,target_user_id,details) VALUES (?,?,NULL,?)',
      [req.user!.id,'UPDATE_PLAYER_OVERALL',
       JSON.stringify({playerId,name:players[0].name,team:players[0].team,
         season:players[0].season,oldOverall:players[0].overall,newOverall:overall})]
    );
    await connection.commit();
    return res.json({success:true,message:`${players[0].name} ${players[0].season} OVR ${overall} 적용 완료`});
  } catch(error) {
    await connection.rollback();
    console.error('Admin update player overall error:',error);
    return res.status(500).json({success:false,error:'OVR 저장 실패'});
  } finally {connection.release();}
});

// Explicit nationality editing: nationality must reflect the actual player, not the league region.
router.put('/player-nationality/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const playerId=Number(req.params.id);
  const rawCountryCode=String(req.body?.nationality || '').trim().toUpperCase();
  const nationality=rawCountryCode === 'UK' ? 'GB' : rawCountryCode;
  if(!Number.isSafeInteger(playerId)||playerId<1||!/^[A-Z]{2}$/.test(nationality)) {
    return res.status(400).json({success:false,error:'선수 ID와 두 글자 국적 코드(예: KR)를 입력하세요.'});
  }
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [players]:any=await conn.query(
      'SELECT id,name,team,position,season,nationality FROM players WHERE id=? FOR UPDATE',
      [playerId]
    );
    if(!players.length){
      await conn.rollback();
      return res.status(404).json({success:false,error:'해당 카드를 찾을 수 없습니다.'});
    }
    const applyToAllSeasons = req.body?.applyToAllSeasons === true;
    const [changed]:any = applyToAllSeasons
      ? await conn.query(
          'UPDATE players SET nationality=? WHERE name=? AND team=? AND position=?',
          [nationality, players[0].name, players[0].team, players[0].position]
        )
      : await conn.query('UPDATE players SET nationality=? WHERE id=?',[nationality,playerId]);
    const changedCount = Number(changed.affectedRows) || 0;
    await conn.query(
      'INSERT INTO admin_logs (admin_id,action,target_user_id,details) VALUES (?,?,NULL,?)',
      [req.user!.id,'UPDATE_PLAYER_NATIONALITY',
        JSON.stringify({playerId,name:players[0].name,team:players[0].team,
          position:players[0].position,season:players[0].season,
          previous:players[0].nationality,newNationality:nationality,
          applyToAllSeasons,changedCount})]
    );
    await conn.commit();
    return res.json({
      success:true,changedCount,
      message:`${players[0].name} 국적 ${nationality} 저장 완료 (${changedCount}개 카드)`
    });
  } catch(error){
    await conn.rollback();
    console.error('Player nationality update error:',error);
    return res.status(500).json({success:false,error:'국적 저장 실패. nationality 컬럼 마이그레이션을 확인하세요.'});
  } finally {conn.release();}
});

router.get('/missing-nationalities', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [players]:any=await pool.query(
      `SELECT id,name,team,season,position,overall,region,nationality FROM players
       WHERE nationality IS NULL OR nationality=''
       ORDER BY region,team,name,season LIMIT 500`
    );
    const [[count]]:any=await pool.query(
      "SELECT COUNT(*) AS total FROM players WHERE nationality IS NULL OR nationality=''"
    );
    return res.json({success:true,data:{total:count.total,players}});
  } catch(error) {
    console.error('Missing nationalities error:',error);
    return res.status(500).json({success:false,error:'국적 데이터 점검 실패'});
  }
});

// 카드 지급
router.post('/give-card', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { username, playerId, level, reason } = req.body;

    if (!username || !playerId) {
      return res.status(400).json({
        success: false,
        error: '유저명과 선수를 선택해주세요.',
      });
    }

    // 강화 등급 검증
    const enhancementLevel = parseInt(level) || 0;
    if (enhancementLevel < 0 || enhancementLevel > 10) {
      return res.status(400).json({
        success: false,
        error: '강화 등급은 0~10 사이로 입력해주세요.',
      });
    }

    // 유저 찾기
    const [users]: any = await connection.query(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '해당 유저를 찾을 수 없습니다.',
      });
    }

    const targetUser = users[0];

    // 선수 ID로 직접 찾기
    const [players]: any = await connection.query(
      `SELECT id, name, overall, season,
              CASE
                WHEN season = 'ICON' THEN 'ICON'
                WHEN overall <= 80 THEN 'COMMON'
                WHEN overall <= 90 THEN 'RARE'
                WHEN overall <= 100 THEN 'EPIC'
                ELSE 'LEGENDARY'
              END as tier
       FROM players WHERE id = ?`,
      [playerId]
    );

    if (players.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '선수를 찾을 수 없습니다.',
      });
    }

    if (players.length > 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `여러 선수가 검색되었습니다: ${players.map((p: any) => `${p.name} (${p.tier}, ${p.season || '25'})`).join(', ')}`,
        players: players.map((p: any) => ({ id: p.id, name: p.name, tier: p.tier, season: p.season })),
      });
    }

    const player = players[0];

    // 카드 지급
    await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, ?)',
      [targetUser.id, player.id, enhancementLevel]
    );

    // 관리자 로그 기록
    await connection.query(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user!.id, 'GIVE_CARD', targetUser.id, JSON.stringify({ playerName: player.name, playerId: player.id, tier: player.tier, level: enhancementLevel, reason: reason || '없음' })]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `${username}님에게 ${player.name} (강화 +${enhancementLevel}) 카드를 지급했습니다.`,
      data: {
        username: targetUser.username,
        playerName: player.name,
        tier: player.tier,
        level: enhancementLevel,
      },
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Give card error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  } finally {
    connection.release();
  }
});

// 관리자 로그 조회
router.get('/logs', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const [logs]: any = await pool.query(`
      SELECT
        al.*,
        u1.username as admin_username,
        u2.username as target_username
      FROM admin_logs al
      LEFT JOIN users u1 ON al.admin_id = u1.id
      LEFT JOIN users u2 ON al.target_user_id = u2.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({
      success: true,
      data: logs,
    });

  } catch (error: any) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// 강제 로그아웃 (관리자 전용)
router.post('/force-logout', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }

    // Get user id
    const [users]: any = await pool.query('SELECT id FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userId = users[0].id;

    // Broadcast force logout to all clients - client will check if it's them
    io.emit('force_logout', { userId, reason: '계정이 정지되었습니다.' });

    console.log(`[Admin] Force logout sent for user ${username} (ID: ${userId})`);

    res.json({
      success: true,
      message: `${username} 강제 로그아웃 신호 전송 완료`,
    });
  } catch (error: any) {
    console.error('Force logout error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 핫타임 이벤트 수동 트리거 (관리자 전용)
router.post('/hot-time/trigger', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('[Admin] Hot time event manual trigger by user:', req.user!.id);

    await triggerHotTimeEvent();

    res.json({
      success: true,
      message: '핫타임 이벤트가 실행되었습니다.',
    });
  } catch (error: any) {
    console.error('Trigger hot time event error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// 핫타임 이벤트 로그 조회 (관리자 전용)
router.get('/hot-time/logs', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const [logs]: any = await pool.query(`
      SELECT
        htl.*,
        u.username as jackpot_username
      FROM hot_time_logs htl
      JOIN users u ON htl.jackpot_user_id = u.id
      ORDER BY htl.created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Get hot time logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;
