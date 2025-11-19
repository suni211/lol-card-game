import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

const router = express.Router();
let io: Server;

export const setSocketIOForMatch3Phase = (socketIO: Server) => {
  io = socketIO;
};

// Strategy counter relationships
const STRATEGY_COUNTERS: any = {
  LANING: {
    AGGRESSIVE: { counters: ['SAFE'], weakTo: ['SCALING'] },
    SAFE: { counters: ['PUSH'], weakTo: ['AGGRESSIVE'] },
    ROAMING: { counters: ['SCALING'], weakTo: ['PUSH'] },
    SCALING: { counters: ['AGGRESSIVE'], weakTo: ['ROAMING'] },
    PUSH: { counters: ['ROAMING'], weakTo: ['SAFE'] },
  },
  TEAMFIGHT: {
    ENGAGE: { counters: ['POKE'], weakTo: ['DISENGAGE'] },
    DISENGAGE: { counters: ['ENGAGE'], weakTo: ['POKE'] },
    POKE: { counters: ['DISENGAGE'], weakTo: ['ENGAGE'] },
    PROTECT: { counters: ['DIVE'], weakTo: ['POKE'] },
  },
  MACRO: {
    OBJECTIVE: { counters: ['SPLITPUSH'], weakTo: ['PICK'] },
    VISION: { counters: ['PICK'], weakTo: ['SPLITPUSH'] },
    SPLITPUSH: { counters: ['GROUPING'], weakTo: ['OBJECTIVE'] },
    GROUPING: { counters: ['VISION'], weakTo: ['SPLITPUSH'] },
  },
};

// Calculate strategy advantage
function calculateStrategyAdvantage(
  myStrategy: string,
  opponentStrategy: string,
  phase: 'LANING' | 'TEAMFIGHT' | 'MACRO'
): number {
  const strategies = STRATEGY_COUNTERS[phase];
  const myStrategyData = strategies[myStrategy];

  if (!myStrategyData) return 1.0;

  if (myStrategyData.counters.includes(opponentStrategy)) {
    return 1.15; // 15% advantage
  } else if (myStrategyData.weakTo.includes(opponentStrategy)) {
    return 0.85; // 15% disadvantage
  }

  return 1.0; // No advantage
}

// Calculate phase-specific deck power
async function calculatePhasePower(
  connection: any,
  deckId: number,
  phase: 'LANING' | 'TEAMFIGHT' | 'MACRO'
): Promise<number> {
  const [deck]: any = await connection.query('SELECT * FROM decks WHERE id = ?', [deckId]);
  if (deck.length === 0) return 0;

  const deckData = deck[0];
  const cardIds = [
    deckData.top_card_id,
    deckData.jungle_card_id,
    deckData.mid_card_id,
    deckData.adc_card_id,
    deckData.support_card_id,
  ].filter(Boolean);

  if (cardIds.length === 0) return 0;

  const [cards]: any = await connection.query(`
    SELECT uc.level, p.overall, p.laning, p.teamfight, p.macro, p.mental
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  let totalPower = 0;

  cards.forEach((card: any) => {
    const enhancementBonus = card.level * 2; // 레벨당 +2
    let basePower = card.overall + enhancementBonus;

    // Phase-specific stat weight
    let phaseStat = 0;
    if (phase === 'LANING') {
      phaseStat = card.laning;
      basePower = basePower * 0.7 + phaseStat * 0.3; // 30% 라이닝 스탯 반영
    } else if (phase === 'TEAMFIGHT') {
      phaseStat = card.teamfight;
      basePower = basePower * 0.7 + phaseStat * 0.3; // 30% 팀파이트 스탯 반영
    } else if (phase === 'MACRO') {
      phaseStat = card.macro;
      const mentalBonus = card.mental * 0.1; // 매크로에서 멘탈 중요
      basePower = basePower * 0.6 + phaseStat * 0.3 + mentalBonus;
    }

    totalPower += basePower;
  });

  return Math.floor(totalPower);
}

// Start a new 3-phase match
router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { opponentId, isRanked = true } = req.body;

    if (!opponentId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '상대방을 선택해주세요.' });
    }

    // Get active decks
    const [player1Deck]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );
    const [player2Deck]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [opponentId]
    );

    if (player1Deck.length === 0 || player2Deck.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '활성 덱이 없습니다.' });
    }

    // Create match
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (
        player1_id, player2_id, player1_deck_id, player2_deck_id,
        match_type, current_phase, is_live, phase_score_p1, phase_score_p2
      ) VALUES (?, ?, ?, ?, ?, 'LANING', TRUE, 0, 0)
    `, [userId, opponentId, player1Deck[0].id, player2Deck[0].id, isRanked ? 'RANKED' : 'PRACTICE']);

    const matchId = matchResult.insertId;

    await connection.commit();

    // Notify via Socket.IO
    if (io) {
      io.to(`user_${opponentId}`).emit('match_started', {
        matchId,
        opponentId: userId,
        phase: 'LANING'
      });
    }

    res.json({
      success: true,
      data: {
        matchId,
        currentPhase: 'LANING',
        message: '경기가 시작되었습니다! 라이닝 페이즈'
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Start 3-phase match error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Execute a phase
router.post('/execute-phase', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { matchId, phase, player1Strategy, player2Strategy } = req.body;

    // Get match
    const [matches]: any = await connection.query(
      'SELECT * FROM matches WHERE id = ? AND is_live = TRUE',
      [matchId]
    );

    if (matches.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '경기를 찾을 수 없습니다.' });
    }

    const match = matches[0];

    // Calculate phase powers
    const player1Power = await calculatePhasePower(connection, match.player1_deck_id, phase);
    const player2Power = await calculatePhasePower(connection, match.player2_deck_id, phase);

    // Apply strategy multipliers
    const p1Multiplier = calculateStrategyAdvantage(player1Strategy, player2Strategy, phase);
    const p2Multiplier = calculateStrategyAdvantage(player2Strategy, player1Strategy, phase);

    const finalPower1 = Math.floor(player1Power * p1Multiplier);
    const finalPower2 = Math.floor(player2Power * p2Multiplier);

    const winnerId = finalPower1 > finalPower2 ? match.player1_id : match.player2_id;

    // Save phase result
    await connection.query(`
      INSERT INTO match_phases (
        match_id, phase, player1_power, player2_power,
        player1_strategy, player2_strategy,
        strategy_multiplier_p1, strategy_multiplier_p2, winner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [matchId, phase, finalPower1, finalPower2, player1Strategy, player2Strategy, p1Multiplier, p2Multiplier, winnerId]);

    // Update scores
    let newScoreP1 = match.phase_score_p1;
    let newScoreP2 = match.phase_score_p2;

    if (winnerId === match.player1_id) {
      newScoreP1++;
    } else {
      newScoreP2++;
    }

    // Determine next phase or finish
    let nextPhase = null;
    let matchFinished = false;

    if (newScoreP1 === 2 || newScoreP2 === 2) {
      // Match finished (best of 3)
      matchFinished = true;
      const finalWinnerId = newScoreP1 === 2 ? match.player1_id : match.player2_id;
      const finalLoserId = finalWinnerId === match.player1_id ? match.player2_id : match.player1_id;

      await connection.query(`
        UPDATE matches
        SET winner_id = ?, loser_id = ?, is_live = FALSE, ended_at = NOW(),
            phase_score_p1 = ?, phase_score_p2 = ?
        WHERE id = ?
      `, [finalWinnerId, finalLoserId, newScoreP1, newScoreP2, matchId]);

      // Update ratings if ranked
      if (match.match_type === 'RANKED') {
        const ratingChange = 25;
        await connection.query(
          'UPDATE users SET rating = rating + ? WHERE id = ?',
          [ratingChange, finalWinnerId]
        );
        await connection.query(
          'UPDATE users SET rating = rating - ? WHERE id = ?',
          [ratingChange, finalLoserId]
        );
      }
    } else {
      // Continue to next phase
      if (phase === 'LANING') {
        nextPhase = 'TEAMFIGHT';
      } else if (phase === 'TEAMFIGHT') {
        nextPhase = 'MACRO';
      }

      await connection.query(`
        UPDATE matches
        SET current_phase = ?, phase_score_p1 = ?, phase_score_p2 = ?
        WHERE id = ?
      `, [nextPhase, newScoreP1, newScoreP2, matchId]);
    }

    await connection.commit();

    // Broadcast via Socket.IO
    if (io) {
      const phaseResult = {
        matchId,
        phase,
        player1Power: finalPower1,
        player2Power: finalPower2,
        winnerId,
        scoreP1: newScoreP1,
        scoreP2: newScoreP2,
        nextPhase,
        matchFinished
      };

      io.to(`match_${matchId}`).emit('phase_complete', phaseResult);
      io.to(`user_${match.player1_id}`).emit('phase_complete', phaseResult);
      io.to(`user_${match.player2_id}`).emit('phase_complete', phaseResult);
    }

    res.json({
      success: true,
      data: {
        phase,
        player1Power: finalPower1,
        player2Power: finalPower2,
        winnerId,
        scoreP1: newScoreP1,
        scoreP2: newScoreP2,
        nextPhase,
        matchFinished
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Execute phase error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get live matches (for spectating)
router.get('/live', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [liveMatches]: any = await pool.query(`
      SELECT
        m.id,
        m.current_phase,
        m.phase_score_p1,
        m.phase_score_p2,
        m.started_at,
        u1.username as player1_name,
        u1.rating as player1_rating,
        u2.username as player2_name,
        u2.rating as player2_rating,
        (SELECT COUNT(*) FROM match_spectators WHERE match_id = m.id) as spectator_count
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      WHERE m.is_live = TRUE
      ORDER BY spectator_count DESC, m.started_at DESC
      LIMIT 20
    `);

    res.json({ success: true, data: liveMatches });
  } catch (error: any) {
    console.error('Get live matches error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Join as spectator
router.post('/spectate/:matchId', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const matchId = parseInt(req.params.matchId);

    // Check if match exists and is live
    const [matches]: any = await connection.query(
      'SELECT * FROM matches WHERE id = ? AND is_live = TRUE',
      [matchId]
    );

    if (matches.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '라이브 경기가 아닙니다.' });
    }

    // Add spectator
    await connection.query(`
      INSERT INTO match_spectators (match_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE joined_at = NOW()
    `, [matchId, userId]);

    // Get match details with phase history
    const [phases]: any = await connection.query(`
      SELECT * FROM match_phases
      WHERE match_id = ?
      ORDER BY created_at ASC
    `, [matchId]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        match: matches[0],
        phases
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Spectate match error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
