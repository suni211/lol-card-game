import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Flame, Star, Zap, Crown, Skull } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VSMode() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') || 'normal') as 'normal' | 'hard';

  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'normal' | 'hard'>(initialMode);
  const [normalCleared, setNormalCleared] = useState<number[]>([]);
  const [hardCleared, setHardCleared] = useState<number[]>([]);
  const [hardUnlocked, setHardUnlocked] = useState(false);
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
        setHardCleared(p.hard_stages_cleared || []);
        setHardUnlocked(p.hard_mode_unlocked || false);
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
    const hard = selectedMode === 'hard';
    if (hard && !hardUnlocked) {
      toast.error('일반 모드 올클 필요!');
      return;
    }
    if (num > 1) {
      const cleared = hard ? hardCleared : normalCleared;
      if (!cleared.includes(num - 1)) {
        toast.error('이전 스테이지 먼저 클리어!');
        return;
      }
    }
    navigate(`/vsmode/battle/${num}?mode=${selectedMode}`);
  };

  const unlocked = (num: number): boolean => {
    if (num === 1) return true;
    const hard = selectedMode === 'hard';
    if (hard && !hardUnlocked) return false;
    const cleared = hard ? hardCleared : normalCleared;
    return cleared.includes(num - 1);
  };

  const cleared = (num: number): boolean => {
    const c = selectedMode === 'hard' ? hardCleared : normalCleared;
    return c.includes(num);
  };

  // 난이도별 스테이지 정보
  const getDifficultyInfo = (num: number) => {
    if (num <= 11) return { label: '쉬움', color: 'from-green-500 to-emerald-500', icon: Star, pts: 300 };
    if (num <= 22) return { label: '보통', color: 'from-blue-500 to-cyan-500', icon: Zap, pts: 1000 };
    if (num <= 33) return { label: '어려움', color: 'from-orange-500 to-red-500', icon: Flame, pts: 2500 };
    if (num <= 49) return { label: '지옥', color: 'from-purple-600 to-pink-600', icon: Skull, pts: 10000 };
    return { label: '최종보스', color: 'from-yellow-500 to-amber-600', icon: Crown, pts: 30000 };
  };

  const isBoss = (num: number) => {
    return num === 11 || num === 22 || num === 33 || num === 49 || num === 50;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  const clearedNormal = normalCleared.length;
  const clearedHard = hardCleared.length;
  const totalStages = 50;

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
            VS 모드 시즌 2
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            50개의 스테이지를 클리어하고 최고의 보상을 획득하세요!
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
              <div className="text-sm text-gray-600 dark:text-gray-400">일반 클리어</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {clearedNormal}/{totalStages}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">하드 클리어</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {clearedHard}/{totalStages}
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg">
            <button
              onClick={() => setSelectedMode('normal')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                selectedMode === 'normal'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              일반 모드
            </button>
            <button
              onClick={() => setSelectedMode('hard')}
              disabled={!hardUnlocked}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                selectedMode === 'hard'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : hardUnlocked
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              하드 모드 {!hardUnlocked && '🔒'}
            </button>
          </div>
        </motion.div>

        {/* Difficulty Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">1-11단계</div>
            <div className="text-sm">쉬움 (300P)</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">12-22단계</div>
            <div className="text-sm">보통 (1000P)</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 text-white text-center">
            <div className="font-bold">23-33단계</div>
            <div className="text-sm">어려움 (2500P)</div>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 text-white text-center">
            <div className="font-bold">34-49단계</div>
            <div className="text-sm">지옥 (10000P)</div>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg p-3 text-white text-center">
            <div className="font-bold">50단계</div>
            <div className="text-sm">최종보스 (30000P)</div>
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
          <div className="text-5xl font-black mb-2">383,300P</div>
          <p className="text-purple-200">
            50개의 모든 스테이지를 클리어하면 획득할 수 있는 총 포인트
          </p>
        </motion.div>
      </div>
    </div>
  );
}
