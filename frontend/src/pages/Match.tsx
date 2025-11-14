import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Layers, Users, Trophy, Target, Zap, Shield, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface Player {
  id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  region: string;
  tier: string;
}

interface UserCard {
  id: number;
  level: number;
  player: Player;
}

interface Deck {
  id: number;
  name: string;
  top: UserCard | null;
  jungle: UserCard | null;
  mid: UserCard | null;
  adc: UserCard | null;
  support: UserCard | null;
  laningStrategy: string;
  teamfightStrategy: string;
  macroStrategy: string;
  isActive: boolean;
}

export default function Match() {
  const { token, user, updateUser } = useAuthStore();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [simulatedPhases, setSimulatedPhases] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchDeck = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/deck`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setDeck(response.data.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch deck:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [token]);

  const calculateCardOVR = (card: UserCard | null, expectedPosition: string): number => {
    if (!card) return 0;
    const baseStat = card.player.overall;
    const positionMatch = card.player.position === expectedPosition;
    return positionMatch ? baseStat : baseStat - 10;
  };

  const calculateTotalOVR = (): number => {
    if (!deck) return 0;
    const positions = [
      { card: deck.top, position: 'TOP' },
      { card: deck.jungle, position: 'JUNGLE' },
      { card: deck.mid, position: 'MID' },
      { card: deck.adc, position: 'ADC' },
      { card: deck.support, position: 'SUPPORT' },
    ];

    return positions.reduce((total, { card, position }) => {
      return total + calculateCardOVR(card, position);
    }, 0);
  };

  const isDeckComplete = (): boolean => {
    if (!deck) return false;
    return !!(deck.top && deck.jungle && deck.mid && deck.adc && deck.support);
  };

  useEffect(() => {
    // Setup socket connection
    if (!token) return;

    console.log('Connecting to socket:', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    let hasConnected = false;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (!hasConnected) {
        hasConnected = true;
        // Only show toast on first connect, not on reconnects
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Don't show toast for every connection error
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('queue_update', (data) => {
      console.log('Queue update:', data);
      setQueueSize(data.playersInQueue || 0);
      if (data.message) {
        toast(data.message);
      }
    });

    socket.on('queue_error', (data) => {
      console.error('Queue error:', data);

      // Handle suspension specifically
      if (data.error === 'Suspended' && data.message) {
        toast.error(data.message, { duration: 5000 });
      } else {
        toast.error(data.error || '매칭 실패');
      }

      setMatching(false);
    });

    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      toast.success(`매치 발견! 상대: ${data.opponent.username}`);
    });

    socket.on('match_result', async (result) => {
      console.log('Match result:', result);

      // Start simulation if phases exist
      if (result.phases && result.phases.length > 0) {
        setIsSimulating(true);
        setSimulatedPhases([]);
        setCurrentPhase(0);

        // Simulate phases over 30 seconds (10 seconds per phase)
        for (let i = 0; i < result.phases.length; i++) {
          setTimeout(() => {
            setSimulatedPhases(prev => [...prev, result.phases[i]]);
            setCurrentPhase(i + 1);

            // After last phase, show final result
            if (i === result.phases.length - 1) {
              setTimeout(() => {
                setIsSimulating(false);
                setMatchResult(result);
                setMatching(false);

                if (result.won) {
                  toast.success(`승리! +${result.pointsChange} 포인트, +${result.ratingChange} 레이팅`);
                } else {
                  toast.error(`패배! +${result.pointsChange} 포인트, ${result.ratingChange} 레이팅`);
                }
              }, 3000); // 3 second pause before showing result
            }
          }, i * 10000); // 10 seconds per phase
        }
      } else {
        // No phases, show result immediately
        setMatchResult(result);
        setMatching(false);

        if (result.won) {
          toast.success(`승리! +${result.pointsChange} 포인트, +${result.ratingChange} 레이팅`);
        } else {
          toast.error(`패배! +${result.pointsChange} 포인트, ${result.ratingChange} 레이팅`);
        }
      }

      // Fetch updated user data from server
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          updateUser(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch updated user data:', error);
      }
    });

    socket.on('match_error', (data) => {
      console.error('Match error:', data);
      toast.error('매치 처리 오류');
      setMatching(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, user, updateUser]);

  const startMatch = () => {
    if (!socketRef.current) {
      toast.error('소켓 연결 실패');
      return;
    }

    setMatching(true);
    setMatchResult(null);
    socketRef.current.emit('join_queue', { token });
    toast.success('매칭 대기열에 참가했습니다');
  };

  const cancelMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_queue');
      setMatching(false);
      toast('매칭 취소됨');
    }
  };

  const playAgain = () => {
    setMatchResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900/20 dark:to-orange-900/20 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900/20 dark:to-orange-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
            <Swords className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            랭크 경기
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최고의 실력자들과 경쟁하세요!
          </p>
        </motion.div>

        {!deck || !isDeckComplete() ? (
          /* Empty State - Need Deck */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              경기를 시작하려면 완성된 덱이 필요합니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              5명의 선수를 모두 배치하고 전략을 설정해야 합니다
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/gacha"
                className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-lg transition-colors"
              >
                카드 뽑기
              </a>
              <a
                href="/deck"
                className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-colors"
              >
                덱 편성하기
              </a>
            </div>
          </motion.div>
        ) : (
          /* Deck Ready - Show Match Options */
          <div className="space-y-6">
            {/* Deck Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                내 덱: {deck.name}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">총 OVR</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{calculateTotalOVR()}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300">평균 OVR</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {Math.round(calculateTotalOVR() / 5)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-300">전략</span>
                  </div>
                  <p className="text-sm font-bold text-green-900 dark:text-green-100">
                    {deck.laningStrategy}
                  </p>
                </div>
              </div>

              {/* Roster Preview */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { card: deck.top, position: 'TOP', label: '탑' },
                  { card: deck.jungle, position: 'JUNGLE', label: '정글' },
                  { card: deck.mid, position: 'MID', label: '미드' },
                  { card: deck.adc, position: 'ADC', label: '원딜' },
                  { card: deck.support, position: 'SUPPORT', label: '서폿' },
                ].map(({ card, position, label }) => (
                  <div key={position} className="text-center">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg p-2 mb-1">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        {label}
                      </div>
                      {card && (
                        <>
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {card.player.name}
                          </div>
                          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {calculateCardOVR(card, position)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Match Button, Simulation, or Result */}
            {isSimulating ? (
              /* Match Simulation */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    경기 진행 중
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    실시간 전투 중...
                  </p>
                </div>

                {/* Phase Progress */}
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {['라인전', '한타', '운영'].map((_, idx) => (
                      <div key={idx} className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                            idx < currentPhase
                              ? 'bg-green-500 text-white'
                              : idx === currentPhase
                              ? 'bg-blue-500 text-white animate-pulse'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < 2 && (
                          <div
                            className={`w-16 h-1 mx-2 ${
                              idx < currentPhase - 1
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phase Results */}
                <AnimatePresence>
                  <div className="space-y-4">
                    {simulatedPhases.map((phase, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`p-6 rounded-xl border-2 ${
                          phase.advantage === 'player1'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {phase.phase === 'LANING' && <Zap className="w-6 h-6 text-yellow-600" />}
                            {phase.phase === 'TEAMFIGHT' && <Shield className="w-6 h-6 text-blue-600" />}
                            {phase.phase === 'MACRO' && <MapPin className="w-6 h-6 text-purple-600" />}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {phase.name} 단계
                            </h3>
                          </div>
                          <div className={`text-2xl font-bold ${
                            phase.advantage === 'player1'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {phase.advantage === 'player1' ? '승리!' : '패배'}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-4 text-3xl font-bold text-gray-900 dark:text-white">
                          <span className="text-blue-600 dark:text-blue-400">{phase.score.player1}</span>
                          <span className="text-gray-400">-</span>
                          <span className="text-red-600 dark:text-red-400">{phase.score.player2}</span>
                        </div>

                        {phase.strategyWon && (
                          <div className="mt-3 text-center">
                            <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                              전략 카운터 성공!
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </motion.div>
            ) : !matchResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700"
              >
                {!matching ? (
                  <>
                    <button
                      onClick={startMatch}
                      className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-xl rounded-lg transition-all transform hover:scale-105 shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Swords className="w-6 h-6" />
                        <span>랭크 매칭 시작</span>
                      </div>
                    </button>
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      비슷한 실력의 상대와 자동으로 실시간 매칭됩니다
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">매칭 중...</span>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            대기 중: {queueSize}명
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                        상대를 찾고 있습니다<br />
                        <span className="text-xs">30초 후 자동 매칭됩니다</span>
                      </p>
                    </div>
                    <button
                      onClick={cancelMatch}
                      className="w-full px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold text-xl rounded-lg transition-all"
                    >
                      매칭 취소
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              /* Match Result */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
              >
                <div className={`text-center mb-6 ${matchResult.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <div className="text-6xl font-bold mb-2">
                    {matchResult.won ? '승리!' : '패배'}
                  </div>
                  <div className="text-2xl font-semibold">
                    {matchResult.myScore} - {matchResult.opponentScore}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">상대</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {matchResult.opponent.username}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {matchResult.opponent.tier} · {matchResult.opponent.rating} 레이팅
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`rounded-lg p-4 ${matchResult.pointsChange > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">포인트</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      +{matchResult.pointsChange}
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${matchResult.ratingChange > 0 ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">레이팅</div>
                    <div className={`text-2xl font-bold ${matchResult.ratingChange > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {matchResult.ratingChange > 0 ? '+' : ''}{matchResult.ratingChange}
                    </div>
                  </div>
                </div>

                <button
                  onClick={playAgain}
                  className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                >
                  다시 경기하기
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
