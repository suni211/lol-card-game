import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swords, Layers, Users, Trophy, Target, Zap, Shield, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getPlayerImageUrl } from '../utils/playerImage';

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
  season?: string;
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

type Strategy = 'AGGRESSIVE' | 'TEAMFIGHT' | 'DEFENSIVE';

interface RoundResult {
  round: number;
  player1Strategy: Strategy;
  player2Strategy: Strategy;
  player1Power: number;
  player2Power: number;
  winner: 1 | 2;
  currentScore: {
    player1: number;
    player2: number;
  };
}

export default function Match() {
  const { token, user, updateUser } = useAuthStore();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [queueSize, setQueueSize] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Realtime match state
  const [inMatch, setInMatch] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [opponentDeck, setOpponentDeck] = useState<any>(null);
  const [showLineup, setShowLineup] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

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
        // Authenticate for realtime match handlers
        socket.emit('authenticate', { token });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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

    // Realtime match events
    socket.on('matchFound', (data) => {
      console.log('Real-time match found:', data);
      setMatchId(data.matchId);
      setOpponent(data.opponent);
      setOpponentDeck(data.opponent.deck);
      setShowLineup(true);
      setMatching(false);
      setRoundHistory([]);
      setMyScore(0);
      setOpponentScore(0);
      toast.success(`매치 발견! 상대: ${data.opponent.username}`);
    });

    socket.on('roundStart', (data) => {
      console.log('Round start:', data);
      setShowLineup(false);
      setInMatch(true);
      setCurrentRound(data.round);
      setRoundTimeLeft(Math.floor(data.timeLimit / 1000));
      setSelectedStrategy(null);

      // Start countdown timer
      const interval = setInterval(() => {
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    });

    socket.on('roundResult', (data: RoundResult) => {
      console.log('Round result:', data);
      setRoundHistory(prev => [...prev, data]);
      setMyScore(data.currentScore.player1);
      setOpponentScore(data.currentScore.player2);

      // Show round result toast
      if (data.winner === 1) {
        toast.success(`라운드 ${data.round} 승리!`);
      } else {
        toast.error(`라운드 ${data.round} 패배`);
      }
    });

    socket.on('matchComplete', async (data) => {
      console.log('Match complete:', data);
      setInMatch(false);
      setMatchId(null);
      setMatchResult({
        won: data.won,
        myScore: data.myScore,
        opponentScore: data.opponentScore,
        opponent: data.opponent,
        pointsChange: data.pointsChange,
        ratingChange: data.ratingChange,
      });

      if (data.won) {
        toast.success(`승리! +${data.pointsChange} 포인트, +${data.ratingChange} 레이팅`);
      } else {
        toast.error(`패배! +${data.pointsChange} 포인트, ${data.ratingChange} 레이팅`);
      }

      // Fetch updated user data
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
      setInMatch(false);
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
    socketRef.current.emit('join_queue', { token, isPractice: false });
    toast.success('매칭 대기열에 참가했습니다');
  };

  const cancelMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_queue');
      setMatching(false);
      toast('매칭 취소됨');
    }
  };

  const selectStrategy = (strategy: Strategy) => {
    if (!socketRef.current || !matchId || selectedStrategy) return;

    setSelectedStrategy(strategy);
    socketRef.current.emit('selectStrategy', { matchId, strategy });
    toast.success(`${getStrategyName(strategy)} 선택!`);
  };

  const forfeitMatch = () => {
    if (!socketRef.current || !matchId) return;

    if (confirm('정말 항복하시겠습니까?')) {
      socketRef.current.emit('forfeitMatch', { matchId });
      setInMatch(false);
      setMatchId(null);
      toast.error('항복했습니다');
    }
  };

  const playAgain = () => {
    setMatchResult(null);
    setRoundHistory([]);
  };

  const getStrategyName = (strategy: Strategy): string => {
    switch (strategy) {
      case 'AGGRESSIVE':
        return '공격형 (라인전)';
      case 'TEAMFIGHT':
        return '한타형';
      case 'DEFENSIVE':
        return '수비형 (운영)';
    }
  };

  const getStrategyIcon = (strategy: Strategy) => {
    switch (strategy) {
      case 'AGGRESSIVE':
        return <Zap className="w-6 h-6" />;
      case 'TEAMFIGHT':
        return <Shield className="w-6 h-6" />;
      case 'DEFENSIVE':
        return <MapPin className="w-6 h-6" />;
    }
  };

  const getStrategyColor = (strategy: Strategy): string => {
    switch (strategy) {
      case 'AGGRESSIVE':
        return 'from-yellow-500 to-orange-500';
      case 'TEAMFIGHT':
        return 'from-blue-500 to-purple-500';
      case 'DEFENSIVE':
        return 'from-green-500 to-teal-500';
    }
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
            실시간 전략 대결!
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
        ) : showLineup ? (
          /* Lineup Preview Screen */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
                VS {opponent?.username}
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400">
                상대 라인업을 확인하세요
              </p>
            </div>

            {/* Lineups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* My Deck */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-blue-500">
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">
                  내 라인업
                </h3>
                <div className="space-y-3">
                  {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                    const card = deck[pos as keyof Deck] as UserCard | null;
                    return (
                      <div key={pos} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {card && (
                          <>
                            <img
                              src={getPlayerImageUrl(card.player.name, card.player.season || '25', card.player.tier)}
                              alt={card.player.name}
                              className="w-16 h-16 rounded-lg object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/players/placeholder.png';
                              }}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {card.player.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {card.player.team} · {card.player.position}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                OVR {card.player.overall + card.level}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opponent Deck */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-red-500">
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 text-center">
                  상대 라인업
                </h3>
                <div className="space-y-3">
                  {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                    const card = opponentDeck?.[pos];
                    return (
                      <div key={pos} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {card && (
                          <>
                            <img
                              src={getPlayerImageUrl(card.name, card.season || '25', card.tier)}
                              alt={card.name}
                              className="w-16 h-16 rounded-lg object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/players/placeholder.png';
                              }}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {card.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {card.team}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                OVR {card.overall + card.level}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setShowLineup(false);
                  setInMatch(true);
                }}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                경기 시작
              </button>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                10초 후 자동으로 경기가 시작됩니다
              </p>
            </div>
          </motion.div>
        ) : inMatch ? (
          /* In Match - Strategy Selection */
          <div className="space-y-6">
            {/* Match Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">YOU</div>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{myScore}</div>
                </div>
                <div className="text-center px-6">
                  <div className="text-xl font-bold text-gray-600 dark:text-gray-400">VS</div>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">라운드 {currentRound}</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{opponent?.username}</div>
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400 mt-2">{opponentScore}</div>
                </div>
              </div>

              {/* Round Timer */}
              {roundTimeLeft > 0 && (
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                    {roundTimeLeft}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">초 남음</div>
                </div>
              )}
            </motion.div>

            {/* Strategy Selection */}
            {roundTimeLeft > 0 && !selectedStrategy && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                  전략을 선택하세요!
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => selectStrategy('AGGRESSIVE')}
                    className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transition-all transform hover:scale-105 shadow-lg"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Zap className="w-12 h-12" />
                      <div className="text-xl font-bold">공격형</div>
                      <div className="text-sm opacity-90">(라인전 스탯 사용)</div>
                    </div>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>

                  <button
                    onClick={() => selectStrategy('TEAMFIGHT')}
                    className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all transform hover:scale-105 shadow-lg"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="w-12 h-12" />
                      <div className="text-xl font-bold">한타형</div>
                      <div className="text-sm opacity-90">(한타 스탯 사용)</div>
                    </div>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>

                  <button
                    onClick={() => selectStrategy('DEFENSIVE')}
                    className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white transition-all transform hover:scale-105 shadow-lg"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <MapPin className="w-12 h-12" />
                      <div className="text-xl font-bold">수비형</div>
                      <div className="text-sm opacity-90">(운영 스탯 사용)</div>
                    </div>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-900 dark:text-blue-300 text-center">
                    <strong>가위바위보 상성:</strong> 공격형 {">"} 한타형 {">"} 수비형 {">"} 공격형
                  </div>
                </div>
              </motion.div>
            )}

            {selectedStrategy && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 text-center"
              >
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  선택 완료! 상대방을 기다리는 중...
                </div>
                <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r ${getStrategyColor(selectedStrategy)} text-white`}>
                  {getStrategyIcon(selectedStrategy)}
                  <span className="text-2xl font-bold">{getStrategyName(selectedStrategy)}</span>
                </div>
              </motion.div>
            )}

            {/* Round History */}
            {roundHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">라운드 기록</h3>
                <div className="space-y-3">
                  {roundHistory.map((round, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        round.winner === 1
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            R{round.round}
                          </div>
                          <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getStrategyColor(round.player1Strategy)} text-white text-sm font-bold`}>
                            {getStrategyName(round.player1Strategy)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">vs</div>
                          <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getStrategyColor(round.player2Strategy)} text-white text-sm font-bold`}>
                            {getStrategyName(round.player2Strategy)}
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${
                          round.winner === 1
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {round.winner === 1 ? '승리' : '패배'}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                        파워: {round.player1Power} vs {round.player2Power}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Forfeit Button */}
            <button
              onClick={forfeitMatch}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
            >
              항복
            </button>
          </div>
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

            {/* Match Button or Result */}
            {!matchResult ? (
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
                      실시간 전략 대결 - 5판 3선승
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
