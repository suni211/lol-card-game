import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/engine';
import { MatchState, TurnAction, TurnResult } from '../game/types';
import { ITEMS, getAvailableItems } from '../game/items';
import { CHAMPIONS } from '../game/skills';
import pool from '../config/database';
import { spectatorCounts } from '../routes/spectator';

// Active matches - exported for spectator
export const activeMatches = new Map<string, GameEngine>();
const playerToMatch = new Map<number, string>(); // oderId -> matchId
const matchTimers = new Map<string, NodeJS.Timeout>();
const spectatorSockets = new Map<string, Set<string>>(); // matchId -> Set of socket IDs

// Constants
const TURN_TIME = 60000; // 60 seconds
const TURN_PROCESS_DELAY = 15000; // 15 seconds for animations
const BAN_PICK_TIME = 30000; // 30 seconds per pick

interface QueuePlayer {
  oderId: number;
  socketId: string;
  deckData: any;
  rating: number;
  matchType: 'RANKED' | 'NORMAL';
  username: string;
}

interface BanPickState {
  matchId: string;
  phase: number; // 1-7: Phase number
  currentTeam: 1 | 2;
  picksPerPhase: number; // How many picks in current phase
  team1Picks: number[]; // Champion IDs picked by team 1
  team2Picks: number[]; // Champion IDs picked by team 2
  bannedChampions: number[]; // All banned champions
  timer?: NodeJS.Timeout;
}

const rankedQueue: QueuePlayer[] = [];
const normalQueue: QueuePlayer[] = [];
const banPickStates = new Map<string, BanPickState>();

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

      // Get user rating and username
      const [users]: any = await pool.query('SELECT rating, username FROM users WHERE id = ?', [oderId]);
      const rating = users[0]?.rating || 1000;
      const username = users[0]?.username || `Player ${oderId}`;

      const queuePlayer: QueuePlayer = {
        oderId,
        socketId: socket.id,
        deckData,
        rating,
        matchType: data.matchType,
        username,
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

  // Get all champions list
  socket.on('moba_get_champions', () => {
    const championList = Object.values(CHAMPIONS).map(c => ({
      id: c.id,
      name: c.name,
      skillName: c.skillName,
      skillDescription: c.skillDescription,
      cooldown: c.cooldown,
      scalingType: c.scalingType,
      championClass: c.championClass,
    }));
    socket.emit('moba_champions_list', { champions: championList });
  });

  // Ban/Pick: Pick a champion
  socket.on('moba_pick_champion', (data: { matchId: string; championId: number; position: string }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) {
      socket.emit('moba_error', { message: '밴/픽 상태를 찾을 수 없습니다.' });
      return;
    }

    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    // Check if it's this team's turn
    if (banPickState.currentTeam !== teamNumber) {
      socket.emit('moba_error', { message: '당신의 차례가 아닙니다.' });
      return;
    }

    // Check if champion is available
    const allPicked = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    if (allPicked.includes(data.championId)) {
      socket.emit('moba_error', { message: '이미 선택되었거나 밴된 챔피언입니다.' });
      return;
    }

    // Add pick
    if (teamNumber === 1) {
      banPickState.team1Picks.push(data.championId);
    } else {
      banPickState.team2Picks.push(data.championId);
    }

    // Clear timer
    if (banPickState.timer) {
      clearTimeout(banPickState.timer);
    }

    // Notify all players
    io.to(data.matchId).emit('moba_champion_picked', {
      teamNumber,
      championId: data.championId,
      position: data.position,
      championName: CHAMPIONS[data.championId]?.name || 'Unknown',
    });

    // Advance to next phase
    advanceBanPickPhase(io, data.matchId, banPickState);
  });

  // Skip ban/pick turn (auto-pick random)
  socket.on('moba_skip_pick', (data: { matchId: string }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) return;

    const engine = activeMatches.get(data.matchId);
    if (!engine) return;

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    if (banPickState.currentTeam !== teamNumber) return;

    // Auto pick random available champion
    const allPicked = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    const availableChampions = Object.keys(CHAMPIONS).map(Number).filter(id => !allPicked.includes(id));

    if (availableChampions.length > 0) {
      const randomChampion = availableChampions[Math.floor(Math.random() * availableChampions.length)];

      if (teamNumber === 1) {
        banPickState.team1Picks.push(randomChampion);
      } else {
        banPickState.team2Picks.push(randomChampion);
      }

      io.to(data.matchId).emit('moba_champion_picked', {
        teamNumber,
        championId: randomChampion,
        position: 'AUTO',
        championName: CHAMPIONS[randomChampion]?.name || 'Unknown',
      });
    }

    if (banPickState.timer) {
      clearTimeout(banPickState.timer);
    }

    advanceBanPickPhase(io, data.matchId, banPickState);
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
  socket.on('moba_spectate', async (data: { matchId: string }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const state = engine.getState();

    // Only allow spectating ranked matches
    if (state.matchType === 'NORMAL') {
      socket.emit('moba_error', { message: '일반전은 관전할 수 없습니다.' });
      return;
    }

    // Join spectator room
    socket.join(data.matchId);
    socket.join(`${data.matchId}_spectators`);

    // Track spectator
    if (!spectatorSockets.has(data.matchId)) {
      spectatorSockets.set(data.matchId, new Set());
    }
    spectatorSockets.get(data.matchId)!.add(socket.id);

    // Update spectator count
    const count = spectatorSockets.get(data.matchId)!.size;
    spectatorCounts.set(data.matchId, count);

    // Get usernames for both players
    const [users]: any = await pool.query(
      'SELECT id, username FROM users WHERE id IN (?, ?)',
      [state.team1.oderId, state.team2.oderId]
    );

    const user1 = users.find((u: any) => u.id === state.team1.oderId);
    const user2 = users.find((u: any) => u.id === state.team2.oderId);

    socket.emit('moba_spectate_joined', {
      state: {
        ...state,
        team1: {
          ...state.team1,
          username: user1?.username || `Player ${state.team1.oderId}`,
        },
        team2: {
          ...state.team2,
          username: user2?.username || `Player ${state.team2.oderId}`,
        },
      },
      spectatorCount: count,
    });

    // Notify others of spectator count update
    io.to(data.matchId).emit('moba_spectator_count', { count });
  });

  // Leave spectate
  socket.on('moba_spectate_leave', (data: { matchId: string }) => {
    removeSpectator(socket, data.matchId);
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    removeFromQueue(oderId);

    // Remove from any spectator rooms
    for (const [matchId, sockets] of spectatorSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        const count = sockets.size;
        spectatorCounts.set(matchId, count);
        io.to(matchId).emit('moba_spectator_count', { count });
        if (count === 0) {
          spectatorSockets.delete(matchId);
          spectatorCounts.delete(matchId);
        }
      }
    }

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

  // Get initial state
  const state = engine.getState();

  // Initialize ban/pick state
  // Phase order: 1팀1개 -> 2팀2개 -> 1팀2개 -> 2팀1개 -> 1팀1개 -> 2팀2개 -> 1팀1개
  const banPickState: BanPickState = {
    matchId,
    phase: 1,
    currentTeam: 1,
    picksPerPhase: 1,
    team1Picks: [],
    team2Picks: [],
    bannedChampions: [],
  };
  banPickStates.set(matchId, banPickState);

  // Update game state to BAN_PICK
  state.status = 'BAN_PICK';
  state.banPickPhase = 1;

  // Get all champions for picking
  const championList = Object.values(CHAMPIONS).map(c => ({
    id: c.id,
    name: c.name,
    skillName: c.skillName,
    skillDescription: c.skillDescription,
    cooldown: c.cooldown,
    scalingType: c.scalingType,
    championClass: c.championClass,
  }));

  // Send match found with ban/pick info
  if (socket1) {
    socket1.emit('moba_match_found', {
      matchId,
      teamNumber: 1,
      state: getVisibleState(state, 1),
      opponent: { username: player2.username, oderId: player2.oderId },
      banPickPhase: true,
      champions: championList,
    });
  }

  if (socket2) {
    socket2.emit('moba_match_found', {
      matchId,
      teamNumber: 2,
      state: getVisibleState(state, 2),
      opponent: { username: player1.username, oderId: player1.oderId },
      banPickPhase: true,
      champions: championList,
    });
  }

  // Start ban/pick phase
  startBanPickTimer(io, matchId, banPickState);
}

// Ban/Pick phase management
function startBanPickTimer(io: Server, matchId: string, banPickState: BanPickState) {
  // Clear existing timer
  if (banPickState.timer) {
    clearTimeout(banPickState.timer);
  }

  // Notify players of current phase
  io.to(matchId).emit('moba_ban_pick_phase', {
    phase: banPickState.phase,
    currentTeam: banPickState.currentTeam,
    picksNeeded: getPicksForPhase(banPickState.phase),
    team1Picks: banPickState.team1Picks,
    team2Picks: banPickState.team2Picks,
    bannedChampions: banPickState.bannedChampions,
    timeLimit: BAN_PICK_TIME,
  });

  // Set timeout for auto-pick
  banPickState.timer = setTimeout(() => {
    // Auto-pick random champion for current team
    const allPicked = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    const availableChampions = Object.keys(CHAMPIONS).map(Number).filter(id => !allPicked.includes(id));

    if (availableChampions.length > 0) {
      const randomChampion = availableChampions[Math.floor(Math.random() * availableChampions.length)];

      if (banPickState.currentTeam === 1) {
        banPickState.team1Picks.push(randomChampion);
      } else {
        banPickState.team2Picks.push(randomChampion);
      }

      io.to(matchId).emit('moba_champion_picked', {
        teamNumber: banPickState.currentTeam,
        championId: randomChampion,
        position: 'AUTO',
        championName: CHAMPIONS[randomChampion]?.name || 'Unknown',
        isAutoPick: true,
      });
    }

    advanceBanPickPhase(io, matchId, banPickState);
  }, BAN_PICK_TIME);
}

function getPicksForPhase(phase: number): number {
  // Phase order: 1팀1개 -> 2팀2개 -> 1팀2개 -> 2팀1개 -> 1팀1개 -> 2팀2개 -> 1팀1개
  switch (phase) {
    case 1: return 1; // Team 1: 1 pick
    case 2: return 2; // Team 2: 2 picks
    case 3: return 2; // Team 1: 2 picks
    case 4: return 1; // Team 2: 1 pick
    case 5: return 1; // Team 1: 1 pick
    case 6: return 2; // Team 2: 2 picks
    case 7: return 1; // Team 1: 1 pick (final)
    default: return 0;
  }
}

function getTeamForPhase(phase: number): 1 | 2 {
  switch (phase) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 1;
    case 4: return 2;
    case 5: return 1;
    case 6: return 2;
    case 7: return 1;
    default: return 1;
  }
}

function advanceBanPickPhase(io: Server, matchId: string, banPickState: BanPickState) {
  const currentPicksNeeded = getPicksForPhase(banPickState.phase);
  const currentTeamPicks = banPickState.currentTeam === 1 ? banPickState.team1Picks : banPickState.team2Picks;

  // Check how many picks were made in this phase
  const previousPhasePicks = banPickState.phase === 1 ? 0 :
    getTotalPicksBeforePhase(banPickState.phase, banPickState.currentTeam);
  const currentPhasePicks = currentTeamPicks.length - previousPhasePicks;

  if (currentPhasePicks < currentPicksNeeded) {
    // Still need more picks in this phase
    startBanPickTimer(io, matchId, banPickState);
    return;
  }

  // Move to next phase
  banPickState.phase++;

  // Check if ban/pick is complete (total 5 picks per team)
  if (banPickState.team1Picks.length >= 5 && banPickState.team2Picks.length >= 5) {
    // Ban/pick complete, start game
    finishBanPick(io, matchId, banPickState);
    return;
  }

  // Set next team
  banPickState.currentTeam = getTeamForPhase(banPickState.phase);

  // Continue ban/pick
  startBanPickTimer(io, matchId, banPickState);
}

function getTotalPicksBeforePhase(phase: number, team: 1 | 2): number {
  let total = 0;
  for (let i = 1; i < phase; i++) {
    if (getTeamForPhase(i) === team) {
      total += getPicksForPhase(i);
    }
  }
  return total;
}

function finishBanPick(io: Server, matchId: string, banPickState: BanPickState) {
  const engine = activeMatches.get(matchId);
  if (!engine) return;

  // Assign champions to players
  const state = engine.getState();

  // Assign team 1 champions (5 picks for 5 positions)
  const positions: ('TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT')[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  for (let i = 0; i < 5; i++) {
    const player = state.team1.players.find(p => p.position === positions[i]);
    if (player && banPickState.team1Picks[i]) {
      player.championId = banPickState.team1Picks[i];
      player.skill = {
        championId: banPickState.team1Picks[i],
        currentCooldown: 0,
        hasBeenUsed: false,
        skillLevel: 0,
      };
    }
  }

  // Assign team 2 champions
  for (let i = 0; i < 5; i++) {
    const player = state.team2.players.find(p => p.position === positions[i]);
    if (player && banPickState.team2Picks[i]) {
      player.championId = banPickState.team2Picks[i];
      player.skill = {
        championId: banPickState.team2Picks[i],
        currentCooldown: 0,
        hasBeenUsed: false,
        skillLevel: 0,
      };
    }
  }

  // Update state
  state.status = 'IN_PROGRESS';
  state.bannedChampions = banPickState.bannedChampions;

  // Clean up ban/pick state
  if (banPickState.timer) {
    clearTimeout(banPickState.timer);
  }
  banPickStates.delete(matchId);

  // Notify players
  io.to(matchId).emit('moba_ban_pick_complete', {
    team1Picks: banPickState.team1Picks,
    team2Picks: banPickState.team2Picks,
    state: getVisibleState(state, 1),
  });

  // Start game timer
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

  // Get engine and check for upcoming event
  const engine = activeMatches.get(matchId);
  const upcomingEvent = engine?.getUpcomingEvent();
  const currentTurn = engine?.getState().currentTurn;

  // Notify players of turn start
  io.to(matchId).emit('moba_turn_start', {
    turn: currentTurn,
    timeLimit: TURN_TIME,
    upcomingEvent: upcomingEvent || null,
  });

  // If there's a teamfight event, send special notification
  if (upcomingEvent) {
    const eventNames: Record<string, string> = {
      'GRUB': '유충',
      'DRAGON': '드래곤',
      'BARON': '바론',
      'ELDER': '장로 드래곤',
    };

    io.to(matchId).emit('moba_teamfight_alert', {
      turn: currentTurn,
      event: upcomingEvent,
      eventName: eventNames[upcomingEvent] || upcomingEvent,
      message: `⚔️ ${currentTurn}턴 한타! ${eventNames[upcomingEvent] || upcomingEvent} 쟁탈전이 시작됩니다!`,
    });
  }
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

  // Save item statistics for both teams
  const saveTeamItemStats = async (team: typeof state.team1, isWinner: boolean) => {
    for (const player of team.players) {
      for (const itemId of player.items) {
        const item = ITEMS[itemId];
        if (item) {
          await pool.query(
            `INSERT INTO moba_item_stats
              (match_id, user_id, player_position, item_id, item_name, gold_spent, is_winner, match_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              state.matchId,
              team.oderId,
              player.position,
              itemId,
              item.name,
              item.cost,
              isWinner,
              state.matchType,
            ]
          );
        }
      }
    }
  };

  try {
    await saveTeamItemStats(state.team1, winner === 1);
    await saveTeamItemStats(state.team2, winner === 2);
  } catch (itemError) {
    console.error('Error saving item stats:', itemError);
    // Don't fail the whole process if item stats fail
  }
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

function removeSpectator(socket: Socket, matchId: string) {
  const sockets = spectatorSockets.get(matchId);
  if (sockets) {
    sockets.delete(socket.id);
    const count = sockets.size;
    spectatorCounts.set(matchId, count);
    socket.leave(matchId);
    socket.leave(`${matchId}_spectators`);

    // Broadcast updated count
    const io = socket.nsp;
    io.to(matchId).emit('moba_spectator_count', { count });

    if (count === 0) {
      spectatorSockets.delete(matchId);
      spectatorCounts.delete(matchId);
    }
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

  // Cleanup spectator data
  spectatorSockets.delete(matchId);
  spectatorCounts.delete(matchId);
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
