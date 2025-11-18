import express from 'express';
import pool from '../config/database';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

const DAILY_ATTACK_LIMIT = 10;
const TOTAL_REWARD_POOL = 1000000; // 1M points
const MIN_REWARD = 100; // Minimum reward per participant

// Helper function to calculate deck power
async function calculateDeckPower(userId: number, connection: any): Promise<number> {
  // Get active deck
  const [decks]: any = await connection.query(
    'SELECT * FROM decks WHERE user_id = ? AND is_active = TRUE',
    [userId]
  );

  if (decks.length === 0) {
    return 0;
  }

  const deck = decks[0];
  const cardIds = [
    deck.top_card_id,
    deck.jungle_card_id,
    deck.mid_card_id,
    deck.adc_card_id,
    deck.support_card_id,
  ].filter(Boolean);

  if (cardIds.length === 0) {
    return 0;
  }

  // Get card details with levels
  const [cards]: any = await connection.query(`
    SELECT
      uc.level,
      p.overall
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  // Calculate total power (base overall + enhancement bonus)
  let totalPower = 0;
  cards.forEach((card: any) => {
    const basePower = card.overall;
    const enhancementBonus = card.level * 2; // Each level adds 2 power
    totalPower += basePower + enhancementBonus;
  });

  return totalPower;
}

// Get current active raid
router.get('/current', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [raids]: any = await pool.query(`
      SELECT
        id,
        name,
        current_hp,
        max_hp,
        is_active,
        started_at,
        ended_at,
        reward_multiplier
      FROM raid_bosses
      WHERE is_active = TRUE
      ORDER BY started_at DESC
      LIMIT 1
    `);

    if (raids.length === 0) {
      return res.json({ success: true, data: null });
    }

    const raid = raids[0];

    // Get total participants and total damage
    const [stats]: any = await pool.query(`
      SELECT
        COUNT(*) as total_participants,
        SUM(damage_dealt) as total_damage
      FROM raid_participants
      WHERE raid_boss_id = ?
    `, [raid.id]);

    res.json({
      success: true,
      data: {
        ...raid,
        totalParticipants: stats[0].total_participants || 0,
        totalDamage: stats[0].total_damage || 0,
      }
    });
  } catch (error: any) {
    console.error('Get current raid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get raid leaderboard
router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get active raid
    const [raids]: any = await pool.query(
      'SELECT id FROM raid_bosses WHERE is_active = TRUE ORDER BY started_at DESC LIMIT 1'
    );

    if (raids.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const raidId = raids[0].id;

    const [leaderboard]: any = await pool.query(`
      SELECT
        rp.user_id,
        rp.damage_dealt,
        rp.attempts,
        u.username,
        u.level,
        u.rating,
        t.name as title_name,
        t.color as title_color,
        t.rarity as title_rarity
      FROM raid_participants rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN titles t ON u.equipped_title_id = t.id
      WHERE rp.raid_boss_id = ?
      ORDER BY rp.damage_dealt DESC
      LIMIT ?
    `, [raidId, parseInt(limit as string)]);

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get my raid stats
router.get('/my-stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get active raid
    const [raids]: any = await pool.query(
      'SELECT id FROM raid_bosses WHERE is_active = TRUE ORDER BY started_at DESC LIMIT 1'
    );

    if (raids.length === 0) {
      return res.json({ success: true, data: null });
    }

    const raidId = raids[0].id;

    // Get my participation
    const [participation]: any = await pool.query(`
      SELECT
        damage_dealt,
        attempts,
        last_attack_at
      FROM raid_participants
      WHERE raid_boss_id = ? AND user_id = ?
    `, [raidId, userId]);

    // Get my rank
    const [rankResult]: any = await pool.query(`
      SELECT COUNT(*) + 1 as rank
      FROM raid_participants
      WHERE raid_boss_id = ? AND damage_dealt > (
        SELECT COALESCE(damage_dealt, 0)
        FROM raid_participants
        WHERE raid_boss_id = ? AND user_id = ?
      )
    `, [raidId, raidId, userId]);

    // Check remaining attacks today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remainingAttacks = DAILY_ATTACK_LIMIT;
    let totalDamage = 0;

    if (participation.length > 0) {
      const lastAttack = new Date(participation[0].last_attack_at);
      lastAttack.setHours(0, 0, 0, 0);

      // Reset attempts if last attack was not today
      if (lastAttack.getTime() === today.getTime()) {
        remainingAttacks = DAILY_ATTACK_LIMIT - participation[0].attempts;
      }

      totalDamage = participation[0].damage_dealt;
    }

    res.json({
      success: true,
      data: {
        totalDamage,
        attempts: participation.length > 0 ? participation[0].attempts : 0,
        remainingAttacks: Math.max(0, remainingAttacks),
        rank: rankResult[0].rank,
        lastAttackAt: participation.length > 0 ? participation[0].last_attack_at : null,
      }
    });
  } catch (error: any) {
    console.error('Get my stats error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Attack raid boss with AI battle
router.post('/attack', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get active raid
    const [raids]: any = await connection.query(
      'SELECT * FROM raid_bosses WHERE is_active = TRUE ORDER BY started_at DESC LIMIT 1 FOR UPDATE'
    );

    if (raids.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '활성화된 레이드가 없습니다.' });
    }

    const raid = raids[0];

    if (raid.current_hp <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이미 처치된 보스입니다.' });
    }

    // Check daily attack limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [participation]: any = await connection.query(
      'SELECT attempts, last_attack_at FROM raid_participants WHERE raid_boss_id = ? AND user_id = ?',
      [raid.id, userId]
    );

    let currentAttempts = 0;
    if (participation.length > 0) {
      const lastAttack = new Date(participation[0].last_attack_at);
      lastAttack.setHours(0, 0, 0, 0);

      // Check if last attack was today
      if (lastAttack.getTime() === today.getTime()) {
        currentAttempts = participation[0].attempts;
      }
    }

    if (currentAttempts >= DAILY_ATTACK_LIMIT) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '오늘의 공격 횟수를 모두 사용했습니다.' });
    }

    // Get user's active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '활성 덱이 없습니다.' });
    }

    const deckId = decks[0].id;

    // Calculate deck power (user's power for AI battle)
    const deckPower = await calculateDeckPower(userId, connection);

    if (deckPower === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱에 카드가 없습니다.' });
    }

    // Create AI opponent (ICON tier all +10 boss)
    const aiPower = 500; // ICON all +10 = approximately 500 power

    // Simulate battle
    const playerWinChance = deckPower / (deckPower + aiPower);
    const won = Math.random() < playerWinChance;

    let damage = 0;
    let battleResult = '';

    if (won) {
      // Victory: deal damage based on deck power
      const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      damage = Math.floor(deckPower * randomMultiplier);
      battleResult = '승리';
    } else {
      // Loss: deal minimal damage
      damage = Math.floor(deckPower * 0.1); // 10% of power
      battleResult = '패배';
    }

    // Update or insert participation
    if (participation.length > 0) {
      const lastAttack = new Date(participation[0].last_attack_at);
      lastAttack.setHours(0, 0, 0, 0);

      if (lastAttack.getTime() === today.getTime()) {
        // Same day - increment attempts and damage
        await connection.query(`
          UPDATE raid_participants
          SET damage_dealt = damage_dealt + ?, attempts = attempts + 1, last_attack_at = NOW()
          WHERE raid_boss_id = ? AND user_id = ?
        `, [damage, raid.id, userId]);
      } else {
        // New day - reset attempts
        await connection.query(`
          UPDATE raid_participants
          SET damage_dealt = damage_dealt + ?, attempts = 1, last_attack_at = NOW()
          WHERE raid_boss_id = ? AND user_id = ?
        `, [damage, raid.id, userId]);
      }
    } else {
      // First attack
      await connection.query(`
        INSERT INTO raid_participants (raid_boss_id, user_id, damage_dealt, attempts, last_attack_at)
        VALUES (?, ?, ?, 1, NOW())
      `, [raid.id, userId, damage]);
    }

    // Update boss HP
    const newHp = Math.max(0, raid.current_hp - damage);
    await connection.query(
      'UPDATE raid_bosses SET current_hp = ? WHERE id = ?',
      [newHp, raid.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `${battleResult}! ${damage.toLocaleString()} 데미지를 입혔습니다!`,
      data: {
        damage,
        won,
        playerPower: deckPower,
        aiPower,
        newHp,
        maxHp: raid.max_hp,
        remainingAttacks: DAILY_ATTACK_LIMIT - currentAttempts - 1,
        isBossDefeated: newHp === 0,
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Attack raid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Start new raid (admin only)
router.post('/admin/start', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { name, maxHp, rewardMultiplier } = req.body;

    if (!name) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '보스 이름을 입력해주세요.' });
    }

    // End all active raids first
    await connection.query(
      'UPDATE raid_bosses SET is_active = FALSE, ended_at = NOW() WHERE is_active = TRUE'
    );

    // Create new raid
    const hp = maxHp || 100000;
    const [result]: any = await connection.query(`
      INSERT INTO raid_bosses (name, current_hp, max_hp, is_active, reward_multiplier)
      VALUES (?, ?, ?, TRUE, ?)
    `, [name, hp, hp, rewardMultiplier || 1.0]);

    await connection.commit();

    res.json({
      success: true,
      message: '새 레이드가 시작되었습니다.',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Start raid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// End raid and distribute rewards (admin only)
router.post('/admin/end', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get active raid
    const [raids]: any = await connection.query(
      'SELECT * FROM raid_bosses WHERE is_active = TRUE ORDER BY started_at DESC LIMIT 1'
    );

    if (raids.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '활성화된 레이드가 없습니다.' });
    }

    const raid = raids[0];

    // Get all participants
    const [participants]: any = await connection.query(`
      SELECT user_id, damage_dealt
      FROM raid_participants
      WHERE raid_boss_id = ?
      ORDER BY damage_dealt DESC
    `, [raid.id]);

    if (participants.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '참가자가 없습니다.' });
    }

    // Calculate total damage
    const totalDamage = participants.reduce((sum: number, p: any) => sum + p.damage_dealt, 0);

    // Distribute rewards
    const rewardPool = TOTAL_REWARD_POOL * raid.reward_multiplier;

    for (const participant of participants) {
      const damageRatio = participant.damage_dealt / totalDamage;
      let reward = Math.floor(rewardPool * damageRatio);

      // Ensure minimum reward
      reward = Math.max(reward, MIN_REWARD);

      // Give points to user
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [reward, participant.user_id]
      );
    }

    // End raid
    await connection.query(
      'UPDATE raid_bosses SET is_active = FALSE, ended_at = NOW() WHERE id = ?',
      [raid.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `레이드가 종료되었습니다. ${participants.length}명의 참가자에게 보상이 지급되었습니다.`,
      data: {
        totalParticipants: participants.length,
        totalDamage,
        totalRewards: rewardPool,
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('End raid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get all raids (admin only)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const [raids]: any = await pool.query(`
      SELECT
        rb.id,
        rb.name,
        rb.current_hp,
        rb.max_hp,
        rb.is_active,
        rb.started_at,
        rb.ended_at,
        rb.reward_multiplier,
        COUNT(rp.id) as total_participants,
        COALESCE(SUM(rp.damage_dealt), 0) as total_damage
      FROM raid_bosses rb
      LEFT JOIN raid_participants rp ON rb.id = rp.raid_boss_id
      GROUP BY rb.id
      ORDER BY rb.started_at DESC
      LIMIT 20
    `);

    res.json({ success: true, data: raids });
  } catch (error: any) {
    console.error('Get all raids error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
