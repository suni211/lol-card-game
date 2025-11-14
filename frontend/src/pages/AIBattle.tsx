import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Swords, Trophy, TrendingUp, Zap, Target } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AIStats {
  currentDifficulty: number;
  totalWins: number;
}

interface BattleResult {
  won: boolean;
  playerScore: number;
  aiScore: number;
  playerPower: number;
  aiPower: number;
  pointsReward: number;
  aiDifficulty: number;
}

export default function AIBattle() {
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [battling, setBattling] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, user, updateUser } = useAuthStore();

  useEffect(() => {
    fetchAIStats();
  }, []);

  const fetchAIStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAiStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = async () => {
    try {
      setBattling(true);
      setResult(null);

      const response = await axios.post(
        `${API_URL}/ai/battle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setResult(response.data.data);

        // Fetch updated user data
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.data.success) {
          updateUser(userResponse.data.data);
        }

        // Refresh AI stats
        await fetchAIStats();
      }
    } catch (error: any) {
      console.error('AI battle error:', error);
      alert(error.response?.data?.error || 'AI 배틀 실패');
    } finally {
      setBattling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <Bot className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI 배틀
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            무제한으로 AI와 대결하고 포인트를 획득하세요!
          </p>
        </motion.div>

        {/* AI Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Difficulty */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-3">
                <Target className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {aiStats?.currentDifficulty || 400}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                현재 AI 난이도
              </div>
            </div>

            {/* Total Wins */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-3">
                <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {aiStats?.totalWins || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                총 승리 횟수
              </div>
            </div>

            {/* User Points */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user?.points || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                보유 포인트
              </div>
            </div>
          </div>
        </motion.div>

        {/* Battle Button */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <button
              onClick={startBattle}
              disabled={battling}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {battling ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>배틀 중...</span>
                </>
              ) : (
                <>
                  <Swords className="w-6 h-6" />
                  <span>AI 배틀 시작</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Battle Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gradient-to-br ${
              result.won
                ? 'from-green-500 to-emerald-600'
                : 'from-red-500 to-rose-600'
            } rounded-xl shadow-2xl p-8 mb-8 text-white`}
          >
            {/* Result Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{result.won ? '🎉' : '😢'}</div>
              <h2 className="text-4xl font-bold mb-2">
                {result.won ? '승리!' : '패배'}
              </h2>
              <p className="text-xl opacity-90">
                {result.won
                  ? 'AI를 이겼습니다!'
                  : '다음엔 더 잘할 수 있을 거예요!'}
              </p>
            </div>

            {/* Score */}
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="text-center">
                <div className="text-sm opacity-80 mb-1">내 점수</div>
                <div className="text-5xl font-bold">{result.playerScore}</div>
              </div>
              <div className="text-4xl">-</div>
              <div className="text-center">
                <div className="text-sm opacity-80 mb-1">AI 점수</div>
                <div className="text-5xl font-bold">{result.aiScore}</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-sm opacity-80 mb-1">내 파워</div>
                <div className="text-2xl font-bold">{result.playerPower}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-sm opacity-80 mb-1">AI 파워</div>
                <div className="text-2xl font-bold">{result.aiPower}</div>
              </div>
            </div>

            {/* Rewards */}
            <div className="bg-white/20 backdrop-blur rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingUp className="w-6 h-6" />
                <span className="text-lg font-semibold">획득 포인트</span>
              </div>
              <div className="text-4xl font-bold">+{result.pointsReward}P</div>
            </div>

            {/* Try Again Button */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setResult(null);
                }}
                className="px-8 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                다시 도전하기
              </button>
            </div>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
            AI 배틀 정보
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>무제한으로 플레이 가능합니다</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>승리할수록 AI 난이도가 증가합니다 (승리당 +20 파워)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>난이도가 높을수록 더 많은 포인트를 획득합니다</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>레이팅은 변동되지 않습니다</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
