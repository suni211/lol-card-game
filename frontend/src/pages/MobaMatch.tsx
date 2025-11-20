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
  Trophy,
  HelpCircle,
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
  Champion,
} from '../types/moba';
import {
  POSITION_ACTIONS,
  EVENT_INFO,
} from '../types/moba';
import BanPickTutorial from '../components/Moba/BanPickTutorial';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function MobaMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const matchType = (searchParams.get('type') as 'RANKED' | 'NORMAL') || 'NORMAL';
  const deckSlot = parseInt(searchParams.get('deck') || '1');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'queuing' | 'ban_pick' | 'playing' | 'ended'>('connecting');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [teamNumber, setTeamNumber] = useState<1 | 2>(1);
  const [actions, setActions] = useState<Map<number, TurnAction>>(new Map());
  const [timeLeft, setTimeLeft] = useState(30);
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
  const [gameEndPopup, setGameEndPopup] = useState<{
    winner: 1 | 2;
    reason: string;
  } | null>(null);

  // Ban/Pick state
  const [champions, setChampions] = useState<Champion[]>([]);
  const [banPickData, setBanPickData] = useState<any | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Skill usage state (for future target selection feature)
  const [, setSkillTargetSelection] = useState<{
    playerId: number;
    needsTarget: boolean;
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

      if (data.banPickPhase) {
        setChampions(data.champions || []);
        setStatus('ban_pick');
        toast.success('매치 시작! 밴픽을 진행합니다.');
      } else {
        setStatus('playing');
        toast.success('매치 시작!');
      }
    });

    // Ban/Pick events
    newSocket.on('moba_ban_pick_phase', (data) => {
      console.log('[MobaMatch] Ban/Pick phase:', data);
      setBanPickData(data);
      setTimeLeft(Math.floor(data.timeLimit / 1000));
      setSelectedChampion(null);
    });

    newSocket.on('moba_champion_banned', (data) => {
      console.log('[MobaMatch] Champion banned:', data);
      setBanPickData((prev: any) => ({
        ...prev,
        bannedChampions: [...(prev?.bannedChampions || []), data.championId],
      }));
      toast(`챔피언이 밴되었습니다.`, { icon: '🚫' });
    });

    newSocket.on('moba_champion_picked', (data) => {
      console.log('[MobaMatch] Champion picked:', data);
      setBanPickData((prev: any) => {
        const newPicks = {
          team1Picks: prev.team1Picks,
          team2Picks: prev.team2Picks,
        };
        if (data.teamNumber === 1) {
          newPicks.team1Picks = [...newPicks.team1Picks, data.championId];
        } else {
          newPicks.team2Picks = [...newPicks.team2Picks, data.championId];
        }
        return { ...prev, ...newPicks };
      });
      toast(`챔피언이 선택되었습니다.`, { icon: '🎮' });
    });

    newSocket.on('moba_ban_pick_complete', (data) => {
      console.log('[MobaMatch] Ban/Pick complete:', data);
      setMatchState(data.state);
      setBanPickData(null);
      setStatus('playing');
      toast.success('챔피언 선택 완료! 게임을 시작합니다.');
    });

    newSocket.on('moba_champions_list', (data) => {
      setChampions(data.champions);
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
      setMatchState(data.finalState);

      // Show game end popup first
      setGameEndPopup({
        winner: data.winner,
        reason: data.reason,
      });

      // Transition to end screen after popup
      setTimeout(() => {
        setGameEndPopup(null);
        setStatus('ended');
      }, 3000);
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
    if (status !== 'playing' && status !== 'ban_pick') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Auto-skip ban/pick turn
  useEffect(() => {
    if (timeLeft === 0 && status === 'ban_pick' && socket && banPickData) {
      if (banPickData.team === teamNumber) {
        socket.emit('moba_skip_turn', { matchId: matchState?.matchId });
      }
    }
  }, [timeLeft, status, socket, banPickData, teamNumber, matchState]);
  
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

  // Ban/Pick actions
  const banChampion = useCallback((championId: number) => {
    if (!socket || !matchState) return;
    socket.emit('moba_ban_champion', { matchId: matchState.matchId, championId });
  }, [socket, matchState]);

  const pickChampion = useCallback((championId: number) => {
    if (!socket || !matchState) return;
    socket.emit('moba_pick_champion', { matchId: matchState.matchId, championId });
  }, [socket, matchState]);

  const confirmBanPick = () => {
    if (!selectedChampion || !banPickData) return;
    if (banPickData.type === 'BAN') {
      banChampion(selectedChampion);
    } else {
      pickChampion(selectedChampion);
    }
  };

  // Use skill
  const useSkill = useCallback((player: PlayerState, targetId?: number) => {
    setActions(prev => {
      const newActions = new Map(prev);
      const existing = newActions.get(player.oderId) || {
        oderId: player.oderId,
        action: 'FIGHT' as PlayerAction,
      };
      newActions.set(player.oderId, {
        ...existing,
        useSkill: true,
        skillTargetId: targetId,
      });
      return newActions;
    });
    setSkillTargetSelection(null);
    toast.success(`${player.name} 스킬 사용 예약됨`);
  }, []);

  // Cancel skill
  const cancelSkill = useCallback((playerId: number) => {
    setActions(prev => {
      const newActions = new Map(prev);
      const existing = newActions.get(playerId);
      if (existing) {
        newActions.set(playerId, {
          ...existing,
          useSkill: false,
          skillTargetId: undefined,
        });
      }
      return newActions;
    });
  }, []);

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

  // Ban/Pick Phase UI
  if (status === 'ban_pick' && banPickData) {
    const isMyTurn = banPickData.team === teamNumber;
    const currentAction = banPickData.type === 'BAN' ? '밴' : '픽';
    const turnText = isMyTurn ? `아군 ${currentAction}` : `적군 ${currentAction}`;

    const myTeamName = user?.username || '아군';
    const enemyTeamName = opponentName || '적군';

    const team1Name = teamNumber === 1 ? myTeamName : enemyTeamName;
    const team2Name = teamNumber === 2 ? myTeamName : enemyTeamName;

    const allSelectedChamps = [...(banPickData.team1Picks || []), ...(banPickData.team2Picks || []), ...(banPickData.bannedChampions || [])];

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
        {showTutorial && <BanPickTutorial onClose={() => setShowTutorial(false)} />}
        {/* Top Bar: Teams & Turn Info */}
        <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg mb-4">
          {/* Team 1 */}
          <div className="w-1/3 text-left">
            <h2 className="text-lg font-bold text-blue-400">{team1Name}</h2>
            <div className="flex gap-1 mt-1">
              {[...Array(3)].map((_, i) => (
                <div key={`t1-ban-${i}`} className="w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center text-red-500 font-bold">
                  {banPickData.bannedChampions[i*2] ? 'B' : ''}
                </div>
              ))}
              {[...Array(2)].map((_, i) => (
                <div key={`t1-ban2-${i}`} className="w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center text-red-500 font-bold">
                  {banPickData.bannedChampions[6 + i*2 + 1] ? 'B' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Center Info */}
          <div className="text-center">
            <h1 className="text-2xl font-bold">{turnText}</h1>
            <div className="text-xl font-mono">{timeLeft}</div>
          </div>

          {/* Team 2 */}
          <div className="w-1/3 text-right">
            <h2 className="text-lg font-bold text-red-400">{team2Name}</h2>
            <div className="flex gap-1 mt-1 justify-end">
              {[...Array(3)].map((_, i) => (
                <div key={`t2-ban-${i}`} className="w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center text-red-500 font-bold">
                  {banPickData.bannedChampions[i*2 + 1] ? 'B' : ''}
                </div>
              ))}
              {[...Array(2)].map((_, i) => (
                <div key={`t2-ban2-${i}`} className="w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center text-red-500 font-bold">
                  {banPickData.bannedChampions[6 + i*2] ? 'B' : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Picks & Champion Grid */}
        <div className="flex-grow flex gap-4">
          {/* Team 1 Picks */}
          <div className="w-1/5 flex flex-col gap-2">
            {banPickData.team1Picks.map((champId: number, i: number) => (
              <div key={`t1-pick-${i}`} className="bg-blue-800 p-2 rounded h-16 flex items-center gap-2">
                <div className="text-sm font-bold">{champions.find(c => c.id === champId)?.name}</div>
              </div>
            ))}
          </div>

          {/* Center: Champion Grid */}
          <div className="w-3/5 flex flex-col">
            <div className="grid grid-cols-8 gap-1 flex-grow overflow-y-auto p-2 bg-gray-800 rounded-lg">
              {champions.map(champion => {
                const isSelected = allSelectedChamps.includes(champion.id);
                return (
                  <div
                    key={champion.id}
                    onClick={() => isMyTurn && !isSelected && setSelectedChampion(champion.id)}
                    className={`
                      p-1 rounded text-center cursor-pointer transition-all
                      ${isSelected ? 'opacity-30 grayscale' : ''}
                      ${selectedChampion === champion.id ? 'ring-2 ring-yellow-400' : ''}
                      ${isMyTurn && !isSelected ? 'hover:bg-gray-700' : ''}
                    `}
                  >
                    <div className="text-xs truncate">{champion.name}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTutorial(true)}
                className="mt-4 px-4 py-3 bg-gray-600 text-white font-bold rounded-lg"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              {isMyTurn && (
                <button
                  onClick={confirmBanPick}
                  disabled={!selectedChampion}
                  className="mt-4 w-full py-3 bg-yellow-600 text-black font-bold rounded-lg disabled:opacity-50"
                >
                  {currentAction} 확정
                </button>
              )}
            </div>
          </div>

          {/* Team 2 Picks */}
          <div className="w-1/5 flex flex-col gap-2">
            {banPickData.team2Picks.map((champId: number, i: number) => (
              <div key={`t2-pick-${i}`} className="bg-red-800 p-2 rounded h-16 flex items-center gap-2">
                <div className="text-sm font-bold">{champions.find(c => c.id === champId)?.name}</div>
              </div>
            ))}
          </div>
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
              ? `+${matchType === 'RANKED' ? '15,000' : '1,500'}P`
              : `+${matchType === 'RANKED' ? '10,000' : '300'}P`}
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

      {/* Game End Popup */}
      <AnimatePresence>
        {gameEndPopup && (() => {
          const isWin = gameEndPopup.winner === teamNumber;
          return (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/70"
            >
              <motion.div
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                className={`p-2 rounded-2xl ${isWin
                  ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500'
                  : 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'}`}
              >
                <div className="bg-gray-900 rounded-xl p-12 text-center min-w-[400px]">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: isWin ? [0, 5, -5, 0] : [0, -3, 3, 0]
                    }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="mb-6"
                  >
                    {isWin ? (
                      <Trophy className="w-24 h-24 text-yellow-500 mx-auto" />
                    ) : (
                      <Swords className="w-24 h-24 text-red-500 mx-auto" />
                    )}
                  </motion.div>
                  <h2 className={`text-5xl font-black mb-4 ${
                    isWin ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {isWin ? '승리!' : '패배'}
                  </h2>
                  <p className="text-xl text-gray-300 mb-2">
                    {gameEndPopup.reason}
                  </p>
                  <p className="text-gray-500 text-sm">
                    잠시 후 결과 화면으로 이동합니다...
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
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
                onUseSkill={useSkill}
                onCancelSkill={cancelSkill}
                allItems={items}
                champions={champions}
                skillQueued={actions.get(player.oderId)?.useSkill}
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
                champions={champions}
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
  onUseSkill,
  onCancelSkill,
  allItems,
  champions,
  skillQueued,
}: {
  player: PlayerState;
  isMyTeam: boolean;
  action?: PlayerAction;
  onActionChange?: (action: PlayerAction) => void;
  onOpenShop?: () => void;
  onUseSkill?: (player: PlayerState, targetId?: number) => void;
  onCancelSkill?: (playerId: number) => void;
  allItems?: Item[];
  champions?: Champion[];
  skillQueued?: boolean;
}) {
  const healthPercent = (player.currentHealth / player.maxHealth) * 100;
  const actions = POSITION_ACTIONS[player.position];

  // Get champion info
  const champion = player.championId && champions
    ? champions.find(c => c.id === player.championId)
    : null;

  // Check if skill is ready (used in skill display logic)
  const _skillReady = player.skill &&
    player.skill.skillLevel > 0 &&
    player.skill.currentCooldown === 0 &&
    !player.skill.hasBeenUsed;
  void _skillReady; // Mark as used

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
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">{player.position}</span>
              {champion && (
                <span className="text-xs text-primary-400">({champion.name})</span>
              )}
            </div>
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
            const itemIcon = itemInfo?.icon || `/items/${itemId}.png`;
            return (
              <div
                key={idx}
                className="relative group"
              >
                <img
                  src={itemIcon}
                  alt={itemName}
                  className="w-6 h-6 rounded border border-gray-600 cursor-help"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/items/default.svg';
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <p className="font-bold">{itemName}</p>
                  {itemInfo && <p>{itemInfo.description}</p>}
                  {itemInfo && <p className="text-yellow-400">{itemInfo.cost}G</p>}
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

      {/* Skill Info */}
      {champion && player.skill && (
        <div className="mb-2 p-2 bg-gray-800 rounded">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-primary-400">{champion.skillName}</span>
                <span className={`text-[10px] px-1 rounded ${
                  champion.scalingType === 'AD' ? 'bg-red-600' : 'bg-purple-600'
                }`}>
                  {champion.scalingType}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate">{champion.skillDescription}</p>
            </div>
            {isMyTeam && !player.isDead && onUseSkill && (
              <div className="ml-2">
                {player.skill.skillLevel === 0 ? (
                  <span className="text-xs text-gray-500">Lv6 해금</span>
                ) : player.skill.currentCooldown > 0 ? (
                  <span className="text-xs text-orange-400">
                    {player.skill.currentCooldown}턴
                  </span>
                ) : player.skill.hasBeenUsed ? (
                  <span className="text-xs text-gray-500">사용됨</span>
                ) : skillQueued ? (
                  <button
                    onClick={() => onCancelSkill?.(player.oderId)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    취소
                  </button>
                ) : (
                  <button
                    onClick={() => onUseSkill(player)}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 animate-pulse"
                  >
                    사용
                  </button>
                )}
              </div>
            )}
          </div>
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

      {/* Recalling indicator */}
      {player.isRecalling && (
        <div className="mt-2 text-center text-yellow-400 text-xs animate-pulse">
          귀환 중...
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
