import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { calculateTier, canMatchTiers, UserTier } from '../utils/tierCalculator';
import { updateMissionProgress } from '../utils/missionTracker';

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
      SELECT uc.level, p.overall, p.team, p.position
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.id IN (?)
    `, [cardIds]);

    let totalPower = 0;
    const teams: any = {};

    cards.forEach((card: any) => {
      let power = card.overall + card.level;
      totalPower += power;
      teams[card.team] = (teams[card.team] || 0) + 1;
    });

    // Team synergy
    let synergyBonus = 0;
    Object.values(teams).forEach((count: any) => {
      if (count === 3) synergyBonus += 5;
      if (count === 4) synergyBonus += 12;
      if (count === 5) synergyBonus += 25;
    });

    totalPower = Math.floor(totalPower * (1 + synergyBonus / 100));
    return totalPower;
  } finally {
    connection.release();
  }
}

// Process match
async function processMatch(player1: MatchmakingPlayer, player2: MatchmakingPlayer, io: Server, isPractice: boolean = false) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Calculate powers
    const player1Power = await calculateDeckPower(player1.deckId);
    const player2Power = await calculateDeckPower(player2.deckId);

    // Determine winner
    const randomFactor1 = 0.9 + Math.random() * 0.2;
    const randomFactor2 = 0.9 + Math.random() * 0.2;
    const player1FinalPower = player1Power * randomFactor1;
    const player2FinalPower = player2Power * randomFactor2;

    const winnerId = player1FinalPower > player2FinalPower ? player1.userId : player2.userId;
    const player1Score = player1FinalPower > player2FinalPower ? 3 : 1;
    const player2Score = player1FinalPower > player2FinalPower ? 1 : 3;

    // Create match record
    const [matchResult]: any = await connection.query(`
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at, match_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), ?)
    `, [player1.userId, player2.userId, player1.deckId, player2.deckId, winnerId, player1Score, player2Score, isPractice ? 'PRACTICE' : 'RANKED']);

    const matchId = matchResult.insertId;

    // Update both players
    for (const player of [player1, player2]) {
      const won = winnerId === player.userId;

      // Practice mode: lower rewards, no rating change
      const pointsChange = isPractice ? (won ? 50 : 30) : (won ? 100 : 50);
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

    // Calculate actual values for each player
    const player1Won = winnerId === player1.userId;
    const player2Won = winnerId === player2.userId;
    const player1PointsChange = isPractice ? (player1Won ? 50 : 30) : (player1Won ? 100 : 50);
    const player2PointsChange = isPractice ? (player2Won ? 50 : 30) : (player2Won ? 100 : 50);
    const player1RatingChange = isPractice ? 0 : (player1Won ? 25 : -15);
    const player2RatingChange = isPractice ? 0 : (player2Won ? 25 : -15);

    // Send results to both players
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
function findMatch(
  player: MatchmakingPlayer,
  queue: MatchmakingPlayer[],
  recentMatchesMap: Map<number, { opponentId: number; timestamp: number }>,
  io: Server,
  isPractice: boolean = false,
  forceMatch: boolean = false
): boolean {
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
    // Practice: Match with anyone who wasn't recently matched (no tier or rating restrictions)
    opponentIndex = queue.findIndex((p) =>
      p.userId !== player.userId &&
      canMatchPlayers(player.userId, p.userId, recentMatchesMap)
    );
  }

  // If force match or no similar rating opponent, get first available
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

  // If still no match after 3 minutes in queue, match with anyone (ignore recent match rule)
  if (opponentIndex === -1 && forceMatch && queue.length > 0) {
    const waitTime = Date.now() - player.joinedAt;
    if (waitTime >= PREVENT_REMATCH_DURATION) {
      if (isPractice) {
        opponentIndex = queue.findIndex((p) => p.userId !== player.userId);
      } else {
        opponentIndex = queue.findIndex((p) =>
          p.userId !== player.userId &&
          canMatchTiers(player.tier, p.tier)
        );
      }
    }
  }

  if (opponentIndex !== -1) {
    const opponent = queue[opponentIndex];
    queue.splice(opponentIndex, 1);

    // Clear timeout for opponent
    if (opponent.timeoutId) {
      clearTimeout(opponent.timeoutId);
    }

    // Notify both players that match was found
    io.to(player.socketId).emit('match_found', {
      opponent: {
        username: opponent.username,
        rating: opponent.rating,
      },
      isPractice,
    });

    io.to(opponent.socketId).emit('match_found', {
      opponent: {
        username: player.username,
        rating: player.rating,
      },
      isPractice,
    });

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

    // Process the match
    processMatch(player, opponent, io, isPractice);

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

        // Get user info
        const [users]: any = await pool.query(
          'SELECT id, username, rating, tier_suspended_until FROM users WHERE id = ?',
          [decoded.id]
        );

        if (users.length === 0) {
          socket.emit('queue_error', { error: 'User not found' });
          return;
        }

        const user = users[0];

        // Check if user is suspended (only for ranked)
        if (!isPractice && user.tier_suspended_until) {
          const suspendedUntil = new Date(user.tier_suspended_until);
          const now = new Date();

          if (suspendedUntil > now) {
            const remainingTime = Math.ceil((suspendedUntil.getTime() - now.getTime()) / (1000 * 60)); // minutes
            socket.emit('queue_error', {
              error: 'Suspended',
              message: `랭크 매치가 ${remainingTime}분 동안 정지되었습니다. (연패 페널티)`,
            });
            return;
          }
        }

        // Calculate tier based on rating
        const userTier = calculateTier(user.rating);

        // Get active deck
        const [decks]: any = await pool.query(
          'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
          [user.id]
        );

        if (decks.length === 0) {
          socket.emit('queue_error', { error: 'No active deck found' });
          return;
        }

        const player: MatchmakingPlayer = {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
          rating: user.rating,
          tier: userTier,
          deckId: decks[0].id,
          joinedAt: Date.now(),
        };

        // Select queue based on match type
        const queue = isPractice ? practiceQueue : rankedQueue;
        const recentMatchesMap = isPractice ? practiceRecentMatches : recentMatches;

        // Try to find a match
        const matched = findMatch(player, queue, recentMatchesMap, io, isPractice);

        if (!matched) {
          // Add to queue
          queue.push(player);

          // Set timeout for auto-match after 30 seconds
          const timeoutId = setTimeout(() => {
            const playerIndex = queue.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
              const queuedPlayer = queue[playerIndex];
              queue.splice(playerIndex, 1);

              // Try force match (any opponent)
              const forceMatched = findMatch(queuedPlayer, queue, recentMatchesMap, io, isPractice, true);

              if (!forceMatched) {
                // No opponents at all, put back in queue
                queue.push(queuedPlayer);
                broadcastQueueSize(io, queue, isPractice ? 'practice_queue_update' : 'queue_update');
              }
            }
          }, AUTO_MATCH_TIMEOUT);

          player.timeoutId = timeoutId;

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
    socket.on('disconnect', () => {
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
      console.log('Client disconnected:', socket.id);
    });
  });
}
