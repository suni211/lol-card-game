import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

interface MatchmakingPlayer {
  socketId: string;
  userId: number;
  username: string;
  rating: number;
  deckId: number;
  joinedAt: number;
  timeoutId?: NodeJS.Timeout;
}

const matchmakingQueue: MatchmakingPlayer[] = [];
const RATING_RANGE = 200;
const AUTO_MATCH_TIMEOUT = 30000; // 30 seconds

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
      const ratingChange = won ? 25 : -15;

      await connection.query(`
        INSERT INTO match_history (user_id, match_id, result, points_change, rating_change)
        VALUES (?, ?, ?, ?, ?)
      `, [player.userId, matchId, won ? 'WIN' : 'LOSE', pointsChange, ratingChange]);

      await connection.query(
        'UPDATE users SET points = points + ?, rating = rating + ? WHERE id = ?',
        [pointsChange, ratingChange, player.userId]
      );

      await connection.query(`
        UPDATE user_stats
        SET
          total_matches = total_matches + 1,
          wins = wins + ?,
          losses = losses + ?
        WHERE user_id = ?
      `, [won ? 1 : 0, won ? 0 : 1, player.userId]);
    }

    await connection.commit();

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

// Find match for player
function findMatch(player: MatchmakingPlayer, io: Server, forceMatch: boolean = false): boolean {
  const minRating = player.rating - RATING_RANGE;
  const maxRating = player.rating + RATING_RANGE;

  let opponentIndex = -1;

  if (!forceMatch) {
    // First try to find opponent with similar rating
    opponentIndex = matchmakingQueue.findIndex((p) =>
      p.userId !== player.userId &&
      p.rating >= minRating &&
      p.rating <= maxRating
    );
  }

  // If force match or no similar rating opponent, just get first available (선착순)
  if (opponentIndex === -1 && matchmakingQueue.length > 0) {
    opponentIndex = matchmakingQueue.findIndex((p) => p.userId !== player.userId);
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
    socket.on('join_queue', async (data: { token: string }) => {
      try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded: any = jwt.verify(data.token, jwtSecret);

        // Get user info
        const [users]: any = await pool.query(
          'SELECT id, username, rating FROM users WHERE id = ?',
          [decoded.id]
        );

        if (users.length === 0) {
          socket.emit('queue_error', { error: 'User not found' });
          return;
        }

        const user = users[0];

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
                socket.emit('queue_update', {
                  playersInQueue: matchmakingQueue.length,
                  message: '상대를 찾지 못했습니다. 계속 대기 중...'
                });
              }
            }
          }, AUTO_MATCH_TIMEOUT);

          player.timeoutId = timeoutId;

          socket.emit('queue_joined', {
            position: matchmakingQueue.length,
            playersInQueue: matchmakingQueue.length,
            message: 'Searching for opponent...',
          });

          // Broadcast queue size to all players
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
