import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 이벤트 정보 조회 (퀘스트, 마일스톤)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // 활성화된 퀘스트 조회
    const [quests]: any = await pool.query(`
      SELECT * FROM event_quests
      WHERE is_active = TRUE
      AND CURDATE() BETWEEN start_date AND end_date
      ORDER BY quest_type
    `);

    // 마일스톤 조회
    const [milestones]: any = await pool.query(`
      SELECT * FROM event_milestones
      ORDER BY required_mileage ASC
    `);

    // 유저 진행도 조회 또는 생성
    let [progress]: any = await pool.query(`
      SELECT * FROM user_event_progress
      WHERE user_id = ?
    `, [userId]);

    if (progress.length === 0) {
      // 진행도가 없으면 생성
      await pool.query(`
        INSERT INTO user_event_progress (user_id, total_mileage)
        VALUES (?, 0)
      `, [userId]);

      [progress] = await pool.query(`
        SELECT * FROM user_event_progress
        WHERE user_id = ?
      `, [userId]);
    }

    const userProgress = progress[0];

    // 날짜가 바뀌었으면 일일 퀘스트 초기화
    const today = new Date().toISOString().split('T')[0];
    const lastQuestDate = userProgress.last_quest_date
      ? new Date(userProgress.last_quest_date).toISOString().split('T')[0]
      : null;

    if (lastQuestDate !== today) {
      await pool.query(`
        UPDATE user_event_progress
        SET normal_match_today = 0,
            ranked_match_today = 0,
            ai_match_today = 0,
            last_quest_date = CURDATE()
        WHERE user_id = ?
      `, [userId]);

      userProgress.normal_match_today = 0;
      userProgress.ranked_match_today = 0;
      userProgress.ai_match_today = 0;
    }

    // 받은 보상 조회
    const [rewards]: any = await pool.query(`
      SELECT milestone_id FROM user_event_rewards
      WHERE user_id = ?
    `, [userId]);

    const claimedMilestones = rewards.map((r: any) => r.milestone_id);

    res.json({
      success: true,
      data: {
        quests,
        milestones,
        progress: {
          normalMatchToday: userProgress.normal_match_today,
          rankedMatchToday: userProgress.ranked_match_today,
          aiMatchToday: userProgress.ai_match_today,
          totalMileage: userProgress.total_mileage,
        },
        claimedMilestones,
        eventPeriod: {
          start: '2025-11-17',
          end: '2025-12-17',
        },
      },
    });
  } catch (error: any) {
    console.error('Get event error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 마일스톤 보상 받기
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { milestoneId } = req.body;

    if (!milestoneId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Milestone ID required' });
    }

    // 마일스톤 정보 조회
    const [milestones]: any = await connection.query(
      'SELECT * FROM event_milestones WHERE id = ?',
      [milestoneId]
    );

    if (milestones.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }

    const milestone = milestones[0];

    // 유저 진행도 조회
    const [progress]: any = await connection.query(
      'SELECT * FROM user_event_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Progress not found' });
    }

    const userProgress = progress[0];

    // 마일리지 확인
    if (userProgress.total_mileage < milestone.required_mileage) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'Insufficient mileage',
        required: milestone.required_mileage,
        current: userProgress.total_mileage,
      });
    }

    // 이미 받았는지 확인
    const [existingRewards]: any = await connection.query(
      'SELECT * FROM user_event_rewards WHERE user_id = ? AND milestone_id = ?',
      [userId, milestoneId]
    );

    if (existingRewards.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // 보상 지급
    let rewardCards: any[] = [];

    // 포인트 보상
    if (milestone.reward_points > 0) {
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [milestone.reward_points, userId]
      );
    }

    // 카드 보상
    if (milestone.reward_type === 'CARD_PACK' || milestone.reward_type === 'CARD_GUARANTEED') {
      const cardCount = milestone.reward_card_count || 1;

      for (let i = 0; i < cardCount; i++) {
        let cardQuery = '';

        if (milestone.reward_type === 'CARD_GUARANTEED' && milestone.reward_card_guaranteed_overall) {
          // 확정 카드
          cardQuery = `
            SELECT * FROM players
            WHERE overall >= ?
            ORDER BY RAND()
            LIMIT 1
          `;
          var [cards]: any = await connection.query(cardQuery, [milestone.reward_card_guaranteed_overall]);
        } else {
          // G2 카드 확률 체크
          const isG2 = Math.random() < (milestone.reward_g2_probability || 0);

          if (isG2) {
            // G2 카드 (season = '19G2')
            cardQuery = `
              SELECT * FROM players
              WHERE season = '19G2'
              AND overall >= ?
              ORDER BY RAND()
              LIMIT 1
            `;
          } else {
            // 일반 카드
            cardQuery = `
              SELECT * FROM players
              WHERE overall >= ?
              AND (season IS NULL OR season != '19G2')
              ORDER BY RAND()
              LIMIT 1
            `;
          }

          var [cards]: any = await connection.query(cardQuery, [milestone.reward_card_min_overall]);
        }

        if (cards.length > 0) {
          const card = cards[0];

          // 유저 카드 추가
          const [result]: any = await connection.query(
            'INSERT INTO user_cards (user_id, player_id, level) VALUES (?, ?, 0)',
            [userId, card.id]
          );

          rewardCards.push({
            cardId: result.insertId,
            playerId: card.id,
            playerName: card.name,
            overall: card.overall,
            position: card.position,
            team: card.team,
          });
        }
      }
    }

    // 보상 기록 저장
    const [rewardResult]: any = await connection.query(
      'INSERT INTO user_event_rewards (user_id, milestone_id, reward_type) VALUES (?, ?, ?)',
      [userId, milestoneId, milestone.reward_type]
    );

    const rewardId = rewardResult.insertId;

    // 카드 보상이 있으면 인벤토리에 추가
    if (rewardCards.length > 0) {
      for (const card of rewardCards) {
        await connection.query(
          'INSERT INTO event_reward_cards (user_id, reward_id, user_card_id, is_claimed) VALUES (?, ?, ?, FALSE)',
          [userId, rewardId, card.cardId]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        points: milestone.reward_points,
        cards: rewardCards,
        milestone: {
          id: milestoneId,
          requiredMileage: milestone.required_mileage,
          description: milestone.description,
        },
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim milestone error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// 이벤트 보상 카드 인벤토리 조회
router.get('/rewards/cards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [cards]: any = await pool.query(`
      SELECT
        erc.id,
        erc.user_card_id,
        erc.is_claimed,
        erc.created_at,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        CASE
          WHEN p.season = 'ICON' OR p.team = 'ICON' OR p.name LIKE '[ICON]%' OR p.name LIKE 'ICON%' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier,
        p.region,
        p.season,
        uc.level
      FROM event_reward_cards erc
      JOIN user_cards uc ON erc.user_card_id = uc.id
      JOIN players p ON uc.player_id = p.id
      WHERE erc.user_id = ?
      AND erc.is_claimed = FALSE
      ORDER BY erc.created_at DESC
    `, [userId]);

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('Get reward cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 이벤트 보상 카드 인벤토리에서 카드 받기
router.post('/rewards/cards/claim', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { rewardCardId } = req.body;

    if (!rewardCardId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward card ID required' });
    }

    // 보상 카드 조회
    const [cards]: any = await connection.query(
      'SELECT * FROM event_reward_cards WHERE id = ? AND user_id = ?',
      [rewardCardId, userId]
    );

    if (cards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Reward card not found' });
    }

    const card = cards[0];

    if (card.is_claimed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Card already claimed' });
    }

    // 카드 받기 처리
    await connection.query(
      'UPDATE event_reward_cards SET is_claimed = TRUE, claimed_at = NOW() WHERE id = ?',
      [rewardCardId]
    );

    await connection.commit();

    res.json({ success: true, message: 'Card claimed successfully' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Claim reward card error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
