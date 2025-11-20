import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/engine';
import { MatchState, TurnAction, TurnResult } from '../game/types';
import { ITEMS, getAvailableItems } from '../game/items';
import pool from '../config/database';

// Active matches - exported for spectator
export const activeMatches = new Map<string, GameEngine>();
const playerToMatch = new Map<number, string>(); // oderId -> matchId
const matchTimers = new Map<string, NodeJS.Timeout>();

// Constants
const TURN_TIME = 60000; // 60 seconds
const TURN_PROCESS_DELAY = 15000; // 15 seconds for animations

interface QueuePlayer {
  oderId: number;
  socketId: string;
  deckData: any;
  rating: number;
  matchType: 'RANKED' | 'NORMAL';
}

const rankedQueue: QueuePlayer[] = [];
const normalQueue: QueuePlayer[] = [];

export function setupMobaMatch(io: Server, socket: Socket, user: any) {
  const oderId = user.id;

  // Join match queue
  socket.on('moba_queue_join', async (data: { matchType: 'RANKED' | 'NORMAL'; deckSlot: number }) => {
    try {
      // Get user's active deck
      const deckData = await getUserDeck(oderId, data.deckSlot);
      if (!deckData) {
        socket.emit('moba_error', { message: '덱을 찾을 수 없습니다.' });
        return;
      }

      // Get user rating
      const [users]: any = await pool.query('SELECT rating FROM users WHERE id = ?', [oderId]);
      const rating = users[0]?.rating || 1000;

      const queuePlayer: QueuePlayer = {
        oderId,
        socketId: socket.id,
        deckData,
        rating,
        matchType: data.matchType,
      };

      // Add to queue
      const queue = data.matchType === 'RANKED' ? rankedQueue : normalQueue;

      // Remove if already in queue
      const existingIndex = queue.findIndex(p => p.oderId === oderId);
      if (existingIndex !== -1) {
        queue.splice(existingIndex, 1);
      }

      queue.push(queuePlayer);

      socket.emit('moba_queue_joined', { position: queue.length, matchType: data.matchType });

      // Try to find match
      tryMatchPlayers(io, queue, data.matchType);
    } catch (error) {
      console.error('Queue join error:', error);
      socket.emit('moba_error', { message: '큐 참가 실패' });
    }
  });

  // Leave queue
  socket.on('moba_queue_leave', () => {
    removeFromQueue(oderId);
    socket.emit('moba_queue_left');
  });

  // Submit turn actions
  socket.on('moba_submit_actions', (data: { matchId: string; actions: TurnAction[] }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    if (engine.submitActions(teamNumber, data.actions)) {
      socket.emit('moba_actions_submitted');

      // Check auto-ready for teams with all dead players
      engine.checkAutoReady();

      // Check if both teams ready
      if (engine.areBothTeamsReady()) {
        processTurn(io, data.matchId);
      }
    }
  });

  // Buy item
  socket.on('moba_buy_item', (data: { matchId: string; oderId: number; itemId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) return;

    // Item purchase is handled in turn actions
    socket.emit('moba_item_queued', { itemId: data.itemId });
  });

  // Sell item
  socket.on('moba_sell_item', (data: { matchId: string; oderId: number; itemId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) return;

    socket.emit('moba_item_sell_queued', { itemId: data.itemId });
  });

  // Surrender
  socket.on('moba_surrender', (data: { matchId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) return;

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    if (engine.surrender(teamNumber)) {
      const finalState = engine.getState();

      // Notify both players
      io.to(data.matchId).emit('moba_game_end', {
        winner: finalState.status === 'TEAM1_WINS' ? 1 : 2,
        reason: 'surrender',
        finalState,
      });

      // Process rewards
      processMatchRewards(finalState);

      // Cleanup
      cleanupMatch(data.matchId);
    }
  });

  // Get available items for position
  socket.on('moba_get_items', (data: { position: string }) => {
    const items = getAvailableItems(data.position as any);
    socket.emit('moba_items_list', { items });
  });

  // Get match state
  socket.on('moba_get_state', (data: { matchId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    // Hide enemy actions if not submitted
    const visibleState = getVisibleState(state, teamNumber);
    socket.emit('moba_state', { state: visibleState, teamNumber });
  });

  // Spectate match
  socket.on('moba_spectate', (data: { matchId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    socket.join(data.matchId);
    socket.emit('moba_spectate_joined', { state: engine.getState() });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    removeFromQueue(oderId);

    // Handle in-match disconnect - player who disconnects loses
    const matchId = playerToMatch.get(oderId);
    if (matchId) {
      const engine = activeMatches.get(matchId);
      if (engine) {
        const state = engine.getState();

        // Only process if match is still in progress
        if (state.status === 'IN_PROGRESS') {
          const teamNumber = state.team1.oderId === oderId ? 1 : 2;
          const winner = teamNumber === 1 ? 2 : 1;

          // Update state to show disconnected team lost
          if (teamNumber === 1) {
            state.status = 'TEAM2_WINS';
          } else {
            state.status = 'TEAM1_WINS';
          }

          // Notify remaining player of victory
          io.to(matchId).emit('moba_game_end', {
            winner,
            reason: '상대방 연결 끊김',
            finalState: state,
          });

          // Process rewards
          await processMatchRewards(state);

          // Cleanup
          cleanupMatch(matchId);
        }
      }
    }
  });
}

async function getUserDeck(oderId: number, deckSlot: number): Promise<any> {
  const [decks]: any = await pool.query(
    `SELECT d.*,
      uc_top.id as top_card_id, p_top.id as top_player_id, p_top.name as top_name, p_top.overall as top_overall,
      uc_jg.id as jg_card_id, p_jg.id as jg_player_id, p_jg.name as jg_name, p_jg.overall as jg_overall,
      uc_mid.id as mid_card_id, p_mid.id as mid_player_id, p_mid.name as mid_name, p_mid.overall as mid_overall,
      uc_adc.id as adc_card_id, p_adc.id as adc_player_id, p_adc.name as adc_name, p_adc.overall as adc_overall,
      uc_sup.id as sup_card_id, p_sup.id as sup_player_id, p_sup.name as sup_name, p_sup.overall as sup_overall
    FROM decks d
    LEFT JOIN user_cards uc_top ON d.top_card_id = uc_top.id
    LEFT JOIN players p_top ON uc_top.player_id = p_top.id
    LEFT JOIN user_cards uc_jg ON d.jungle_card_id = uc_jg.id
    LEFT JOIN players p_jg ON uc_jg.player_id = p_jg.id
    LEFT JOIN user_cards uc_mid ON d.mid_card_id = uc_mid.id
    LEFT JOIN players p_mid ON uc_mid.player_id = p_mid.id
    LEFT JOIN user_cards uc_adc ON d.adc_card_id = uc_adc.id
    LEFT JOIN players p_adc ON uc_adc.player_id = p_adc.id
    LEFT JOIN user_cards uc_sup ON d.support_card_id = uc_sup.id
    LEFT JOIN players p_sup ON uc_sup.player_id = p_sup.id
    WHERE d.user_id = ? AND d.deck_slot = ?`,
    [oderId, deckSlot]
  );

  if (decks.length === 0) return null;

  const deck = decks[0];

  return {
    oderId,
    players: [
      { userCardId: deck.top_card_id, playerId: deck.top_player_id, name: deck.top_name, overall: deck.top_overall, position: 'TOP' },
      { userCardId: deck.jg_card_id, playerId: deck.jg_player_id, name: deck.jg_name, overall: deck.jg_overall, position: 'JUNGLE' },
      { userCardId: deck.mid_card_id, playerId: deck.mid_player_id, name: deck.mid_name, overall: deck.mid_overall, position: 'MID' },
      { userCardId: deck.adc_card_id, playerId: deck.adc_player_id, name: deck.adc_name, overall: deck.adc_overall, position: 'ADC' },
      { userCardId: deck.sup_card_id, playerId: deck.sup_player_id, name: deck.sup_name, overall: deck.sup_overall, position: 'SUPPORT' },
    ],
  };
}

function tryMatchPlayers(io: Server, queue: QueuePlayer[], matchType: 'RANKED' | 'NORMAL') {
  if (queue.length < 2) return;

  // Simple matching: take first two players
  // TODO: Implement rating-based matching
  const player1 = queue.shift()!;
  const player2 = queue.shift()!;

  // Create match
  const matchId = `moba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const engine = new GameEngine(matchId, matchType, player1.deckData, player2.deckData);
  activeMatches.set(matchId, engine);

  // Map players to match
  playerToMatch.set(player1.oderId, matchId);
  playerToMatch.set(player2.oderId, matchId);

  // Get sockets and join room
  const socket1 = io.sockets.sockets.get(player1.socketId);
  const socket2 = io.sockets.sockets.get(player2.socketId);

  if (socket1) socket1.join(matchId);
  if (socket2) socket2.join(matchId);

  // Send match start
  const state = engine.getState();

  if (socket1) {
    socket1.emit('moba_match_found', {
      matchId,
      teamNumber: 1,
      state: getVisibleState(state, 1),
      opponent: { username: 'Player 2' }, // TODO: Get actual username
    });
  }

  if (socket2) {
    socket2.emit('moba_match_found', {
      matchId,
      teamNumber: 2,
      state: getVisibleState(state, 2),
      opponent: { username: 'Player 1' },
    });
  }

  // Start turn timer
  startTurnTimer(io, matchId);
}

function startTurnTimer(io: Server, matchId: string) {
  // Clear existing timer
  const existingTimer = matchTimers.get(matchId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    const engine = activeMatches.get(matchId);
    if (!engine) return;

    // Auto-submit empty actions for players who didn't submit
    const state = engine.getState();
    if (!state.team1Ready) {
      engine.submitActions(1, []);
    }
    if (!state.team2Ready) {
      engine.submitActions(2, []);
    }

    // Check auto-ready for dead teams
    engine.checkAutoReady();

    processTurn(io, matchId);
  }, TURN_TIME);

  matchTimers.set(matchId, timer);

  // Notify players of turn start
  io.to(matchId).emit('moba_turn_start', {
    turn: activeMatches.get(matchId)?.getState().currentTurn,
    timeLimit: TURN_TIME,
  });
}

async function processTurn(io: Server, matchId: string) {
  const engine = activeMatches.get(matchId);
  if (!engine) return;

  // Clear timer
  const timer = matchTimers.get(matchId);
  if (timer) {
    clearTimeout(timer);
    matchTimers.delete(matchId);
  }

  // Process the turn
  const result = engine.processTurn();

  // Send turn result to all in room
  io.to(matchId).emit('moba_turn_result', result);

  // Check game end
  if (result.gameEnd) {
    setTimeout(async () => {
      const finalState = engine.getState();

      io.to(matchId).emit('moba_game_end', {
        winner: result.gameEnd!.winner,
        reason: result.gameEnd!.reason,
        finalState,
      });

      // Process rewards
      await processMatchRewards(finalState);

      // Cleanup
      cleanupMatch(matchId);
    }, TURN_PROCESS_DELAY);
  } else {
    // Start next turn after delay
    setTimeout(() => {
      startTurnTimer(io, matchId);
    }, TURN_PROCESS_DELAY);
  }
}

async function processMatchRewards(state: MatchState) {
  const winner = state.status === 'TEAM1_WINS' ? 1 : 2;
  const winnerId = winner === 1 ? state.team1.oderId : state.team2.oderId;
  const loserId = winner === 1 ? state.team2.oderId : state.team1.oderId;

  let winnerPoints, loserPoints, ratingChange;

  if (state.matchType === 'RANKED') {
    winnerPoints = 5000;
    loserPoints = 1000;
    ratingChange = 25;
  } else {
    winnerPoints = 1500;
    loserPoints = 300;
    ratingChange = 0;
  }

  // Update winner
  await pool.query(
    `UPDATE users SET
      points = points + ?,
      rating = rating + ?
    WHERE id = ?`,
    [winnerPoints, ratingChange, winnerId]
  );

  // Update loser
  await pool.query(
    `UPDATE users SET
      points = points + ?,
      rating = GREATEST(0, rating - ?)
    WHERE id = ?`,
    [loserPoints, ratingChange, loserId]
  );

  // Update stats
  await pool.query(
    `UPDATE user_stats SET
      total_matches = total_matches + 1,
      wins = wins + 1
    WHERE user_id = ?`,
    [winnerId]
  );

  await pool.query(
    `UPDATE user_stats SET
      total_matches = total_matches + 1,
      losses = losses + 1
    WHERE user_id = ?`,
    [loserId]
  );

  // Save match to history
  await pool.query(
    `INSERT INTO moba_match_history
      (match_id, player1_id, player2_id, winner_id, match_type, turns, logs)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      state.matchId,
      state.team1.oderId,
      state.team2.oderId,
      winnerId,
      state.matchType,
      state.currentTurn,
      JSON.stringify(state.logs),
    ]
  );
}

function getVisibleState(state: MatchState, teamNumber: 1 | 2): any {
  // Return state with hidden enemy info if needed
  const visibleState = { ...state };

  // Check for wards to reveal enemy positions
  const myTeam = teamNumber === 1 ? state.team1 : state.team2;
  const enemyTeam = teamNumber === 1 ? state.team2 : state.team1;

  // Hide enemy gold and items unless warded
  // TODO: Implement ward vision

  return visibleState;
}

function removeFromQueue(oderId: number) {
  const rankedIndex = rankedQueue.findIndex(p => p.oderId === oderId);
  if (rankedIndex !== -1) {
    rankedQueue.splice(rankedIndex, 1);
  }

  const normalIndex = normalQueue.findIndex(p => p.oderId === oderId);
  if (normalIndex !== -1) {
    normalQueue.splice(normalIndex, 1);
  }
}

function cleanupMatch(matchId: string) {
  const engine = activeMatches.get(matchId);
  if (engine) {
    const state = engine.getState();
    playerToMatch.delete(state.team1.oderId);
    playerToMatch.delete(state.team2.oderId);
  }

  activeMatches.delete(matchId);

  const timer = matchTimers.get(matchId);
  if (timer) {
    clearTimeout(timer);
    matchTimers.delete(matchId);
  }
}

// Get active matches for spectating
export function getActiveMatches(): { matchId: string; team1: string; team2: string; turn: number }[] {
  const matches: any[] = [];

  for (const [matchId, engine] of activeMatches) {
    const state = engine.getState();
    matches.push({
      matchId,
      team1: `Player ${state.team1.oderId}`,
      team2: `Player ${state.team2.oderId}`,
      turn: state.currentTurn,
    });
  }

  return matches;
}
