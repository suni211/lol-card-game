import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Tutorial steps configuration
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: '가챠 뽑기',
    description: '무료 가챠를 뽑아 첫 번째 선수 카드를 획득하세요!',
    action: '가챠 페이지로 이동',
    route: '/gacha',
    requirement: 'gacha_draw'
  },
  {
    id: 2,
    title: '덱 만들기',
    description: '5명의 선수로 구성된 덱을 만들어보세요!',
    action: '덱 페이지로 이동',
    route: '/deck',
    requirement: 'deck_created'
  },
  {
    id: 3,
    title: 'AI 대전 체험',
    description: 'AI와 대전하여 게임 방식을 익혀보세요!',
    action: 'AI 대전 시작',
    route: '/practice',
    requirement: 'ai_battle'
  },
  {
    id: 4,
    title: '카드 강화',
    description: '재료 카드를 사용하여 카드를 강화해보세요!',
    action: '강화 페이지로 이동',
    route: '/enhancement',
    requirement: 'card_enhanced'
  },
  {
    id: 5,
    title: 'VS 모드 도전',
    description: 'VS 모드 스테이지 1을 클리어하세요!',
    action: 'VS 모드 시작',
    route: '/vsmode',
    requirement: 'vs_stage_cleared'
  },
  {
    id: 6,
    title: '랭크 매치 도전',
    description: '다른 플레이어와 랭크 매치를 해보세요!',
    action: '매치 페이지로 이동',
    route: '/match',
    requirement: 'ranked_match'
  }
];

const TUTORIAL_REWARD = 10000;

// Get tutorial progress
router.get('/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let [progress]: any = await pool.query(
      'SELECT * FROM user_tutorial_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      // Initialize tutorial progress
      await pool.query(
        'INSERT INTO user_tutorial_progress (user_id, current_step, completed_steps) VALUES (?, 1, ?)',
        [userId, JSON.stringify([])]
      );

      progress = [{
        user_id: userId,
        current_step: 1,
        completed_steps: [],
        is_completed: false,
        reward_claimed: false
      }];
    } else {
      progress[0].completed_steps = JSON.parse(progress[0].completed_steps || '[]');
    }

    res.json({
      success: true,
      data: {
        progress: progress[0],
        steps: TUTORIAL_STEPS,
        totalSteps: TUTORIAL_STEPS.length,
        reward: TUTORIAL_REWARD
      }
    });
  } catch (error) {
    console.error('Get tutorial progress error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Complete a tutorial step
router.post('/step/:stepId/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const stepId = parseInt(req.params.stepId);

    if (stepId < 1 || stepId > TUTORIAL_STEPS.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid step ID' });
    }

    // Get current progress
    let [progress]: any = await connection.query(
      'SELECT * FROM user_tutorial_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Tutorial progress not found' });
    }

    progress = progress[0];
    const completedSteps = JSON.parse(progress.completed_steps || '[]');

    // Check if already completed
    if (completedSteps.includes(stepId)) {
      await connection.rollback();
      return res.json({ success: true, message: 'Step already completed' });
    }

    // Add to completed steps
    completedSteps.push(stepId);
    const nextStep = stepId + 1;
    const isAllCompleted = completedSteps.length === TUTORIAL_STEPS.length;

    // Update progress
    await connection.query(
      `UPDATE user_tutorial_progress
       SET current_step = ?,
           completed_steps = ?,
           is_completed = ?,
           completed_at = ?
       WHERE user_id = ?`,
      [
        isAllCompleted ? TUTORIAL_STEPS.length : nextStep,
        JSON.stringify(completedSteps),
        isAllCompleted,
        isAllCompleted ? new Date() : null,
        userId
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Tutorial step completed!',
      data: {
        stepId,
        nextStep: isAllCompleted ? null : nextStep,
        isAllCompleted,
        completedSteps
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Complete tutorial step error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Claim tutorial reward
router.post('/claim-reward', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get tutorial progress
    const [progress]: any = await connection.query(
      'SELECT * FROM user_tutorial_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Tutorial progress not found' });
    }

    const tutorialProgress = progress[0];

    if (!tutorialProgress.is_completed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Tutorial not completed yet' });
    }

    if (tutorialProgress.reward_claimed) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Reward already claimed' });
    }

    // Award points
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [TUTORIAL_REWARD, userId]
    );

    // Mark reward as claimed
    await connection.query(
      'UPDATE user_tutorial_progress SET reward_claimed = TRUE WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `튜토리얼 완료! ${TUTORIAL_REWARD} 포인트를 획득했습니다!`,
      data: {
        reward: TUTORIAL_REWARD
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Claim tutorial reward error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Skip tutorial (for returning users)
router.post('/skip', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Mark all steps as completed without reward
    const allSteps = TUTORIAL_STEPS.map(s => s.id);

    await connection.query(
      `INSERT INTO user_tutorial_progress
       (user_id, current_step, completed_steps, is_completed, reward_claimed)
       VALUES (?, ?, ?, TRUE, TRUE)
       ON DUPLICATE KEY UPDATE
       is_completed = TRUE,
       completed_steps = ?,
       current_step = ?`,
      [userId, TUTORIAL_STEPS.length, JSON.stringify(allSteps), JSON.stringify(allSteps), TUTORIAL_STEPS.length]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Tutorial skipped'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Skip tutorial error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
