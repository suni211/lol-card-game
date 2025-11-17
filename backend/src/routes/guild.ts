import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 길드 생성 (5만 포인트 필요)
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { name, tag, description } = req.body;

    // 유효성 검사
    if (!name || !tag) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드 이름과 태그는 필수입니다.',
      });
    }

    if (tag.length !== 3) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드 태그는 정확히 3글자여야 합니다.',
      });
    }

    // 유저 정보 조회
    const [users]: any = await connection.query(
      'SELECT id, username, points, guild_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '유저를 찾을 수 없습니다.',
      });
    }

    const user = users[0];

    // 이미 길드에 소속되어 있는지 확인
    if (user.guild_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 길드에 소속되어 있습니다.',
      });
    }

    // 포인트 확인 (5만 포인트)
    if (user.points < 50000) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드 생성에 필요한 포인트가 부족합니다. (필요: 50,000)',
      });
    }

    // 길드 이름 중복 확인
    const [nameCheck]: any = await connection.query('SELECT id FROM guilds WHERE name = ?', [name]);
    if (nameCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 길드 이름입니다.',
      });
    }

    // 길드 태그 중복 확인
    const [tagCheck]: any = await connection.query('SELECT id FROM guilds WHERE tag = ?', [tag]);
    if (tagCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 길드 태그입니다.',
      });
    }

    // 포인트 차감
    await connection.query('UPDATE users SET points = points - 50000 WHERE id = ?', [userId]);

    // 길드 생성
    const [guildResult]: any = await connection.query(
      'INSERT INTO guilds (name, tag, description, leader_id) VALUES (?, ?, ?, ?)',
      [name, tag, description || '', userId]
    );

    const guildId = guildResult.insertId;

    // 길드 멤버 추가 (리더)
    await connection.query(
      'INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?)',
      [guildId, userId, 'LEADER']
    );

    // 유저 테이블 업데이트
    await connection.query('UPDATE users SET guild_id = ? WHERE id = ?', [guildId, userId]);

    // 주간 미션 5개 랜덤 선택
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 이번 주 일요일
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [missions]: any = await connection.query(
      'SELECT id FROM guild_mission_pool ORDER BY RAND() LIMIT 5'
    );

    for (const mission of missions) {
      await connection.query(
        'INSERT INTO guild_weekly_missions (guild_id, mission_id, week_start) VALUES (?, ?, ?)',
        [guildId, mission.id, weekStartStr]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: '길드가 생성되었습니다!',
      data: {
        guildId,
        name,
        tag,
        description,
        pointsRemaining: user.points - 50000,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Guild create error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 내 길드 정보 조회
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [users]: any = await pool.query('SELECT guild_id FROM users WHERE id = ?', [userId]);

    if (users.length === 0 || !users[0].guild_id) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const guildId = users[0].guild_id;

    // 길드 정보 조회
    const [guilds]: any = await pool.query(
      `SELECT g.*, u.username as leader_name,
              (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
       FROM guilds g
       JOIN users u ON g.leader_id = u.id
       WHERE g.id = ?`,
      [guildId]
    );

    if (guilds.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const guild = guilds[0];

    // 내 멤버 정보
    const [myMember]: any = await pool.query(
      'SELECT role, contribution FROM guild_members WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    res.json({
      success: true,
      data: {
        ...guild,
        myRole: myMember[0]?.role || 'MEMBER',
        myContribution: myMember[0]?.contribution || 0,
      },
    });
  } catch (error: any) {
    console.error('Get my guild error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 길드 상세 정보 조회
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const guildId = parseInt(req.params.id);

    const [guilds]: any = await pool.query(
      `SELECT g.*, u.username as leader_name,
              (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
       FROM guilds g
       JOIN users u ON g.leader_id = u.id
       WHERE g.id = ?`,
      [guildId]
    );

    if (guilds.length === 0) {
      return res.status(404).json({
        success: false,
        error: '길드를 찾을 수 없습니다.',
      });
    }

    const guild = guilds[0];

    // 멤버 목록
    const [members]: any = await pool.query(
      `SELECT gm.role, gm.contribution, gm.joined_at,
              u.id, u.username, u.tier, u.wins, u.losses, u.level
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = ?
       ORDER BY gm.role ASC, gm.contribution DESC`,
      [guildId]
    );

    res.json({
      success: true,
      data: {
        ...guild,
        members,
      },
    });
  } catch (error: any) {
    console.error('Get guild detail error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 길드 목록 조회
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [guilds]: any = await pool.query(
      `SELECT g.*, u.username as leader_name,
              (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
       FROM guilds g
       JOIN users u ON g.leader_id = u.id
       ORDER BY g.points DESC, g.level DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      data: guilds,
    });
  } catch (error: any) {
    console.error('Get guilds error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 길드 가입
router.post('/join/:id', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const guildId = parseInt(req.params.id);

    // 유저 정보 조회
    const [users]: any = await connection.query(
      'SELECT id, username, guild_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '유저를 찾을 수 없습니다.',
      });
    }

    const user = users[0];

    // 이미 길드에 소속되어 있는지 확인
    if (user.guild_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 길드에 소속되어 있습니다.',
      });
    }

    // 길드 정보 조회
    const [guilds]: any = await connection.query(
      `SELECT g.*, (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
       FROM guilds g WHERE g.id = ?`,
      [guildId]
    );

    if (guilds.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: '길드를 찾을 수 없습니다.',
      });
    }

    const guild = guilds[0];

    // 정원 확인
    if (guild.member_count >= guild.max_members) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드 정원이 가득 찼습니다.',
      });
    }

    // 길드 멤버 추가
    await connection.query(
      'INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?)',
      [guildId, userId, 'MEMBER']
    );

    // 유저 테이블 업데이트
    await connection.query('UPDATE users SET guild_id = ? WHERE id = ?', [guildId, userId]);

    await connection.commit();

    res.json({
      success: true,
      message: `${guild.name} 길드에 가입했습니다!`,
      data: {
        guildId,
        guildName: guild.name,
        guildTag: guild.tag,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Guild join error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 길드 탈퇴
router.post('/leave', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // 유저 정보 조회
    const [users]: any = await connection.query(
      'SELECT id, username, guild_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].guild_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드에 소속되어 있지 않습니다.',
      });
    }

    const guildId = users[0].guild_id;

    // 길드 리더 확인
    const [guilds]: any = await connection.query('SELECT leader_id FROM guilds WHERE id = ?', [
      guildId,
    ]);

    if (guilds.length > 0 && guilds[0].leader_id === userId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: '길드 리더는 탈퇴할 수 없습니다. 먼저 리더를 위임하거나 길드를 해체하세요.',
      });
    }

    // 길드 멤버 삭제
    await connection.query('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?', [
      guildId,
      userId,
    ]);

    // 유저 테이블 업데이트
    await connection.query('UPDATE users SET guild_id = NULL WHERE id = ?', [userId]);

    await connection.commit();

    res.json({
      success: true,
      message: '길드에서 탈퇴했습니다.',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Guild leave error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 길드 주간 미션 조회
router.get('/missions/weekly', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // 유저의 길드 ID 조회
    const [users]: any = await pool.query('SELECT guild_id FROM users WHERE id = ?', [userId]);

    if (users.length === 0 || !users[0].guild_id) {
      return res.status(400).json({
        success: false,
        error: '길드에 소속되어 있지 않습니다.',
      });
    }

    const guildId = users[0].guild_id;

    // 이번 주 시작일 계산
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // 주간 미션 조회
    const [missions]: any = await pool.query(
      `SELECT gwm.id as weekly_mission_id, gwm.current_progress, gwm.is_completed, gwm.completed_at,
              gmp.id as mission_id, gmp.title, gmp.description, gmp.requirement,
              gmp.mission_type, gmp.reward_points, gmp.difficulty
       FROM guild_weekly_missions gwm
       JOIN guild_mission_pool gmp ON gwm.mission_id = gmp.id
       WHERE gwm.guild_id = ? AND gwm.week_start = ?
       ORDER BY gwm.is_completed ASC, gmp.difficulty ASC`,
      [guildId, weekStartStr]
    );

    // 미션이 없으면 새로 생성 (주간 리셋)
    if (missions.length === 0) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 랜덤으로 5개 미션 선택
        const [missionPool]: any = await connection.query(
          'SELECT id FROM guild_mission_pool ORDER BY RAND() LIMIT 5'
        );

        for (const mission of missionPool) {
          await connection.query(
            'INSERT INTO guild_weekly_missions (guild_id, mission_id, week_start) VALUES (?, ?, ?)',
            [guildId, mission.id, weekStartStr]
          );
        }

        await connection.commit();

        // 다시 조회
        const [newMissions]: any = await pool.query(
          `SELECT gwm.id as weekly_mission_id, gwm.current_progress, gwm.is_completed, gwm.completed_at,
                  gmp.id as mission_id, gmp.title, gmp.description, gmp.requirement,
                  gmp.mission_type, gmp.reward_points, gmp.difficulty
           FROM guild_weekly_missions gwm
           JOIN guild_mission_pool gmp ON gwm.mission_id = gmp.id
           WHERE gwm.guild_id = ? AND gwm.week_start = ?
           ORDER BY gwm.is_completed ASC, gmp.difficulty ASC`,
          [guildId, weekStartStr]
        );

        return res.json({
          success: true,
          data: newMissions,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    res.json({
      success: true,
      data: missions,
    });
  } catch (error: any) {
    console.error('Get weekly missions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
