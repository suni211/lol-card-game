import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  Swords,
  Shield,
  ShoppingBag,
  Clock,
  Zap,
  Target,
  Flag,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import type {
  MatchState,
  PlayerState,
  TurnAction,
  TurnResult,
  Item,
  PlayerAction,
  Lane,
} from '../types/moba';
import {
  POSITION_ACTIONS,
  EVENT_INFO,
} from '../types/moba';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function MobaMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuthStore();
  const matchType = (searchParams.get('type') as 'RANKED' | 'NORMAL') || 'NORMAL';
  const deckSlot = parseInt(searchParams.get('deck') || '1');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'queuing' | 'matched' | 'playing' | 'ended'>('connecting');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [teamNumber, setTeamNumber] = useState<1 | 2>(1);
  const [actions, setActions] = useState<Map<number, TurnAction>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerState | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showSurrender, setShowSurrender] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [opponentName, setOpponentName] = useState<string>('');
  const [teamfightAlert, setTeamfightAlert] = useState<{
    event: string;
    eventName: string;
    message: string;
  } | null>(null);

  // Connect to socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('[MobaMatch] Socket connected');
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('auth_success', () => {
      console.log('[MobaMatch] Authenticated, joining queue...');
      setStatus('queuing');
      newSocket.emit('moba_queue_join', { matchType, deckSlot });
    });

    newSocket.on('moba_queue_joined', (data) => {
      console.log('[MobaMatch] Joined queue, position:', data.position);
      toast.success(`큐에 참가했습니다. (${data.position}번째)`);
    });

    newSocket.on('moba_match_found', (data) => {
      console.log('[MobaMatch] Match found!', data);
      setMatchState(data.state);
      setTeamNumber(data.teamNumber);
      setOpponentName(data.opponent?.username || '상대방');
      setStatus('playing');
      toast.success('매치 시작!');
    });

    newSocket.on('moba_turn_start', (data) => {
      console.log('[MobaMatch] Turn start:', data.turn);
      setTimeLeft(Math.floor(data.timeLimit / 1000));
      setTurnResult(null);
      setActions(new Map());
      setHasSubmitted(false);
      setTeamfightAlert(null);
    });

    newSocket.on('moba_teamfight_alert', (data) => {
      console.log('[MobaMatch] Teamfight alert:', data);
      setTeamfightAlert({
        event: data.event,
        eventName: data.eventName,
        message: data.message,
      });
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setTeamfightAlert(null);
      }, 5000);
    });

    newSocket.on('moba_actions_submitted', () => {
      toast.success('행동이 제출되었습니다.');
    });

    newSocket.on('moba_turn_result', (result: TurnResult) => {
      console.log('[MobaMatch] Turn result:', result);
      setTurnResult(result);
      setMatchState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          team1: result.team1State,
          team2: result.team2State,
          currentTurn: result.turn + 1,
        };
      });
    });

    newSocket.on('moba_game_end', (data) => {
      console.log('[MobaMatch] Game ended:', data);
      setWinner(data.winner);
      setStatus('ended');
      setMatchState(data.finalState);
    });

    newSocket.on('moba_items_list', (data) => {
      setItems(data.items);
    });

    newSocket.on('moba_error', (data) => {
      toast.error(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, matchType, deckSlot]);

  // Timer countdown
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when timer reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && status === 'playing' && socket && matchState && !hasSubmitted) {
      setHasSubmitted(true);

      // Set default actions for players without actions
      const myTeamPlayers = teamNumber === 1 ? matchState.team1.players : matchState.team2.players;
      const updatedActions = new Map(actions);

      for (const player of myTeamPlayers) {
        if (player.isDead) continue;
        if (!updatedActions.has(player.oderId)) {
          // Set default action based on position
          let defaultAction: PlayerAction = 'FIGHT';
          if (player.position === 'JUNGLE') {
            defaultAction = 'FARM';
          }
          updatedActions.set(player.oderId, { oderId: player.oderId, action: defaultAction });
        }
      }

      // Submit actions
      const actionArray = Array.from(updatedActions.values());
      socket.emit('moba_submit_actions', {
        matchId: matchState.matchId,
        actions: actionArray,
      });

      toast('시간 초과! 행동이 자동으로 제출되었습니다.', { icon: '⏰' });
    }
  }, [timeLeft, status, socket, matchState, teamNumber, actions, hasSubmitted]);

  // Set action for player
  const setPlayerAction = useCallback((oderId: number, action: PlayerAction) => {
    setActions(prev => {
      const newActions = new Map(prev);
      const existing = newActions.get(oderId) || { oderId, action: 'FIGHT' };
      newActions.set(oderId, { ...existing, action });
      return newActions;
    });
  }, []);

  // Submit actions
  const submitActions = useCallback(() => {
    if (!socket || !matchState || hasSubmitted) return;

    setHasSubmitted(true);
    const actionArray = Array.from(actions.values());
    socket.emit('moba_submit_actions', {
      matchId: matchState.matchId,
      actions: actionArray,
    });
  }, [socket, matchState, actions, hasSubmitted]);

  // Buy item
  const buyItem = useCallback((itemId: string) => {
    if (!selectedPlayer) return;

    setActions(prev => {
      const newActions = new Map(prev);
      const existing = newActions.get(selectedPlayer.oderId) || {
        oderId: selectedPlayer.oderId,
        action: 'FIGHT' as PlayerAction,
      };
      newActions.set(selectedPlayer.oderId, { ...existing, targetItemId: itemId });
      return newActions;
    });

    toast.success('아이템 구매 예약됨');
    setShowShop(false);
  }, [selectedPlayer]);

  // Surrender
  const handleSurrender = useCallback(() => {
    if (!socket || !matchState) return;
    socket.emit('moba_surrender', { matchId: matchState.matchId });
    setShowSurrender(false);
  }, [socket, matchState]);

  // Get my team
  const myTeam = teamNumber === 1 ? matchState?.team1 : matchState?.team2;
  const enemyTeam = teamNumber === 1 ? matchState?.team2 : matchState?.team1;

  // Open shop for player
  const openShop = (player: PlayerState) => {
    setSelectedPlayer(player);
    socket?.emit('moba_get_items', { position: player.position });
    setShowShop(true);
  };

  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white">연결 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'queuing') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Swords className="w-16 h-16 text-primary-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">매칭 중...</h2>
          <p className="text-gray-400 mb-4">{matchType === 'RANKED' ? '랭크전' : '일반전'}</p>
          <button
            onClick={() => {
              socket?.emit('moba_queue_leave');
              navigate('/');
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  if (status === 'ended' && winner !== null) {
    const isWinner = winner === teamNumber;
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className={`text-6xl font-black mb-4 ${isWinner ? 'text-yellow-500' : 'text-red-500'}`}>
            {isWinner ? '승리!' : '패배'}
          </div>
          <p className="text-xl text-white mb-4">
            {isWinner
              ? `+${matchType === 'RANKED' ? '5,000' : '1,500'}P`
              : `+${matchType === 'RANKED' ? '1,000' : '300'}P`}
          </p>
          {matchType === 'RANKED' && (
            <p className="text-gray-400 mb-6">
              {isWinner ? '+25 레이팅' : '-25 레이팅'}
            </p>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            로비로 돌아가기
          </button>
        </motion.div>
      </div>
    );
  }

  if (!matchState || !myTeam || !enemyTeam) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold">턴 {matchState.currentTurn}</span>
          <span className={`px-3 py-1 rounded ${matchType === 'RANKED' ? 'bg-yellow-600' : 'bg-blue-600'} text-white`}>
            {matchType === 'RANKED' ? '랭크전' : '일반전'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            <span className={timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''}>
              {timeLeft}초
            </span>
          </div>

          {matchState.currentTurn >= 15 && (
            <button
              onClick={() => setShowSurrender(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              항복
            </button>
          )}
        </div>
      </div>

      {/* Teamfight Alert Popup */}
      <AnimatePresence>
        {teamfightAlert && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 p-1 rounded-xl">
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <Swords className="w-16 h-16 text-red-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  ⚔️ 한타 시작! ⚔️
                </h2>
                <p className="text-xl text-yellow-400 font-bold mb-2">
                  {teamfightAlert.eventName} 쟁탈전
                </p>
                <p className="text-gray-300">
                  모든 생존 선수가 전투에 참여합니다!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Banner */}
      {matchState.currentEvent && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-center"
        >
          <h3 className="text-xl font-bold text-white">
            {EVENT_INFO[matchState.currentEvent]?.name || matchState.currentEvent} 한타!
          </h3>
          <p className="text-white/80 text-sm">
            {EVENT_INFO[matchState.currentEvent]?.description}
          </p>
        </motion.div>
      )}

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Team */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-400 mb-4">내 팀</h3>

          {/* Nexus & Towers */}
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">넥서스</span>
              <span className="text-green-400">
                {myTeam.nexusHealth}/{myTeam.maxNexusHealth}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(myTeam.nexusHealth / myTeam.maxNexusHealth) * 100}%` }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {(['TOP', 'MID', 'BOT'] as Lane[]).map(lane => {
                const laneTowers = myTeam.towers
                  .filter(t => t.lane === lane)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div key={lane} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-8">{lane}</span>
                    <div className="flex gap-1 flex-1">
                      {laneTowers.map(tower => (
                        <div key={`${tower.lane}-${tower.position}`} className="flex-1" title={`${tower.position}차 포탑: ${tower.health}/${tower.maxHealth}`}>
                          <div className={`h-3 rounded ${tower.isDestroyed ? 'bg-gray-600' : 'bg-gray-500'}`}>
                            {!tower.isDestroyed && (
                              <div
                                className="h-3 rounded bg-blue-500 transition-all"
                                style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                              />
                            )}
                          </div>
                          <div className="text-center text-xs text-gray-500 mt-0.5">
                            {tower.isDestroyed ? 'X' : `${Math.ceil((tower.health / tower.maxHealth) * 100)}%`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buffs */}
          {(myTeam.grubBuff || myTeam.dragonStacks > 0 || myTeam.baronBuff || myTeam.elderBuff) && (
            <div className="mb-4 flex gap-2 flex-wrap">
              {myTeam.grubBuff && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">유충</span>
              )}
              {myTeam.dragonStacks > 0 && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                  용 x{myTeam.dragonStacks}
                </span>
              )}
              {myTeam.baronBuff && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">바론</span>
              )}
              {myTeam.elderBuff && (
                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">장로</span>
              )}
            </div>
          )}

          {/* Players */}
          <div className="space-y-3">
            {myTeam.players.map(player => (
              <PlayerCard
                key={player.oderId}
                player={player}
                isMyTeam={true}
                action={actions.get(player.oderId)?.action}
                onActionChange={(action) => setPlayerAction(player.oderId, action)}
                onOpenShop={() => openShop(player)}
                allItems={items}
              />
            ))}
          </div>
        </div>

        {/* Center - Map/Log */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">전투 로그</h3>

          <div className="h-[400px] overflow-y-auto space-y-2">
            {turnResult?.events.map((event, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-2 rounded text-sm ${
                  event.type === 'KILL'
                    ? 'bg-red-900/50 text-red-300'
                    : event.type === 'TOWER'
                    ? 'bg-orange-900/50 text-orange-300'
                    : event.type === 'OBJECTIVE'
                    ? 'bg-purple-900/50 text-purple-300'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {event.message}
              </motion.div>
            ))}

            {matchState.logs.slice(-10).map((log, idx) => (
              <div
                key={`log-${idx}`}
                className="p-2 bg-gray-700 rounded text-sm text-gray-400"
              >
                [{log.turn}턴] {log.message}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={submitActions}
            disabled={actions.size === 0}
            className="mt-4 w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            행동 제출 ({actions.size}/5)
          </button>
        </div>

        {/* Enemy Team */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-400 mb-4">{opponentName || '적 팀'}</h3>

          {/* Nexus & Towers */}
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">넥서스</span>
              <span className="text-red-400">
                {enemyTeam.nexusHealth}/{enemyTeam.maxNexusHealth}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all"
                style={{ width: `${(enemyTeam.nexusHealth / enemyTeam.maxNexusHealth) * 100}%` }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {(['TOP', 'MID', 'BOT'] as Lane[]).map(lane => {
                const laneTowers = enemyTeam.towers
                  .filter(t => t.lane === lane)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div key={lane} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-8">{lane}</span>
                    <div className="flex gap-1 flex-1">
                      {laneTowers.map(tower => (
                        <div key={`${tower.lane}-${tower.position}`} className="flex-1" title={`${tower.position}차 포탑: ${tower.health}/${tower.maxHealth}`}>
                          <div className={`h-3 rounded ${tower.isDestroyed ? 'bg-gray-600' : 'bg-gray-500'}`}>
                            {!tower.isDestroyed && (
                              <div
                                className="h-3 rounded bg-red-500 transition-all"
                                style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                              />
                            )}
                          </div>
                          <div className="text-center text-xs text-gray-500 mt-0.5">
                            {tower.isDestroyed ? 'X' : `${Math.ceil((tower.health / tower.maxHealth) * 100)}%`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enemy Buffs */}
          {(enemyTeam.grubBuff || enemyTeam.dragonStacks > 0 || enemyTeam.baronBuff || enemyTeam.elderBuff) && (
            <div className="mb-4 flex gap-2 flex-wrap">
              {enemyTeam.grubBuff && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">유충</span>
              )}
              {enemyTeam.dragonStacks > 0 && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                  용 x{enemyTeam.dragonStacks}
                </span>
              )}
              {enemyTeam.baronBuff && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">바론</span>
              )}
              {enemyTeam.elderBuff && (
                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">장로</span>
              )}
            </div>
          )}

          {/* Enemy Players */}
          <div className="space-y-3">
            {enemyTeam.players.map(player => (
              <PlayerCard
                key={player.oderId}
                player={player}
                isMyTeam={false}
                allItems={items}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Shop Modal */}
      <AnimatePresence>
        {showShop && selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShop(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  상점 - {selectedPlayer.name} ({selectedPlayer.gold}G)
                </h3>
                <button onClick={() => setShowShop(false)}>
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(item => {
                  const canBuy = selectedPlayer.gold >= item.cost;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        canBuy
                          ? 'bg-gray-700 border-gray-600 hover:border-primary-500 cursor-pointer'
                          : 'bg-gray-800 border-gray-700 opacity-50'
                      }`}
                      onClick={() => canBuy && buyItem(item.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={`/items/${item.id}.png`}
                          alt={item.name}
                          className="w-8 h-8 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/items/default.svg';
                          }}
                        />
                        <div>
                          <div className="text-white font-bold text-sm">{item.name}</div>
                          <div className="text-yellow-400 text-xs">{item.cost}G</div>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surrender Modal */}
      <AnimatePresence>
        {showSurrender && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">항복하시겠습니까?</h3>
                <p className="text-gray-400 mb-6">항복 시 패배 처리되며 보상이 50% 감소합니다.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSurrender(false)}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSurrender}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    항복
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Player Card Component
function PlayerCard({
  player,
  isMyTeam,
  action,
  onActionChange,
  onOpenShop,
  allItems,
}: {
  player: PlayerState;
  isMyTeam: boolean;
  action?: PlayerAction;
  onActionChange?: (action: PlayerAction) => void;
  onOpenShop?: () => void;
  allItems?: Item[];
}) {
  const healthPercent = (player.currentHealth / player.maxHealth) * 100;
  const actions = POSITION_ACTIONS[player.position];

  return (
    <div
      className={`p-3 rounded-lg ${
        player.isDead
          ? 'bg-gray-700/50 opacity-50'
          : isMyTeam
          ? 'bg-blue-900/30 border border-blue-700'
          : 'bg-red-900/30 border border-red-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Level Badge */}
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              player.level >= 18 ? 'bg-yellow-500 border-yellow-300 text-black' :
              player.level >= 11 ? 'bg-purple-600 border-purple-400 text-white' :
              player.level >= 6 ? 'bg-blue-600 border-blue-400 text-white' :
              'bg-gray-600 border-gray-400 text-white'
            }`}>
              {player.level}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-400">{player.position}</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{player.name}</span>
              <span className="text-xs text-green-400">{player.kills}/{player.deaths}/{player.assists}</span>
            </div>
          </div>
        </div>
        {isMyTeam && !player.isDead && onOpenShop && (
          <button
            onClick={onOpenShop}
            className="p-2 bg-yellow-600 rounded hover:bg-yellow-700"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Health Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">HP</span>
          <span className="text-white">
            {player.currentHealth}/{player.maxHealth}
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 text-xs mb-2">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-red-400" />
          <span className="text-white">{Math.floor(player.attack)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-400" />
          <span className="text-white">{player.defense}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-yellow-400" />
          <span className="text-white">{player.gold}G</span>
        </div>
      </div>

      {/* Items */}
      {player.items.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {player.items.map((itemId, idx) => {
            const itemInfo = allItems?.find(i => i.id === itemId);
            const itemName = itemInfo?.name || itemId.replace(/_/g, ' ');
            return (
              <div
                key={idx}
                className="relative group"
              >
                <div className="w-6 h-6 rounded bg-gray-700 border border-gray-600 flex items-center justify-center text-xs text-gray-300 cursor-help">
                  {itemName.substring(0, 2)}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {itemName}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Empty items placeholder */}
      {player.items.length === 0 && (
        <div className="flex gap-1 mb-2">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="w-6 h-6 rounded bg-gray-800/50 border border-gray-700/50"
            />
          ))}
        </div>
      )}

      {/* Action Selection (only for my team) */}
      {isMyTeam && !player.isDead && onActionChange && actions && (
        <div className="flex flex-wrap gap-1">
          {actions.map(({ action: actionType, label }) => (
            <button
              key={actionType}
              onClick={() => onActionChange(actionType)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                action === actionType
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Dead indicator */}
      {player.isDead && (
        <div className="text-center text-red-400 text-sm">
          사망 (부활: {player.respawnTurn}턴)
        </div>
      )}
    </div>
  );
}
