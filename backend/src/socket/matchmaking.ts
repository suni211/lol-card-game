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

const matchmakingQueue: MatchmakingPlayer[] = [];
const RATING_RANGE = 200;
const AUTO_MATCH_TIMEOUT = 30000; // 30 seconds
const PREVENT_REMATCH_DURATION = 3 * 60 * 1000; // 3 minutes
const RANK_MATCH_LIMIT = 10; // Max rank matches per hour
const RANK_MATCH_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Store recent matches to prevent immediate rematches
const recentMatches = new Map<number, { opponentId: number; timestamp: number }>();

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
async function processMatch(player1: MatchmakingPlayer, player2: MatchmakingPlayer, io: Server) {
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
      INSERT INTO matches (player1_id, player2_id, player1_deck_id, player2_deck_id, winner_id, player1_score, player2_score, status, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW())
    `, [player1.userId, player2.userId, player1.deckId, player2.deckId, winnerId, player1Score, player2Score]);

    const matchId = matchResult.insertId;

    // Update both players
    for (const player of [player1, player2]) {
      const won = winnerId === player.userId;
      const pointsChange = won ? 100 : 50;
      let ratingChange = won ? 25 : -15;

      // Get current rating to prevent going below 1000
      const [currentUser]: any = await connection.query(
        'SELECT rating FROM users WHERE id = ?',
        [player.userId]
      );

      const currentRating = currentUser[0].rating;
      const newRating = currentRating + ratingChange;

      // Prevent rating from going below 1000
      if (newRating < 1000) {
        ratingChange = 1000 - currentRating;
      }

      // Calculate new tier
      const newTier = calculateTier(currentRating + ratingChange);

      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [player.userId, matchId, won ? 'WIN' : 'LOSE', pointsChange, ratingChange]);

      await connection.query(
        'UPDATE users SET points = points + ?, rating = rating + ?, tier = ? WHERE id = ?',
        [pointsChange, ratingChange, newTier, player.userId]
      );

      await connection.query(`
        UPDATE user_stats
        SET
          total_matches = total_matches + 1,
          wins = wins + ?,
          losses = losses + ?
        WHERE user_id = ?
      `, [won ? 1 : 0, won ? 0 : 1, player.userId]);

      // Check for 0 rating penalty (suspended for 12 hours)
      if (currentRating + ratingChange <= 1000 && !won) {
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

    // Update mission progress for both players
    updateMissionProgress(player1.userId, 'rank_match', 1).catch(err =>
      console.error('Mission update error:', err)
    );
    updateMissionProgress(player2.userId, 'rank_match', 1).catch(err =>
      console.error('Mission update error:', err)
    );

    // Send results to both players
    io.to(player1.socketId).emit('match_result', {
      opponent: {
        id: player2.userId,
        username: player2.username,
        rating: player2.rating,
      },
      won: winnerId === player1.userId,
      myScore: player1Score,
      opponentScore: player2Score,
      pointsChange: winnerId === player1.userId ? 100 : 50,
      ratingChange: winnerId === player1.userId ? 25 : -15,
    });

    io.to(player2.socketId).emit('match_result', {
      opponent: {
        id: player1.userId,
        username: player1.username,
        rating: player1.rating,
      },
      won: winnerId === player2.userId,
      myScore: player2Score,
      opponentScore: player1Score,
      pointsChange: winnerId === player2.userId ? 100 : 50,
      ratingChange: winnerId === player2.userId ? 25 : -15,
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
function broadcastQueueSize(io: Server) {
  const queueSize = matchmakingQueue.length;
  matchmakingQueue.forEach(player => {
    io.to(player.socketId).emit('queue_update', { playersInQueue: queueSize });
  });
}

// Check if two players recently played against each other
function canMatchPlayers(player1Id: number, player2Id: number): boolean {
  const now = Date.now();

  const player1Recent = recentMatches.get(player1Id);
  const player2Recent = recentMatches.get(player2Id);

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
function findMatch(player: MatchmakingPlayer, io: Server, forceMatch: boolean = false): boolean {
  const minRating = player.rating - RATING_RANGE;
  const maxRating = player.rating + RATING_RANGE;

  let opponentIndex = -1;

  if (!forceMatch) {
    // First try to find opponent with similar rating, matching tier, who wasn't recently matched
    opponentIndex = matchmakingQueue.findIndex((p) =>
      p.userId !== player.userId &&
      p.rating >= minRating &&
      p.rating <= maxRating &&
      canMatchTiers(player.tier, p.tier) &&
      canMatchPlayers(player.userId, p.userId)
    );
  }

  // If force match or no similar rating opponent, get first available (check tier and 3-min rule)
  if (opponentIndex === -1 && matchmakingQueue.length > 0) {
    opponentIndex = matchmakingQueue.findIndex((p) =>
      p.userId !== player.userId &&
      canMatchTiers(player.tier, p.tier) &&
      canMatchPlayers(player.userId, p.userId)
    );
  }

  // If still no match after 3 minutes in queue, match with anyone (ignore recent match rule but keep tier restriction)
  if (opponentIndex === -1 && forceMatch && matchmakingQueue.length > 0) {
    const waitTime = Date.now() - player.joinedAt;
    if (waitTime >= PREVENT_REMATCH_DURATION) {
      opponentIndex = matchmakingQueue.findIndex((p) =>
        p.userId !== player.userId &&
        canMatchTiers(player.tier, p.tier)
      );
    }
  }

  if (opponentIndex !== -1) {
    const opponent = matchmakingQueue[opponentIndex];
    matchmakingQueue.splice(opponentIndex, 1);

    // Clear timeout for opponent
    if (opponent.timeoutId) {
      clearTimeout(opponent.timeoutId);
    }

    // Notify both players that match was found
    io.to(player.socketId).emit('match_found', {
      opponent: {
        username: opponent.username,
        rating: opponent.rating,
      }
    });

    io.to(opponent.socketId).emit('match_found', {
      opponent: {
        username: player.username,
        rating: player.rating,
      }
    });

    // Record this match to prevent immediate rematches
    const now = Date.now();
    recentMatches.set(player.userId, { opponentId: opponent.userId, timestamp: now });
    recentMatches.set(opponent.userId, { opponentId: player.userId, timestamp: now });

    // Clean up old entries (older than PREVENT_REMATCH_DURATION)
    recentMatches.forEach((value, key) => {
      if (now - value.timestamp > PREVENT_REMATCH_DURATION) {
        recentMatches.delete(key);
      }
    });

    // Process the match
    processMatch(player, opponent, io);

    // Update queue size for remaining players
    broadcastQueueSize(io);

    return true;
  }

  return false;
}

export function setupMatchmaking(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join matchmaking queue
    socket.on('join_queue', async (data: { token: string; isRanked?: boolean }) => {
      try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded: any = jwt.verify(data.token, jwtSecret);

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

        // Check if user is suspended
        if (user.tier_suspended_until) {
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

        // Try to find a match
        const matched = findMatch(player, io);

        if (!matched) {
          // Add to queue
          matchmakingQueue.push(player);

          // Set timeout for auto-match after 30 seconds
          const timeoutId = setTimeout(() => {
            const playerIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
              const queuedPlayer = matchmakingQueue[playerIndex];
              matchmakingQueue.splice(playerIndex, 1);

              // Try force match (any opponent)
              const forceMatched = findMatch(queuedPlayer, io, true);

              if (!forceMatched) {
                // No opponents at all, put back in queue
                matchmakingQueue.push(queuedPlayer);
                broadcastQueueSize(io);
              }
            }
          }, AUTO_MATCH_TIMEOUT);

          player.timeoutId = timeoutId;

          // Broadcast queue size to ALL players (including new one)
          broadcastQueueSize(io);

          console.log(`Player ${user.username} joined queue (${matchmakingQueue.length} in queue)`);
        }

      } catch (error: any) {
        console.error('Join queue error:', error);
        socket.emit('queue_error', { error: 'Failed to join queue' });
      }
    });

    // Leave matchmaking queue
    socket.on('leave_queue', () => {
      const index = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        const player = matchmakingQueue[index];

        // Clear timeout
        if (player.timeoutId) {
          clearTimeout(player.timeoutId);
        }

        matchmakingQueue.splice(index, 1);
        console.log(`Player ${player.username} left queue`);
        socket.emit('queue_left', { message: 'Left matchmaking queue' });

        // Update queue size for remaining players
        broadcastQueueSize(io);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const index = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        const player = matchmakingQueue[index];

        // Clear timeout
        if (player.timeoutId) {
          clearTimeout(player.timeoutId);
        }

        matchmakingQueue.splice(index, 1);
        console.log(`Player ${player.username} disconnected from queue`);

        // Update queue size for remaining players
        broadcastQueueSize(io);
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}
