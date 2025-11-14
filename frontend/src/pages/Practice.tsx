import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, TrendingUp, Layers } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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

export default function Practice() {
  const { token, user, updateUser } = useAuthStore();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [queueSize, setQueueSize] = useState(0);
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
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      toast.success('서버 연결됨');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('서버 연결 실패');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('practice_queue_update', (data) => {
      console.log('Practice queue update:', data);
      setQueueSize(data.playersInQueue || 0);
    });

    socket.on('queue_error', (data) => {
      console.error('Queue error:', data);
      toast.error(data.error || '매칭 실패');
      setMatching(false);
    });

    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      toast.success(`매치 발견! 상대: ${data.opponent.username}`);
    });

    socket.on('match_result', async (result) => {
      console.log('Match result:', result);
      setMatchResult(result);
      setMatching(false);

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

      if (result.won) {
        toast.success(`승리! +${result.pointsChange} 포인트`);
      } else {
        toast.error(`패배! +${result.pointsChange} 포인트`);
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
    socketRef.current.emit('join_queue', { token, isPractice: true });
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-900/20 dark:to-blue-900/20 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-900/20 dark:to-blue-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            일반전
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            랭크 변동 없이 포인트만 획득하는 연습 모드
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
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-300">총 OVR</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{calculateTotalOVR()}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">평균 OVR</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {Math.round(calculateTotalOVR() / 5)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Swords className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300">대기 인원</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{queueSize}명</p>
                </div>
              </div>

              {/* Match Controls */}
              {!matching && !matchResult && (
                <motion.button
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startMatch}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-xl rounded-xl shadow-lg transition-all"
                >
                  일반전 시작
                </motion.button>
              )}

              {matching && !matchResult && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      상대를 찾는 중...
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      대기 중인 플레이어: {queueSize}명
                    </p>
                  </div>
                  <button
                    onClick={cancelMatch}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                  >
                    매칭 취소
                  </button>
                </div>
              )}
            </motion.div>

            {/* Match Result */}
            <AnimatePresence>
              {matchResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700"
                >
                  {/* Result Header */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className={`inline-block px-12 py-4 rounded-2xl text-white font-bold text-3xl mb-4 ${
                        matchResult.won
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600'
                      }`}
                    >
                      {matchResult.won ? '승리!' : '패배'}
                    </motion.div>
                  </div>

                  {/* Match Details */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">상대</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {matchResult.opponent.username}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Rating</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {matchResult.opponent.rating}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border-2 border-blue-500">
                        <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                          내 스코어
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {matchResult.myScore}
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border-2 border-red-500">
                        <div className="text-sm text-red-600 dark:text-red-400 mb-1">
                          상대 스코어
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {matchResult.opponentScore}
                        </div>
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border-2 border-yellow-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            획득 포인트
                          </span>
                        </div>
                        <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                          +{matchResult.pointsChange}P
                        </div>
                      </div>
                    </div>

                    {/* Rating (No Change) */}
                    <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            랭크 변동
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                          없음
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={playAgain}
                      className="py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all"
                    >
                      다시 하기
                    </button>
                    <button
                      onClick={startMatch}
                      className="py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                    >
                      새 매치
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Cards */}
            {!matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-green-500 dark:border-green-400 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    승리 보상
                  </h3>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                    +50P
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    랭크 변동 없음
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-blue-500 dark:border-blue-400 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    패배 보상
                  </h3>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    +30P
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    랭크 변동 없음
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
