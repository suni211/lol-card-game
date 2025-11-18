import { normalizeTeamName } from '../utils/teamUtils';
import { Server, Socket } from 'socket.io';
import pool from '../config/database';
import { updateEventProgress } from '../utils/eventTracker';
import { addExperience, calculateExpReward } from '../utils/levelTracker';
import { checkAndAwardMatchBonuses, applyHappyHourMultiplier } from '../utils/matchBonuses';
import { awardReferralMatchBonus } from '../utils/referralBonuses';

// 전략 타입 정의
type Strategy = 'AGGRESSIVE' | 'TEAMFIGHT' | 'DEFENSIVE';

// 전략 상성표
const STRATEGY_COUNTERS: Record<Strategy, { beats: Strategy; losesTo: Strategy }> = {
  AGGRESSIVE: { beats: 'TEAMFIGHT', losesTo: 'DEFENSIVE' },
  TEAMFIGHT: { beats: 'DEFENSIVE', losesTo: 'AGGRESSIVE' },
  DEFENSIVE: { beats: 'AGGRESSIVE', losesTo: 'TEAMFIGHT' },
};

// 전략별 사용 스탯 (8개 세부 스탯 기반)
const STRATEGY_STATS: Record<Strategy, string[]> = {
  AGGRESSIVE: ['cs_ability', 'lane_pressure', 'damage_dealing'],
  TEAMFIGHT: ['damage_dealing', 'survivability', 'decision_making'],
  DEFENSIVE: ['objective_control', 'vision_control', 'consistency'],
};

// 포지션별 스탯 가중치 (실제 경기처럼 포지션 특성 반영)
const POSITION_WEIGHTS: Record<string, Record<string, number>> = {
  TOP: {
    cs_ability: 1.0,
    lane_pressure: 1.0,
    damage_dealing: 1.0,
    survivability: 1.0,
    objective_control: 1.0,
    vision_control: 1.0,
    decision_making: 1.0,
    consistency: 1.0,
  },
  JUNGLE: {
    cs_ability: 0.3,
    lane_pressure: 0.2,
    damage_dealing: 0.8,
    survivability: 1.2,
    objective_control: 1.5,
    vision_control: 1.3,
    decision_making: 1.2,
    consistency: 1.0,
  },
  MID: {
    cs_ability: 1.0,
    lane_pressure: 1.0,
    damage_dealing: 1.0,
    survivability: 1.0,
    objective_control: 1.0,
    vision_control: 1.0,
    decision_making: 1.0,
    consistency: 1.0,
  },
  ADC: {
    cs_ability: 1.0,
    lane_pressure: 1.0,
    damage_dealing: 1.0,
    survivability: 1.0,
    objective_control: 1.0,
    vision_control: 1.0,
    decision_making: 1.0,
    consistency: 1.0,
  },
  SUPPORT: {
    cs_ability: 0.1,
    lane_pressure: 0.3,
    damage_dealing: 0.5,
    survivability: 1.0,
    objective_control: 0.9,
    vision_control: 1.5,
    decision_making: 1.3,
    consistency: 1.3,
  },
};

interface ActiveMatch {
  matchId: string;
  player1: {
    socketId: string;
    userId: number;
    username: string;
    deckId: number;
    score: number;
    ready: boolean;
    strategy?: Strategy;
  };
  player2: {
    socketId: string;
    userId: number;
    username: string;
    deckId: number;
    score: number;
    ready: boolean;
    strategy?: Strategy;
  };
  player1Deck?: any; // Deck data for player1
  player2Deck?: any; // Deck data for player2 (can be AI deck)
  currentRound: number;
  roundStartTime?: number;
  roundTimer?: NodeJS.Timeout;
  isPractice: boolean;
}

export const activeMatches = new Map<string, ActiveMatch>();
const ROUND_TIME_LIMIT = 10000; // 10 seconds

// Calculate power from deck object directly (for AI decks)
function calculateDeckObjectPower(
  deckObj: any,
  stats: string[]
): number {
  const positions = ['top', 'jungle', 'mid', 'adc', 'support'];
  const teamMapping: any = {
    'NJS': 'BRO',
    'AZF': 'CJ',
    'MVP': 'GEN',
    'SKT': 'T1',
  };

  const teams: any = {};
  let totalPower = 0;

  positions.forEach((pos) => {
    const card = deckObj[pos];
    if (!card) return;

    // Calculate level bonus
    const level = card.level || 0;
    let levelBonus = 0;
    if (level <= 4) {
      levelBonus = level; // 1~4강: +1씩
    } else if (level <= 7) {
      levelBonus = 4 + (level - 4) * 2; // 5~7강: +2씩
    } else {
      levelBonus = 10 + (level - 7) * 5; // 8~10강: +5씩
    }

    // 포지션별 가중치 적용한 스탯 평균 계산
    const position = pos.toUpperCase();
    const positionWeights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.MID;

    let weightedStatSum = 0;
    let totalWeight = 0;

    stats.forEach((statName) => {
      // 세부 스탯에도 강화 보너스 적용
      const baseStat = card[statName] || 50;
      const statValue = baseStat + levelBonus;
      const weight = positionWeights[statName] || 1.0;
      weightedStatSum += statValue * weight;
      totalWeight += weight;
    });

    const avgStat = totalWeight > 0 ? weightedStatSum / totalWeight : 50;

    // Overall 50%, weighted stat 40%
    const cardPower = (card.overall + levelBonus) * 0.5 + avgStat * 0.4;
    totalPower += cardPower;

    // Track teams for synergy
    const normalizedTeam = normalizeTeamName(card.team);
    teams[normalizedTeam] = (teams[normalizedTeam] || 0) + 1;
  });

  // Team synergy bonus
  for (const team in teams) {
    const count = teams[team];
    if (count >= 5) totalPower *= 1.20; // 5명: +20%
    else if (count >= 3) totalPower *= 1.10; // 3명: +10%
    else if (count >= 2) totalPower *= 1.05; // 2명: +5%
  }

  return Math.round(totalPower);
}

// 덱의 특정 스탯 파워 계산 (시너지 및 특성 포함)
async function calculateDeckStatPower(
  deckId: number,
  stats: string[]
): Promise<number> {
  const connection = await pool.getConnection();

  try {
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

    // 8개 세부 스탯 모두 조회
    const [cards]: any = await connection.query(`
      SELECT
        uc.level,
        p.overall,
        p.team,
        p.position,
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
      WHERE uc.id IN (?)
    `, [cardIds]);

    // 팀 시너지 계산
    const teams: any = {};
    const teamMapping: any = {
      'NJS': 'BRO',
      'AZF': 'CJ',
      'MVP': 'GEN',
      'SKT': 'T1',
    };

    let totalPower = 0;
    cards.forEach((card: any, index: number) => {
      // 강화 등급별 오버롤 보너스 계산
      let levelBonus = 0;
      if (card.level <= 4) {
        levelBonus = card.level; // 1~4강: +1씩
      } else if (card.level <= 7) {
        levelBonus = 4 + (card.level - 4) * 2; // 5~7강: +2씩 (4 + 2,4,6)
      } else {
        levelBonus = 10 + (card.level - 7) * 4; // 8~10강: +4씩 (10 + 4,8,12)
      }

      // 포지션별 가중치 적용한 스탯 평균 계산
      const positionWeights = POSITION_WEIGHTS[card.position] || POSITION_WEIGHTS.MID;

      let weightedStatSum = 0;
      let totalWeight = 0;

      stats.forEach((statName) => {
        // 세부 스탯에도 강화 보너스 적용
        const baseStat = card[statName] || 50;
        const statValue = baseStat + levelBonus;
        const weight = positionWeights[statName] || 1.0;
        weightedStatSum += statValue * weight;
        totalWeight += weight;
      });

      const avgStat = totalWeight > 0 ? weightedStatSum / totalWeight : 50;

      // Overall 50% (기본 오버롤 + 강화 보너스), weighted stat 40%
      const statContribution = avgStat * 0.4;
      const overallContribution = (card.overall + levelBonus) * 0.5;
      totalPower += statContribution + overallContribution;

      // 팀 시너지 카운팅
      const synergyTeam = normalizeTeamName(card.team);
      teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
    });

    // 팀 시너지 보너스: 3명 = +30, 4명 = +80, 5명 = +150
    let synergyBonus = 0;
    Object.values(teams).forEach((count: any) => {
      if (count === 3) synergyBonus += 30;
      if (count === 4) synergyBonus += 80;
      if (count === 5) synergyBonus += 150;
    });

    totalPower += synergyBonus;

    // 특성 보너스 (세부 스탯 관련 특성에 따라 추가 보너스)
    // TODO: 나중에 8개 세부 스탯에 맞는 특성으로 확장 가능
    const [traits]: any = await connection.query(`
      SELECT pt.name, pt.effect
      FROM player_traits pt
      JOIN user_cards uc ON pt.player_id = uc.player_id
      WHERE uc.id IN (?)
    `, [cardIds]);

    // 간단한 특성 매핑 (기본 보너스)
    traits.forEach((trait: any) => {
      // 모든 특성에 기본 보너스 제공
      totalPower += 30;
    });

    return totalPower;
  } finally {
    connection.release();
  }
}

// 라운드 결과 계산
async function calculateRoundResult(
  match: ActiveMatch
): Promise<{ winner: 1 | 2; player1Power: number; player2Power: number }> {
  const p1Strategy = match.player1.strategy!;
  const p2Strategy = match.player2.strategy!;

  // 사용할 스탯 결정
  const p1Stat = STRATEGY_STATS[p1Strategy];
  const p2Stat = STRATEGY_STATS[p2Strategy];

  // 덱 파워 계산
  // Check if using deck objects (AI match) or deck IDs (normal match)
  let p1BasePower, p2BasePower;

  if (match.player1Deck && match.player1.deckId === -1) {
    // AI match - use deck object
    p1BasePower = calculateDeckObjectPower(match.player1Deck, p1Stat);
  } else {
    // Normal match - use deck ID
    p1BasePower = await calculateDeckStatPower(match.player1.deckId, p1Stat);
  }

  if (match.player2Deck && match.player2.deckId === -1) {
    // AI match - use deck object
    p2BasePower = calculateDeckObjectPower(match.player2Deck, p2Stat);
  } else {
    // Normal match - use deck ID
    p2BasePower = await calculateDeckStatPower(match.player2.deckId, p2Stat);
  }

  // 전략 상성 보너스 (약하게 조정: ±5%)
  let p1Bonus = 1.0;
  let p2Bonus = 1.0;

  if (STRATEGY_COUNTERS[p1Strategy].beats === p2Strategy) {
    p1Bonus = 1.05; // +5% advantage
  } else if (STRATEGY_COUNTERS[p1Strategy].losesTo === p2Strategy) {
    p1Bonus = 0.95; // -5% disadvantage
  }

  if (STRATEGY_COUNTERS[p2Strategy].beats === p1Strategy) {
    p2Bonus = 1.05;
  } else if (STRATEGY_COUNTERS[p2Strategy].losesTo === p1Strategy) {
    p2Bonus = 0.95;
  }

  // 랜덤 요소 (±5%)
  const p1Random = 0.95 + Math.random() * 0.1;
  const p2Random = 0.95 + Math.random() * 0.1;

  // 최종 파워 계산
  const p1FinalPower = p1BasePower * p1Bonus * p1Random;
  const p2FinalPower = p2BasePower * p2Bonus * p2Random;

  return {
    winner: p1FinalPower > p2FinalPower ? 1 : 2,
    player1Power: Math.round(p1FinalPower),
    player2Power: Math.round(p2FinalPower),
  };
}

// 라운드 시작
function startRound(matchId: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.player1.ready = false;
  match.player2.ready = false;
  match.player1.strategy = undefined;
  match.player2.strategy = undefined;
  match.roundStartTime = Date.now();

  // Check if player2 is AI
  const isPlayer2AI = match.player2.socketId.startsWith('ai_');

  // 양 플레이어에게 라운드 시작 알림 (AI는 제외)
  io.to(match.player1.socketId).emit('roundStart', {
    round: match.currentRound,
    timeLimit: ROUND_TIME_LIMIT,
  });

  if (!isPlayer2AI) {
    io.to(match.player2.socketId).emit('roundStart', {
      round: match.currentRound,
      timeLimit: ROUND_TIME_LIMIT,
    });
  } else {
    // AI는 즉시 랜덤 전략 선택
    const strategies: Strategy[] = ['AGGRESSIVE', 'TEAMFIGHT', 'DEFENSIVE'];
    match.player2.strategy = strategies[Math.floor(Math.random() * strategies.length)];
    match.player2.ready = true;
    console.log(`AI selected strategy: ${match.player2.strategy}`);
  }

  // 타임아웃 설정 (10초)
  match.roundTimer = setTimeout(() => {
    processRoundTimeout(matchId, io);
  }, ROUND_TIME_LIMIT);
}

// 타임아웃 처리 (전략 선택 안한 플레이어는 랜덤)
async function processRoundTimeout(matchId: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) return;

  const strategies: Strategy[] = ['AGGRESSIVE', 'TEAMFIGHT', 'DEFENSIVE'];

  // 선택 안한 플레이어는 랜덤 전략
  if (!match.player1.strategy) {
    match.player1.strategy = strategies[Math.floor(Math.random() * strategies.length)];
  }
  if (!match.player2.strategy) {
    match.player2.strategy = strategies[Math.floor(Math.random() * strategies.length)];
  }

  // 라운드 결과 처리
  await processRound(matchId, io);
}

// 이벤트 메시지 생성 함수
function generateMatchEvent(
  stage: number,
  match: ActiveMatch,
  player1Deck: any,
  player2Deck: any
): string {
  const positions = ['top', 'jungle', 'mid', 'adc', 'support'];
  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  const player1Card = player1Deck?.[randomPos];
  const player2Card = player2Deck?.[randomPos];

  const events = [
    // Stage 0 (0초): 라운드 시작
    [
      `경기가 시작되었습니다!`,
      `양 팀 선수들이 소환사의 협곡에 입장했습니다`,
      `초반 라인전이 시작됩니다`,
    ],
    // Stage 1 (5초): 초반
    [
      player1Card ? `${player1Card.name}이(가) 초반 라인전에서 우위를 점하고 있습니다` : `양 팀 모두 안정적으로 CS를 챙기고 있습니다`,
      `정글러들이 갱킹 루트를 그리며 움직입니다`,
      `미드 라인에서 치열한 견제가 오가고 있습니다`,
    ],
    // Stage 2 (10초): 중반 1
    [
      `첫 번째 드래곤 싸움이 시작되었습니다!`,
      player2Card ? `${player2Card.name}의 로밍으로 게임 템포가 빨라집니다` : `양 팀 모두 오브젝트를 노리고 있습니다`,
      `한타가 벌어질 조짐이 보입니다`,
    ],
    // Stage 3 (15초): 중반 2
    [
      `팀파이트가 시작되었습니다!`,
      `양 팀 모두 스킬을 쏟아붓고 있습니다`,
      `누가 이 한타를 가져갈 것인가?!`,
    ],
    // Stage 4 (20초): 후반 1
    [
      `결정적인 순간입니다!`,
      player1Card && player2Card ? `${player1Card.name}과(와) ${player2Card.name}의 대결!` : `양 팀 모두 승리를 위해 최선을 다하고 있습니다`,
      `바론을 향한 치열한 경쟁이 펼쳐집니다`,
    ],
    // Stage 5 (25초): 후반 2
    [
      `승부의 갈림길에 섰습니다!`,
      `한 팀의 넥서스가 위험합니다`,
      `마지막 한타가 시작됩니다!`,
    ],
  ];

  const stageEvents = events[stage] || events[0];
  return stageEvents[Math.floor(Math.random() * stageEvents.length)];
}

// 라운드 결과 처리 (30초 이벤트 포함)
async function processRound(matchId: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) {
    console.log('❌ processRound: Match not found:', matchId);
    return;
  }

  console.log(`🎮 processRound: Starting for match ${matchId}, round ${match.currentRound}`);

  // 타이머 정리
  if (match.roundTimer) {
    clearTimeout(match.roundTimer);
    match.roundTimer = undefined;
  }

  // Check if player2 is AI
  const isPlayer2AI = match.player2.socketId.startsWith('ai_');

  // 30초 이벤트 진행
  const eventStages = [0, 5000, 10000, 15000, 20000, 25000]; // 0, 5, 10, 15, 20, 25초

  for (let i = 0; i < eventStages.length; i++) {
    ((stage) => {
      setTimeout(() => {
        const currentMatch = activeMatches.get(matchId);
        if (!currentMatch) {
          console.log(`❌ Match ${matchId} no longer exists for event stage ${stage}`);
          return;
        }

        const eventMessage = generateMatchEvent(stage, currentMatch, currentMatch.player1Deck, currentMatch.player2Deck);
        console.log(`📢 Sending event stage ${stage} (${eventStages[stage] / 1000}s): ${eventMessage}`);
        console.log(`   └─ To socketId: ${currentMatch.player1.socketId}`);

        // Player 1에게 이벤트 전송
        const emitted = io.to(currentMatch.player1.socketId).emit('matchEvent', {
          round: currentMatch.currentRound,
          stage: stage,
          time: eventStages[stage] / 1000,
          message: eventMessage,
        });
        console.log(`   └─ Emitted result:`, emitted ? 'success' : 'failed');

        // Player 2에게 이벤트 전송 (AI가 아닐 때만)
        if (!isPlayer2AI) {
          console.log(`   └─ Also sending to Player 2: ${currentMatch.player2.socketId}`);
          io.to(currentMatch.player2.socketId).emit('matchEvent', {
            round: currentMatch.currentRound,
            stage: stage,
            time: eventStages[stage] / 1000,
            message: eventMessage,
          });
        }
      }, eventStages[stage]);
    })(i);
  }

  // 30초 후 결과 계산 및 전송
  setTimeout(async () => {
    // 결과 계산
    const result = await calculateRoundResult(match);

    // 점수 업데이트
    if (result.winner === 1) {
      match.player1.score++;
    } else {
      match.player2.score++;
    }

    // 라운드 결과 전송 (각 플레이어 관점으로)
    // Player 1 관점
    io.to(match.player1.socketId).emit('roundResult', {
      round: match.currentRound,
      player1Strategy: match.player1.strategy,
      player2Strategy: match.player2.strategy,
      player1Power: result.player1Power,
      player2Power: result.player2Power,
      winner: result.winner,
      currentScore: {
        player1: match.player1.score,
        player2: match.player2.score,
      },
    });

    // Player 2 관점 (winner를 반대로) - AI가 아닐 때만
    if (!isPlayer2AI) {
      io.to(match.player2.socketId).emit('roundResult', {
        round: match.currentRound,
        player1Strategy: match.player2.strategy,
        player2Strategy: match.player1.strategy,
        player1Power: result.player2Power,
        player2Power: result.player1Power,
        winner: result.winner === 1 ? 2 : 1,
        currentScore: {
          player1: match.player2.score,
          player2: match.player1.score,
        },
      });
    }

    // 매치 종료 확인 (3승)
    if (match.player1.score >= 3 || match.player2.score >= 3) {
      await endMatch(matchId, io);
    } else {
      // 다음 라운드 시작
      match.currentRound++;
      setTimeout(() => startRound(matchId, io), 3000); // 3초 후 다음 라운드
    }
  }, 30000); // 30초 후
}

// MMR 기반 레이팅 변화 계산
function calculateRatingChange(winnerRating: number, loserRating: number, isWinner: boolean): number {
  const K = 32; // K-factor (변화량 계수)
  const ratingDiff = loserRating - winnerRating;

  // Expected score 계산 (ELO 공식)
  const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));

  // 실제 결과 (승리 = 1, 패배 = 0)
  const actualScore = isWinner ? 1 : 0;

  // 레이팅 변화 = K * (실제 - 예상)
  const change = Math.round(K * (actualScore - expectedScore));

  return change;
}

// 매치 종료 및 결과 저장
async function endMatch(matchId: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) return;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const winnerId = match.player1.score > match.player2.score ? match.player1.userId : match.player2.userId;
    const player1Won = winnerId === match.player1.userId;

    // Check if player2 is AI
    const isPlayer2AI = match.player2.socketId.startsWith('ai_');

    // 현재 레이팅 조회
    const [player1Data]: any = await connection.query('SELECT rating FROM users WHERE id = ?', [match.player1.userId]);

    let player1Rating = player1Data[0]?.rating || 1500;
    let player2Rating = 1500;

    if (!isPlayer2AI) {
      const [player2Data]: any = await connection.query('SELECT rating FROM users WHERE id = ?', [match.player2.userId]);
      player2Rating = player2Data[0]?.rating || 1500;
    }

    // MMR 기반 레이팅 변화 계산
    let player1RatingChange = 0;
    let player2RatingChange = 0;

    if (!match.isPractice) {
      if (player1Won) {
        player1RatingChange = calculateRatingChange(player1Rating, player2Rating, true);
        player2RatingChange = calculateRatingChange(player2Rating, player1Rating, false);
      } else {
        player1RatingChange = calculateRatingChange(player1Rating, player2Rating, false);
        player2RatingChange = calculateRatingChange(player2Rating, player1Rating, true);
      }
    }

    // Practice vs Ranked rewards
    let player1PointsChange = 0;
    let player2PointsChange = 0;

    if (match.isPractice) {
      // 일반전: 승리 300, 패배 100
      player1PointsChange = player1Won ? 300 : 100;
      player2PointsChange = player1Won ? 100 : 300;
    } else {
      // 랭크전: 승리 500, 패배 300
      player1PointsChange = player1Won ? 500 : 300;
      player2PointsChange = player1Won ? 300 : 500;
    }

    // 해피아워 적용 (오후 7시 ~ 8시)
    player1PointsChange = applyHappyHourMultiplier(player1PointsChange);
    player2PointsChange = applyHappyHourMultiplier(player2PointsChange);

    // matches 테이블에 저장 (AI 매치는 player2_deck_id를 NULL로)
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at, match_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), ?)
    `, [match.player1.userId, match.player2.userId, match.player1.deckId, isPlayer2AI ? null : match.player2.deckId, winnerId, match.player1.score, match.player2.score, match.isPractice ? 'PRACTICE' : 'RANKED']);

    const dbMatchId = matchResult.insertId;

    // match_history 저장 - player1만 (AI는 제외)
    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, ?)
    `, [match.player1.userId, dbMatchId, player1Won ? 'WIN' : 'LOSE', player1PointsChange, player1RatingChange]);

    // AI가 아닐 때만 player2 기록 저장
    if (!isPlayer2AI) {
      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [match.player2.userId, dbMatchId, player1Won ? 'LOSE' : 'WIN', player2PointsChange, player2RatingChange]);
    }

    // 유저 포인트 업데이트 (player1만)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [player1PointsChange, match.player1.userId]
    );

    // AI가 아닐 때만 player2 포인트 업데이트
    if (!isPlayer2AI) {
      await connection.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [player2PointsChange, match.player2.userId]
      );
    }

    // 경쟁전만 레이팅 및 통계 업데이트
    if (!match.isPractice) {
      await connection.query(
        'UPDATE users SET rating = GREATEST(1000, rating + ?) WHERE id = ?',
        [player1RatingChange, match.player1.userId]
      );

      // AI가 아닐 때만 player2 레이팅 업데이트
      if (!isPlayer2AI) {
        await connection.query(
          'UPDATE users SET rating = GREATEST(1000, rating + ?) WHERE id = ?',
          [player2RatingChange, match.player2.userId]
        );
      }

      // 통계 업데이트 - player1만
      await connection.query(`
        UPDATE user_stats
        SET total_matches = total_matches + 1, wins = wins + ?, losses = losses + ?
        WHERE user_id = ?
      `, [player1Won ? 1 : 0, player1Won ? 0 : 1, match.player1.userId]);

      // AI가 아닐 때만 player2 통계 업데이트
      if (!isPlayer2AI) {
        await connection.query(`
          UPDATE user_stats
          SET total_matches = total_matches + 1, wins = wins + ?, losses = losses + ?
          WHERE user_id = ?
        `, [player1Won ? 0 : 1, player1Won ? 1 : 0, match.player2.userId]);
      }
    }

    await connection.commit();

    // 이벤트 진행도 업데이트 (비동기로 처리)
    if (match.isPractice) {
      // 일반전
      updateEventProgress(match.player1.userId, 'NORMAL_MATCH', 1).catch(err =>
        console.error('Event update error (player1):', err)
      );
      if (!isPlayer2AI) {
        updateEventProgress(match.player2.userId, 'NORMAL_MATCH', 1).catch(err =>
          console.error('Event update error (player2):', err)
        );
      }
    } else {
      // 랭킹전
      updateEventProgress(match.player1.userId, 'RANKED_MATCH', 1).catch(err =>
        console.error('Event update error (player1):', err)
      );
      if (!isPlayer2AI) {
        updateEventProgress(match.player2.userId, 'RANKED_MATCH', 1).catch(err =>
          console.error('Event update error (player2):', err)
        );
      }
    }

    // 경험치 추가 (비동기로 처리)
    const matchType = match.isPractice ? 'NORMAL' : 'RANKED';
    const player1Exp = calculateExpReward(matchType, player1Won);
    addExperience(match.player1.userId, player1Exp).catch(err =>
      console.error('Exp update error (player1):', err)
    );
    if (!isPlayer2AI) {
      const player2Exp = calculateExpReward(matchType, !player1Won);
      addExperience(match.player2.userId, player2Exp).catch(err =>
        console.error('Exp update error (player2):', err)
      );
    }

    // 추천인 보너스 지급 (비동기로 처리)
    awardReferralMatchBonus(match.player1.userId).catch(err =>
      console.error('Referral bonus error (player1):', err)
    );
    if (!isPlayer2AI) {
      awardReferralMatchBonus(match.player2.userId).catch(err =>
        console.error('Referral bonus error (player2):', err)
      );
    }

    // 매치 보너스 체크 (퍼펙트, 역전승, 연승)
    let player1Bonuses: any = { bonuses: [], totalBonus: 0 };
    let player2Bonuses: any = { bonuses: [], totalBonus: 0 };

    try {
      player1Bonuses = await checkAndAwardMatchBonuses(
        match.player1.userId,
        dbMatchId,
        match.player1.score,
        match.player2.score,
        true,
        player1Won
      );

      if (!isPlayer2AI) {
        player2Bonuses = await checkAndAwardMatchBonuses(
          match.player2.userId,
          dbMatchId,
          match.player1.score,
          match.player2.score,
          false,
          !player1Won
        );
      }
    } catch (err) {
      console.error('Match bonus error:', err);
    }

    // 최종 결과 전송
    io.to(match.player1.socketId).emit('matchComplete', {
      won: player1Won,
      myScore: match.player1.score,
      opponentScore: match.player2.score,
      opponent: { username: match.player2.username },
      pointsChange: player1PointsChange,
      ratingChange: player1RatingChange,
      bonuses: player1Bonuses.bonuses,
      totalBonus: player1Bonuses.totalBonus,
    });

    // AI가 아닐 때만 player2에게 결과 전송
    if (!isPlayer2AI) {
      io.to(match.player2.socketId).emit('matchComplete', {
        won: !player1Won,
        myScore: match.player2.score,
        opponentScore: match.player1.score,
        opponent: { username: match.player1.username },
        pointsChange: player2PointsChange,
        ratingChange: player2RatingChange,
        bonuses: player2Bonuses.bonuses,
        totalBonus: player2Bonuses.totalBonus,
      });
    }

    console.log(`Match ${matchId} completed. Winner: ${player1Won ? match.player1.username : match.player2.username} (${match.player1.score}-${match.player2.score})`);

  } catch (error) {
    await connection.rollback();
    console.error('End match error:', error);
  } finally {
    connection.release();
    activeMatches.delete(matchId);
  }
}

// 소켓 이벤트 핸들러 설정
export function setupRealtimeMatch(io: Server, socket: Socket, user: any) {
  // 전략 선택 이벤트
  socket.on('selectStrategy', async (data: { matchId: string; strategy: Strategy }) => {
    const match = activeMatches.get(data.matchId);
    if (!match) return;

    // 플레이어 식별 및 전략 저장
    if (socket.id === match.player1.socketId) {
      match.player1.strategy = data.strategy;
      match.player1.ready = true;
    } else if (socket.id === match.player2.socketId) {
      match.player2.strategy = data.strategy;
      match.player2.ready = true;
    }

    // Check if player2 is AI - if so, AI already selected strategy automatically
    const isPlayer2AI = match.player2.socketId.startsWith('ai_');

    // 둘 다 준비되면 라운드 처리 (AI는 이미 준비됨)
    if (match.player1.ready && match.player2.ready) {
      console.log('✅ Both players ready, starting processRound');

      // 기존 타임아웃 타이머 제거 (중요!)
      if (match.roundTimer) {
        clearTimeout(match.roundTimer);
        match.roundTimer = undefined;
        console.log('🔥 Cleared round timeout timer');
      }

      await processRound(data.matchId, io);
    }
  });

  // 매치 포기
  socket.on('forfeitMatch', async (data: { matchId: string }) => {
    const match = activeMatches.get(data.matchId);
    if (!match) return;

    // 포기한 플레이어 반대편을 승자로
    if (socket.id === match.player1.socketId) {
      match.player2.score = 3;
      match.player1.score = 0;
    } else if (socket.id === match.player2.socketId) {
      match.player1.score = 3;
      match.player2.score = 0;
    }

    await endMatch(data.matchId, io);
  });
}

// 덱 정보 가져오기
async function getDeckInfo(deckId: number) {
  const connection = await pool.getConnection();
  try {
    const [decks]: any = await connection.query(`
      SELECT d.*,
        top_p.id as top_player_id, top_p.name as top_name, top_p.team as top_team,
        top_p.position as top_position, top_p.overall as top_overall,
        CASE
          WHEN top_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN top_p.overall <= 80 THEN 'COMMON'
          WHEN top_p.overall <= 90 THEN 'RARE'
          WHEN top_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as top_tier,
        top_p.season as top_season,
        top_uc.level as top_level,
        jungle_p.id as jungle_player_id, jungle_p.name as jungle_name, jungle_p.team as jungle_team,
        jungle_p.position as jungle_position, jungle_p.overall as jungle_overall,
        CASE
          WHEN jungle_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN jungle_p.overall <= 80 THEN 'COMMON'
          WHEN jungle_p.overall <= 90 THEN 'RARE'
          WHEN jungle_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as jungle_tier,
        jungle_p.season as jungle_season,
        jungle_uc.level as jungle_level,
        mid_p.id as mid_player_id, mid_p.name as mid_name, mid_p.team as mid_team,
        mid_p.position as mid_position, mid_p.overall as mid_overall,
        CASE
          WHEN mid_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN mid_p.overall <= 80 THEN 'COMMON'
          WHEN mid_p.overall <= 90 THEN 'RARE'
          WHEN mid_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as mid_tier,
        mid_p.season as mid_season,
        mid_uc.level as mid_level,
        adc_p.id as adc_player_id, adc_p.name as adc_name, adc_p.team as adc_team,
        adc_p.position as adc_position, adc_p.overall as adc_overall,
        CASE
          WHEN adc_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN adc_p.overall <= 80 THEN 'COMMON'
          WHEN adc_p.overall <= 90 THEN 'RARE'
          WHEN adc_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as adc_tier,
        adc_p.season as adc_season,
        adc_uc.level as adc_level,
        support_p.id as support_player_id, support_p.name as support_name, support_p.team as support_team,
        support_p.position as support_position, support_p.overall as support_overall,
        CASE
          WHEN support_p.name LIKE 'ICON%' THEN 'ICON'
          WHEN support_p.overall <= 80 THEN 'COMMON'
          WHEN support_p.overall <= 90 THEN 'RARE'
          WHEN support_p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as support_tier,
        support_p.season as support_season,
        support_uc.level as support_level
      FROM decks d
      LEFT JOIN user_cards top_uc ON d.top_card_id = top_uc.id
      LEFT JOIN players top_p ON top_uc.player_id = top_p.id
      LEFT JOIN user_cards jungle_uc ON d.jungle_card_id = jungle_uc.id
      LEFT JOIN players jungle_p ON jungle_uc.player_id = jungle_p.id
      LEFT JOIN user_cards mid_uc ON d.mid_card_id = mid_uc.id
      LEFT JOIN players mid_p ON mid_uc.player_id = mid_p.id
      LEFT JOIN user_cards adc_uc ON d.adc_card_id = adc_uc.id
      LEFT JOIN players adc_p ON adc_uc.player_id = adc_p.id
      LEFT JOIN user_cards support_uc ON d.support_card_id = support_uc.id
      LEFT JOIN players support_p ON support_uc.player_id = support_p.id
      WHERE d.id = ?
    `, [deckId]);

    if (decks.length === 0) return null;
    const deck = decks[0];

    return {
      top: deck.top_player_id ? { name: deck.top_name, team: deck.top_team, tier: deck.top_tier, season: deck.top_season, overall: deck.top_overall, level: deck.top_level } : null,
      jungle: deck.jungle_player_id ? { name: deck.jungle_name, team: deck.jungle_team, tier: deck.jungle_tier, season: deck.jungle_season, overall: deck.jungle_overall, level: deck.jungle_level } : null,
      mid: deck.mid_player_id ? { name: deck.mid_name, team: deck.mid_team, tier: deck.mid_tier, season: deck.mid_season, overall: deck.mid_overall, level: deck.mid_level } : null,
      adc: deck.adc_player_id ? { name: deck.adc_name, team: deck.adc_team, tier: deck.adc_tier, season: deck.adc_season, overall: deck.adc_overall, level: deck.adc_level } : null,
      support: deck.support_player_id ? { name: deck.support_name, team: deck.support_team, tier: deck.support_tier, season: deck.support_season, overall: deck.support_overall, level: deck.support_level } : null,
    };
  } finally {
    connection.release();
  }
}

// 새로운 매치 생성 (matchmaking에서 호출)
export async function createRealtimeMatch(
  player1: { socketId: string; userId: number; username: string; deckId: number },
  player2: { socketId: string; userId: number; username: string; deckId: number },
  isPractice: boolean,
  io: Server,
  aiDeck?: any // Optional AI deck for AI matches
): Promise<string> {
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get deck information for both players
  // If aiDeck is provided (AI match), use it for player2
  let player1Deck, player2Deck;

  if (aiDeck) {
    // AI match: get player1's deck, use provided AI deck for player2
    player1Deck = await getDeckInfo(player1.deckId);
    player2Deck = aiDeck;
  } else {
    // Normal match: get both decks from database
    [player1Deck, player2Deck] = await Promise.all([
      getDeckInfo(player1.deckId),
      getDeckInfo(player2.deckId)
    ]);
  }

  const match: ActiveMatch = {
    matchId,
    player1: {
      ...player1,
      score: 0,
      ready: false,
    },
    player2: {
      ...player2,
      score: 0,
      ready: false,
    },
    player1Deck,
    player2Deck,
    currentRound: 1,
    isPractice,
  };

  activeMatches.set(matchId, match);

  // 양 플레이어에게 매치 시작 알림 (상대 덱 정보 포함)
  io.to(player1.socketId).emit('matchFound', {
    matchId,
    opponent: {
      username: player2.username,
      deck: player2Deck
    },
    isPractice,
  });

  // Only emit to player2 if not AI (AI has fake socket ID)
  if (!aiDeck) {
    io.to(player2.socketId).emit('matchFound', {
      matchId,
      opponent: {
        username: player1.username,
        deck: player1Deck
      },
      isPractice,
    });
  }

  // 첫 라운드 시작 (10초 후 - 라인업 확인 시간)
  setTimeout(() => startRound(matchId, io), 10000);

  return matchId;
}

// 플레이어 disconnect 처리
export async function handlePlayerDisconnect(socketId: string, io: Server) {
  // 해당 소켓이 참여중인 매치 찾기
  for (const [matchId, match] of activeMatches.entries()) {
    if (match.player1.socketId === socketId || match.player2.socketId === socketId) {
      // 타이머 정리
      if (match.roundTimer) {
        clearTimeout(match.roundTimer);
      }

      // 나간 플레이어의 반대편을 승자로
      if (match.player1.socketId === socketId) {
        match.player2.score = 3;
        match.player1.score = 0;
      } else {
        match.player1.score = 3;
        match.player2.score = 0;
      }

      // 매치 종료
      await endMatch(matchId, io);
      break;
    }
  }
}
