import { Server, Socket } from 'socket.io';
import pool from '../config/database';

// 전략 타입 정의
type Strategy = 'AGGRESSIVE' | 'TEAMFIGHT' | 'DEFENSIVE';

// 전략 상성표
const STRATEGY_COUNTERS: Record<Strategy, { beats: Strategy; losesTo: Strategy }> = {
  AGGRESSIVE: { beats: 'TEAMFIGHT', losesTo: 'DEFENSIVE' },
  TEAMFIGHT: { beats: 'DEFENSIVE', losesTo: 'AGGRESSIVE' },
  DEFENSIVE: { beats: 'AGGRESSIVE', losesTo: 'TEAMFIGHT' },
};

// 전략별 사용 스탯
const STRATEGY_STATS: Record<Strategy, 'laning' | 'teamfight' | 'macro'> = {
  AGGRESSIVE: 'laning',
  TEAMFIGHT: 'teamfight',
  DEFENSIVE: 'macro',
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
  currentRound: number;
  roundStartTime?: number;
  roundTimer?: NodeJS.Timeout;
  isPractice: boolean;
}

export const activeMatches = new Map<string, ActiveMatch>();
const ROUND_TIME_LIMIT = 10000; // 10 seconds

// 덱의 특정 스탯 파워 계산 (시너지 및 특성 포함)
async function calculateDeckStatPower(
  deckId: number,
  stat: 'laning' | 'teamfight' | 'macro'
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

    const [cards]: any = await connection.query(`
      SELECT uc.level, p.overall, p.${stat} as stat_value, p.team, p.position
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

      // Overall 50% (기본 오버롤 + 강화 보너스), 스탯 40%
      const statContribution = (card.stat_value || 50) * 0.4;
      const overallContribution = (card.overall + levelBonus) * 0.5;
      totalPower += statContribution + overallContribution;

      // 팀 시너지 카운팅
      const synergyTeam = teamMapping[card.team] || card.team;
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

    // 특성 보너스 (해당 스탯에 맞는 특성이 있으면 추가 보너스)
    const [traits]: any = await connection.query(`
      SELECT pt.name, pt.effect
      FROM player_traits pt
      JOIN user_cards uc ON pt.player_id = uc.player_id
      WHERE uc.id IN (?)
    `, [cardIds]);

    const traitStatMap: any = {
      '라인전 장인': 'laning',
      '한타 장인': 'teamfight',
      '운영 장인': 'macro',
      '라인전 킹': 'laning',
      '한타의 신': 'teamfight',
      '운영 천재': 'macro',
    };

    traits.forEach((trait: any) => {
      if (traitStatMap[trait.name] === stat) {
        totalPower += 50; // 특성 매칭시 +50
      }
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
  const p1BasePower = await calculateDeckStatPower(match.player1.deckId, p1Stat);
  const p2BasePower = await calculateDeckStatPower(match.player2.deckId, p2Stat);

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

  // 양 플레이어에게 라운드 시작 알림
  io.to(match.player1.socketId).emit('roundStart', {
    round: match.currentRound,
    timeLimit: ROUND_TIME_LIMIT,
  });
  io.to(match.player2.socketId).emit('roundStart', {
    round: match.currentRound,
    timeLimit: ROUND_TIME_LIMIT,
  });

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

// 라운드 결과 처리
async function processRound(matchId: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) return;

  // 타이머 정리
  if (match.roundTimer) {
    clearTimeout(match.roundTimer);
    match.roundTimer = undefined;
  }

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

  // Player 2 관점 (winner를 반대로)
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

  // 매치 종료 확인 (3승)
  if (match.player1.score >= 3 || match.player2.score >= 3) {
    await endMatch(matchId, io);
  } else {
    // 다음 라운드 시작
    match.currentRound++;
    setTimeout(() => startRound(matchId, io), 3000); // 3초 후 다음 라운드
  }
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

    // 현재 레이팅 조회
    const [player1Data]: any = await connection.query('SELECT rating FROM users WHERE id = ?', [match.player1.userId]);
    const [player2Data]: any = await connection.query('SELECT rating FROM users WHERE id = ?', [match.player2.userId]);

    const player1Rating = player1Data[0]?.rating || 1500;
    const player2Rating = player2Data[0]?.rating || 1500;

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

    // Practice vs Ranked rewards (포인트는 MMR 기반으로 조정)
    let player1PointsChange = 0;
    let player2PointsChange = 0;

    if (match.isPractice) {
      player1PointsChange = player1Won ? 100 : 60;
      player2PointsChange = player1Won ? 60 : 100;
    } else {
      // 경쟁전: 레이팅 변화에 비례한 포인트 (승리 최소 20, 패배 최소 10)
      const winPoints = Math.max(20, 100 + Math.abs(player1RatingChange) * 2);
      const losePoints = Math.max(10, 50 + Math.abs(player1RatingChange));

      player1PointsChange = player1Won ? winPoints : losePoints;

      const winPoints2 = Math.max(20, 100 + Math.abs(player2RatingChange) * 2);
      const losePoints2 = Math.max(10, 50 + Math.abs(player2RatingChange));

      player2PointsChange = player1Won ? losePoints2 : winPoints2;
    }

    // matches 테이블에 저장
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at, match_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), ?)
    `, [match.player1.userId, match.player2.userId, match.player1.deckId, match.player2.deckId, winnerId, match.player1.score, match.player2.score, match.isPractice ? 'PRACTICE' : 'RANKED']);

    const dbMatchId = matchResult.insertId;

    // match_history 저장
    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, ?)
    `, [match.player1.userId, dbMatchId, player1Won ? 'WIN' : 'LOSE', player1PointsChange, player1RatingChange]);

    await connection.query(`
      INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
      VALUES (?, ?, ?, ?, ?)
    `, [match.player2.userId, dbMatchId, player1Won ? 'LOSE' : 'WIN', player2PointsChange, player2RatingChange]);

    // 유저 포인트 업데이트 (일반전/경쟁전 모두)
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [player1PointsChange, match.player1.userId]
    );

    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [player2PointsChange, match.player2.userId]
    );

    // 경쟁전만 레이팅 및 통계 업데이트
    if (!match.isPractice) {
      await connection.query(
        'UPDATE users SET rating = GREATEST(1000, rating + ?) WHERE id = ?',
        [player1RatingChange, match.player1.userId]
      );

      await connection.query(
        'UPDATE users SET rating = GREATEST(1000, rating + ?) WHERE id = ?',
        [player2RatingChange, match.player2.userId]
      );

      // 통계 업데이트
      await connection.query(`
        UPDATE user_stats
        SET total_matches = total_matches + 1, wins = wins + ?, losses = losses + ?
        WHERE user_id = ?
      `, [player1Won ? 1 : 0, player1Won ? 0 : 1, match.player1.userId]);

      await connection.query(`
        UPDATE user_stats
        SET total_matches = total_matches + 1, wins = wins + ?, losses = losses + ?
        WHERE user_id = ?
      `, [player1Won ? 0 : 1, player1Won ? 1 : 0, match.player2.userId]);
    }

    await connection.commit();

    // 최종 결과 전송
    io.to(match.player1.socketId).emit('matchComplete', {
      won: player1Won,
      myScore: match.player1.score,
      opponentScore: match.player2.score,
      opponent: { username: match.player2.username },
      pointsChange: player1PointsChange,
      ratingChange: player1RatingChange,
    });

    io.to(match.player2.socketId).emit('matchComplete', {
      won: !player1Won,
      myScore: match.player2.score,
      opponentScore: match.player1.score,
      opponent: { username: match.player1.username },
      pointsChange: player2PointsChange,
      ratingChange: player2RatingChange,
    });

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

    // 둘 다 준비되면 라운드 처리
    if (match.player1.ready && match.player2.ready) {
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

// 새로운 매치 생성 (matchmaking에서 호출)
export function createRealtimeMatch(
  player1: { socketId: string; userId: number; username: string; deckId: number },
  player2: { socketId: string; userId: number; username: string; deckId: number },
  isPractice: boolean,
  io: Server
): string {
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    currentRound: 1,
    isPractice,
  };

  activeMatches.set(matchId, match);

  // 양 플레이어에게 매치 시작 알림
  io.to(player1.socketId).emit('matchFound', {
    matchId,
    opponent: { username: player2.username },
    isPractice,
  });

  io.to(player2.socketId).emit('matchFound', {
    matchId,
    opponent: { username: player1.username },
    isPractice,
  });

  // 첫 라운드 시작 (3초 후)
  setTimeout(() => startRound(matchId, io), 3000);

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
