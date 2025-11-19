import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Users, Eye, Zap, Target, Map } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Phase = 'LANING' | 'TEAMFIGHT' | 'MACRO';

interface Match {
  id: number;
  player1_id: number;
  player2_id: number;
  current_phase: Phase;
  phase_score_p1: number;
  phase_score_p2: number;
  is_live: boolean;
}

// Strategy options for each phase
const STRATEGIES = {
  LANING: ['AGGRESSIVE', 'SAFE', 'ROAMING', 'SCALING', 'PUSH'],
  TEAMFIGHT: ['ENGAGE', 'DISENGAGE', 'POKE', 'PROTECT'],
  MACRO: ['OBJECTIVE', 'VISION', 'SPLITPUSH', 'GROUPING'],
};

const STRATEGY_LABELS: { [key: string]: string } = {
  // Laning
  AGGRESSIVE: '공격적 라이닝',
  SAFE: '안전 라이닝',
  ROAMING: '로밍',
  SCALING: '성장형',
  PUSH: '푸시',
  // Teamfight
  ENGAGE: '이니시에이팅',
  DISENGAGE: '역이니시',
  POKE: '포킹',
  PROTECT: '보호 조합',
  // Macro
  OBJECTIVE: '오브젝트 우선',
  VISION: '시야 장악',
  SPLITPUSH: '분할 푸시',
  GROUPING: '그룹 플레이',
};

const PHASE_ICONS: { [key in Phase]: any } = {
  LANING: Target,
  TEAMFIGHT: Swords,
  MACRO: Map,
};

const PHASE_LABELS: { [key in Phase]: string } = {
  LANING: '라이닝 페이즈',
  TEAMFIGHT: '팀파이트 페이즈',
  MACRO: '매크로 페이즈',
};

export default function Match3Phase() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [opponents, setOpponents] = useState<any[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<number | null>(null);
  const [isRanked, setIsRanked] = useState(true);

  // Match state
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
    loadOpponents();
  }, []);

  const loadOpponents = async () => {
    try {
      setLoading(true);
      // Get users for match selection
      const res = await axios.get(`${API_URL}/ranking/top`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        // Filter out current user
        const otherUsers = res.data.data.filter((u: any) => u.id !== user?.id);
        setOpponents(otherUsers);
      }
    } catch (err) {
      console.error(err);
      toast.error('상대 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const startMatch = async () => {
    if (!selectedOpponent) {
      toast.error('상대를 선택해주세요');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/match3phase/start`,
        {
          opponentId: selectedOpponent,
          isRanked,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        setCurrentMatch({
          id: res.data.data.matchId,
          player1_id: user!.id,
          player2_id: selectedOpponent,
          current_phase: 'LANING',
          phase_score_p1: 0,
          phase_score_p2: 0,
          is_live: true,
        });
        toast.success(res.data.data.message);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || '경기 시작 실패');
    } finally {
      setLoading(false);
    }
  };

  const executePhase = async () => {
    if (!selectedStrategy || !currentMatch) {
      toast.error('전략을 선택해주세요');
      return;
    }

    try {
      setLoading(true);
      setWaitingForOpponent(true);

      // In real implementation, both players would select strategies
      // For demo purposes, we'll use a random strategy for opponent
      const opponentStrategies = STRATEGIES[currentMatch.current_phase];
      const opponentStrategy =
        opponentStrategies[Math.floor(Math.random() * opponentStrategies.length)];

      const res = await axios.post(
        `${API_URL}/match3phase/execute-phase`,
        {
          matchId: currentMatch.id,
          phase: currentMatch.current_phase,
          player1Strategy: selectedStrategy,
          player2Strategy: opponentStrategy,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        const { winnerId, scoreP1, scoreP2, nextPhase, matchFinished } = res.data.data;

        if (matchFinished) {
          const isWinner = winnerId === user?.id;
          toast.success(isWinner ? '승리했습니다!' : '패배했습니다!');
          setCurrentMatch(null);
          setSelectedStrategy('');
          setWaitingForOpponent(false);
        } else {
          // Update match for next phase
          setCurrentMatch({
            ...currentMatch,
            current_phase: nextPhase,
            phase_score_p1: scoreP1,
            phase_score_p2: scoreP2,
          });
          setSelectedStrategy('');
          setWaitingForOpponent(false);
          toast.success(
            winnerId === user?.id
              ? `페이즈 승리! ${PHASE_LABELS[nextPhase]} 준비`
              : `페이즈 패배. ${PHASE_LABELS[nextPhase]} 준비`
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || '페이즈 실행 실패');
      setWaitingForOpponent(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  // Battle UI when match is active
  if (currentMatch) {
    const PhaseIcon = PHASE_ICONS[currentMatch.current_phase];
    const availableStrategies = STRATEGIES[currentMatch.current_phase];

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Match Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <PhaseIcon className="w-8 h-8 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">
                  {PHASE_LABELS[currentMatch.current_phase]}
                </h2>
              </div>
              <div className="text-white text-xl font-bold">
                {currentMatch.phase_score_p1} - {currentMatch.phase_score_p2}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div
                className={`h-3 rounded-full flex-1 ${
                  currentMatch.phase_score_p1 >= 1 ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
              <div
                className={`h-3 rounded-full flex-1 ${
                  currentMatch.phase_score_p1 >= 2 ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
              <div className="text-white font-semibold">VS</div>
              <div
                className={`h-3 rounded-full flex-1 ${
                  currentMatch.phase_score_p2 >= 1 ? 'bg-red-500' : 'bg-gray-600'
                }`}
              />
              <div
                className={`h-3 rounded-full flex-1 ${
                  currentMatch.phase_score_p2 >= 2 ? 'bg-red-500' : 'bg-gray-600'
                }`}
              />
            </div>
          </motion.div>

          {/* Strategy Selection */}
          {!waitingForOpponent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">전략 선택</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {availableStrategies.map((strategy) => (
                  <button
                    key={strategy}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedStrategy === strategy
                        ? 'bg-primary-600 border-primary-400 text-white scale-105'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="font-semibold">{STRATEGY_LABELS[strategy]}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={executePhase}
                disabled={!selectedStrategy || loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                {loading ? '실행 중...' : '전략 확정'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center"
            >
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">상대방의 전략을 기다리는 중...</p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Match selection UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4">
            3단계 전투
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            라이닝 → 팀파이트 → 매크로 3단계 전략 대결
          </p>
        </motion.div>

        {/* Mode Selection */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setIsRanked(true)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              isRanked
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Trophy className="inline w-5 h-5 mr-2" />
            랭크전
          </button>
          <button
            onClick={() => setIsRanked(false)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              !isRanked
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Users className="inline w-5 h-5 mr-2" />
            일반전
          </button>
        </div>

        {/* Opponent Selection */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            상대 선택
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {opponents.map((opponent) => (
              <button
                key={opponent.id}
                onClick={() => setSelectedOpponent(opponent.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedOpponent === opponent.id
                    ? 'bg-primary-100 dark:bg-primary-900 border-primary-500'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-300'
                }`}
              >
                <div className="font-semibold text-gray-800 dark:text-white">
                  {opponent.username}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Rating: {opponent.rating || 1000}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Start Match Button */}
        <button
          onClick={startMatch}
          disabled={!selectedOpponent || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          {loading ? '경기 시작 중...' : '경기 시작'}
        </button>

        {/* Spectator Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/spectator')}
            className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            라이브 경기 관전하기
          </button>
        </div>
      </div>
    </div>
  );
}
