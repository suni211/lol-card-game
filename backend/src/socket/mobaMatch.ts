import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/engine';
import { MatchState, TurnAction, TurnResult } from '../game/types';
import { ITEMS, getAvailableItems } from '../game/items';
import { CHAMPIONS } from '../game/skills';
import pool from '../config/database';
import { spectatorCounts } from '../routes/spectator';
import { calculateTier } from '../utils/tierCalculator';

// Active matches - exported for spectator
export const activeMatches = new Map<string, GameEngine>();
const playerToMatch = new Map<number, string>(); // oderId -> matchId
const userIdToSocketId = new Map<number, string>(); // oderId -> socketId
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
  phase: 'BAN_1' | 'PICK_1' | 'BAN_2' | 'PICK_2' | 'COMPLETE';
  turn: number; // 1-20 overall turn
  team1Picks: number[];
  team2Picks: number[];
  bannedChampions: number[];
  timer?: NodeJS.Timeout;
}

// Standard 5v5 draft phase configuration
const phaseConfig: { phase: BanPickState['phase']; turn: number; team: 1 | 2; type: 'BAN' | 'PICK' }[] = [
  // Ban Phase 1
  { phase: 'BAN_1', turn: 1, team: 1, type: 'BAN' },
  { phase: 'BAN_1', turn: 2, team: 2, type: 'BAN' },
  { phase: 'BAN_1', turn: 3, team: 1, type: 'BAN' },
  { phase: 'BAN_1', turn: 4, team: 2, type: 'BAN' },
  { phase: 'BAN_1', turn: 5, team: 1, type: 'BAN' },
  { phase: 'BAN_1', turn: 6, team: 2, type: 'BAN' },
  // Pick Phase 1
  { phase: 'PICK_1', turn: 7, team: 1, type: 'PICK' },
  { phase: 'PICK_1', turn: 8, team: 2, type: 'PICK' },
  { phase: 'PICK_1', turn: 9, team: 2, type: 'PICK' },
  { phase: 'PICK_1', turn: 10, team: 1, type: 'PICK' },
  { phase: 'PICK_1', turn: 11, team: 1, type: 'PICK' },
  { phase: 'PICK_1', turn: 12, team: 2, type: 'PICK' },
  // Ban Phase 2
  { phase: 'BAN_2', turn: 13, team: 2, type: 'BAN' },
  { phase: 'BAN_2', turn: 14, team: 1, type: 'BAN' },
  { phase: 'BAN_2', turn: 15, team: 2, type: 'BAN' },
  { phase: 'BAN_2', turn: 16, team: 1, type: 'BAN' },
  // Pick Phase 2
  { phase: 'PICK_2', turn: 17, team: 2, type: 'PICK' },
  { phase: 'PICK_2', turn: 18, team: 1, type: 'PICK' },
  { phase: 'PICK_2', turn: 19, team: 2, type: 'PICK' },
  { phase: 'PICK_2', turn: 20, team: 1, type: 'PICK' },
];

const rankedQueue: QueuePlayer[] = [];
const normalQueue: QueuePlayer[] = [];
const banPickStates = new Map<string, BanPickState>();

function getSocketIdByUserId(userId: number): string | undefined {
  return userIdToSocketId.get(userId);
}

export function setupMobaMatch(io: Server, socket: Socket, user: any) {
  const oderId = user.id;
  userIdToSocketId.set(oderId, socket.id);

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
      userIdToSocketId.set(oderId, socket.id);

      socket.emit('moba_queue_joined', { position: queue.length, matchType: data.matchType });

      // Broadcast match notification to all other users (excluding sender)
      socket.broadcast.emit('moba_match_notification', {
        userId: oderId,
        username,
        matchType: data.matchType,
        rating,
        queuePosition: queue.length,
      });

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

  // Set ready state (with actions)
  socket.on('moba_set_ready', (data: { matchId: string; isReady: boolean; actions: TurnAction[] }) => {
    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const state = engine.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    if (data.isReady) {
      // Submit actions and set ready
      if (engine.submitActions(teamNumber, data.actions)) {
        socket.emit('moba_actions_submitted');

        // Check auto-ready for teams with all dead players
        engine.checkAutoReady();

        // Check if both teams ready - auto process turn
        if (engine.areBothTeamsReady()) {
          processTurn(io, data.matchId);
        }
      }
    } else {
      // Unset ready state
      if (teamNumber === 1) {
        state.team1Ready = false;
        state.team1Actions = [];
      } else {
        state.team2Ready = false;
        state.team2Actions = [];
      }
      socket.emit('moba_ready_state_changed', { isReady: false });
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
      processMatchRewards(io, finalState);

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

  // Ban/Pick: Ban a champion
  socket.on('moba_ban_champion', (data: { matchId: string; championId: number }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) {
      console.log(`[moba_ban_champion] No banPickState for matchId: ${data.matchId}`);
      return;
    }

    const currentPhase = phaseConfig.find(p => p.turn === banPickState.turn);
    if (!currentPhase || currentPhase.type !== 'BAN') {
      console.log(`[moba_ban_champion] Not a ban phase or no currentPhase for turn ${banPickState.turn}`);
      return;
    }

    const state = activeMatches.get(data.matchId)!.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    console.log(`[moba_ban_champion] Received ban request from team ${teamNumber} (user ${oderId}) for champion ${data.championId}. Current turn: ${banPickState.turn}, Expected team: ${currentPhase.team}`);

    if (currentPhase.team !== teamNumber) {
      socket.emit('moba_error', { message: '밴할 차례가 아닙니다.' });
      console.log(`[moba_ban_champion] ERROR: Team ${teamNumber} tried to ban, but it's team ${currentPhase.team}'s turn.`);
      return;
    }

    const allPickedOrBanned = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    if (allPickedOrBanned.includes(data.championId)) {
      return socket.emit('moba_error', { message: '이미 선택되거나 밴된 챔피언입니다.' });
    }

    banPickState.bannedChampions.push(data.championId);

    io.to(data.matchId).emit('moba_champion_banned', {
      championId: data.championId,
      teamNumber,
    });

    banPickState.turn++; // Increment turn here
    advanceBanPick(io, data.matchId, banPickState);
  });

  // Ban/Pick: Pick a champion
  socket.on('moba_pick_champion', (data: { matchId: string; championId: number }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) {
      console.log(`[moba_pick_champion] No banPickState for matchId: ${data.matchId}`);
      return;
    }

    const currentPhase = phaseConfig.find(p => p.turn === banPickState.turn);
    if (!currentPhase || currentPhase.type !== 'PICK') {
      console.log(`[moba_pick_champion] Not a pick phase or no currentPhase for turn ${banPickState.turn}`);
      return;
    }

    const state = activeMatches.get(data.matchId)!.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    console.log(`[moba_pick_champion] Received pick request from team ${teamNumber} (user ${oderId}) for champion ${data.championId}. Current turn: ${banPickState.turn}, Expected team: ${currentPhase.team}`);

    if (currentPhase.team !== teamNumber) {
      socket.emit('moba_error', { message: '선택할 차례가 아닙니다.' });
      console.log(`[moba_pick_champion] ERROR: Team ${teamNumber} tried to pick, but it's team ${currentPhase.team}'s turn.`);
      return;
    }

    const allPickedOrBanned = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    if (allPickedOrBanned.includes(data.championId)) {
      return socket.emit('moba_error', { message: '이미 선택되었거나 밴된 챔피언입니다.' });
    }

    if (teamNumber === 1) {
      banPickState.team1Picks.push(data.championId);
    } else {
      banPickState.team2Picks.push(data.championId);
    }

    io.to(data.matchId).emit('moba_champion_picked', {
      championId: data.championId,
      teamNumber,
    });

    banPickState.turn++; // Increment turn here
    advanceBanPick(io, data.matchId, banPickState);
  });

  // Skip ban/pick turn (auto-pick/ban random)
  socket.on('moba_skip_turn', (data: { matchId: string }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) return;

    const currentPhase = phaseConfig.find(p => p.turn === banPickState.turn);
    if (!currentPhase) return;
    
    const state = activeMatches.get(data.matchId)!.getState();
    const teamNumber = state.team1.oderId === oderId ? 1 : 2;

    if (currentPhase.team !== teamNumber) return;

    // Auto pick/ban random available champion
    const allPickedOrBanned = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    const availableChampions = Object.keys(CHAMPIONS).map(Number).filter(id => !allPickedOrBanned.includes(id));
    const randomChampion = availableChampions[Math.floor(Math.random() * availableChampions.length)];

    if (currentPhase.type === 'BAN') {
      banPickState.bannedChampions.push(randomChampion);
      io.to(data.matchId).emit('moba_champion_banned', { championId: randomChampion, teamNumber, isAuto: true });
    } else {
      if (teamNumber === 1) {
        banPickState.team1Picks.push(randomChampion);
      } else {
        banPickState.team2Picks.push(randomChampion);
      }
      io.to(data.matchId).emit('moba_champion_picked', { championId: randomChampion, teamNumber, isAuto: true });
    }
    
    advanceBanPick(io, data.matchId, banPickState);
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


  // Request to swap champions between two players on the same team
  socket.on('moba_request_swap', (data: { matchId: string; player1OderId: number; player2OderId: number; champion1Id: number; champion2Id: number }) => {
    const banPickState = banPickStates.get(data.matchId);
    if (!banPickState) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    const engine = activeMatches.get(data.matchId);
    if (!engine) {
      socket.emit('moba_error', { message: '매치를 찾을 수 없습니다.' });
      return;
    }

    // Ensure swapping is allowed only after all picks have been made (turn > phaseConfig.length for picks)
    // and before the game officially starts (match status not IN_PROGRESS)
    if (banPickState.turn <= phaseConfig.length || engine.getState().status === 'IN_PROGRESS') {
        socket.emit('moba_error', { message: '지금은 챔피언을 스왑할 수 없습니다. 밴/픽 단계가 완료된 후 게임 시작 전에 스왑 가능합니다.' });
        return;
    }

    const state = engine.getState();
    const team1 = state.team1;
    const team2 = state.team2;

    let teamNumber: 1 | 2 | undefined;
    let player1IndexInTeam: number = -1;
    let player2IndexInTeam: number = -1;

    // Determine team and find player indices based on oderId
    const findPlayerInTeam = (teamPlayers: any[], oderIdToFind: number) => teamPlayers.findIndex(p => p.oderId === oderIdToFind);

    player1IndexInTeam = findPlayerInTeam(team1.players, data.player1OderId);
    player2IndexInTeam = findPlayerInTeam(team1.players, data.player2OderId);

    if (player1IndexInTeam !== -1 && player2IndexInTeam !== -1) {
      teamNumber = 1;
    } else {
      player1IndexInTeam = findPlayerInTeam(team2.players, data.player1OderId);
      player2IndexInTeam = findPlayerInTeam(team2.players, data.player2OderId);
      if (player1IndexInTeam !== -1 && player2IndexInTeam !== -1) {
        teamNumber = 2;
      } else {
        socket.emit('moba_error', { message: '스왑 요청 플레이어가 같은 팀에 속해 있지 않거나 매치에 없습니다.' });
        return;
      }
    }

    const teamPlayers = teamNumber === 1 ? team1.players : team2.players;
    const player1 = teamPlayers[player1IndexInTeam];
    const player2 = teamPlayers[player2IndexInTeam];

    // Ensure the champions specified in the request match the current champion assignments for these players
    if (player1.championId !== data.champion1Id || player2.championId !== data.champion2Id) {
      socket.emit('moba_error', { message: '스왑하려는 챔피언 정보가 현재 플레이어의 챔피언과 일치하지 않습니다.' });
      return;
    }
    
    // Perform the swap in the GameEngine's state
    const tempChampionId = player1.championId;
    player1.championId = player2.championId;
    player2.championId = tempChampionId;

    engine.initializePlayersWithChampions(); // Re-initialize skills based on new champion assignments

    io.to(data.matchId).emit('moba_champion_swapped', {
      teamNumber,
      player1OderId: data.player1OderId,
      player2OderId: data.player2OderId,
      player1NewChampionId: player1.championId, // Send new champion for player1
      player2NewChampionId: player2.championId, // Send new champion for player2
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    const disconnectedUserId = [...userIdToSocketId.entries()]
        .find(([_, socketId]) => socketId === socket.id)?.[0];
    
    if (disconnectedUserId) {
        removeFromQueue(disconnectedUserId);
        userIdToSocketId.delete(disconnectedUserId);
    }

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
    const matchId = disconnectedUserId ? playerToMatch.get(disconnectedUserId) : undefined;
    if (matchId) {
      const engine = activeMatches.get(matchId);
      if (engine) {
        const state = engine.getState();

        // Only process if match is still in progress
        if (state.status === 'IN_PROGRESS') {
          const teamNumber = state.team1.oderId === disconnectedUserId ? 1 : 2;
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
          await processMatchRewards(io, state);

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
  const banPickState: BanPickState = {
    matchId,
    phase: 'BAN_1',
    turn: 1,
    team1Picks: [],
    team2Picks: [],
    bannedChampions: [],
  };
  banPickStates.set(matchId, banPickState);

  // Update game state to BAN_PICK
  state.status = 'BAN_PICK';

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
  advanceBanPick(io, matchId, banPickState);
}

// Ban/Pick phase management
function advanceBanPick(io: Server, matchId: string, banPickState: BanPickState) {
  if (banPickState.timer) {
    clearTimeout(banPickState.timer);
  }

  // Check if complete
  if (banPickState.turn > phaseConfig.length) {
    finishBanPick(io, matchId, banPickState);
    return;
  }

  const currentPhaseInfo = phaseConfig.find(p => p.turn === banPickState.turn);
  if (!currentPhaseInfo) {
    // Should not happen
    finishBanPick(io, matchId, banPickState);
    return;
  }

  banPickState.phase = currentPhaseInfo.phase;

  // Notify players of current phase
  io.to(matchId).emit('moba_ban_pick_phase', {
    ...currentPhaseInfo,
    team1Picks: banPickState.team1Picks,
    team2Picks: banPickState.team2Picks,
    bannedChampions: banPickState.bannedChampions,
    timeLimit: BAN_PICK_TIME,
  });

  // Set timeout for auto-action
  banPickState.timer = setTimeout(() => {
    const allPickedOrBanned = [...banPickState.team1Picks, ...banPickState.team2Picks, ...banPickState.bannedChampions];
    const availableChampions = Object.keys(CHAMPIONS).map(Number).filter(id => !allPickedOrBanned.includes(id));
    const randomChampion = availableChampions[Math.floor(Math.random() * availableChampions.length)];

    if (currentPhaseInfo.type === 'BAN') {
      banPickState.bannedChampions.push(randomChampion);
      io.to(matchId).emit('moba_champion_banned', { championId: randomChampion, teamNumber: currentPhaseInfo.team, isAuto: true });
    } else { // PICK
      if (currentPhaseInfo.team === 1) {
        banPickState.team1Picks.push(randomChampion);
      } else {
        banPickState.team2Picks.push(randomChampion);
      }
      io.to(matchId).emit('moba_champion_picked', { championId: randomChampion, teamNumber: currentPhaseInfo.team, isAuto: true });
    }
    
    banPickState.turn++;
    advanceBanPick(io, matchId, banPickState);
  }, BAN_PICK_TIME);
}

function finishBanPick(io: Server, matchId: string, banPickState: BanPickState) {
  const engine = activeMatches.get(matchId);
  if (!engine) return;

  if (banPickState.timer) {
    clearTimeout(banPickState.timer);
  }

  // Assign champions to players
  const state = engine.getState();
  const positions: ('TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT')[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  
  for (let i = 0; i < 5; i++) {
    const team1Player = state.team1.players.find(p => p.position === positions[i]);
    if (team1Player && banPickState.team1Picks[i]) {
      team1Player.championId = banPickState.team1Picks[i];
    }
    const team2Player = state.team2.players.find(p => p.position === positions[i]);
    if (team2Player && banPickState.team2Picks[i]) {
      team2Player.championId = banPickState.team2Picks[i];
    }
  }

  // Update state
  state.status = 'IN_PROGRESS';
  state.bannedChampions = banPickState.bannedChampions;
  state.team1Picks = banPickState.team1Picks;
  state.team2Picks = banPickState.team2Picks;
  engine.initializePlayersWithChampions(); // Make sure skills etc are initialized

  // Clean up ban/pick state
  banPickStates.delete(matchId);

  // Notify players
  io.to(matchId).emit('moba_ban_pick_complete', {
    team1Picks: banPickState.team1Picks,
    team2Picks: banPickState.team2Picks,
    bannedChampions: banPickState.bannedChampions,
    state: engine.getState(), // Send the final, initialized state
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

    // Auto-submit default actions for players who didn't submit
    const state = engine.getState();
    if (!state.team1Ready) {
      const defaultActionsTeam1: TurnAction[] = state.team1.players.map(p => ({
        oderId: p.oderId,
        action: 'FIGHT', // Default to fight
      }));
      engine.submitActions(1, defaultActionsTeam1);
    }
    if (!state.team2Ready) {
      const defaultActionsTeam2: TurnAction[] = state.team2.players.map(p => ({
        oderId: p.oderId,
        action: 'FIGHT', // Default to fight
      }));
      engine.submitActions(2, defaultActionsTeam2);
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
  console.log(`[startTurnTimer] Match ${matchId}: Starting turn timer for turn ${currentTurn || 'N/A'}`);

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
  console.log(`[processTurn] Match ${matchId}: Processing turn ${engine.getState().currentTurn}`);
  const result = engine.processTurn();

  console.log(`[processTurn] Match ${matchId}: Turn ${engine.getState().currentTurn} processed. Game end: ${!!result.gameEnd}`);

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
      await processMatchRewards(io, finalState);

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

async function processMatchRewards(io: Server, state: MatchState) {
  const winner = state.status === 'TEAM1_WINS' ? 1 : 2;
  const winnerId = winner === 1 ? state.team1.oderId : state.team2.oderId;
  const loserId = winner === 1 ? state.team2.oderId : state.team1.oderId;

  let winnerPoints, loserPoints, ratingChange;

  if (state.matchType === 'RANKED') {
    winnerPoints = 15000;
    loserPoints = 10000;
    ratingChange = 25;
  } else {
    winnerPoints = 1500;
    loserPoints = 300;
    ratingChange = 0;
  }

  // Update champion stats
  await updateChampionStats(state, winner);

  // Get current tier before update (for promotion check)
  const [winnerBefore]: any = await pool.query(
    'SELECT rating, tier FROM users WHERE id = ?',
    [winnerId]
  );
  const oldWinnerTier = winnerBefore[0]?.tier || 'IRON';
  const oldWinnerRating = winnerBefore[0]?.rating || 0;
  const newWinnerRating = oldWinnerRating + ratingChange;
  const newWinnerTier = calculateTier(newWinnerRating);

  // Get loser info
  const [loserBefore]: any = await pool.query(
    'SELECT rating FROM users WHERE id = ?',
    [loserId]
  );
  const oldLoserRating = loserBefore[0]?.rating || 0;
  const newLoserRating = Math.max(0, oldLoserRating - ratingChange);
  const newLoserTier = calculateTier(newLoserRating);

  // Update winner
  await pool.query(
    `UPDATE users SET
      points = points + ?,
      rating = ?,
      tier = ?
    WHERE id = ?`,
    [winnerPoints, newWinnerRating, newWinnerTier, winnerId]
  );

  // Check for tier promotion (only for ranked matches)
  if (state.matchType === 'RANKED' && newWinnerTier !== oldWinnerTier) {
    // Tier promoted! Give 1,000,000 points
    await pool.query(
      'UPDATE users SET points = points + 1000000 WHERE id = ?',
      [winnerId]
    );
    
    // Notify winner of tier promotion
    const winnerSocketId = getSocketIdByUserId(winnerId);
    if (winnerSocketId) {
      io.to(winnerSocketId).emit('tier_promotion', {
        oldTier: oldWinnerTier,
        newTier: newWinnerTier,
        rewardPoints: 1000000,
      });
    }
  }

  // Update loser
  await pool.query(
    `UPDATE users SET
      points = points + ?,
      rating = ?,
      tier = ?
    WHERE id = ?`,
    [loserPoints, newLoserRating, newLoserTier, loserId]
  );

  // --- START: Notify users of their updated points ---
  try {
    const [updatedUsers]: any = await pool.query(
      'SELECT id, username, points, rating, level, exp, guild_id FROM users WHERE id IN (?, ?)',
      [winnerId, loserId]
    );

    const winnerData = updatedUsers.find((u: any) => u.id === winnerId);
    const loserData = updatedUsers.find((u: any) => u.id === loserId);

    const winnerSocketId = getSocketIdByUserId(winnerId);
    const loserSocketId = getSocketIdByUserId(loserId);

    if (winnerData && winnerSocketId) {
      io.to(winnerSocketId).emit('user_update', winnerData);
    }
    if (loserData && loserSocketId) {
      io.to(loserSocketId).emit('user_update', loserData);
    }
  } catch (error) {
    console.error('Error fetching or emitting user updates after match:', error);
  }
  // --- END: Notify users of their updated points ---

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

async function updateChampionStats(state: MatchState, winner: 1 | 2) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // This query is not needed here as it's already in processMatchRewards
    // await connection.query('INSERT INTO moba_match_history (match_id) VALUES (?)', [state.matchId]);

    // Update ban counts
    for (const championId of state.bannedChampions) {
      await connection.query(
        `INSERT INTO moba_champion_stats (champion_id, ban_count) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE ban_count = ban_count + 1`,
        [championId]
      );
    }

    // Update pick and win counts for Team 1
    for (const championId of state.team1Picks) {
      const isWinner = winner === 1;
      await connection.query(
        `INSERT INTO moba_champion_stats (champion_id, pick_count, win_count) VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE pick_count = pick_count + 1, win_count = win_count + ?`,
        [championId, isWinner ? 1 : 0, isWinner ? 1 : 0]
      );
    }

    // Update pick and win counts for Team 2
    for (const championId of state.team2Picks) {
      const isWinner = winner === 2;
      await connection.query(
        `INSERT INTO moba_champion_stats (champion_id, pick_count, win_count) VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE pick_count = pick_count + 1, win_count = win_count + ?`,
        [championId, isWinner ? 1 : 0, isWinner ? 1 : 0]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error updating champion stats:', error);
  } finally {
    connection.release();
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
  userIdToSocketId.delete(oderId);
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
    userIdToSocketId.delete(state.team1.oderId);
    userIdToSocketId.delete(state.team2.oderId);
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
