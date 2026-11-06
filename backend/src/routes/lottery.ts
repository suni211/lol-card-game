import express, { Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Lottery draws are permitted only during 20:00-20:59 Asia/Seoul.
// Use the server clock so clients cannot bypass the window.
const getKstDate = () => {
  const pieces = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => pieces.find(p => p.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const isLotteryOpen = () => {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()));
  return hour === 20;
};

router.get('/availability', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const date = getKstDate();
    const [plays]: any = await pool.query(
      'SELECT 1 FROM lottery_daily_plays WHERE user_id=? AND play_date=? LIMIT 1',
      [req.user!.id,date]
    );
    const alreadyPlayed = plays.length > 0;
    res.json({success:true,data:{
      isOpen: isLotteryOpen() && !alreadyPlayed,
      withinTimeWindow: isLotteryOpen(),
      alreadyPlayed,
      timeZone:'Asia/Seoul',start:'20:00',end:'21:00',playDate:date,
    }});
  } catch (error) {
    console.error('Lottery availability error:',error);
    res.status(500).json({success:false,error:'럭키드로우 참여 상태 확인 실패'});
  }
});

// Lottery configuration
const TICKET_COST = 25000; // 2만 5천 포인트
const TOTAL_NUMBERS = 49;

// Grade probabilities (must sum to 100)
const GRADE_PROBABILITIES = {
  B: 70,
  A: 20,
  S: 6.2497,
  SS: 3.75,
  SSR: 0.0003,
};

// Rewards by grade
const REWARDS = {
  B: [
    { type: 'points', value: 1000, name: '1,000P' },
    { type: 'points', value: 1500, name: '1,500P' },
    { type: 'points', value: 2000, name: '2,000P' },
    { type: 'pack', minOverall: 88, name: '88+ 카드팩' },
    { type: 'pack', minOverall: 85, name: '85+ 카드팩' },
  ],
  A: [
    { type: 'points', value: 3000, name: '3,000P' },
    { type: 'points', value: 5000, name: '5,000P' },
    { type: 'pack', minOverall: 92, name: '92+ 카드팩' },
    { type: 'pack', minOverall: 95, name: '95+ 카드팩' },
  ],
  S: [
    { type: 'points', value: 10000, name: '10,000P' },
    { type: 'points', value: 50000, name: '50,000P' },
    { type: 'points', value: 100000, name: '100,000P' },
    { type: 'pack', minOverall: 100, name: '100+ 카드팩' },
    { type: 'pack', minOverall: 103, name: '103+ 카드팩' },
  ],
  SS: [
    { type: 'points', value: 150000, name: '150,000P' },
    { type: 'points', value: 200000, name: '200,000P' },
    { type: 'pack', minOverall: 103, name: '103+ 카드팩' },
    { type: 'pack', minOverall: 106, name: '106+ 카드팩' },
    { type: 'pack', minOverall: 108, name: '108+ 카드팩' },
  ],
  SSR: [
    { type: 'points', value: 500000, name: '500,000P' },
    { type: 'points', value: 1000000, name: '1,000,000P' },
    { type: 'pack', minOverall: 110, name: '110+ 카드팩' },
    { type: 'pack', minOverall: 113, name: '113+ 카드팩' },
    { type: 'wrs', name: '26WRs 확정 카드' },
  ],
};

// Generate lottery board with exactly 1 SSR
function generateLotteryBoard(): { number: number; grade: string; reward: any }[] {
  const board: { number: number; grade: string; reward: any }[] = [];

  // First, place exactly 1 SSR at random position
  const ssrPosition = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
  const ssrReward = REWARDS.SSR[Math.floor(Math.random() * REWARDS.SSR.length)];

  // Generate grades for remaining positions (excluding SSR from probabilities)
  const remainingProbabilities = {
    B: GRADE_PROBABILITIES.B,
    A: GRADE_PROBABILITIES.A,
    S: GRADE_PROBABILITIES.S,
    SS: GRADE_PROBABILITIES.SS,
  };

  // Normalize probabilities (they should sum to ~99.9997%)
  const totalProb = Object.values(remainingProbabilities).reduce((a, b) => a + b, 0);

  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    if (i === ssrPosition) {
      board.push({
        number: i,
        grade: 'SSR',
        reward: ssrReward,
      });
    } else {
      // Roll for grade
      const roll = Math.random() * totalProb;
      let cumulative = 0;
      let selectedGrade = 'B';

      for (const [grade, prob] of Object.entries(remainingProbabilities)) {
        cumulative += prob;
        if (roll <= cumulative) {
          selectedGrade = grade;
          break;
        }
      }

      // Select random reward for grade
      const gradeRewards = REWARDS[selectedGrade as keyof typeof REWARDS];
      const reward = gradeRewards[Math.floor(Math.random() * gradeRewards.length)];

      board.push({
        number: i,
        grade: selectedGrade,
        reward,
      });
    }
  }

  return board.sort((a, b) => a.number - b.number);
}

// Get or create user's lottery board
router.get('/board', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check if user has active lottery board
    const [boards]: any = await pool.query(
      'SELECT * FROM lottery_boards WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (boards.length === 0) {
      // Create new board
      const newBoard = generateLotteryBoard();

      await pool.query(
        'INSERT INTO lottery_boards (user_id, board_data, picked_numbers, is_active) VALUES (?, ?, ?, TRUE)',
        [userId, JSON.stringify(newBoard), JSON.stringify([])]
      );

      const [created]: any = await pool.query(
        'SELECT * FROM lottery_boards WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      const board = created[0];
      const boardData = JSON.parse(board.board_data);
      const pickedNumbers = JSON.parse(board.picked_numbers);

      // Hide rewards for unpicked numbers
      const displayBoard = boardData.map((item: any) => ({
        number: item.number,
        picked: pickedNumbers.includes(item.number),
        grade: pickedNumbers.includes(item.number) ? item.grade : null,
        reward: pickedNumbers.includes(item.number) ? item.reward : null,
      }));

      return res.json({
        success: true,
        data: {
          board: displayBoard,
          pickedCount: pickedNumbers.length,
          totalNumbers: TOTAL_NUMBERS,
          ticketCost: TICKET_COST,
        },
      });
    }

    const board = boards[0];
    const boardData = JSON.parse(board.board_data);
    const pickedNumbers = JSON.parse(board.picked_numbers);

    // Hide rewards for unpicked numbers
    const displayBoard = boardData.map((item: any) => ({
      number: item.number,
      picked: pickedNumbers.includes(item.number),
      grade: pickedNumbers.includes(item.number) ? item.grade : null,
      reward: pickedNumbers.includes(item.number) ? item.reward : null,
    }));

    res.json({
      success: true,
      data: {
        board: displayBoard,
        pickedCount: pickedNumbers.length,
        totalNumbers: TOTAL_NUMBERS,
        ticketCost: TICKET_COST,
      },
    });
  } catch (error: any) {
    console.error('Get lottery board error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Pick a number
router.post('/pick', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!isLotteryOpen()) return res.status(403).json({ success: false, error: '럭키드로우는 매일 한국시간 오후 8시부터 9시 전까지만 참여할 수 있습니다.' });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { number } = req.body;

    if (!number || number < 1 || number > TOTAL_NUMBERS) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '유효하지 않은 번호입니다.' });
    }

    // Lock the user before checking daily eligibility to serialize simultaneous requests.
    const playDate = getKstDate();
    const [previous]: any = await connection.query(
      'SELECT 1 FROM lottery_daily_plays WHERE user_id=? AND play_date=? LIMIT 1',
      [userId,playDate]
    );
    if (previous.length) {
      await connection.rollback();
      return res.status(409).json({success:false,error:'오늘 럭키드로우 참여를 이미 완료했습니다. 내일 오후 8시에 다시 참여하세요.'});
    }

    // Check user points
    const [users]: any = await connection.query(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0 || users[0].points < TICKET_COST) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `포인트가 부족합니다. (필요: ${TICKET_COST.toLocaleString()}P)`
      });
    }

    // Get active board
    const [boards]: any = await connection.query(
      'SELECT * FROM lottery_boards WHERE user_id = ? AND is_active = TRUE FOR UPDATE',
      [userId]
    );

    if (boards.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '복권판이 없습니다.' });
    }

    const board = boards[0];
    const boardData = JSON.parse(board.board_data);
    const pickedNumbers: number[] = JSON.parse(board.picked_numbers);

    // Check if already picked
    if (pickedNumbers.includes(number)) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '이미 선택한 번호입니다.' });
    }

    // Find the reward for this number
    const selectedItem = boardData.find((item: any) => item.number === number);
    if (!selectedItem) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '번호를 찾을 수 없습니다.' });
    }

    // Reserve today's draw in the same transaction as the point debit and reward.
    // Unique (user_id,play_date) blocks double payouts even for parallel requests.
    try {
      await connection.query(
        'INSERT INTO lottery_daily_plays (user_id,play_date) VALUES (?,?)',
        [userId,playDate]
      );
    } catch (dailyError: any) {
      if (dailyError?.code !== 'ER_DUP_ENTRY') throw dailyError;
      await connection.rollback();
      return res.status(409).json({success:false,error:'오늘 럭키드로우는 이미 참여했습니다.'});
    }

    // Deduct points
    await connection.query(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [TICKET_COST, userId]
    );

    // Process reward
    let rewardResult: any = {
      grade: selectedItem.grade,
      reward: selectedItem.reward,
    };

    if (selectedItem.reward.type === 'points') {
      // Give points
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [selectedItem.reward.value, userId]
      );
      rewardResult.pointsGained = selectedItem.reward.value;
    } else if (selectedItem.reward.type === 'pack' || selectedItem.reward.type === 'wrs') {
      // Give card
      let query = '';
      let params: any[] = [];

      if (selectedItem.reward.type === 'wrs') {
        query = `SELECT id, name, team, position, overall, region, season, salary FROM players WHERE season = '26WRs' ORDER BY RAND() LIMIT 1`;
      } else {
        query = `SELECT id, name, team, position, overall, region, season, salary FROM players WHERE overall >= ? AND season IN ('26 LIVE','26WR','26WRs') ORDER BY RAND() LIMIT 1`;
        params = [selectedItem.reward.minOverall];
      }

      const [players]: any = await connection.query(query, params);

      if (players.length > 0) {
        const player = players[0];
        await connection.query(
          'INSERT INTO user_cards (user_id, player_id) VALUES (?, ?)',
          [userId, player.id]
        );
        rewardResult.card = player;
      }
    }

    // Update picked numbers
    pickedNumbers.push(number);

    // Check if SSR was picked - reset board
    let boardReset = false;
    if (selectedItem.grade === 'SSR') {
      // Reset board
      const newBoard = generateLotteryBoard();
      await connection.query(
        'UPDATE lottery_boards SET board_data = ?, picked_numbers = ? WHERE id = ?',
        [JSON.stringify(newBoard), JSON.stringify([]), board.id]
      );
      boardReset = true;
      rewardResult.boardReset = true;
    } else {
      // Just update picked numbers
      await connection.query(
        'UPDATE lottery_boards SET picked_numbers = ? WHERE id = ?',
        [JSON.stringify(pickedNumbers), board.id]
      );
    }

    // Log the pick
    await connection.query(
      'INSERT INTO lottery_logs (user_id, board_id, picked_number, grade, reward_data) VALUES (?, ?, ?, ?, ?)',
      [userId, board.id, number, selectedItem.grade, JSON.stringify(selectedItem.reward)]
    );

    await connection.commit();

    // Get updated user points
    const [updatedUser]: any = await connection.query(
      'SELECT points FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        ...rewardResult,
        newPoints: updatedUser[0].points,
        boardReset,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Pick lottery number error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get lottery history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const [logs]: any = await pool.query(
      `SELECT * FROM lottery_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );

    const history = logs.map((log: any) => ({
      id: log.id,
      number: log.picked_number,
      grade: log.grade,
      reward: JSON.parse(log.reward_data),
      createdAt: log.created_at,
    }));

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Get lottery history error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Reset board (admin or manual reset after all picked)
router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get current board
    const [boards]: any = await connection.query(
      'SELECT * FROM lottery_boards WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (boards.length === 0) {
      // Create new board if none exists
      const newBoard = generateLotteryBoard();
      await connection.query(
        'INSERT INTO lottery_boards (user_id, board_data, picked_numbers, is_active) VALUES (?, ?, ?, TRUE)',
        [userId, JSON.stringify(newBoard), JSON.stringify([])]
      );
    } else {
      // Check if all numbers picked or SSR was found
      const board = boards[0];
      const pickedNumbers = JSON.parse(board.picked_numbers);

      if (pickedNumbers.length < TOTAL_NUMBERS) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: '아직 모든 번호를 선택하지 않았습니다.'
        });
      }

      // Reset with new board
      const newBoard = generateLotteryBoard();
      await connection.query(
        'UPDATE lottery_boards SET board_data = ?, picked_numbers = ? WHERE id = ?',
        [JSON.stringify(newBoard), JSON.stringify([]), board.id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: '복권판이 리셋되었습니다.',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Reset lottery board error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
