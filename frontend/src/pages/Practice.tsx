import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, TrendingUp, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface MatchResult {
  opponent: {
    id: number;
    username: string;
    rating: number;
  };
  won: boolean;
  myScore: number;
  opponentScore: number;
  pointsChange: number;
  ratingChange: number;
  isPractice: boolean;
}

interface AutoMatchStats {
  totalMatches: number;
  wins: number;
  losses: number;
  totalPoints: number;
}

export default function Practice() {
  const { user, token, updateUser } = useAuthStore();
  const [searching, setSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [autoMatch, setAutoMatch] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [autoMatchStats, setAutoMatchStats] = useState<AutoMatchStats>({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    totalPoints: 0
  });
  const [showAutoMatchSummary, setShowAutoMatchSummary] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const autoMatchRef = useRef(false);

  useEffect(() => {
    autoMatchRef.current = autoMatch;
  }, [autoMatch]);

  useEffect(() => {
    // Setup socket connection
    if (!token) return;

    console.log('Connecting to socket:', SOCKET_URL);
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (!autoMatchRef.current) {
        toast.error('서버 연결 실패');
      }
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
      if (!autoMatchRef.current) {
        toast.error(data.error || '매칭 실패');
      }
      setSearching(false);
      setAutoMatch(false);
    });

    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      if (!autoMatchRef.current) {
        toast.success(`매치 발견! 상대: ${data.opponent.username}`);
      }
    });

    socket.on('match_result', async (result: MatchResult) => {
      console.log('Match result:', result);
      setMatchResult(result);

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

      // Update stats
      if (autoMatchRef.current) {
        setAutoMatchStats(prev => ({
          totalMatches: prev.totalMatches + 1,
          wins: prev.wins + (result.won ? 1 : 0),
          losses: prev.losses + (result.won ? 0 : 1),
          totalPoints: prev.totalPoints + result.pointsChange
        }));

        setMatchCount(prev => prev + 1);

        // Continue auto-matching immediately
        setTimeout(() => {
          if (autoMatchRef.current && socketRef.current) {
            socketRef.current.emit('join_queue', { token, isPractice: true });
          }
        }, 300);
      } else {
        // Show result modal for manual matches
        setSearching(false);
        setShowResult(true);

        if (result.won) {
          toast.success(`승리! +${result.pointsChange}P`);
        } else {
          toast(`패배... +${result.pointsChange}P`, { icon: '😢' });
        }
      }
    });

    socket.on('match_error', (data) => {
      console.error('Match error:', data);
      if (!autoMatchRef.current) {
        toast.error('매치 처리 오류');
      }
      setSearching(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, updateUser]);

  const findMatch = () => {
    if (!user || !token) {
      toast.error('로그인이 필요합니다!');
      return;
    }

    if (!socketRef.current) {
      toast.error('소켓 연결 실패');
      return;
    }

    setSearching(true);
    setMatchResult(null);
    setShowResult(false);
    socketRef.current.emit('join_queue', { token, isPractice: true });
    toast.success('매칭 대기열에 참가했습니다');
  };

  const toggleAutoMatch = () => {
    if (!autoMatch) {
      // Start auto-match
      setAutoMatch(true);
      setMatchCount(0);
      setAutoMatchStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0
      });
      setSearching(true);

      if (socketRef.current && token) {
        socketRef.current.emit('join_queue', { token, isPractice: true });
      }
    } else {
      // Stop auto-match
      setAutoMatch(false);
      setSearching(false);

      if (socketRef.current) {
        socketRef.current.emit('leave_queue');
      }

      if (autoMatchStats.totalMatches > 0) {
        setShowAutoMatchSummary(true);
      }
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setMatchResult(null);
  };

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
          {user && (
            <div className="mt-4 inline-flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
              <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {user.points.toLocaleString()}
              </span>
              <span className="text-gray-600 dark:text-gray-400">포인트</span>
            </div>
          )}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                일반전 안내
              </h3>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>• 랭크 변동이 없는 연습 모드입니다</li>
                <li>• 승리 시 50P, 패배 시 30P를 획득합니다</li>
                <li>• 횟수 제한이 없어 자유롭게 플레이할 수 있습니다</li>
                <li>• 실제 유저와 매칭되며 덱 파워로 승부가 결정됩니다</li>
                {queueSize > 0 && (
                  <li className="font-bold text-green-700 dark:text-green-300">
                    • 현재 대기 중인 플레이어: {queueSize}명
                  </li>
                )}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Match Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="text-center">
            <div className="mb-6">
              <Swords className="w-24 h-24 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                대전 준비
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                상대를 찾아 일반전을 시작하세요
              </p>
              {autoMatch && (
                <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-500 rounded-lg">
                  <p className="text-green-700 dark:text-green-400 font-semibold">
                    🔄 자동 매칭 중... ({matchCount}경기 완료)
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={findMatch}
                disabled={searching || autoMatch}
                className="w-full max-w-md py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {searching && !autoMatch ? '매칭 중...' : '일반전 시작'}
              </button>

              <button
                onClick={toggleAutoMatch}
                disabled={searching && !autoMatch}
                className={`w-full max-w-md py-4 px-8 font-bold text-lg rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg ${
                  autoMatch
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                {autoMatch ? '🛑 자동 매칭 중지' : '🔄 자동 매칭 시작'}
              </button>
            </div>

            {searching && !autoMatch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6"
              >
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  상대를 찾는 중...
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Rewards Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-green-500 dark:border-green-400 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  승리 보상
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  상대를 이기면 획득
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  +50P
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  랭크 변동 없음
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-blue-500 dark:border-blue-400 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  패배 보상
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  패배해도 획득
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  +30P
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  랭크 변동 없음
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && matchResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeResult}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div
                className={`rounded-2xl p-1 shadow-2xl ${
                  matchResult.won
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                    : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                }`}
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  {/* Result Header */}
                  <div className="text-center mb-6">
                    <div
                      className={`inline-block px-8 py-3 rounded-full text-white font-bold text-2xl mb-4 ${
                        matchResult.won
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600'
                      }`}
                    >
                      {matchResult.won ? '승리!' : '패배'}
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">상대</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {matchResult.opponent.username}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Rating</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {matchResult.opponent.rating}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                          내 스코어
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {matchResult.myScore}
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                        <div className="text-sm text-red-600 dark:text-red-400 mb-1">
                          상대 스코어
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {matchResult.opponentScore}
                        </div>
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            획득 포인트
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          +{matchResult.pointsChange}P
                        </div>
                      </div>
                    </div>

                    {/* Rating (No Change) */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            랭크 변동
                          </span>
                        </div>
                        <div className="text-xl font-bold text-gray-500 dark:text-gray-400">
                          없음
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={closeResult}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all"
                  >
                    확인
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Match Summary Modal */}
      <AnimatePresence>
        {showAutoMatchSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAutoMatchSummary(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-2xl shadow-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
                    자동 매칭 결과
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 경기 수</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {autoMatchStats.totalMatches}경기
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <div className="text-sm text-green-700 dark:text-green-400 mb-1">승리</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {autoMatchStats.wins}
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                        <div className="text-sm text-red-700 dark:text-red-400 mb-1">패배</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {autoMatchStats.losses}
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <div className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">승률</div>
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {autoMatchStats.totalMatches > 0
                          ? ((autoMatchStats.wins / autoMatchStats.totalMatches) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-4">
                      <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">
                        총 획득 포인트
                      </div>
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        +{autoMatchStats.totalPoints}P
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAutoMatchSummary(false)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                  >
                    확인
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
