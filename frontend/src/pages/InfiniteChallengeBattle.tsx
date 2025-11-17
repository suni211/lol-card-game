import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Swords, SkipForward, Shield, Target, Flame } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface BattleResult {
  won: boolean;
  playerScore: number;
  aiScore: number;
  playerPower: number;
  aiPower: number;
  currentStage: number;
  aiDifficulty: number;
}

interface BattlePhase {
  phase: 'loading' | 'fighting' | 'result';
  playerHP: number;
  aiHP: number;
  turn: number;
}

export default function InfiniteChallengeBattle() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [result, setResult] = useState<BattleResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>({
    phase: 'loading',
    playerHP: 100,
    aiHP: 100,
    turn: 0,
  });
  const [battleLog, setBattleLog] = useState<string[]>([]);

  const simulateBattle = (playerPower: number, aiPower: number) => {
    setBattlePhase({ phase: 'fighting', playerHP: 100, aiHP: 100, turn: 0 });
    setBattleLog(['전투 시작!']);

    let pHP = 100;
    let aHP = 100;
    let turn = 0;
    const logs: string[] = ['전투 시작!'];

    const interval = setInterval(() => {
      turn++;

      // Player attacks
      const playerDamage = Math.floor((playerPower / 10) * (0.8 + Math.random() * 0.4));
      aHP -= playerDamage;
      logs.push(`턴 ${turn}: 당신이 ${playerDamage} 데미지를 입혔습니다!`);

      if (aHP <= 0) {
        clearInterval(interval);
        logs.push('승리!');
        setBattleLog([...logs]);
        setTimeout(() => {
          setBattlePhase({ phase: 'result', playerHP: pHP, aiHP: 0, turn });
        }, 500);
        return;
      }

      // AI attacks
      const aiDamage = Math.floor((aiPower / 10) * (0.8 + Math.random() * 0.4));
      pHP -= aiDamage;
      logs.push(`턴 ${turn}: AI가 ${aiDamage} 데미지를 입혔습니다!`);

      if (pHP <= 0) {
        clearInterval(interval);
        logs.push('패배...');
        setBattleLog([...logs]);
        setTimeout(() => {
          setBattlePhase({ phase: 'result', playerHP: 0, aiHP: aHP, turn });
        }, 500);
        return;
      }

      setBattlePhase({ phase: 'fighting', playerHP: Math.max(0, pHP), aiHP: Math.max(0, aHP), turn });
      setBattleLog([...logs]);
    }, 1000);
  };

  const startBattle = async () => {
    try {
      setResult(null);
      setBattlePhase({ phase: 'loading', playerHP: 100, aiHP: 100, turn: 0 });

      const response = await axios.post(
        `${API_URL}/infinite-challenge/battle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        setResult(data);

        // Start battle simulation
        setTimeout(() => {
          simulateBattle(data.playerPower, data.aiPower);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Battle error:', error);
      toast.error(error.response?.data?.error || '전투 실패');
      navigate('/infinite-challenge');
    }
  };

  const submitResult = async () => {
    if (!result) return;

    try {
      setSubmitting(true);

      const response = await axios.post(
        `${API_URL}/infinite-challenge/complete-stage`,
        {
          userScore: result.playerScore,
          aiScore: result.aiScore,
          totalDamage: 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);

        if (result.won) {
          // Victory - continue to next stage
          setResult(null);
          startBattle();
        } else {
          // Defeat - return to main page
          navigate('/infinite-challenge');
        }
      }
    } catch (error: any) {
      console.error('Submit result error:', error);
      toast.error(error.response?.data?.error || '결과 제출 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const skipToResult = () => {
    if (result) {
      submitResult();
    }
  };

  useEffect(() => {
    startBattle();
  }, []);

  // Auto-submit result when battle phase reaches 'result'
  useEffect(() => {
    if (battlePhase.phase === 'result' && result && !submitting) {
      submitResult();
    }
  }, [battlePhase.phase]);

  // Loading phase
  if (battlePhase.phase === 'loading' || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Swords className="w-24 h-24 text-purple-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-4xl font-bold text-white mb-2">전투 준비 중...</h2>
          <p className="text-purple-300">스테이지 {result?.currentStage || '?'}의 AI와 대전합니다</p>
        </motion.div>
      </div>
    );
  }

  // Fighting phase
  if (battlePhase.phase === 'fighting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Stage Header */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-bold text-white mb-2"
            >
              무한 도전 - 스테이지 {result.currentStage}
            </motion.h1>
            <p className="text-purple-300">AI 난이도: {result.aiDifficulty}</p>
          </div>

          {/* Battle Arena */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Player */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-blue-900/30 backdrop-blur-lg rounded-2xl p-6 border-2 border-blue-500"
            >
              <div className="text-center mb-4">
                <Shield className="w-16 h-16 text-blue-400 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-white">당신</h2>
                <p className="text-blue-300">파워: {result.playerPower}</p>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-white/80 mb-1">
                  <span>HP</span>
                  <span>{battlePhase.playerHP}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${battlePhase.playerHP}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {battlePhase.playerHP > 10 && `${battlePhase.playerHP}%`}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="text-6xl font-bold text-white/40"
              >
                <Swords className="w-24 h-24" />
              </motion.div>
            </div>

            {/* AI */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-red-900/30 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500"
            >
              <div className="text-center mb-4">
                <Target className="w-16 h-16 text-red-400 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-white">AI</h2>
                <p className="text-red-300">파워: {result.aiPower}</p>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-white/80 mb-1">
                  <span>HP</span>
                  <span>{battlePhase.aiHP}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${battlePhase.aiHP}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {battlePhase.aiHP > 10 && `${battlePhase.aiHP}%`}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Battle Log */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 max-h-64 overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-400" />
              전투 로그
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {battleLog.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="text-white/80 font-mono text-sm"
                  >
                    {log}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Result phase
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-4xl w-full"
      >
        {/* Result Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {result.won ? (
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-4" />
            ) : (
              <Zap className="w-32 h-32 text-red-400 mx-auto mb-4" />
            )}
          </motion.div>
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-6xl font-bold mb-4 ${
              result.won
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {result.won ? '승리!' : '패배...'}
          </motion.h1>
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl text-white"
          >
            스테이지 {result.currentStage}
          </motion.p>
        </div>

        {/* Score Display */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {result.playerScore}
              </div>
              <div className="text-white/80">당신</div>
              <div className="text-sm text-blue-300 mt-1">
                파워: {result.playerPower}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-3xl font-bold text-white/60">VS</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-400 mb-2">
                {result.aiScore}
              </div>
              <div className="text-white/80">AI</div>
              <div className="text-sm text-red-300 mt-1">
                파워: {result.aiPower} (난이도 {result.aiDifficulty})
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          {result.won ? (
            <button
              onClick={skipToResult}
              disabled={submitting}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <SkipForward className="w-6 h-6" />
              {submitting ? '처리 중...' : '다음 스테이지'}
            </button>
          ) : (
            <button
              onClick={skipToResult}
              disabled={submitting}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xl font-bold rounded-lg hover:from-red-600 hover:to-orange-600 transform hover:scale-105 transition disabled:opacity-50"
            >
              {submitting ? '처리 중...' : '도전 종료'}
            </button>
          )}
        </motion.div>

        {result.won && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-6 text-purple-300"
          >
            계속해서 더 높은 스테이지에 도전하세요!
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
