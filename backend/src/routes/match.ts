import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Strategy counter relationships
const STRATEGY_COUNTERS: any = {
  LANING: {
    AGGRESSIVE: { counters: ['SAFE'], weakTo: ['SCALING'] },
    SAFE: { counters: ['PUSH'], weakTo: ['AGGRESSIVE'] },
    ROAMING: { counters: ['SCALING'], weakTo: ['PUSH'] },
    SCALING: { counters: ['AGGRESSIVE'], weakTo: ['ROAMING'] },
    PUSH: { counters: ['ROAMING'], weakTo: ['SAFE'] },
    FREEZE: { counters: ['PUSH'], weakTo: ['ROAMING'] },
    TRADE: { counters: ['SCALING'], weakTo: ['ALLKILL'] },
    ALLKILL: { counters: ['TRADE'], weakTo: ['SAFE'] },
  },
  TEAMFIGHT: {
    ENGAGE: { counters: ['POKE'], weakTo: ['DISENGAGE'] },
    DISENGAGE: { counters: ['ENGAGE'], weakTo: ['POKE'] },
    POKE: { counters: ['DISENGAGE'], weakTo: ['ENGAGE'] },
    PROTECT: { counters: ['DIVE'], weakTo: ['POKE'] },
    SPLIT: { counters: ['PROTECT'], weakTo: ['ENGAGE'] },
    FLANK: { counters: ['PROTECT'], weakTo: ['KITE'] },
    KITE: { counters: ['ENGAGE'], weakTo: ['FLANK'] },
    DIVE: { counters: ['KITE'], weakTo: ['PROTECT'] },
  },
  MACRO: {
    OBJECTIVE: { counters: ['SPLITPUSH'], weakTo: ['PICK'] },
    VISION: { counters: ['PICK'], weakTo: ['SPLITPUSH'] },
    SPLITPUSH: { counters: ['GROUPING'], weakTo: ['OBJECTIVE'] },
    GROUPING: { counters: ['VISION'], weakTo: ['SPLITPUSH'] },
    PICK: { counters: ['OBJECTIVE'], weakTo: ['VISION'] },
    SIEGE: { counters: ['GROUPING'], weakTo: ['ROTATION'] },
    ROTATION: { counters: ['SIEGE'], weakTo: ['CONTROL'] },
    CONTROL: { counters: ['ROTATION'], weakTo: ['GROUPING'] },
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

// Calculate deck power
async function calculateDeckPower(connection: any, deckId: number): Promise<number> {
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
    SELECT uc.id as card_id, uc.level, p.overall, p.team, p.position, p.laning, p.teamfight, p.macro, p.mental
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  let totalPower = 0;
  const teams: any = {};
  const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const deckPositions: any = {
    [deckData.top_card_id]: 'TOP',
    [deckData.jungle_card_id]: 'JUNGLE',
    [deckData.mid_card_id]: 'MID',
    [deckData.adc_card_id]: 'ADC',
    [deckData.support_card_id]: 'SUPPORT',
  };

  // Team synergy mapping: old teams treated as current teams
  const teamMapping: any = {
    'NJS': 'BRO',
    'AZF': 'CJ',
    'MVP': 'GEN',
    'SKT': 'T1',
  };

  // Calculate enhancement bonus
  const calculateEnhancementBonus = (level: number): number => {
    if (level <= 4) {
      return level; // 1~4강: +1씩
    } else if (level <= 7) {
      return 4 + (level - 4) * 2; // 5~7강: +2씩
    } else {
      return 10 + (level - 7) * 4; // 8~10강: +4씩
    }
  };

  cards.forEach((card: any) => {
    const enhancementBonus = calculateEnhancementBonus(card.level);
    let power = card.overall + enhancementBonus;

    // Wrong position penalty
    const cardIds = Object.keys(deckPositions);
    const matchingCardId = cardIds.find(id => {
      const [cardData]: any = cards.filter((c: any) => c.position === card.position);
      return cardData && deckPositions[id] !== card.position;
    });

    if (matchingCardId && deckPositions[matchingCardId] !== card.position) {
      power -= 10; // Wrong position penalty
    }

    totalPower += power;

    // Count teams for synergy (map old teams to current teams)
    const synergyTeam = teamMapping[card.team] || card.team;
    teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
  });

  // Team synergy: same team 3 players = +1 OVR, 4 players = +2 OVR, 5 players = +3 OVR
  let synergyBonus = 0;
  Object.values(teams).forEach((count: any) => {
    if (count === 3) synergyBonus += 1;
    if (count === 4) synergyBonus += 2;
    if (count === 5) synergyBonus += 3;
  });

  // Special synergies
  const playerNames = cards.map((c: any) => c.card_id);
  const [playerDetails]: any = await connection.query(`
    SELECT uc.id as card_id, p.name, p.season
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  const names = playerDetails.map((p: any) => p.name);
  const seasons = playerDetails.map((p: any) => p.season);

  // 17SSG의 귀환: 5명 모두 17SSG 선수 (+3 OVR)
  const ssgPlayers = ['17SSG CuVee', '17SSG Ambition', '17SSG Crown', '17SSG Ruler', '17SSG CoreJJ'];
  if (ssgPlayers.every(name => names.includes(name))) {
    synergyBonus += 3;
  }

  // 25 도오페구케 우승: Zeus, Oner, Faker, Gumayusi, Keria (시즌 25) (+2 OVR)
  const t1ChampPlayers = ['Zeus', 'Oner', 'Faker', 'Gumayusi', 'Keria'];
  const hasT1ChampSynergy = t1ChampPlayers.every(name => {
    const playerDetail = playerDetails.find((p: any) => p.name === name);
    return playerDetail && playerDetail.season === '25';
  });
  if (hasT1ChampSynergy) {
    synergyBonus += 2;
  }

  // 대한민국 국가대표 시너지: Zeus, Canyon/Oner, Chovy/Faker, Ruler, Keria (+1 OVR)
  const hasZeus = names.includes('Zeus');
  const hasJungler = names.includes('Canyon') || names.includes('Oner');
  const hasMid = names.includes('Chovy') || names.includes('Faker');
  const hasRuler = names.includes('Ruler');
  const hasKeria = names.includes('Keria');
  if (hasZeus && hasJungler && hasMid && hasRuler && hasKeria) {
    synergyBonus += 1;
  }

  totalPower += synergyBonus;

  return totalPower;
}

// Calculate deck power for specific stat (laning, teamfight, macro, mental)
async function calculateDeckStatPower(
  connection: any,
  deckId: number,
  stat: 'laning' | 'teamfight' | 'macro' | 'mental'
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
    SELECT uc.level, p.${stat} as stat_value, p.overall
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  let totalPower = 0;
  cards.forEach((card: any) => {
    // Combine stat with overall and level
    const statContribution = (card.stat_value || 50) * 0.7; // 70% from specific stat
    const overallContribution = card.overall * 0.3; // 30% from overall
    totalPower += statContribution + overallContribution + card.level;
  });

  return totalPower;
}

// Simulate match with detailed phases
async function simulateMatch(
  connection: any,
  player1DeckId: number,
  player2DeckId: number
): Promise<{
  phases: any[];
  finalScore: { player1: number; player2: number };
  winnerId: 1 | 2;
}> {
  // Get deck strategies
  const [deck1]: any = await connection.query(
    'SELECT laning_strategy, teamfight_strategy, macro_strategy FROM decks WHERE id = ?',
    [player1DeckId]
  );
  const [deck2]: any = await connection.query(
    'SELECT laning_strategy, teamfight_strategy, macro_strategy FROM decks WHERE id = ?',
    [player2DeckId]
  );

  const p1Strategies = deck1[0];
  const p2Strategies = deck2[0];

  // Calculate base powers
  const p1Power = await calculateDeckPower(connection, player1DeckId);
  const p2Power = await calculateDeckPower(connection, player2DeckId);

  const phases: any[] = [];
  let p1TotalScore = 0;
  let p2TotalScore = 0;

  // Best of 5 (5판 3선승제)
  // Play up to 5 games, first to win 3 games wins the match
  for (let gameNum = 1; gameNum <= 5; gameNum++) {
    // Stop if someone already won 3 games
    if (p1TotalScore >= 3 || p2TotalScore >= 3) break;

    // Determine which strategy to use for this game
    let strategyType: 'LANING' | 'TEAMFIGHT' | 'MACRO';
    let strategyName: string;
    let p1Strategy: string;
    let p2Strategy: string;
    let statType: 'laning' | 'teamfight' | 'macro' | 'mental';

    if (gameNum % 3 === 1) {
      strategyType = 'LANING';
      strategyName = '라인전';
      statType = 'laning';
      p1Strategy = p1Strategies.laning_strategy;
      p2Strategy = p2Strategies.laning_strategy;
    } else if (gameNum % 3 === 2) {
      strategyType = 'TEAMFIGHT';
      strategyName = '한타';
      statType = 'teamfight';
      p1Strategy = p1Strategies.teamfight_strategy;
      p2Strategy = p2Strategies.teamfight_strategy;
    } else {
      strategyType = 'MACRO';
      strategyName = '운영';
      statType = 'macro';
      p1Strategy = p1Strategies.macro_strategy;
      p2Strategy = p2Strategies.macro_strategy;
    }

    // Calculate stat-specific power for this phase
    const p1StatPower = await calculateDeckStatPower(connection, player1DeckId, statType);
    const p2StatPower = await calculateDeckStatPower(connection, player2DeckId, statType);

    // Calculate advantage for this game
    const advantage = calculateStrategyAdvantage(p1Strategy, p2Strategy, strategyType);
    const randomFactor = 0.85 + Math.random() * 0.3; // 85%-115%

    // Add momentum bonus if ahead
    const p1MomentumBonus = p1TotalScore > p2TotalScore ? 1.05 : 1.0;
    const p2MomentumBonus = p2TotalScore > p1TotalScore ? 1.05 : 1.0;

    // Use stat-specific power instead of overall power
    const p1GamePower = p1StatPower * advantage * randomFactor * p1MomentumBonus;
    const p2GamePower = p2StatPower * (1 / advantage) * randomFactor * p2MomentumBonus;

    const gameWinner = p1GamePower > p2GamePower ? 1 : 2;

    // Winner gets 1 point
    if (gameWinner === 1) {
      p1TotalScore += 1;
    } else {
      p2TotalScore += 1;
    }

    phases.push({
      phase: strategyType,
      name: `${gameNum}게임 - ${strategyName}`,
      winner: gameWinner,
      score: { player1: p1TotalScore, player2: p2TotalScore },
      advantage: gameWinner === 1 ? 'player1' : 'player2',
      strategyWon: advantage !== 1.0,
      gameNumber: gameNum,
    });
  }

  return {
    phases,
    finalScore: { player1: p1TotalScore, player2: p2TotalScore },
    winnerId: p1TotalScore > p2TotalScore ? 1 : 2,
  };
}

// Find match
router.post('/find', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;

    // Get user's active deck
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'No active deck found' });
    }

    const userDeckId = decks[0].id;

    // Find opponent with similar rating
    const [users]: any = await connection.query(
      'SELECT rating FROM users WHERE id = ?',
      [userId]
    );

    const userRating = users[0].rating;

    const [opponents]: any = await connection.query(`
      SELECT u.id, u.username, u.tier, u.rating, d.id as deck_id
      FROM users u
      JOIN decks d ON u.id = d.user_id AND d.is_active = TRUE
      WHERE u.id != ?
      AND u.rating BETWEEN ? AND ?
      ORDER BY RAND()
      LIMIT 1
    `, [userId, userRating - 200, userRating + 200]);

    let opponent;
    let opponentDeckId;

    if (opponents.length === 0) {
      // Create AI opponent
      opponent = {
        id: 0,
        username: 'AI Opponent',
        tier: 'SILVER',
        rating: userRating,
      };

      // Use random deck (simulate)
      opponentDeckId = userDeckId; // For demo purposes
    } else {
      opponent = opponents[0];
      opponentDeckId = opponent.deck_id;
    }

    // Simulate match with detailed phases
    const matchSimulation = await simulateMatch(connection, userDeckId, opponentDeckId);

    const winnerId = matchSimulation.winnerId === 1 ? userId : opponent.id;
    const player1Score = matchSimulation.finalScore.player1;
    const player2Score = matchSimulation.finalScore.player2;

    // Create match record
    if (opponent.id !== 0) {
      const [matchResult]: any = await connection.query(`
        INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW())
      `, [userId, opponent.id, userDeckId, opponentDeckId, winnerId, player1Score, player2Score]);

      const matchId = matchResult.insertId;

      // Update match history
      const won = winnerId === userId;
      let pointsChange = won ? 20 : 0;
      const ratingChange = won ? 25 : -15;

      // Get current win streak for bonus calculation
      let winStreak = 0;
      let streakBonus = 0;

      if (won) {
        // Get or create ladder stats
        let [ladderStats]: any = await connection.query(
          'SELECT * FROM user_ladder_stats WHERE user_id = ?',
          [userId]
        );

        if (ladderStats.length === 0) {
          await connection.query(
            'INSERT INTO user_ladder_stats (user_id, current_win_streak) VALUES (?, 1)',
            [userId]
          );
          winStreak = 1;
        } else {
          winStreak = ladderStats[0].current_win_streak + 1;

          // Calculate streak bonus
          if (winStreak >= 5) streakBonus = 50;
          else if (winStreak >= 3) streakBonus = 20;
          else if (winStreak >= 2) streakBonus = 10;

          // Update ladder stats
          await connection.query(`
            UPDATE user_ladder_stats
            SET current_win_streak = ?,
                best_win_streak = GREATEST(best_win_streak, ?),
                total_streak_bonus = total_streak_bonus + ?,
                last_match_at = NOW()
            WHERE user_id = ?
          `, [winStreak, winStreak, streakBonus, userId]);
        }

        pointsChange += streakBonus;
      } else {
        // Reset win streak on loss
        await connection.query(
          `INSERT INTO user_ladder_stats (user_id, current_win_streak, last_match_at)
           VALUES (?, 0, NOW())
           ON DUPLICATE KEY UPDATE current_win_streak = 0, last_match_at = NOW()`,
          [userId]
        );
      }

      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, matchId, won ? 'WIN' : 'LOSE', pointsChange, ratingChange]);

      // Update user points and rating
      await connection.query(
        'UPDATE users SET points = points + ?, rating = rating + ? WHERE id = ?',
        [pointsChange, ratingChange, userId]
      );

      // Update stats
      await connection.query(`
        UPDATE user_stats
        SET
          total_matches = total_matches + 1,
          wins = wins + ?,
          losses = losses + ?,
          current_streak = ?,
          longest_win_streak = GREATEST(longest_win_streak, ?)
        WHERE user_id = ?
      `, [won ? 1 : 0, won ? 0 : 1, won ? winStreak : 0, won ? winStreak : 0, userId]);
    }

    await connection.commit();

    const won = winnerId === userId;

    // Get final streak info
    let finalWinStreak = 0;
    let finalStreakBonus = 0;
    if (opponent.id !== 0 && won) {
      const [ladderStats]: any = await connection.query(
        'SELECT current_win_streak FROM user_ladder_stats WHERE user_id = ?',
        [userId]
      );
      if (ladderStats.length > 0) {
        finalWinStreak = ladderStats[0].current_win_streak;
        if (finalWinStreak >= 5) finalStreakBonus = 50;
        else if (finalWinStreak >= 3) finalStreakBonus = 20;
        else if (finalWinStreak >= 2) finalStreakBonus = 10;
      }
    }

    res.json({
      success: true,
      data: {
        opponent,
        won,
        myScore: player1Score,
        opponentScore: player2Score,
        pointsChange: opponent.id === 0 ? (won ? 100 : 50) : (won ? 20 + finalStreakBonus : 0),
        ratingChange: won ? 25 : -15,
        phases: matchSimulation.phases,
        winStreak: finalWinStreak,
        streakBonus: finalStreakBonus,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Find match error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get match history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [history]: any = await pool.query(`
      SELECT
        mh.id,
        mh.result,
        mh.points_change,
        mh.rating_change,
        mh.created_at,
        m.player1_id,
        m.player2_id,
        u.username as opponent_username
      FROM match_history mh
      JOIN matches m ON mh.match_id = m.id
      JOIN users u ON u.id = IF(m.player1_id = ?, m.player2_id, m.player1_id)
      WHERE mh.user_id = ?
      ORDER BY mh.created_at DESC
      LIMIT 20
    `, [userId, userId]);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Get match history error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Export simulateMatch for use in socket matchmaking
export { simulateMatch };

export default router;
