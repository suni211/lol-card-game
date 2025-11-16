import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { updateMissionProgress } from '../utils/missionTracker';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';

const router = express.Router();

// Gacha probabilities (더 어려운 확률로 조정)
const GACHA_OPTIONS = {
  free: { cost: 0, probabilities: { icon: 0.01, legendary: 0.01, epic: 0.1, rare: 5, common: 94.88 } },
  basic: { cost: 100, probabilities: { icon: 0.01, legendary: 0.05, epic: 0.5, rare: 10, common: 89.44 } },
  premium: { cost: 300, probabilities: { icon: 0.01, legendary: 0.2, epic: 3, rare: 18, common: 78.79 } },
  ultra: { cost: 500, probabilities: { icon: 0.01, legendary: 0.5, epic: 6, rare: 25, common: 68.49 } },
  worlds_winner: { cost: 2500, probabilities: { icon: 0.01, legendary: 5, epic: 25, rare: 69.99, common: 0 }, special: 'WORLDS' }, // 25WW, 25WUD, and Rare+ cards (레어 이상 확정)
  ssg_2017: { cost: 6500, probabilities: { icon: 0.01, legendary: 9.5, epic: 90.49, rare: 0, common: 0 }, special: '17SSG' }, // 2017 SSG Worlds, Epic+ only
  msi_pack: { cost: 2500, probabilities: { icon: 0.01, legendary: 5, epic: 30, rare: 64.99, common: 0 }, special: 'MSI' }, // MSI cards + Rare+ only (LCK보다 우수)
  icon_test: { cost: 0, probabilities: { icon: 100, legendary: 0, epic: 0, rare: 0, common: 0 }, adminOnly: true }, // Admin-only ICON test pack
};

function selectTierByProbability(probabilities: any): string {
  const random = Math.random() * 100;

  if (random < probabilities.icon) return 'ICON';
  if (random < probabilities.icon + probabilities.legendary) return 'LEGENDARY';
  if (random < probabilities.icon + probabilities.legendary + probabilities.epic) return 'EPIC';
  if (random < probabilities.icon + probabilities.legendary + probabilities.epic + probabilities.rare) return 'RARE';
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

    // Check if free draw was used today
    if (type === 'free') {
      const [lastFree]: any = await connection.query(
        'SELECT created_at FROM gacha_history WHERE user_id = ? AND cost = 0 AND DATE(created_at) = CURDATE()',
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
    } else if ((option as any).special === '17SSG') {
      // 2017 SSG pack - Only 17SSG cards + 25 season cards + 25HW cards + ICON cards
      [players] = await connection.query(
        "SELECT * FROM players WHERE tier = ? AND (name LIKE '17SSG%' OR season = '25' OR season = '25HW' OR season = 'ICON') ORDER BY RAND() LIMIT 1",
        [tier]
      );
    } else if ((option as any).special === 'MSI') {
      // MSI pack - Only MSI cards + 25 season cards + 25HW cards + ICON cards
      [players] = await connection.query(
        "SELECT * FROM players WHERE tier = ? AND (name LIKE 'MSI %' OR season = '25' OR season = '25HW' OR season = 'ICON') ORDER BY RAND() LIMIT 1",
        [tier]
      );
    } else {
      // Regular packs - 25 season cards + RE (LCK Legend) cards + 25HW (Hard Walker) cards + ICON cards
      [players] = await connection.query(
        "SELECT * FROM players WHERE tier = ? AND (season = '25' OR season = 'RE' OR season = '25HW' OR season = 'ICON') ORDER BY RAND() LIMIT 1",
        [tier]
      );
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

    // Update user points
    const pointsChange = refundPoints - option.cost;
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsChange, userId]
    );

    // Record gacha history
    await connection.query(
      'INSERT INTO gacha_history (user_id, player_id, cost, is_duplicate, refund_points) VALUES (?, ?, ?, ?, ?)',
      [userId, player.id, option.cost, isDuplicate, refundPoints]
    );

    await connection.commit();

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
        p.tier,
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
        p.tier,
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
const BASE_ENHANCEMENT_RATES = [90, 80, 70, 60, 50, 40, 20, 10, 5, 1];
const MAX_ENHANCEMENT_LEVEL = 10;

// OVR downgrade amounts on failure (based on enhancement level)
const OVR_DOWNGRADE_RATES = [0, 0, 0, 0, 0, 1, 2, 3, 5, 7]; // 0→1 ~ 4→5 실패 시 OVR 하락 없음, 이후 1~7 하락

// Calculate success rate based on material card quality (FIFA 4 style)
function calculateEnhancementRate(
  baseRate: number,
  targetCard: any,
  materialCard: any,
  targetPlayer: any,
  materialPlayer: any
): number {
  let successRate = baseRate;

  // Same player bonus: +15% (기존 +30%에서 하향)
  if (targetCard.player_id === materialCard.player_id) {
    successRate += 15;
  }

  // Tier bonus/penalty (기존 20/10/5에서 10/5/3으로 하향)
  const tierValues: any = { LEGENDARY: 10, EPIC: 5, RARE: 3, COMMON: 0 };
  const tierBonus = tierValues[materialPlayer.tier] || 0;
  successRate += tierBonus;

  // Overall bonus: every 10 overall above 70 = +3% (기존 +5%에서 하향)
  const overallBonus = Math.floor(Math.max(0, materialPlayer.overall - 70) / 10) * 3;
  successRate += overallBonus;

  // Enhancement level of material: each level = +1% (기존 +2%에서 하향)
  successRate += materialCard.level * 1;

  // Cap at 85% max, 3% min (기존 95%/5%에서 하향)
  return Math.min(85, Math.max(3, successRate));
}

// Get enhancement rate (for preview before enhance)
router.post('/enhance/preview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { targetCardId, materialCardId } = req.body;

    if (!targetCardId || !materialCardId) {
      return res.status(400).json({ success: false, error: 'Target card and material card are required' });
    }

    // Get both cards with player info
    const [cards]: any = await pool.query(
      'SELECT uc.*, p.name as player_name, p.tier, p.overall FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.id IN (?, ?) AND uc.user_id = ?',
      [targetCardId, materialCardId, userId]
    );

    if (cards.length !== 2) {
      return res.status(404).json({ success: false, error: 'One or both cards not found' });
    }

    const targetCard = cards.find((c: any) => c.id === targetCardId);
    const materialCard = cards.find((c: any) => c.id === materialCardId);

    if (targetCard.level >= MAX_ENHANCEMENT_LEVEL) {
      return res.status(400).json({ success: false, error: 'Card is already at maximum enhancement level' });
    }

    const baseRate = BASE_ENHANCEMENT_RATES[targetCard.level];
    const successRate = calculateEnhancementRate(
      baseRate,
      targetCard,
      materialCard,
      { tier: targetCard.tier, overall: targetCard.overall },
      { tier: materialCard.tier, overall: materialCard.overall }
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
        isSamePlayer: targetCard.player_id === materialCard.player_id,
        materialTier: materialCard.tier,
        materialOverall: materialCard.overall,
        materialLevel: materialCard.level,
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
    const { targetCardId, materialCardId } = req.body;

    // Validate input
    if (!targetCardId || !materialCardId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Target card and material card are required' });
    }

    if (targetCardId === materialCardId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Cannot use the same card as both target and material' });
    }

    // Get both cards with player info
    const [cards]: any = await connection.query(
      'SELECT uc.*, p.name as player_name, p.tier, p.overall FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.id IN (?, ?) AND uc.user_id = ?',
      [targetCardId, materialCardId, userId]
    );

    if (cards.length !== 2) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'One or both cards not found' });
    }

    const targetCard = cards.find((c: any) => c.id === targetCardId);
    const materialCard = cards.find((c: any) => c.id === materialCardId);

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

    // Calculate success rate with material card quality
    const baseRate = BASE_ENHANCEMENT_RATES[targetCard.level];
    const successRate = calculateEnhancementRate(
      baseRate,
      targetCard,
      materialCard,
      { tier: targetCard.tier, overall: targetCard.overall },
      { tier: materialCard.tier, overall: materialCard.overall }
    );

    const random = Math.random() * 100;
    const isSuccess = random < successRate;

    // Delete material card (consumed regardless of success/failure)
    await connection.query('DELETE FROM user_cards WHERE id = ?', [materialCardId]);

    // Deduct points
    await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [cost, userId]);

    let levelDowngraded = false;
    let levelLost = 0;
    let newLevel = targetCard.level;

    // Update target card level if success
    if (isSuccess) {
      await connection.query('UPDATE user_cards SET level = level + 1 WHERE id = ?', [targetCardId]);
      newLevel = targetCard.level + 1;
    } else {
      // On failure, decrease enhancement level (not overall)
      // Level 0: no downgrade
      // Level 1-3: 50% chance to drop 1 level
      // Level 4-6: 70% chance to drop 1 level
      // Level 7-9: 100% chance to drop 1 level
      // Level 10: 100% chance to drop 1 level

      let downgradeChance = 0;
      if (targetCard.level >= 7) {
        downgradeChance = 100; // 100% chance
      } else if (targetCard.level >= 4) {
        downgradeChance = 70; // 70% chance
      } else if (targetCard.level >= 1) {
        downgradeChance = 50; // 50% chance
      }

      const shouldDowngrade = Math.random() * 100 < downgradeChance;

      if (shouldDowngrade && targetCard.level > 0) {
        levelDowngraded = true;
        levelLost = 1;
        newLevel = targetCard.level - 1;

        // Decrease enhancement level
        await connection.query(
          'UPDATE user_cards SET level = ? WHERE id = ?',
          [newLevel, targetCardId]
        );
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
        materialCardName: materialCard.player_name,
        levelDowngraded,
        levelLost,
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

// Dismantle card
router.delete('/dismantle/:cardId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const cardId = parseInt(req.params.cardId);

    // Get card
    const [cards]: any = await connection.query(
      'SELECT uc.*, p.tier FROM user_cards uc JOIN players p ON uc.player_id = p.id WHERE uc.id = ? AND uc.user_id = ?',
      [cardId, userId]
    );

    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const card = cards[0];

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

export default router;
