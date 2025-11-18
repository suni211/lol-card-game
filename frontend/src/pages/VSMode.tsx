import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Flame, Star, Zap, Crown } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VSMode() {
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [normalCleared, setNormalCleared] = useState<number[]>([]);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/vsmode/stages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const p = res.data.data.progress;
        setNormalCleared(p.stages_cleared || []);
        setPoints(p.total_points_earned || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const clickStage = (num: number) => {
    if (num > 1 && !normalCleared.includes(num - 1)) {
      toast.error('이전 스테이지 먼저 클리어!');
      return;
    }
    navigate(`/vsmode/battle/${num}`);
  };

  const unlocked = (num: number): boolean => {
    if (num === 1) return true;
    return normalCleared.includes(num - 1);
  };

  const cleared = (num: number): boolean => {
    return normalCleared.includes(num);
  };

  // 시즌 3 설정
  const seasonConfig = {
    title: 'VS 모드 시즌 3 - 도전의 탑',
    description: '100개의 스테이지를 클리어하고 최고의 보상을 획득하세요!',
    totalStages: 100,
    totalReward: 200000,
  };

  // 난이도별 스테이지 정보
  const getDifficultyInfo = (num: number) => {
    if (num <= 20) return { label: '초급', color: 'from-green-500 to-emerald-500', icon: Star, pts: 800 };
    if (num <= 60) return { label: '중급', color: 'from-blue-500 to-cyan-500', icon: Zap, pts: 1800 };
    if (num <= 90) return { label: '고급', color: 'from-orange-500 to-red-500', icon: Flame, pts: 2400 };
    return { label: '최종', color: 'from-purple-600 to-pink-600', icon: Crown, pts: 4000 };
  };

  const isBoss = (num: number) => {
    return num === 20 || num === 60 || num === 90 || num === 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  const clearedCount = normalCleared.length;
  const totalStages = seasonConfig.totalStages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4">
            {seasonConfig.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            {seasonConfig.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">총 획득 포인트</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {points.toLocaleString()}P
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">클리어 진행도</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {clearedCount}/{totalStages}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">진행률</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.floor((clearedCount / totalStages) * 100)}%
              </div>
            </div>
          </div>
        </motion.div>

        {/* Difficulty Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">1-20단계</div>
            <div className="text-sm">초급 (800P)</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">21-60단계</div>
            <div className="text-sm">중급 (1800P)</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">61-90단계</div>
            <div className="text-sm">고급 (2400P)</div>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 text-white text-center">
            <div className="font-bold">91-100단계</div>
            <div className="text-sm">최종 (4000P)</div>
          </div>
        </div>

        {/* Stages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {Array.from({ length: totalStages }, (_, i) => i + 1).map((num) => {
            const isUnlocked = unlocked(num);
            const isCleared = cleared(num);
            const boss = isBoss(num);
            const diff = getDifficultyInfo(num);
            const Icon = diff.icon;

            return (
              <motion.button
                key={num}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: num * 0.01 }}
                onClick={() => isUnlocked && clickStage(num)}
                disabled={!isUnlocked}
                className={`relative aspect-square rounded-xl font-bold text-lg transition-all ${
                  isCleared
                    ? `bg-gradient-to-br ${diff.color} text-white shadow-lg hover:scale-105`
                    : isUnlocked
                    ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:scale-105 shadow-md border-2 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {/* Boss Badge */}
                {boss && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Cleared Badge */}
                {isCleared && (
                  <div className="absolute -top-2 -left-2 bg-green-500 rounded-full p-1 shadow-lg">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Stage Number */}
                <div className="flex flex-col items-center justify-center h-full">
                  {isUnlocked ? (
                    <>
                      {isCleared && <Icon className="w-5 h-5 mb-1" />}
                      <div>{num}</div>
                      {boss && <div className="text-xs mt-1">BOSS</div>}
                    </>
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </div>

                {/* Points Badge */}
                {isUnlocked && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                    {diff.pts.toLocaleString()}P
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Total Points Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center"
        >
          <h3 className="text-2xl font-bold mb-2">전체 클리어 보상</h3>
          <div className="text-5xl font-black mb-2">{seasonConfig.totalReward.toLocaleString()}P</div>
          <p className="text-purple-200">
            {seasonConfig.totalStages}개의 모든 스테이지를 클리어하면 획득할 수 있는 총 포인트
          </p>
        </motion.div>
      </div>
    </div>
  );
}
