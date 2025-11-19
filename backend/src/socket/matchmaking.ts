import { normalizeTeamName } from '../utils/teamUtils';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { calculateTier, canMatchTiers, UserTier } from '../utils/tierCalculator';
import { updateMissionProgress } from '../utils/missionTracker';
import { checkAndUpdateAchievements } from '../utils/achievementTracker';
import { createRealtimeMatch, setupRealtimeMatch, handlePlayerDisconnect } from './realtimeMatch';
import { checkDeckSalaryCap } from '../utils/salaryCheck';
import { calculateTraitBonus } from '../utils/traitBonus';

// 해피아워 체크 (20:00-21:00 KST)
function isHappyHour(): boolean {
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  const hour = kstTime.getUTCHours();
  return hour === 20; // 20시(8PM)
}

// 해피아워 보너스 적용
function applyHappyHourBonus(points: number): number {
  if (isHappyHour()) {
    console.log(`🎉 Happy Hour! Points: ${points} → ${Math.floor(points * 1.05)}`);
    return Math.floor(points * 1.05); // +5% 보너스
  }
  return points;
}

interface MatchmakingPlayer {
  socketId: string;
  userId: number;
  username: string;
  rating: number;
  tier: UserTier;
  deckId: number;
  joinedAt: number;
  timeoutId?: NodeJS.Timeout;
  lastOpponentId?: number; // Track last opponent
}

const rankedQueue: MatchmakingPlayer[] = [];
const practiceQueue: MatchmakingPlayer[] = [];
const RATING_RANGE = 200;
const AUTO_MATCH_TIMEOUT = 30000; // 30 seconds
const PREVENT_REMATCH_DURATION = 3 * 60 * 1000; // 3 minutes
const RANK_MATCH_LIMIT = 10; // Max rank matches per hour
const RANK_MATCH_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Store recent matches to prevent immediate rematches
const recentMatches = new Map<number, { opponentId: number; timestamp: number }>();
const practiceRecentMatches = new Map<number, { opponentId: number; timestamp: number }>();

// Calculate deck power
async function calculateDeckPower(deckId: number): Promise<number> {
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
      SELECT uc.level, p.overall, p.team, p.position, p.name, p.trait1
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id IN (?)
    `, [cardIds]);

    let totalPower = 0;
    const teams: any = {};

    // Calculate enhancement bonus helper
    const calculateEnhancementBonus = (level: number): number => {
      if (level <= 0) return 0;
      if (level <= 4) return level; // 1~4강: +1씩
      if (level <= 7) return 4 + (level - 4) * 2; // 5~7강: +2씩
      return 10 + (level - 7) * 5; // 8~10강: +5씩
    };

    // Team synergy mapping: old teams treated as current teams
    const teamMapping: any = {
      'NJS': 'BRO',
      'AZF': 'CJ',
      'MVP': 'GEN',
      'SKT': 'T1',
    };

    cards.forEach((card: any) => {
      const enhancementBonus = calculateEnhancementBonus(card.level || 0);
      const traitBonus = calculateTraitBonus(card);
      let power = card.overall + enhancementBonus + traitBonus;
      totalPower += power;

      // Check if team field contains multiple teams (comma-separated)
      if (card.team && card.team.includes(',')) {
        // Multiple teams (e.g., ICON Peanut with "T1,HLE,NS,GEN,LGD")
        const multipleTeams = card.team.split(',').map((t: string) => t.trim());
        multipleTeams.forEach((team: string) => {
          const synergyTeam = normalizeTeamName(team);
          teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
        });
      } else {
        // Single team
        const synergyTeam = normalizeTeamName(card.team);
        teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
      }
    });

    // Team synergy: same team 3 players = +1 OVR, 4 players = +3 OVR, 5 players = +5 OVR
    let synergyBonus = 0;
    Object.values(teams).forEach((count: any) => {
      if (count === 3) synergyBonus += 1;
      if (count === 4) synergyBonus += 3;
      if (count === 5) synergyBonus += 5;
    });

    totalPower += synergyBonus;
    return totalPower;
  } finally {
    connection.release();
  }
}

// Match with AI
async function matchWithAI(player: MatchmakingPlayer, io: Server) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get random AI user
    const [aiUsers]: any = await connection.query(`
      SELECT id, username, rating
      FROM users
      WHERE username LIKE 'AI_%'
      ORDER BY RAND()
      LIMIT 1
    `);

    if (aiUsers.length === 0) {
      throw new Error('No AI users available');
    }

    const aiUser = aiUsers[0];

    // Create random AI deck - select random player for each position
    const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    const aiDeck: any = {};

    for (const position of positions) {
      const [randomPlayers]: any = await connection.query(`
        SELECT
          id, name, team, position, overall, season,
          CASE
            WHEN name LIKE 'ICON%' THEN 'ICON'
            WHEN overall <= 80 THEN 'COMMON'
            WHEN overall <= 90 THEN 'RARE'
            WHEN overall <= 100 THEN 'EPIC'
            ELSE 'LEGENDARY'
          END as tier,
          laning, teamfight, macro, mental,
          cs_ability, lane_pressure, damage_dealing, survivability,
          objective_control, vision_control, decision_making, consistency
        FROM players
        WHERE position = ?
        ORDER BY RAND()
        LIMIT 1
      `, [position]);

      if (randomPlayers.length > 0) {
        const p = randomPlayers[0];
        aiDeck[position.toLowerCase()] = {
          name: p.name,
          team: p.team,
          tier: p.tier,
          season: p.season || '25',
          overall: p.overall,
          level: 0, // AI doesn't have card levels
          // 기존 4개 스탯
          laning: p.laning || 50,
          teamfight: p.teamfight || 50,
          macro: p.macro || 50,
          mental: p.mental || 50,
          // 새로운 8개 세부 스탯
          cs_ability: p.cs_ability || 50,
          lane_pressure: p.lane_pressure || 50,
          damage_dealing: p.damage_dealing || 50,
          survivability: p.survivability || 50,
          objective_control: p.objective_control || 50,
          vision_control: p.vision_control || 50,
          decision_making: p.decision_making || 50,
          consistency: p.consistency || 50,
        };
      }
    }

    await connection.commit();

    console.log(`Player ${player.username} matched with AI ${aiUser.username}`);
    console.log('AI Deck:', aiDeck);

    // Use realtime match system
    const { createRealtimeMatch } = require('./realtimeMatch');

    // Create a fake socket ID for AI
    const aiSocketId = `ai_${Date.now()}`;

    // Create realtime match with AI (AI has no real deck ID, using -1 as placeholder)
    await createRealtimeMatch(
      {
        socketId: player.socketId,
        userId: player.userId,
        username: player.username,
        deckId: player.deckId,
      },
      {
        socketId: aiSocketId,
        userId: aiUser.id,
        username: aiUser.username,
        deckId: -1, // Placeholder for AI (will be ignored)
      },
      true, // isPractice
      io,
      aiDeck // Pass AI deck directly
    );

  } catch (error) {
    await connection.rollback();
    console.error('AI match error:', error);
    io.to(player.socketId).emit('queue_error', { error: 'Failed to create AI match' });
  } finally {
    connection.release();
  }
}

// Process match
async function processMatch(player1: MatchmakingPlayer, player2: MatchmakingPlayer, io: Server, isPractice: boolean = false) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Import simulateMatch from match routes
    const { simulateMatch } = require('../routes/match');

    // Simulate match with detailed phases
    const matchSimulation = await simulateMatch(connection, player1.deckId, player2.deckId);

    const winnerId = matchSimulation.winnerId === 1 ? player1.userId : player2.userId;
    const player1Score = matchSimulation.finalScore.player1;
    const player2Score = matchSimulation.finalScore.player2;

    // Create match record
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at, match_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), ?)
    `, [player1.userId, player2.userId, player1.deckId, player2.deckId, winnerId, player1Score, player2Score, isPractice ? 'PRACTICE' : 'RANKED']);

    const matchId = matchResult.insertId;

    // Store actual rating changes for later use
    const actualRatingChanges: { [key: number]: number } = {};

    // Update both players
    for (const player of [player1, player2]) {
      const won = winnerId === player.userId;

      // Practice mode: lower rewards, no rating change
      let pointsChange = isPractice ? (won ? 350 : 100) : (won ? 650 : 200);

      // 해피아워 보너스 적용
      pointsChange = applyHappyHourBonus(pointsChange);

      let ratingChange = isPractice ? 0 : (won ? 25 : -15);

      // Get current rating to prevent going below 1000
      const [currentUser]: any = await connection.query(
        'SELECT rating FROM users WHERE id = ?',
        [player.userId]
      );

      const currentRating = currentUser[0].rating;
      const newRating = currentRating + ratingChange;

      // Prevent rating from going below 1000 (only for ranked)
      if (!isPractice && newRating < 1000) {
        ratingChange = 1000 - currentRating;
      }

      // Store actual rating change for this player
      actualRatingChanges[player.userId] = ratingChange;

      // Calculate new tier (only for ranked)
      const newTier = isPractice ? null : calculateTier(currentRating + ratingChange);

      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [player.userId, matchId, won ? 'WIN' : 'LOSE', pointsChange, ratingChange]);

      // Update user: only update tier/rating for ranked matches
      if (isPractice) {
        await connection.query(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [pointsChange, player.userId]
        );
      } else {
        await connection.query(
          'UPDATE users SET points = points + ?, rating = rating + ?, tier = ? WHERE id = ?',
          [pointsChange, ratingChange, newTier, player.userId]
        );
      }

      // Update stats only for ranked matches (승률은 랭크전만 반영)
      if (!isPractice) {
        await connection.query(`
          UPDATE user_stats
          SET
            total_matches = total_matches + 1,
            wins = wins + ?,
            losses = losses + ?
          WHERE user_id = ?
        `, [won ? 1 : 0, won ? 0 : 1, player.userId]);
      }

      // Check for 0 rating penalty (suspended for 12 hours) - only for ranked
      if (!isPractice && currentRating + ratingChange <= 1000 && !won) {
        // Check if already at minimum and losing
        const [lossStreak]: any = await connection.query(`
          SELECT COUNT(*) as count
          FROM match_history
          WHERE user_id = ?
          AND created_at >= NOW() - INTERVAL 1 HOUR
          AND result = 'LOSE'
        `, [player.userId]);

        // If lost 3+ games in a row while at minimum rating, apply suspension
        if (lossStreak[0].count >= 3) {
          await connection.query(
            'UPDATE users SET tier_suspended_until = DATE_ADD(NOW(), INTERVAL 12 HOUR) WHERE id = ?',
            [player.userId]
          );
        }
      }
    }

    await connection.commit();

    // Update mission progress for both players (only for ranked)
    if (!isPractice) {
      updateMissionProgress(player1.userId, 'rank_match', 1).catch(err =>
        console.error('Mission update error:', err)
      );
      updateMissionProgress(player2.userId, 'rank_match', 1).catch(err =>
        console.error('Mission update error:', err)
      );
    }

    // Update achievements for both players
    checkAndUpdateAchievements(player1.userId).catch(err =>
      console.error('Achievement update error:', err)
    );
    checkAndUpdateAchievements(player2.userId).catch(err =>
      console.error('Achievement update error:', err)
    );

    // Calculate actual values for each player
    const player1Won = winnerId === player1.userId;
    const player2Won = winnerId === player2.userId;
    const player1PointsChange = isPractice ? (player1Won ? 100 : 60) : (player1Won ? 200 : 100);
    const player2PointsChange = isPractice ? (player2Won ? 100 : 60) : (player2Won ? 200 : 100);
    // Use actual rating changes that were stored (includes 1000 minimum cap)
    const player1RatingChange = actualRatingChanges[player1.userId];
    const player2RatingChange = actualRatingChanges[player2.userId];

    // Send results to both players (with phases for 30-second simulation)
    io.to(player1.socketId).emit('match_result', {
      opponent: {
        id: player2.userId,
        username: player2.username,
        rating: player2.rating,
      },
      won: player1Won,
      myScore: player1Score,
      opponentScore: player2Score,
      pointsChange: player1PointsChange,
      ratingChange: player1RatingChange,
      isPractice,
      phases: matchSimulation.phases,
    });

    io.to(player2.socketId).emit('match_result', {
      opponent: {
        id: player1.userId,
        username: player1.username,
        rating: player1.rating,
      },
      won: player2Won,
      myScore: player2Score,
      opponentScore: player1Score,
      pointsChange: player2PointsChange,
      ratingChange: player2RatingChange,
      isPractice,
      phases: matchSimulation.phases,
    });

  } catch (error) {
    await connection.rollback();
    console.error('Match processing error:', error);
    io.to(player1.socketId).emit('match_error', { error: 'Match processing failed' });
    io.to(player2.socketId).emit('match_error', { error: 'Match processing failed' });
  } finally {
    connection.release();
  }
}

// Broadcast queue size to all players in queue
function broadcastQueueSize(io: Server, queue: MatchmakingPlayer[], eventName: string = 'queue_update') {
  const queueSize = queue.length;
  queue.forEach(player => {
    io.to(player.socketId).emit(eventName, { playersInQueue: queueSize });
  });
}

// Check if two players recently played against each other
function canMatchPlayers(player1Id: number, player2Id: number, recentMatchesMap: Map<number, { opponentId: number; timestamp: number }>): boolean {
  const now = Date.now();

  const player1Recent = recentMatchesMap.get(player1Id);
  const player2Recent = recentMatchesMap.get(player2Id);

  // Check if player1 recently played against player2
  if (player1Recent && player1Recent.opponentId === player2Id) {
    const timeSinceMatch = now - player1Recent.timestamp;
    if (timeSinceMatch < PREVENT_REMATCH_DURATION) {
      return false; // Too soon for rematch
    }
  }

  // Check if player2 recently played against player1
  if (player2Recent && player2Recent.opponentId === player1Id) {
    const timeSinceMatch = now - player2Recent.timestamp;
    if (timeSinceMatch < PREVENT_REMATCH_DURATION) {
      return false; // Too soon for rematch
    }
  }

  return true;
}

// Find match for player
async function findMatch(
  player: MatchmakingPlayer,
  queue: MatchmakingPlayer[],
  recentMatchesMap: Map<number, { opponentId: number; timestamp: number }>,
  io: Server,
  isPractice: boolean = false,
  forceMatch: boolean = false
): Promise<boolean> {
  const minRating = player.rating - RATING_RANGE;
  const maxRating = player.rating + RATING_RANGE;

  let opponentIndex = -1;

  if (!forceMatch && !isPractice) {
    // Ranked: First try to find opponent with similar rating, matching tier, who wasn't recently matched
    opponentIndex = queue.findIndex((p) =>
      p.userId !== player.userId &&
      p.rating >= minRating &&
      p.rating <= maxRating &&
      canMatchTiers(player.tier, p.tier) &&
      canMatchPlayers(player.userId, p.userId, recentMatchesMap)
    );
  }

  if (isPractice && !forceMatch) {
    // Practice: Match with anyone (no restrictions at all)
    opponentIndex = queue.findIndex((p) => p.userId !== player.userId);
  }

  // If force match or no similar rating opponent, get first available
  if (opponentIndex === -1 && forceMatch && queue.length > 0) {
    if (isPractice) {
      // Practice: just find anyone
      opponentIndex = queue.findIndex((p) => p.userId !== player.userId);
    } else {
      // Ranked: match with anyone in matching tier (ignore rating range and recent match)
      opponentIndex = queue.findIndex((p) =>
        p.userId !== player.userId &&
        canMatchTiers(player.tier, p.tier)
      );
    }
  }

  // If still no opponent after force match, relax tier restrictions
  if (opponentIndex === -1 && queue.length > 0) {
    if (isPractice) {
      // Practice: just find anyone
      opponentIndex = queue.findIndex((p) => p.userId !== player.userId);
    } else {
      // Ranked: check tier and 3-min rule
      opponentIndex = queue.findIndex((p) =>
        p.userId !== player.userId &&
        canMatchTiers(player.tier, p.tier) &&
        canMatchPlayers(player.userId, p.userId, recentMatchesMap)
      );
    }
  }

  if (opponentIndex !== -1) {
    const opponent = queue[opponentIndex];
    queue.splice(opponentIndex, 1);

    // Clear timeout for opponent
    if (opponent.timeoutId) {
      clearTimeout(opponent.timeoutId);
    }

    // Record this match to prevent immediate rematches
    const now = Date.now();
    recentMatchesMap.set(player.userId, { opponentId: opponent.userId, timestamp: now });
    recentMatchesMap.set(opponent.userId, { opponentId: player.userId, timestamp: now });

    // Clean up old entries (older than PREVENT_REMATCH_DURATION)
    recentMatchesMap.forEach((value, key) => {
      if (now - value.timestamp > PREVENT_REMATCH_DURATION) {
        recentMatchesMap.delete(key);
      }
    });

    // Create realtime match instead of auto-simulation
    await createRealtimeMatch(
      {
        socketId: player.socketId,
        userId: player.userId,
        username: player.username,
        deckId: player.deckId,
      },
      {
        socketId: opponent.socketId,
        userId: opponent.userId,
        username: opponent.username,
        deckId: opponent.deckId,
      },
      isPractice,
      io
    );

    // Update queue size for remaining players
    broadcastQueueSize(io, queue, isPractice ? 'practice_queue_update' : 'queue_update');

    return true;
  }

  return false;
}

export function setupMatchmaking(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join matchmaking queue
    socket.on('join_queue', async (data: { token: string; isPractice?: boolean }) => {
      try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded: any = jwt.verify(data.token, jwtSecret);

        const isPractice = data.isPractice === true;

        // Get user info and active deck in ONE query (최적화)
        const [results]: any = await pool.query(`
          SELECT
            u.id,
            u.username,
            u.rating,
            u.tier_suspended_until,
            d.id as deck_id
          FROM users u
          LEFT JOIN decks d ON u.id = d.user_id AND d.is_active = TRUE
          WHERE u.id = ?
        `, [decoded.id]);

        if (results.length === 0) {
          socket.emit('queue_error', { error: 'User not found' });
          return;
        }

        const user = results[0];

        if (!user.deck_id) {
          socket.emit('queue_error', { error: 'No active deck found' });
          return;
        }

        // Check salary cap
        const salaryCheck = await checkDeckSalaryCap(pool, user.deck_id);
        if (!salaryCheck.valid) {
          socket.emit('queue_error', { error: salaryCheck.error });
          return;
        }

        // Calculate tier based on rating
        const userTier = calculateTier(user.rating);

        const player: MatchmakingPlayer = {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
          rating: user.rating,
          tier: userTier,
          deckId: user.deck_id,
          joinedAt: Date.now(),
        };

        // Select queue based on match type
        const queue = isPractice ? practiceQueue : rankedQueue;
        const recentMatchesMap = isPractice ? practiceRecentMatches : recentMatches;

        // Try to find a match
        const matched = await findMatch(player, queue, recentMatchesMap, io, isPractice);

        if (!matched) {
          // Check if user already in queue (prevent duplicates)
          const existingIndex = queue.findIndex(p => p.userId === user.id);
          if (existingIndex !== -1) {
            // User already in queue - remove old entry and add new one (updates socketId)
            const oldPlayer = queue[existingIndex];
            if (oldPlayer.timeoutId) {
              clearTimeout(oldPlayer.timeoutId);
            }
            queue.splice(existingIndex, 1);
            console.log(`Player ${user.username} rejoined ${isPractice ? 'practice' : 'ranked'} queue (removed old entry)`);
          }

          // Add to queue
          queue.push(player);

          // Set timeout for auto-match after 30 seconds (ONLY for practice mode)
          if (isPractice) {
            const timeoutId = setTimeout(async () => {
              const playerIndex = queue.findIndex(p => p.socketId === socket.id);
              if (playerIndex !== -1) {
                const queuedPlayer = queue[playerIndex];
                queue.splice(playerIndex, 1);

                // Try force match (any opponent)
                const forceMatched = await findMatch(queuedPlayer, queue, recentMatchesMap, io, isPractice, true);

                if (!forceMatched) {
                  // No opponents - match with AI for practice mode
                  matchWithAI(queuedPlayer, io);
                }
              }
            }, AUTO_MATCH_TIMEOUT);

            player.timeoutId = timeoutId;
          }

          // Broadcast queue size to ALL players (including new one)
          broadcastQueueSize(io, queue, isPractice ? 'practice_queue_update' : 'queue_update');

          console.log(`Player ${user.username} joined ${isPractice ? 'practice' : 'ranked'} queue (${queue.length} in queue)`);
        }

      } catch (error: any) {
        console.error('Join queue error:', error);
        socket.emit('queue_error', { error: 'Failed to join queue' });
      }
    });

    // Leave matchmaking queue
    socket.on('leave_queue', () => {
      // Check both queues
      let index = rankedQueue.findIndex((p) => p.socketId === socket.id);
      let queue = rankedQueue;
      let isPractice = false;

      if (index === -1) {
        index = practiceQueue.findIndex((p) => p.socketId === socket.id);
        queue = practiceQueue;
        isPractice = true;
      }

      if (index !== -1) {
        const player = queue[index];

        // Clear timeout
        if (player.timeoutId) {
          clearTimeout(player.timeoutId);
        }

        queue.splice(index, 1);
        console.log(`Player ${player.username} left ${isPractice ? 'practice' : 'ranked'} queue`);
        socket.emit('queue_left', { message: 'Left matchmaking queue' });

        // Update queue size for remaining players
        broadcastQueueSize(io, queue, isPractice ? 'practice_queue_update' : 'queue_update');
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      // Check both queues
      let index = rankedQueue.findIndex((p) => p.socketId === socket.id);
      let queue = rankedQueue;
      let isPractice = false;

      if (index === -1) {
        index = practiceQueue.findIndex((p) => p.socketId === socket.id);
        queue = practiceQueue;
        isPractice = true;
      }

      if (index !== -1) {
        const player = queue[index];

        // Clear timeout
        if (player.timeoutId) {
          clearTimeout(player.timeoutId);
        }

        queue.splice(index, 1);
        console.log(`Player ${player.username} disconnected from ${isPractice ? 'practice' : 'ranked'} queue`);

        // Update queue size for remaining players
        broadcastQueueSize(io, queue, isPractice ? 'practice_queue_update' : 'queue_update');
      }

      // 실행중인 매치에서 disconnect 처리
      await handlePlayerDisconnect(socket.id, io);

      console.log('Client disconnected:', socket.id);
    });
  });
}
