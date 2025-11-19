import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { normalizeTeamName } from '../utils/teamUtils';
import { calculateDeckPowerWithCoachBuffs } from '../utils/coachBuffs';
import { updateGuildMissionProgress } from '../utils/guildMissionTracker';

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

// Calculate deck power (with coach buffs)
async function calculateDeckPower(connection: any, deckId: number, userId?: number): Promise<number> {
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
  let coachBonus = 0;
  const teams: any = {};
  const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const deckPositions: any = {
    [deckData.top_card_id]: 'TOP',
    [deckData.jungle_card_id]: 'JUNGLE',
    [deckData.mid_card_id]: 'MID',
    [deckData.adc_card_id]: 'ADC',
    [deckData.support_card_id]: 'SUPPORT',
  };

  // Calculate enhancement bonus (대폭 하향)
  const calculateEnhancementBonus = (level: number, overall: number): number => {
    // 강화 레벨에 따른 보너스 (오버롤, 스탯 전부 동일 적용)
    if (level <= 0) return 0;
    if (level <= 4) return level; // 1~4강: +1씩
    if (level <= 7) return 4 + (level - 4) * 2; // 5~7강: +2씩
    return 10 + (level - 7) * 5; // 8~10강: +5씩
  };

  // Apply coach buffs if userId is provided
  if (userId) {
    const { coachBonus: calculatedCoachBonus } = await calculateDeckPowerWithCoachBuffs(userId, cards);
    coachBonus = calculatedCoachBonus;
  }

  cards.forEach((card: any) => {
    const enhancementBonus = calculateEnhancementBonus(card.level, card.overall);
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

    // Normalize team names for synergy calculation (SKT and T1 are same team)
    const synergyTeam = normalizeTeamName(card.team);
    teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
  });

  totalPower += coachBonus;

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

  // 2019 G2 GOLDEN ROAD CLOSE: 5명 모두 19G2 선수 (+3 판단력, +3 오브젝트, +3 딜량)
  // This is equivalent to +3 OVR for overall power calculation
  const g2Players = ['Wunder', 'Jankos', 'Caps', 'Perkz', 'Mikyx'];
  const hasG2Synergy = g2Players.every(name => {
    const playerDetail = playerDetails.find((p: any) => p.name === name);
    return playerDetail && playerDetail.season === '19G2';
  });
  if (hasG2Synergy) {
    synergyBonus += 3;
  }

  totalPower += synergyBonus;

  return totalPower;
}

// Calculate deck power for specific stat (laning, teamfight, macro, mental)
async function calculateDeckStatPower(
  connection: any,
  deckId: number,
  stat: 'laning' | 'teamfight' | 'macro' | 'mental',
  currentScore?: { player1: number; player2: number },
  strategyType?: string
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
    SELECT uc.level, p.${stat} as stat_value, p.overall, p.name, p.season,
           p.trait1, p.trait1_effect, p.trait2, p.trait2_effect, p.trait3, p.trait3_effect
    FROM user_cards uc
    JOIN players p ON uc.player_id = p.id
    WHERE uc.id IN (?)
  `, [cardIds]);

  let totalPower = 0;
  let traitBonus = 0;

  cards.forEach((card: any) => {
    // Combine stat with overall and level
    const statContribution = (card.stat_value || 50) * 0.7; // 70% from specific stat
    const overallContribution = card.overall * 0.3; // 30% from overall
    let cardPower = statContribution + overallContribution + card.level;

    // Apply trait effects for 19G2 players
    if (card.season === '19G2') {
      // Parse and apply trait1_effect
      if (card.trait1_effect) {
        try {
          const effect = JSON.parse(card.trait1_effect);

          // 무지성 돌격: +3 when leading 2-0, -5 penalty if not
          if (effect.type === 'conditional' && currentScore) {
            if (currentScore.player1 === 2 && currentScore.player2 === 0) {
              traitBonus += effect.buff || 0;
            } else {
              traitBonus += effect.debuff || 0;
            }
          }

          // 획기적인 운영: +1 buff, +5 macro on SPLIT strategy
          if (effect.type === 'strategy' && strategyType) {
            if (strategyType === effect.strategy) {
              traitBonus += effect.buff || 0;
              if (stat === 'macro') {
                traitBonus += effect.macro_bonus || 0;
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse trait1_effect:', e);
        }
      }

      // Parse and apply trait2_effect
      if (card.trait2_effect) {
        try {
          const effect = JSON.parse(card.trait2_effect);

          // 새가슴: -3 when tied 2-2
          if (effect.type === 'mental_debuff' && currentScore) {
            if (currentScore.player1 === 2 && currentScore.player2 === 2) {
              traitBonus += effect.debuff || 0;
            }
          }
        } catch (e) {
          console.error('Failed to parse trait2_effect:', e);
        }
      }
    }

    totalPower += cardPower;
  });

  // 2019 G2 GOLDEN ROAD CLOSE 시너지: 5명 모두 19G2 선수
  // +3 판단력(mental), +3 오브젝트(macro), +3 딜량(teamfight)
  const g2Players = ['Wunder', 'Jankos', 'Caps', 'Perkz', 'Mikyx'];
  const names = cards.map((c: any) => c.name);
  const hasG2Synergy = g2Players.every(name => {
    const card = cards.find((c: any) => c.name === name);
    return card && card.season === '19G2';
  });

  if (hasG2Synergy) {
    // 각 스탯별로 +3 보너스 적용
    if (stat === 'mental') {
      traitBonus += 3; // 판단력 +3
    } else if (stat === 'macro') {
      traitBonus += 3; // 오브젝트 +3
    } else if (stat === 'teamfight') {
      traitBonus += 3; // 딜량(한타) +3
    }
  }

  totalPower += traitBonus;

  return totalPower;
}

// Simulate match with detailed phases
async function simulateMatch(
  connection: any,
  player1DeckId: number,
  player2DeckId: number,
  player1UserId?: number,
  player2UserId?: number
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

  // Calculate base powers (with coach buffs)
  const p1Power = await calculateDeckPower(connection, player1DeckId, player1UserId);
  const p2Power = await calculateDeckPower(connection, player2DeckId, player2UserId);

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

    // Calculate stat-specific power for this phase with current score and strategy
    const currentScore = { player1: p1TotalScore, player2: p2TotalScore };
    const p1StatPower = await calculateDeckStatPower(
      connection,
      player1DeckId,
      statType,
      currentScore,
      p1Strategy
    );
    const p2StatPower = await calculateDeckStatPower(
      connection,
      player2DeckId,
      statType,
      { player1: p2TotalScore, player2: p1TotalScore }, // Reverse score for opponent perspective
      p2Strategy
    );

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

    // Simulate match with detailed phases (with coach buffs)
    const matchSimulation = await simulateMatch(connection, userDeckId, opponentDeckId, userId, opponent.id);

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

      // Get user's current rating for MMR bonus calculation
      const [currentUser]: any = await connection.query(
        'SELECT rating FROM users WHERE id = ?',
        [userId]
      );
      const userRating = currentUser[0]?.rating || 1000;

      // Base reward: 120P (3x increased from 40P)
      let pointsChange = won ? 120 : 0;

      // MMR-based bonus: +1P per 10 MMR above 1000
      // Examples: 1500 MMR = +50P, 2000 MMR = +100P, 2500 MMR = +150P
      let mmrBonus = 0;
      if (won && userRating > 1000) {
        mmrBonus = Math.floor((userRating - 1000) / 10);
        pointsChange += mmrBonus;
      }

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

          // Calculate streak bonus (3x increased)
          if (winStreak >= 5) streakBonus = 300;
          else if (winStreak >= 3) streakBonus = 120;
          else if (winStreak >= 2) streakBonus = 60;

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
        if (finalWinStreak >= 5) finalStreakBonus = 300;
        else if (finalWinStreak >= 3) finalStreakBonus = 120;
        else if (finalWinStreak >= 2) finalStreakBonus = 60;
      }
    }

    // Update guild missions (실시간 반영)
    try {
      // 경기 참여
      await updateGuildMissionProgress(userId, 'MATCH', 1);

      // 승리 시
      if (won) {
        await updateGuildMissionProgress(userId, 'WIN', 1);

        // 3:0 승리 (퍼펙트)
        if (player1Score === 3 && player2Score === 0) {
          await updateGuildMissionProgress(userId, 'PERFECT', 1);
        }

        // 0:2 → 3:2 역전승 (컴백)
        if (player1Score === 3 && player2Score === 2 && matchSimulation.phases[0].winner === 2 && matchSimulation.phases[1].winner === 2) {
          await updateGuildMissionProgress(userId, 'COMEBACK', 1);
        }

        // 연승
        if (finalWinStreak >= 3) {
          await updateGuildMissionProgress(userId, 'STREAK', 1);
        }
      }
    } catch (error) {
      console.error('Failed to update guild missions:', error);
      // 길드 미션 업데이트 실패는 무시 (경기 결과에 영향 없음)
    }

    res.json({
      success: true,
      data: {
        opponent,
        won,
        myScore: player1Score,
        opponentScore: player2Score,
        pointsChange: opponent.id === 0 ? (won ? 200 : 100) : (won ? 40 + finalStreakBonus : 0),
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
