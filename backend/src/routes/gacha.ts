import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateMissionProgress } from '../utils/missionTracker';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';
import { emitPointUpdate } from '../server';

const router = express.Router();

// Gacha probabilities (ICON 티어는 모든 팩에서 0.000001% 확률로 등장 - 극악의 희귀도)
const GACHA_OPTIONS = {
  free: { cost: 0, probabilities: { icon: 0.000001, legendary: 0.02, epic: 0.1, rare: 5, common: 94.879999 } },
  basic: { cost: 500, probabilities: { icon: 0.000001, legendary: 0.06, epic: 0.5, rare: 10, common: 89.439999 } },
  premium: { cost: 1000, probabilities: { icon: 0.000001, legendary: 0.22, epic: 3, rare: 18, common: 78.779999 } },
  ultra: { cost: 1500, probabilities: { icon: 0.000001, legendary: 0.52, epic: 6, rare: 25, common: 68.479999 } },
  mega: { cost: 2000, probabilities: { icon: 0.000001, legendary: 1.02, epic: 10, rare: 30, common: 58.979999 } },
  worlds_winner: { cost: 2500, probabilities: { legendary: 5.01, epic: 25, rare: 69.99, common: 0 }, special: 'WORLDS' }, // 25WW, 25WUD, and Rare+ cards (레어 이상 확정)
  icon_test: { cost: 0, probabilities: { icon: 100, legendary: 0, epic: 0, rare: 0, common: 0 }, adminOnly: true }, // Admin-only ICON test pack
};

function selectTierByProbability(probabilities: any): string {
  const random = Math.random() * 100;

  // ICON tier check FIRST - completely separate from other tiers
  // This ensures ICON never overlaps with LEGENDARY
  if (probabilities.icon && random < probabilities.icon) {
    return 'ICON';
  }

  // For non-ICON tiers, recalculate range without ICON probability
  // This prevents ICON range from interfering with LEGENDARY/EPIC/RARE/COMMON
  const iconProb = probabilities.icon || 0;
  const adjustedRandom = random - iconProb;

  // Now check other tiers in order (cumulative)
  let cumulative = 0;

  cumulative += probabilities.legendary || 0;
  if (adjustedRandom < cumulative) return 'LEGENDARY';

  cumulative += probabilities.epic || 0;
  if (adjustedRandom < cumulative) return 'EPIC';

  cumulative += probabilities.rare || 0;
  if (adjustedRandom < cumulative) return 'RARE';

  return 'COMMON';
}

// Draw card
router.post('/draw', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { type } = req.body; // 'free', 'basic', 'premium', 'ultra'
    const userId = req.user!.id;

    // Validate gacha type
    if (!GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS]) {
      return res.status(400).json({ success: false, error: 'Invalid gacha type' });
    }

    const option = GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS];

    // Check admin-only packs
    if ((option as any).adminOnly) {
      const [users]: any = await connection.query(
        'SELECT is_admin FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0 || !users[0].is_admin) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
    }

    // Check if free draw was used today (exclude welcome packs from check)
    if (type === 'free') {
      // Check user exists first
      const [userCheck]: any = await connection.query(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (userCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const [lastFree]: any = await connection.query(
        `SELECT created_at FROM gacha_history
         WHERE user_id = ?
         AND cost = 0
         AND DATE(CONVERT_TZ(created_at, '+00:00', '+09:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))
         AND player_id NOT IN (SELECT id FROM players WHERE season IN ('25WW', '25WUD', '19G2'))`,
        [userId]
      );

      if (lastFree.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Daily free draw already used' });
      }
    }

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (users[0].points < option.cost) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    // Select tier
    const tier = selectTierByProbability(option.probabilities);

    // Get random player of that tier
    let players: any;
    if ((option as any).special === 'WORLDS') {
      // WORLDS pack is now CLOSED - no more 25WW/25WUD cards available
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'This gacha pack is no longer available' });
    } else {
      // Regular packs - All seasons EXCEPT 17SSG (17SSG cards no longer obtainable)
      // Includes: 25, RE, 25HW, 25MSI, GR, T1, 18WC, ICON, 19G2
      // Excludes: 17SSG, 25WW, 25WUD
      // Tier calculated from overall: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
      let minOverall = 1, maxOverall = 80;
      if (tier === 'RARE') { minOverall = 81; maxOverall = 90; }
      else if (tier === 'EPIC') { minOverall = 91; maxOverall = 100; }
      else if (tier === 'LEGENDARY') { minOverall = 101; maxOverall = 999; }
      else if (tier === 'ICON') {
        // ICON tier: special handling - query by season = 'ICON'
        // ICON cards ALWAYS have tier = 'ICON' regardless of overall stat
        [players] = await connection.query(
          `SELECT *, 'ICON' as tier
           FROM players WHERE season = 'ICON' ORDER BY RAND() LIMIT 1`
        );
      }

      if (tier !== 'ICON') {
        // Make absolutely sure ICON cards are never selected for non-ICON tiers
        [players] = await connection.query(
          `SELECT *,
           CASE
             WHEN season = 'ICON' THEN 'ICON'
             WHEN overall <= 80 THEN 'COMMON'
             WHEN overall <= 90 THEN 'RARE'
             WHEN overall <= 100 THEN 'EPIC'
             ELSE 'LEGENDARY'
           END as tier
           FROM players
           WHERE overall >= ?
             AND overall <= ?
             AND season != '17SSG'
             AND season != 'ICON'
             AND name NOT LIKE 'ICON%'
             AND name NOT LIKE '17SSG%'
             AND name NOT LIKE '25WW%'
             AND name NOT LIKE '25WUD%'
           ORDER BY RAND() LIMIT 1`,
          [minOverall, maxOverall]
        );
      }
    }

    if (players.length === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: 'No players available' });
    }

    const player = players[0];

    // Check if duplicate
    const [existing]: any = await connection.query(
      'SELECT id FROM user_cards WHERE user_id = ? AND player_id = ?',
      [userId, player.id]
    );

    const isDuplicate = existing.length > 0;
    const refundPoints = isDuplicate ? Math.floor(option.cost * 0.5) : 0;

    // Add card to user (even if duplicate)
    await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    // Update card collection
    await connection.query(
      `INSERT INTO user_collected_cards (user_id, player_id, total_obtained)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE total_obtained = total_obtained + 1`,
      [userId, player.id]
    );

    // Update collection progress
    await connection.query(
      `INSERT INTO user_collection_progress (user_id, total_cards_collected)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE
         total_cards_collected = (
           SELECT COUNT(DISTINCT player_id)
           FROM user_collected_cards
           WHERE user_id = ?
         )`,
      [userId, userId]
    );

    // Update user points
    const pointsChange = refundPoints - option.cost;
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsChange, userId]
    );

    // Get updated points
    const [updatedUser]: any = await connection.query(
      'SELECT points, level, exp FROM users WHERE id = ?',
      [userId]
    );

    // Record gacha history
    await connection.query(
      'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, ?, ?, ?)',
      [userId, player.id, option.cost, isDuplicate, refundPoints]
    );

    await connection.commit();

    // Emit real-time point update
    if (updatedUser.length > 0) {
      emitPointUpdate(userId, updatedUser[0].points, updatedUser[0].level, updatedUser[0].exp);
    }

    // Update mission progress
    updateMissionProgress(userId, 'gacha', 1).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

    // Get player traits
    const [traits]: any = await connection.query(
      'SELECT * FROM player_traits WHERE player_id = ?',
      [player.id]
    );

    res.json({
      success: true,
      data: {
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          overall: player.overall,
          region: player.region,
          tier: player.tier, // Use tier calculated in SQL
          season: player.season,
          salary: player.salary,
          laning: player.laning || 50,
          teamfight: player.teamfight || 50,
          macro: player.macro || 50,
          mental: player.mental || 50,
          cs_ability: player.cs_ability || 50,
          lane_pressure: player.lane_pressure || 50,
          damage_dealing: player.damage_dealing || 50,
          survivability: player.survivability || 50,
          objective_control: player.objective_control || 50,
          vision_control: player.vision_control || 50,
          decision_making: player.decision_making || 50,
          consistency: player.consistency || 50,
          traits: traits,
        },
        isDuplicate,
        refundPoints,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Gacha draw error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Draw 10 cards at once
router.post('/draw-10', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { type } = req.body;
    const userId = req.user!.id;

    // Validate gacha type
    if (!GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS]) {
      return res.status(400).json({ success: false, error: 'Invalid gacha type' });
    }

    const option = GACHA_OPTIONS[type as keyof typeof GACHA_OPTIONS];

    // Check admin-only packs
    if ((option as any).adminOnly) {
      const [users]: any = await connection.query(
        'SELECT is_admin FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0 || !users[0].is_admin) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
    }

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const totalCost = option.cost * 10;
    if (users[0].points < totalCost) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    const results = [];
    let totalRefund = 0;

    // Draw 10 cards
    for (let i = 0; i < 10; i++) {
      const tier = selectTierByProbability(option.probabilities);

      // Get random player
      let players: any;
      if ((option as any).special === 'WORLDS') {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'This gacha pack is no longer available' });
      } else {
        // Regular packs - All seasons EXCEPT 17SSG (17SSG cards no longer obtainable)
        // Includes: 25, RE, 25HW, 25MSI, GR, T1, 18WC, ICON, 19G2
        // Excludes: 17SSG, 25WW, 25WUD
        // Tier calculated from overall: 1-80=COMMON, 81-90=RARE, 91-100=EPIC, 101+=LEGENDARY
        let minOverall = 1, maxOverall = 80;
        if (tier === 'RARE') { minOverall = 81; maxOverall = 90; }
        else if (tier === 'EPIC') { minOverall = 91; maxOverall = 100; }
        else if (tier === 'LEGENDARY') { minOverall = 101; maxOverall = 999; }
        else if (tier === 'ICON') {
          // ICON tier: special handling - query by season = 'ICON'
          // ICON cards ALWAYS have tier = 'ICON' regardless of overall stat
          [players] = await connection.query(
            `SELECT *, 'ICON' as tier
             FROM players WHERE season = 'ICON' ORDER BY RAND() LIMIT 1`
          );
        }

        if (tier !== 'ICON') {
          // Make absolutely sure ICON cards are never selected for non-ICON tiers
          [players] = await connection.query(
            `SELECT *,
             CASE
               WHEN season = 'ICON' THEN 'ICON'
               WHEN overall <= 80 THEN 'COMMON'
               WHEN overall <= 90 THEN 'RARE'
               WHEN overall <= 100 THEN 'EPIC'
               ELSE 'LEGENDARY'
             END as tier
             FROM players
             WHERE overall >= ?
               AND overall <= ?
               AND season != '17SSG'
               AND season != 'ICON'
               AND name NOT LIKE 'ICON%'
               AND name NOT LIKE '17SSG%'
               AND name NOT LIKE '25WW%'
               AND name NOT LIKE '25WUD%'
             ORDER BY RAND() LIMIT 1`,
            [minOverall, maxOverall]
          );
        }
      }

      if (players.length === 0) {
        await connection.rollback();
        return res.status(500).json({ success: false, error: 'No players available' });
      }

      const player = players[0];

      // Check if duplicate
      const [existing]: any = await connection.query(
        'SELECT id FROM user_cards WHERE user_id = ? AND player_id = ?',
        [userId, player.id]
      );

      const isDuplicate = existing.length > 0;
      const refundPoints = isDuplicate ? Math.floor(option.cost * 0.5) : 0;
      totalRefund += refundPoints;

      // Add card
      await connection.query(
        'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
        [userId, player.id]
      );

      // Update card collection
      await connection.query(
        `INSERT INTO user_collected_cards (user_id, player_id, total_obtained)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE total_obtained = total_obtained + 1`,
        [userId, player.id]
      );

      // Record history
      await connection.query(
        'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, ?, ?, ?)',
        [userId, player.id, option.cost, isDuplicate, refundPoints]
      );

      // Get traits
      const [traits]: any = await connection.query(
        'SELECT * FROM player_traits WHERE player_id = ?',
        [player.id]
      );

      results.push({
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          overall: player.overall,
          region: player.region,
          tier: player.tier, // Use tier calculated in SQL
          season: player.season,
          salary: player.salary,
          laning: player.laning || 50,
          teamfight: player.teamfight || 50,
          macro: player.macro || 50,
          mental: player.mental || 50,
          cs_ability: player.cs_ability || 50,
          lane_pressure: player.lane_pressure || 50,
          damage_dealing: player.damage_dealing || 50,
          survivability: player.survivability || 50,
          objective_control: player.objective_control || 50,
          vision_control: player.vision_control || 50,
          decision_making: player.decision_making || 50,
          consistency: player.consistency || 50,
          traits: traits,
        },
        isDuplicate,
        refundPoints,
      });
    }

    // Update collection progress
    await connection.query(
      `INSERT INTO user_collection_progress (user_id, total_cards_collected)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE
         total_cards_collected = (
           SELECT COUNT(DISTINCT player_id)
           FROM user_collected_cards
           WHERE user_id = ?
         )`,
      [userId, userId]
    );

    // Update user points
    const pointsChange = totalRefund - totalCost;
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsChange, userId]
    );

    // Get updated points
    const [updatedUser]: any = await connection.query(
      'SELECT points, level, exp FROM users WHERE id = ?',
      [userId]
    );

    await connection.commit();

    // Emit real-time point update
    if (updatedUser.length > 0) {
      emitPointUpdate(userId, updatedUser[0].points, updatedUser[0].level, updatedUser[0].exp);
    }

    // Update mission progress
    updateMissionProgress(userId, 'gacha', 10).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

    res.json({
      success: true,
      data: {
        results,
        totalCost,
        totalRefund,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Gacha draw-10 error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get user cards
router.get('/my-cards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [cards]: any = await pool.query(`
      SELECT
        uc.id,
        uc.user_id,
        uc.player_id,
        uc.level,
        uc.created_at,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.region,
        p.salary,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.season,
        p.image_url,
        p.laning,
        p.teamfight,
        p.macro,
        p.mental,
        p.cs_ability,
        p.lane_pressure,
        p.damage_dealing,
        p.survivability,
        p.objective_control,
        p.vision_control,
        p.decision_making,
        p.consistency
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      ORDER BY p.overall DESC, uc.created_at DESC
    `, [userId]);

    // Transform to nested structure
    const formattedCards = await Promise.all(cards.map(async (card: any) => {
      const [traits]: any = await pool.query(
        'SELECT * FROM player_traits WHERE player_id = ?',
        [card.player_id]
      );

      return {
        id: card.id,
        userId: card.user_id,
        playerId: card.player_id,
        level: card.level,
        createdAt: card.created_at,
        player: {
          id: card.player_id,
          name: card.name,
          team: card.team,
          position: card.position,
          overall: card.overall,
          region: card.region,
          tier: card.tier,
          season: card.season,
          salary: card.salary,
          imageUrl: card.image_url,
          laning: card.laning || 50,
          teamfight: card.teamfight || 50,
          macro: card.macro || 50,
          mental: card.mental || 50,
          cs_ability: card.cs_ability || 50,
          lane_pressure: card.lane_pressure || 50,
          damage_dealing: card.damage_dealing || 50,
          survivability: card.survivability || 50,
          objective_control: card.objective_control || 50,
          vision_control: card.vision_control || 50,
          decision_making: card.decision_making || 50,
          consistency: card.consistency || 50,
          traits: traits,
        },
      };
    }));

    res.json({ success: true, data: formattedCards });
  } catch (error: any) {
    console.error('Get cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get another user's cards (for trade)
router.get('/user-cards/:username', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username;

    // Get user by username
    const [users]: any = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const targetUserId = users[0].id;

    const [cards]: any = await pool.query(`
      SELECT
        uc.id,
        uc.user_id,
        uc.player_id,
        uc.level,
        uc.created_at,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.region,
        p.salary,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.season,
        p.image_url,
        p.laning,
        p.teamfight,
        p.macro,
        p.mental
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      ORDER BY p.overall DESC, uc.created_at DESC
    `, [targetUserId]);

    // Transform to nested structure
    const formattedCards = await Promise.all(cards.map(async (card: any) => {
      const [traits]: any = await pool.query(
        'SELECT * FROM player_traits WHERE player_id = ?',
        [card.player_id]
      );

      return {
        id: card.id,
        userId: card.user_id,
        playerId: card.player_id,
        level: card.level,
        createdAt: card.created_at,
        player: {
          id: card.player_id,
          name: card.name,
          team: card.team,
          position: card.position,
          overall: card.overall,
          region: card.region,
          tier: card.tier,
          season: card.season,
          salary: card.salary,
          imageUrl: card.image_url,
          laning: card.laning || 50,
          teamfight: card.teamfight || 50,
          macro: card.macro || 50,
          mental: card.mental || 50,
          cs_ability: card.cs_ability || 50,
          lane_pressure: card.lane_pressure || 50,
          damage_dealing: card.damage_dealing || 50,
          survivability: card.survivability || 50,
          objective_control: card.objective_control || 50,
          vision_control: card.vision_control || 50,
          decision_making: card.decision_making || 50,
          consistency: card.consistency || 50,
          traits: traits,
        },
      };
    }));

    res.json({ success: true, data: formattedCards });
  } catch (error: any) {
    console.error('Get user cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Enhancement success rates per level (0→1, 1→2, ..., 9→10) - 초반 쉬움, 후반 극악
const BASE_ENHANCEMENT_RATES = [80, 70, 60, 50, 40, 30, 15, 8, 3, 1]; // 기본 확률 대폭 하향
const MAX_ENHANCEMENT_LEVEL = 10;

// OVR downgrade amounts on failure (based on enhancement level)
const OVR_DOWNGRADE_RATES = [0, 0, 0, 0, 0, 1, 2, 3, 5, 7]; // 0→1 ~ 4→5 실패 시 OVR 하락 없음, 이후 1~7 하락

// Calculate success rate based on material cards quality (up to 3 materials)
function calculateEnhancementRate(
  baseRate: number,
  targetCard: any,
  materialCards: any[],
  targetPlayer: any,
  materialPlayers: any[]
): number {
  let successRate = baseRate;

  // Process each material card
  materialCards.forEach((materialCard, index) => {
    const materialPlayer = materialPlayers[index];

    // Same player bonus: +5% per same player material
    if (targetCard.player_id === materialCard.player_id) {
      successRate += 5;
    }

    // Overall bonus: 오버롤에 비례 (60 이상부터 시작)
    // 60: 0%, 70: +1%, 80: +2%, 90: +3%, 100: +4%, 110: +5%, 120: +6%
    const overallBonus = Math.floor(Math.max(0, materialPlayer.overall - 60) / 10);
    successRate += overallBonus;

    // Enhancement level of material: each level = +0.3%
    successRate += materialCard.level * 0.3;
  });

  // Cap at 70% max, 2% min
  return Math.min(70, Math.max(2, successRate));
}

// Get enhancement rate (for preview before enhance)
router.post('/enhance/preview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { targetCardId, materialCardIds } = req.body;

    if (!targetCardId || !materialCardIds || !Array.isArray(materialCardIds)) {
      return res.status(400).json({ success: false, error: 'Target card and material cards array are required' });
    }

    if (materialCardIds.length === 0 || materialCardIds.length > 3) {
      return res.status(400).json({ success: false, error: 'Must provide 1-3 material cards' });
    }

    // Get all cards with player info
    const allCardIds = [targetCardId, ...materialCardIds];
    const [cards]: any = await pool.query(
      `SELECT uc.*, p.name as player_name,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.overall
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id IN (?) AND uc.user_id = ?`,
      [allCardIds, userId]
    );

    if (cards.length !== allCardIds.length) {
      return res.status(404).json({ success: false, error: 'One or more cards not found' });
    }

    const targetCard = cards.find((c: any) => c.id === targetCardId);
    const materialCards = materialCardIds.map((id: number) => cards.find((c: any) => c.id === id));

    if (!targetCard || materialCards.some((c: any) => !c)) {
      return res.status(404).json({ success: false, error: 'Cards not found' });
    }

    // Check if any material card is locked
    const lockedMaterial = materialCards.find((c: any) => c.is_locked);
    if (lockedMaterial) {
      return res.status(400).json({ success: false, error: 'Cannot use locked card as material' });
    }

    if (targetCard.level >= MAX_ENHANCEMENT_LEVEL) {
      return res.status(400).json({ success: false, error: 'Card is already at maximum enhancement level' });
    }

    const baseRate = BASE_ENHANCEMENT_RATES[targetCard.level];
    const materialPlayers = materialCards.map((c: any) => ({ tier: c.tier, overall: c.overall }));
    const successRate = calculateEnhancementRate(
      baseRate,
      targetCard,
      materialCards,
      { tier: targetCard.tier, overall: targetCard.overall },
      materialPlayers
    );

    const cost = (targetCard.level + 1) * 100;
    const ovrDowngrade = OVR_DOWNGRADE_RATES[targetCard.level] || 0;

    res.json({
      success: true,
      data: {
        baseRate,
        successRate,
        cost,
        ovrDowngrade,
        materialCards: materialCards.map((c: any) => ({
          id: c.id,
          isSamePlayer: targetCard.player_id === c.player_id,
          tier: c.tier,
          overall: c.overall,
          level: c.level,
          name: c.player_name,
        })),
      },
    });
  } catch (error: any) {
    console.error('Enhancement preview error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Enhance card
router.post('/enhance', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { targetCardId, materialCardIds } = req.body;

    // Validate input
    if (!targetCardId || !materialCardIds || !Array.isArray(materialCardIds)) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Target card and material cards array are required' });
    }

    if (materialCardIds.length === 0 || materialCardIds.length > 3) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Must provide 1-3 material cards' });
    }

    if (materialCardIds.includes(targetCardId)) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot use target card as material' });
    }

    // Get all cards with player info
    const allCardIds = [targetCardId, ...materialCardIds];
    const [cards]: any = await connection.query(
      `SELECT uc.*, p.name as player_name,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.overall
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id IN (?) AND uc.user_id = ?`,
      [allCardIds, userId]
    );

    if (cards.length !== allCardIds.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'One or more cards not found' });
    }

    const targetCard = cards.find((c: any) => c.id === targetCardId);
    const materialCards = materialCardIds.map((id: number) => cards.find((c: any) => c.id === id));

    if (!targetCard || materialCards.some((c: any) => !c)) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Cards not found' });
    }

    // Check if any material card is locked
    const lockedMaterial = materialCards.find((c: any) => c.is_locked);
    if (lockedMaterial) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot use locked card as material' });
    }

    // Check if any material cards are in active decks
    const [decksWithMaterials]: any = await connection.query(
      `SELECT d.deck_slot, uc.id as card_id
       FROM decks d
       JOIN user_cards uc ON (
         d.top_card_id = uc.id OR
         d.jungle_card_id = uc.id OR
         d.mid_card_id = uc.id OR
         d.adc_card_id = uc.id OR
         d.support_card_id = uc.id
       )
       WHERE d.user_id = ? AND uc.id IN (?)`,
      [userId, materialCardIds]
    );

    if (decksWithMaterials.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱에 편성된 카드는 강화 재료로 사용할 수 없습니다.' });
    }

    // Check max level
    if (targetCard.level >= MAX_ENHANCEMENT_LEVEL) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Card is already at maximum enhancement level' });
    }

    // Calculate cost
    const cost = (targetCard.level + 1) * 100;

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (users[0].points < cost) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    // Calculate success rate with material cards quality
    const baseRate = BASE_ENHANCEMENT_RATES[targetCard.level];
    const materialPlayers = materialCards.map((c: any) => ({ tier: c.tier, overall: c.overall }));
    const successRate = calculateEnhancementRate(
      baseRate,
      targetCard,
      materialCards,
      { tier: targetCard.tier, overall: targetCard.overall },
      materialPlayers
    );

    const random = Math.random() * 100;
    const isSuccess = random < successRate;

    // Delete all material cards (consumed regardless of success/failure)
    await connection.query('DELETE FROM user_cards WHERE id IN (?)', [materialCardIds]);

    // Coach drop system: 20% chance to get a coach when using material cards
    let coachDropped = null;
    if (Math.random() < 0.20) {
      // Get coach tier based on material cards
      const maxTier = materialCards.reduce((max: string, card: any) => {
        const tierRank: any = { ICON: 6, GR: 5, LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
        return tierRank[card.tier] > tierRank[max] ? card.tier : max;
      }, 'COMMON');

      let starRating = 1;
      if (maxTier === 'ICON' || maxTier === 'GR') {
        starRating = 5;
      } else if (maxTier === 'LEGENDARY') {
        starRating = Math.random() < 0.5 ? 4 : 5;
      } else if (maxTier === 'EPIC') {
        starRating = Math.random() < 0.5 ? 3 : 4;
      } else if (maxTier === 'RARE') {
        starRating = Math.random() < 0.5 ? 2 : 3;
      } else {
        starRating = Math.random() < 0.5 ? 1 : 2;
      }

      const [coaches]: any = await connection.query(
        'SELECT * FROM coaches WHERE star_rating = ? ORDER BY RAND() LIMIT 1',
        [starRating]
      );

      if (coaches.length > 0) {
        const coach = coaches[0];

        // Check if user already has this coach
        const [hasCoach]: any = await connection.query(
          'SELECT id FROM user_coaches WHERE user_id = ? AND coach_id = ?',
          [userId, coach.id]
        );

        // Only give coach if user doesn't have it yet
        if (hasCoach.length === 0) {
          await connection.query(
            'INSERT INTO user_coaches (user_id, coach_id) VALUES (?, ?)',
            [userId, coach.id]
          );

          coachDropped = coach;
        }
      }
    }

    // Deduct points
    await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [cost, userId]);

    let levelDowngraded = false;
    let levelLost = 0;
    let newLevel = targetCard.level;
    let protectionUsed = false;

    // Check for active enhancement protection effect
    const [protectionEffects]: any = await connection.query(`
      SELECT iul.id
      FROM item_usage_log iul
      JOIN shop_items si ON iul.item_id = si.id
      WHERE iul.user_id = ? AND si.effect_type = 'protection' AND si.effect_value = 'no_downgrade'
      ORDER BY iul.used_at DESC
      LIMIT 1
    `, [userId]);

    // Update target card level if success
    if (isSuccess) {
      await connection.query('UPDATE user_cards SET level = level + 1 WHERE id = ?', [targetCardId]);
      newLevel = targetCard.level + 1;
    } else {
      // On failure, decrease enhancement level
      let downgradeChance = 0;
      if (targetCard.level >= 7) {
        downgradeChance = 100;
      } else if (targetCard.level >= 4) {
        downgradeChance = 70;
      } else if (targetCard.level >= 1) {
        downgradeChance = 50;
      }

      const shouldDowngrade = Math.random() * 100 < downgradeChance;

      if (shouldDowngrade && targetCard.level > 0) {
        // Check if protection is active
        if (protectionEffects.length > 0) {
          // Protection active - prevent downgrade and consume protection
          protectionUsed = true;
          newLevel = targetCard.level; // Keep current level

          // Remove the protection effect (it's consumed)
          await connection.query(
            'DELETE FROM item_usage_log WHERE id = ?',
            [protectionEffects[0].id]
          );
        } else {
          // No protection - apply downgrade
          levelDowngraded = true;
          levelLost = 1;
          newLevel = targetCard.level - 1;

          await connection.query(
            'UPDATE user_cards SET level = ? WHERE id = ?',
            [newLevel, targetCardId]
          );
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        isSuccess,
        newLevel,
        oldLevel: targetCard.level,
        cost,
        baseRate,
        successRate,
        playerName: targetCard.player_name,
        materialCardNames: materialCards.map((c: any) => c.player_name),
        levelDowngraded,
        levelLost,
        protectionUsed,
        coach: coachDropped,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Enhancement error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Lock/Unlock card
router.post('/card/lock/:cardId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const cardId = parseInt(req.params.cardId);
    const { isLocked } = req.body;

    // Verify card ownership
    const [cards]: any = await pool.query(
      'SELECT id FROM user_cards WHERE id = ? AND user_id = ?',
      [cardId, userId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Update lock status
    await pool.query(
      'UPDATE user_cards SET is_locked = ? WHERE id = ?',
      [isLocked, cardId]
    );

    res.json({ success: true, data: { cardId, isLocked } });
  } catch (error: any) {
    console.error('Lock card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Dismantle card
router.delete('/dismantle/:cardId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const cardId = parseInt(req.params.cardId);

    // Get card
    const [cards]: any = await connection.query(
      `SELECT uc.*,
        CASE
          WHEN p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id = ? AND uc.user_id = ?`,
      [cardId, userId]
    );

    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const card = cards[0];

    // Check if card is locked
    if (card.is_locked) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot dismantle locked card' });
    }

    // Check if card is in active deck
    const [decksWithCard]: any = await connection.query(
      `SELECT deck_slot FROM decks
       WHERE user_id = ? AND (
         top_card_id = ? OR
         jungle_card_id = ? OR
         mid_card_id = ? OR
         adc_card_id = ? OR
         support_card_id = ?
       )`,
      [userId, cardId, cardId, cardId, cardId, cardId]
    );

    if (decksWithCard.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱에 편성된 카드는 분해할 수 없습니다.' });
    }

    // Calculate refund based on tier
    const refundMap: any = {
      COMMON: 25,
      RARE: 50,
      EPIC: 100,
      LEGENDARY: 200,
    };

    const refund = refundMap[card.tier] || 25;

    // Delete card
    await connection.query('DELETE FROM user_cards WHERE id = ?', [cardId]);

    // Refund points
    await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [refund, userId]);

    await connection.commit();

    res.json({ success: true, data: { refund } });
  } catch (error: any) {
    await connection.rollback();
    console.error('Dismantle card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Welcome Pack - Free pack containing only 25WW, 25WUD, and 19G2 cards
router.post('/welcome-pack', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Check if user has remaining welcome packs
    const [users]: any = await connection.query(
      'SELECT welcome_packs_remaining FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const packsRemaining = users[0].welcome_packs_remaining || 0;

    if (packsRemaining <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'No welcome packs remaining' });
    }

    // Select random player from 25WW, 25WUD, or 19G2
    const [players]: any = await connection.query(
      `SELECT *,
       CASE
         WHEN name LIKE 'ICON%' THEN 'ICON'
         WHEN overall <= 80 THEN 'COMMON'
         WHEN overall <= 90 THEN 'RARE'
         WHEN overall <= 100 THEN 'EPIC'
         ELSE 'LEGENDARY'
       END as tier
       FROM players
       WHERE season IN ('25WW', '25WUD', '19G2')
       ORDER BY RAND()
       LIMIT 1`
    );

    if (players.length === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: 'No special cards available' });
    }

    const player = players[0];

    // Check if duplicate
    const [existing]: any = await connection.query(
      'SELECT id FROM user_cards WHERE user_id = ? AND player_id = ?',
      [userId, player.id]
    );

    const isDuplicate = existing.length > 0;
    const refundPoints = isDuplicate ? 500 : 0; // Welcome pack duplicate refund

    // Add card to user
    await connection.query(
      'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
      [userId, player.id]
    );

    // Update card collection
    await connection.query(
      `INSERT INTO user_collected_cards (user_id, player_id, total_obtained)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE total_obtained = total_obtained + 1`,
      [userId, player.id]
    );

    // Decrease welcome pack count
    await connection.query(
      'UPDATE users SET welcome_packs_remaining = welcome_packs_remaining - 1 WHERE id = ?',
      [userId]
    );

    // Refund points if duplicate
    if (refundPoints > 0) {
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [refundPoints, userId]
      );
    }

    // Get updated user data
    const [updatedUser]: any = await connection.query(
      'SELECT points, level, exp, welcome_packs_remaining FROM users WHERE id = ?',
      [userId]
    );

    // Record gacha history
    await connection.query(
      'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, 0, ?, ?)',
      [userId, player.id, isDuplicate, refundPoints]
    );

    // Get player traits
    const [traits]: any = await connection.query(
      'SELECT * FROM player_traits WHERE player_id = ?',
      [player.id]
    );

    await connection.commit();

    // Emit real-time point update
    if (updatedUser.length > 0) {
      emitPointUpdate(userId, updatedUser[0].points, updatedUser[0].level, updatedUser[0].exp);
    }

    // Update mission progress
    updateMissionProgress(userId, 'gacha', 1).catch(err =>
      console.error('Mission update error:', err)
    );

    // Update achievements
    checkAndUpdateAchievements(userId).catch(err =>
      console.error('Achievement update error:', err)
    );

    res.json({
      success: true,
      data: {
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          overall: player.overall,
          region: player.region,
          tier: player.tier,
          season: player.season,
          laning: player.laning || 50,
          teamfight: player.teamfight || 50,
          macro: player.macro || 50,
          mental: player.mental || 50,
          cs_ability: player.cs_ability || 50,
          lane_pressure: player.lane_pressure || 50,
          damage_dealing: player.damage_dealing || 50,
          survivability: player.survivability || 50,
          objective_control: player.objective_control || 50,
          vision_control: player.vision_control || 50,
          decision_making: player.decision_making || 50,
          consistency: player.consistency || 50,
          traits: traits,
        },
        isDuplicate,
        refundPoints,
        packsRemaining: updatedUser[0].welcome_packs_remaining,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Welcome pack error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get welcome pack count
router.get('/welcome-pack/count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [users]: any = await pool.query(
      'SELECT welcome_packs_remaining FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        remaining: users[0].welcome_packs_remaining || 0,
      },
    });
  } catch (error: any) {
    console.error('Get welcome pack count error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
