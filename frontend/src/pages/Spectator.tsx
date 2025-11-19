import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, Trophy, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { getPlayerImageUrl } from '../utils/playerImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Get phase name from round number
function getPhaseName(round: number): string {
  const phases: { [key: number]: string } = {
    1: '라이닝 페이즈',
    2: '팀파이트 페이즈',
    3: '매크로 페이즈',
  };
  return phases[round] || `페이즈 ${round}`;
}

interface LiveMatch {
  matchId: string;
  player1: {
    userId: number;
    username: string;
    score: number;
  };
  player2: {
    userId: number;
    username: string;
    score: number;
  };
  currentRound: number;
  player1Deck: any;
  player2Deck: any;
}

export default function Spectator() {
  const { matchId } = useParams<{ matchId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [spectatingMatch, setSpectatingMatch] = useState<LiveMatch | null>(null);
  const [matchEvents, setMatchEvents] = useState<string[]>([]);
  const [roundHistory, setRoundHistory] = useState<any[]>([]);

  // Load live matches list
  useEffect(() => {
    if (!matchId) {
      loadLiveMatches();
      // Refresh every 5 seconds
      const interval = setInterval(loadLiveMatches, 5000);
      return () => clearInterval(interval);
    }
  }, [matchId]);

  // Spectate specific match
  useEffect(() => {
    if (matchId) {
      spectateMatch(matchId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [matchId]);

  const loadLiveMatches = async () => {
    try {
      const res = await axios.get(`${API_URL}/spectator/live-matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLiveMatches(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const spectateMatch = async (id: string) => {
    try {
      setLoading(true);

      // Get match details
      const res = await axios.get(`${API_URL}/spectator/match/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setSpectatingMatch(res.data.data);

        // Connect to Socket.IO to watch real-time updates
        const socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[Spectator] Socket connected');
          socket.emit('authenticate', { token });
        });

        // Listen for round results
        socket.on('roundResult', (data: any) => {
          console.log('[Spectator] Round result:', data);
          setRoundHistory((prev) => [...prev, data]);

          // Update match scores
          setSpectatingMatch((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              player1: { ...prev.player1, score: data.currentScore.player1 },
              player2: { ...prev.player2, score: data.currentScore.player2 },
            };
          });
        });

        // Listen for match events
        socket.on('matchEvent', (data: any) => {
          console.log('[Spectator] Match event:', data);
          setMatchEvents((prev) => [...prev, data.message]);
        });

        // Listen for round start
        socket.on('roundStart', (data: any) => {
          console.log('[Spectator] Round start:', data);
          setMatchEvents([]);
          setSpectatingMatch((prev) => {
            if (!prev) return prev;
            return { ...prev, currentRound: data.round };
          });
        });

        // Listen for match complete
        socket.on('matchComplete', (data: any) => {
          console.log('[Spectator] Match complete:', data);
          toast.success(`경기 종료! ${data.winner.username} 승리!`);
          setTimeout(() => {
            navigate('/spectator');
          }, 3000);
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || '관전 실패');
      navigate('/spectator');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !spectatingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  // Spectating a specific match
  if (spectatingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/spectator')}
            className="mb-6 text-white hover:text-gray-300 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            라이브 경기 목록으로
          </button>

          {/* Match Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">
                  {getPhaseName(spectatingMatch.currentRound)}
                </h2>
              </div>
            </div>

            {/* Player Info */}
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 text-left">
                <div className="text-xl font-bold">{spectatingMatch.player1.username}</div>
                <div className="text-4xl font-bold text-blue-400 mt-2">
                  {spectatingMatch.player1.score}
                </div>
              </div>

              <div className="px-6">
                <div className="text-3xl font-bold">VS</div>
              </div>

              <div className="flex-1 text-right">
                <div className="text-xl font-bold">{spectatingMatch.player2.username}</div>
                <div className="text-4xl font-bold text-red-400 mt-2">
                  {spectatingMatch.player2.score}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Decks Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Player 1 Deck */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-bold text-blue-400 mb-4">
                {spectatingMatch.player1.username}의 덱
              </h3>
              <div className="space-y-2">
                {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                  const card = spectatingMatch.player1Deck?.[pos];
                  return card ? (
                    <div key={pos} className="flex items-center gap-3 text-white">
                      <img
                        src={getPlayerImageUrl(card.name, card.team)}
                        alt={card.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold">{card.name}</div>
                        <div className="text-sm text-gray-300">
                          {card.team} · {card.overall}
                          {card.level > 0 && ` +${card.level}`}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </motion.div>

            {/* Player 2 Deck */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-bold text-red-400 mb-4">
                {spectatingMatch.player2.username}의 덱
              </h3>
              <div className="space-y-2">
                {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                  const card = spectatingMatch.player2Deck?.[pos];
                  return card ? (
                    <div key={pos} className="flex items-center gap-3 text-white">
                      <img
                        src={getPlayerImageUrl(card.name, card.team)}
                        alt={card.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold">{card.name}</div>
                        <div className="text-sm text-gray-300">
                          {card.team} · {card.overall}
                          {card.level > 0 && ` +${card.level}`}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </motion.div>
          </div>

          {/* Match Events */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6"
          >
            <h3 className="text-xl font-bold text-white mb-4">실시간 경기 진행</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {matchEvents.length === 0 ? (
                <p className="text-gray-300 text-center py-4">경기 이벤트 대기 중...</p>
              ) : (
                matchEvents.map((event, idx) => (
                  <div key={idx} className="text-white bg-white/5 rounded p-3">
                    {event}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Round History */}
          {roundHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">페이즈 기록</h3>
              <div className="space-y-4">
                {roundHistory.map((round, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg p-6 border border-white/10"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-white mb-4">
                      <div className="font-bold text-lg">{getPhaseName(round.round)}</div>
                      <div className={`font-bold text-lg ${
                        round.winner === 1 ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        승자: {round.winner === 1
                          ? spectatingMatch.player1.username
                          : spectatingMatch.player2.username}
                      </div>
                    </div>

                    {/* Total Power */}
                    <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-white/5 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm text-gray-400">{spectatingMatch.player1.username}</div>
                        <div className="text-3xl font-bold text-blue-400">{round.player1Power}</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-400">VS</div>
                      <div className="text-center">
                        <div className="text-sm text-gray-400">{spectatingMatch.player2.username}</div>
                        <div className="text-3xl font-bold text-red-400">{round.player2Power}</div>
                      </div>
                    </div>

                    {/* Position Breakdown */}
                    {round.details && (
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-gray-300 mb-2">포지션별 세부 정보:</div>
                        {['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map((position) => {
                          const p1Detail = round.details?.player1?.[position.toLowerCase()];
                          const p2Detail = round.details?.player2?.[position.toLowerCase()];
                          if (!p1Detail || !p2Detail) return null;

                          return (
                            <div key={position} className="grid grid-cols-3 gap-2 p-2 bg-white/10 rounded">
                              <div className="text-xs">
                                <div className="font-semibold text-blue-400">{p1Detail.name}</div>
                                <div className="text-gray-400">파워: {p1Detail.power}</div>
                              </div>
                              <div className="text-center text-xs font-bold text-gray-300 flex items-center justify-center">
                                {position}
                              </div>
                              <div className="text-right text-xs">
                                <div className="font-semibold text-red-400">{p2Detail.name}</div>
                                <div className="text-gray-400">파워: {p2Detail.power}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Live matches list
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4 flex items-center justify-center gap-3">
            <Eye className="w-12 h-12" /> 라이브 경기 관전
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            진행 중인 랭크전을 실시간으로 관전하세요
          </p>
        </motion.div>

        {/* Live Matches */}
        {liveMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              현재 진행 중인 라이브 랭크전이 없습니다
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((match) => (
              <motion.div
                key={match.matchId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all cursor-pointer"
                onClick={() => navigate(`/spectator/${match.matchId}`)}
              >
                {/* Phase Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {getPhaseName(match.currentRound)}
                  </div>
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>

                {/* Players */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.player1.username}
                      </div>
                    </div>
                    <div className="px-4 text-2xl font-bold text-gray-800 dark:text-white">
                      {match.player1.score} - {match.player2.score}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.player2.username}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watch Button */}
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2">
                  <Eye className="w-5 h-5" />
                  관전하기
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
