import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swords, Layers, Users, Trophy, Target, Zap, Shield, MapPin, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getPlayerImageUrl } from '../utils/playerImage';
import PremiumButton from '../components/ui/PremiumButton';
import PremiumCard from '../components/ui/PremiumCard';
import { calculateEnhancementBonus } from '../utils/enhancement';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
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
  details?: {
    player1?: Record<string, { name: string; power: number }>;
    player2?: Record<string, { name: string; power: number }>;
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

  // Realtime match state - SIMPLIFIED
  const [matchState, setMatchState] = useState<'idle' | 'lineup' | 'playing'>('idle');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [opponentDeck, setOpponentDeck] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [matchEvents, setMatchEvents] = useState<string[]>([]);
  const [eventTimer, setEventTimer] = useState(0);

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
    const baseStat = card.player.overall + calculateEnhancementBonus(card.level);
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
      console.log('🔌 Socket connected!');
      console.log('   └─ Socket ID:', socket.id);
      console.log('   └─ Socket URL:', SOCKET_URL);
      if (!hasConnected) {
        hasConnected = true;
        // Authenticate for realtime match handlers
        console.log('   └─ Sending authenticate event');
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
      console.log('🎯 MATCH FOUND EVENT RECEIVED');
      console.log('  ├─ My Socket ID:', socket.id);
      console.log('  ├─ Match ID:', data.matchId);
      console.log('  ├─ Opponent:', data.opponent.username);
      console.log('  └─ Opponent Deck:', data.opponent?.deck);

      // Set all match data
      setMatchId(data.matchId);
      setOpponent(data.opponent);
      setOpponentDeck(data.opponent?.deck || null);
      setMatching(false);
      setRoundHistory([]);
      setMyScore(0);
      setOpponentScore(0);

      // Show lineup preview
      console.log('🔄 SETTING MATCH STATE TO: lineup');
      setMatchState('lineup');
      console.log('✅ State set complete, lineup should now render');

      toast.success(`매치 성사! VS ${data.opponent.username}`, { duration: 3000 });
    });

    socket.on('roundStart', (data) => {
      console.log('⚔️ ROUND START! Round:', data.round);

      // Start playing
      setMatchState('playing');
      setCurrentRound(data.round);
      setRoundTimeLeft(Math.floor(data.timeLimit / 1000));
      setSelectedStrategy(null);

      // 새 라운드 시작 시 이벤트 초기화
      setMatchEvents([]);
      setEventTimer(0);

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

    socket.on('matchEvent', (data: { round: number; stage: number; time: number; message: string }) => {
      console.log('📢 Match event received:', data);
      console.log('  ├─ Round:', data.round);
      console.log('  ├─ Stage:', data.stage);
      console.log('  ├─ Time:', data.time);
      console.log('  └─ Message:', data.message);

      setMatchEvents(prev => {
        const updated = [...prev, data.message];
        console.log('📋 Updated events array:', updated);
        console.log('📊 Events count:', updated.length);
        return updated;
      });

      setEventTimer(data.time);
      console.log('⏱️ Event timer set to:', data.time);
    });

    socket.on('roundResult', (data: RoundResult) => {
      console.log('Round result:', data);
      setRoundHistory(prev => [...prev, data]);
      setMyScore(data.currentScore.player1);
      setOpponentScore(data.currentScore.player2);

      // 이벤트 초기화 제거 - 다음 라운드 시작할 때 초기화됨

      // Show round result toast
      if (data.winner === 1) {
        toast.success(`${getPhaseName(data.round)} 승리!`);
      } else {
        toast.error(`${getPhaseName(data.round)} 패배`);
      }
    });

    socket.on('matchComplete', async (data) => {
      console.log('🏁 Match complete:', data);
      setMatchState('idle');
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
      setMatchState('idle');
    });

    return () => {
      if (socketRef.current) {
        // Remove all event listeners to prevent duplicates
        socketRef.current.off('connect');
        socketRef.current.off('connect_error');
        socketRef.current.off('disconnect');
        socketRef.current.off('queue_update');
        socketRef.current.off('queue_error');
        socketRef.current.off('match_found');
        socketRef.current.off('matchFound');
        socketRef.current.off('roundStart');
        socketRef.current.off('matchEvent');
        socketRef.current.off('roundResult');
        socketRef.current.off('matchComplete');
        socketRef.current.off('match_error');

        socketRef.current.disconnect();
        socketRef.current = null;
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

    console.log('🎯 Selecting strategy:', strategy, 'for match:', matchId);
    setSelectedStrategy(strategy);
    socketRef.current.emit('selectStrategy', { matchId, strategy });
    toast.success(`${getStrategyName(strategy)} 선택!`);
  };

  const forfeitMatch = () => {
    if (!socketRef.current || !matchId) return;

    if (confirm('정말 항복하시겠습니까?')) {
      socketRef.current.emit('forfeitMatch', { matchId });
      setMatchState('idle');
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

  // Debug logging - DETAILED
  console.log('═══════════════════════════════════');
  console.log('🎮 RENDER - Match State:', matchState);
  console.log('👥 Opponent:', opponent?.username || 'none');
  console.log('📋 Opponent Deck:', opponentDeck ? 'loaded' : 'none');
  console.log('🎯 Match ID:', matchId || 'none');
  console.log('✅ Deck complete:', isDeckComplete());
  console.log('🎲 Selected Strategy:', selectedStrategy);
  console.log('📢 Match Events:', matchEvents);
  console.log('📊 Events Count:', matchEvents.length);
  console.log('⏱️ Event Timer:', eventTimer);
  console.log('═══════════════════════════════════');

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
    <div className="min-h-screen relative overflow-hidden py-12 px-4">
      {/* Animated Background */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 via-yellow-50 to-red-50 dark:from-gray-900 dark:via-red-900/30 dark:via-orange-900/30 dark:to-gray-900 bg-[length:200%_200%]"
      />

      {/* Battle Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-30, -100, -30],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0, 0.8, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          className="absolute text-red-500/20 dark:text-orange-400/20 text-2xl"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: 0,
          }}
        >
          ⚔️
        </motion.div>
      ))}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4 shadow-2xl relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 blur-xl opacity-50 animate-pulse rounded-full" />
            <Swords className="w-12 h-12 text-white relative z-10" />
          </motion.div>
          <motion.h1
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="text-5xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 dark:from-red-400 dark:via-orange-400 dark:to-yellow-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-4"
          >
            랭크 경기
          </motion.h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">
            실시간 전략 대결!
          </p>
        </motion.div>

        {/* Check if deck is incomplete first */}
        {!deck || !isDeckComplete() ? (
          /* Empty State - Need Deck */
          <PremiumCard gradient="dark" glow hover3D>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                경기를 시작하려면 완성된 덱이 필요합니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                5명의 선수를 모두 배치하고 전략을 설정해야 합니다
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/gacha">
                  <PremiumButton variant="gold" size="lg" icon={<Sparkles className="w-5 h-5" />}>
                    카드 뽑기
                  </PremiumButton>
                </a>
                <a href="/deck">
                  <PremiumButton variant="primary" size="lg" icon={<Layers className="w-5 h-5" />}>
                    덱 편성하기
                  </PremiumButton>
                </a>
              </div>
            </motion.div>
          </PremiumCard>
        ) : matchState === 'lineup' ? (
          /* 🔥 LINEUP PREVIEW - THIS SHOULD SHOW! */
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <div className="max-w-6xl w-full p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                {/* BIG YELLOW HEADER */}
                <div className="bg-yellow-500 rounded-xl shadow-2xl p-8 border-4 border-yellow-300">
                  <h1 className="text-6xl font-bold text-center text-black mb-4">
                    ⚔️ 라인업 확인 ⚔️
                  </h1>
                  <h2 className="text-4xl font-bold text-center text-black mb-2">
                    VS {opponent?.username || '???'}
                  </h2>
                  <p className="text-center text-black text-2xl font-bold">
                    ⏱️ 10초 후 자동 시작
                  </p>
                </div>

                {/* Lineups */}
                <div className="grid grid-cols-2 gap-6">
                  {/* My Deck */}
                  <div className="bg-blue-600 rounded-xl shadow-2xl p-6 border-4 border-blue-400">
                    <h3 className="text-3xl font-bold text-white mb-4 text-center">
                      내 라인업
                    </h3>
                    <div className="space-y-3">
                      {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                        const card = deck?.[pos as keyof Deck] as UserCard | null;
                        return (
                          <div key={pos} className="flex items-center gap-3 p-3 bg-white rounded-lg">
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
                                  <div className="text-lg font-bold text-gray-900">
                                    {card.player.name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {card.player.team} · {card.player.position}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    OVR {card.player.overall + calculateEnhancementBonus(card.level)}
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
                  <div className="bg-red-600 rounded-xl shadow-2xl p-6 border-4 border-red-400">
                    <h3 className="text-3xl font-bold text-white mb-4 text-center">
                      상대 라인업
                    </h3>
                    <div className="space-y-3">
                      {['top', 'jungle', 'mid', 'adc', 'support'].map((pos) => {
                        const card = opponentDeck?.[pos];
                        return (
                          <div key={pos} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            {card ? (
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
                                  <div className="text-lg font-bold text-gray-900">
                                    {card.name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {card.team} · {pos.toUpperCase()}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    OVR {card.overall + calculateEnhancementBonus(card.level || 0)}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-400">
                                {pos.toUpperCase()} 정보 없음
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : matchState === 'playing' ? (
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
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">{getPhaseName(currentRound)}</div>
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

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <div className="font-bold text-center mb-2 text-lg">📊 전략 효과</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                        <div className="font-semibold text-yellow-600 dark:text-yellow-400">⚡ 공격형</div>
                        <div>초반 압박, 빠른 성장</div>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">🛡️ 한타형</div>
                        <div>협동 플레이, 한타 승률</div>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                        <div className="font-semibold text-green-600 dark:text-green-400">🎯 수비형</div>
                        <div>전략적 운영, 안정성</div>
                      </div>
                    </div>
                    <div className="text-center mt-2 text-xs opacity-75">
                      각 페이즈마다 사용되는 스탯이 다릅니다!
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedStrategy && (
              <>
                {console.log('🔍 Rendering strategy selected section')}
                {console.log('  └─ matchEvents.length:', matchEvents.length)}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 text-center"
                >
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {matchEvents.length > 0 ? '경기 진행 중...' : '선택 완료! 상대방을 기다리는 중...'}
                  </div>
                  <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r ${getStrategyColor(selectedStrategy)} text-white`}>
                    {getStrategyIcon(selectedStrategy)}
                    <span className="text-2xl font-bold">{getStrategyName(selectedStrategy)}</span>
                  </div>

                  {/* Event Timer */}
                  {matchEvents.length > 0 && (
                    <div className="mt-6">
                      <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                        {eventTimer}초
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">경기 진행 시간</div>
                    </div>
                  )}
                </motion.div>

                {/* Match Events - 무조건 표시 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-4 border-yellow-500"
                >
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-8 h-8 text-yellow-500" />
                      실시간 중계
                    </div>
                    {/* 현재 우세 표시 */}
                    {matchEvents.length > 0 && (
                      <div className="text-lg font-bold">
                        {myScore > opponentScore ? (
                          <span className="text-blue-600 dark:text-blue-400">YOU 우세!</span>
                        ) : myScore < opponentScore ? (
                          <span className="text-red-600 dark:text-red-400">{opponent?.username} 우세!</span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">박빙!</span>
                        )}
                      </div>
                    )}
                  </h3>

                  {/* 점수 바 */}
                  {matchEvents.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 w-20">YOU</span>
                        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${(myScore / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400 w-8">{myScore}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 w-20">{opponent?.username}</span>
                        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                            style={{ width: `${(opponentScore / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-xl font-bold text-red-600 dark:text-red-400 w-8">{opponentScore}</span>
                      </div>
                    </div>
                  )}

                  {matchEvents.length === 0 ? (
                    <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-lg text-gray-600 dark:text-gray-300">경기 시작 대기 중...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {matchEvents.map((event, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-blue-400 dark:border-blue-600"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{idx + 1}</span>
                            <p className="text-base text-gray-900 dark:text-white font-bold flex-1">{event}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </>
            )}

            {/* Round History */}
            {roundHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">라운드 기록</h3>
                <div className="space-y-4">
                  {roundHistory.map((round, idx) => (
                    <div
                      key={idx}
                      className={`p-6 rounded-lg border-2 ${
                        round.winner === 1
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {getPhaseName(round.round)}
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

                      {/* Total Power */}
                      <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">YOU</div>
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{round.player1Power}</div>
                        </div>
                        <div className="text-2xl font-bold text-gray-400">VS</div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{opponent?.username}</div>
                          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{round.player2Power}</div>
                        </div>
                      </div>

                      {/* Position Breakdown */}
                      {round.details && (
                        <div className="space-y-2">
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">포지션별 세부 정보:</div>
                          {['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map((position) => {
                            const p1Detail = round.details?.player1?.[position.toLowerCase()];
                            const p2Detail = round.details?.player2?.[position.toLowerCase()];
                            if (!p1Detail || !p2Detail) return null;

                            return (
                              <div key={position} className="grid grid-cols-3 gap-2 p-2 bg-white/30 dark:bg-gray-800/30 rounded">
                                <div className="text-xs">
                                  <div className="font-semibold text-blue-600 dark:text-blue-400">{p1Detail.name}</div>
                                  <div className="text-gray-600 dark:text-gray-400">파워: {p1Detail.power}</div>
                                </div>
                                <div className="text-center text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                  {position}
                                </div>
                                <div className="text-right text-xs">
                                  <div className="font-semibold text-red-600 dark:text-red-400">{p2Detail.name}</div>
                                  <div className="text-gray-600 dark:text-gray-400">파워: {p2Detail.power}</div>
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
            <PremiumCard gradient="blue" glow hover3D>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
              >
                <motion.h2
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-4"
                >
                  내 덱: {deck!.name}
                </motion.h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <PremiumCard gradient="blue" glow hover3D>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </motion.div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">총 OVR</span>
                      </div>
                      <motion.p
                        key={calculateTotalOVR()}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent"
                      >
                        {calculateTotalOVR()}
                      </motion.p>
                    </div>
                  </PremiumCard>

                  <PremiumCard gradient="purple" glow hover3D>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </motion.div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">평균 OVR</span>
                      </div>
                      <motion.p
                        key={Math.round(calculateTotalOVR() / 5)}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
                      >
                        {Math.round(calculateTotalOVR() / 5)}
                      </motion.p>
                    </div>
                  </PremiumCard>

                  <PremiumCard gradient="rainbow" glow hover3D>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </motion.div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">전략</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {deck!.laningStrategy}
                      </p>
                    </div>
                  </PremiumCard>
                </div>

              {/* Roster Preview */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { card: deck!.top, position: 'TOP', label: '탑' },
                  { card: deck!.jungle, position: 'JUNGLE', label: '정글' },
                  { card: deck!.mid, position: 'MID', label: '미드' },
                  { card: deck!.adc, position: 'ADC', label: '원딜' },
                  { card: deck!.support, position: 'SUPPORT', label: '서폿' },
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
            </PremiumCard>

            {/* Match Button or Result */}
            {!matchResult ? (
              <PremiumCard gradient="dark" glow>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-8 text-center"
                >
                  {!matching ? (
                    <>
                      <PremiumButton
                        onClick={startMatch}
                        variant="danger"
                        size="lg"
                        icon={<Swords className="w-6 h-6" />}
                        className="w-full text-xl"
                      >
                        랭크 매칭 시작
                      </PremiumButton>
                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
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
                        상대를 찾고 있습니다
                      </p>
                    </div>
                    <PremiumButton
                      onClick={cancelMatch}
                      variant="secondary"
                      size="lg"
                      className="w-full text-xl"
                    >
                      매칭 취소
                    </PremiumButton>
                  </>
                )}
                </motion.div>
              </PremiumCard>
            ) : (
              /* Match Result */
              <PremiumCard gradient={matchResult.won ? "rainbow" : "dark"} glow hover3D>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8"
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

                <PremiumButton
                  onClick={playAgain}
                  variant="primary"
                  size="lg"
                  icon={<Swords className="w-5 h-5" />}
                  className="w-full"
                >
                  다시 경기하기
                </PremiumButton>
                </motion.div>
              </PremiumCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
