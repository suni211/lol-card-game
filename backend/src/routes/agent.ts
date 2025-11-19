import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Reward type definitions
interface PointsReward {
  type: 'points';
  value: number;
  chance: number;
}

interface PackReward {
  type: 'pack';
  value: string;
  minOverall?: number;
  excludeIcon?: boolean;
  iconOnly?: boolean;
  includeIcon?: boolean;
  minLevel?: number;
  chance: number;
}

type AgentReward = PointsReward | PackReward;

// Agent types with their requirements and rewards
const AGENT_TYPES = {
  daily: {
    name: '일일 에이전트',
    minOverall: 300,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 24,
    rewards: [
      { type: 'points' as const, value: 300, chance: 50.0 },
      { type: 'points' as const, value: 2000, chance: 35.0 },
      { type: 'points' as const, value: 5000, chance: 10.0 },
      { type: 'pack' as const, value: '105+ OVR 확정팩', minOverall: 105, excludeIcon: true, chance: 3.22 },
      { type: 'pack' as const, value: '108+ OVR 확정팩', minOverall: 108, excludeIcon: true, chance: 1.5 },
      { type: 'pack' as const, value: '109+ OVR 확정팩', minOverall: 109, excludeIcon: true, chance: 0.2 },
      { type: 'points' as const, value: 300000, chance: 0.07999153 },
      { type: 'pack' as const, value: 'ICON 5강 확정팩', iconOnly: true, minLevel: 5, chance: 0.00000947 },
    ]
  },
  weekly: {
    name: '주간 에이전트',
    minOverall: 400,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 168, // 7 days
    rewards: [
      { type: 'points' as const, value: 5000, chance: 90.0 },
      { type: 'points' as const, value: 10000, chance: 5.3 },
      { type: 'points' as const, value: 20000, chance: 3.5 },
      { type: 'pack' as const, value: '101+ OVR 확정팩', minOverall: 101, includeIcon: true, chance: 0.77 },
      { type: 'pack' as const, value: '103+ OVR ICON 포함 팩', minOverall: 103, includeIcon: true, chance: 0.4221 },
      { type: 'pack' as const, value: '110+ OVR ICON 포함 팩', minOverall: 110, includeIcon: true, chance: 0.0079 },
    ]
  },
  monthly: {
    name: '월간 에이전트',
    minOverall: 510,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 720, // 30 days
    rewards: [
      { type: 'points' as const, value: 20000, chance: 50.0 },
      { type: 'points' as const, value: 50000, chance: 49.533 },
      { type: 'points' as const, value: 100000, chance: 0.311 },
      { type: 'points' as const, value: 500000, chance: 0.156 },
    ]
  }
};

// Get agent status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [records]: any = await pool.query(
      'SELECT agent_type, last_used FROM agent_usage WHERE user_id = ?',
      [userId]
    );

    const status: any = {};
    const now = new Date();

    for (const type of ['daily', 'weekly', 'monthly']) {
      const record = records.find((r: any) => r.agent_type === type);
      const config = AGENT_TYPES[type as keyof typeof AGENT_TYPES];

      if (!record) {
        status[type] = { available: true, nextAvailable: null };
      } else {
        const lastUsed = new Date(record.last_used);
        const nextAvailable = new Date(lastUsed.getTime() + config.cooldownHours * 60 * 60 * 1000);
        status[type] = {
          available: now >= nextAvailable,
          nextAvailable: now >= nextAvailable ? null : nextAvailable,
        };
      }
    }

    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Get agent status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Submit agent mission
router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { agentType, cardIds } = req.body;

    if (!agentType || !cardIds || !Array.isArray(cardIds)) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const config = AGENT_TYPES[agentType as keyof typeof AGENT_TYPES];
    if (!config) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid agent type' });
    }

    // Check card count
    if (cardIds.length < config.minCards || cardIds.length > config.maxCards) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `${config.minCards}~${config.maxCards}명의 선수가 필요합니다.`,
      });
    }

    // Check cooldown
    const [cooldownCheck]: any = await connection.query(
      'SELECT last_used FROM agent_usage WHERE user_id = ? AND agent_type = ?',
      [userId, agentType]
    );

    if (cooldownCheck.length > 0) {
      const lastUsed = new Date(cooldownCheck[0].last_used);
      const nextAvailable = new Date(lastUsed.getTime() + config.cooldownHours * 60 * 60 * 1000);
      const now = new Date();

      if (now < nextAvailable) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: '아직 사용할 수 없습니다.',
          nextAvailable,
        });
      }
    }

    // Get cards and check ownership
    const [cards]: any = await connection.query(
      `SELECT uc.id, uc.user_id, p.overall, p.name, p.team, p.position, p.season, p.salary
       FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.id IN (?) AND uc.user_id = ?`,
      [cardIds, userId]
    );

    if (cards.length !== cardIds.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '보유하지 않은 카드가 포함되어 있습니다.' });
    }

    // Check total overall
    const totalOverall = cards.reduce((sum: number, card: any) => sum + card.overall, 0);
    if (totalOverall < config.minOverall) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `총 오버롤 ${config.minOverall} 이상이 필요합니다. (현재: ${totalOverall})`,
      });
    }

    // Roll for reward
    const roll = Math.random() * 100;
    let cumulativeChance = 0;
    let selectedReward: AgentReward | null = null;

    for (const reward of config.rewards) {
      cumulativeChance += reward.chance;
      if (roll <= cumulativeChance) {
        selectedReward = reward;
        break;
      }
    }

    if (!selectedReward) {
      selectedReward = config.rewards[config.rewards.length - 1];
    }

    // Give reward
    let rewardResult: any = {};

    if (!selectedReward) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: '보상 선택 실패' });
    }

    if (selectedReward.type === 'points') {
      await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [
        selectedReward.value,
        userId,
      ]);
      rewardResult = {
        type: 'points',
        value: selectedReward.value,
      };
    } else if (selectedReward.type === 'pack') {
      // Generate card based on reward criteria
      const packReward = selectedReward as PackReward;
      let query = `
        SELECT p.id, p.name, p.team, p.position, p.overall, p.region, p.season, p.salary
        FROM players p
        WHERE p.overall >= ?
      `;
      const params: any[] = [packReward.minOverall || 80];

      if (packReward.excludeIcon) {
        query += ' AND p.season != ?';
        params.push('ICON');
      }

      if (packReward.iconOnly) {
        query += ' AND p.season = ?';
        params.push('ICON');
      }

      query += ' ORDER BY RAND() LIMIT 1';

      const [availablePlayers]: any = await connection.query(query, params);

      if (availablePlayers.length === 0) {
        await connection.rollback();
        return res.status(500).json({ success: false, error: '보상 생성 실패' });
      }

      const player = availablePlayers[0];
      const level = packReward.minLevel || 0;

      const [insertResult]: any = await connection.query(
        'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, ?)',
        [userId, player.id, level]
      );

      rewardResult = {
        type: 'card',
        card: {
          id: insertResult.insertId,
          player,
          level,
        },
      };
    }

    // Update or insert usage record
    if (cooldownCheck.length > 0) {
      await connection.query(
        'UPDATE agent_usage SET last_used = NOW() WHERE user_id = ? AND agent_type = ?',
        [userId, agentType]
      );
    } else {
      await connection.query(
        'INSERT INTO agent_usage (user_id, agent_type, last_used) VALUES (?, ?, NOW())',
        [userId, agentType]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        reward: rewardResult,
        rewardName: selectedReward.value,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Agent submit error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
