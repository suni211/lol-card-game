import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Flame, Star, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface StageData {
  number: number;
  name: string;
  isBoss: boolean;
  reward: number;
  enemies: Array<{
    name: string;
    normalLevel: number;
    hardLevel: number;
  }>;
}

const STAGE_DATA: StageData[] = [
  {
    number: 1,
    name: '1단계 - 조합',
    isBoss: false,
    reward: 100,
    enemies: [
      { name: 'DuDu', normalLevel: 0, hardLevel: 2 },
      { name: 'Pyosik', normalLevel: 0, hardLevel: 2 },
      { name: 'BuLLDoG', normalLevel: 0, hardLevel: 2 },
      { name: 'Berserker', normalLevel: 0, hardLevel: 2 },
      { name: 'Life', normalLevel: 0, hardLevel: 2 },
    ],
  },
  {
    number: 2,
    name: '2단계',
    isBoss: false,
    reward: 200,
    enemies: [
      { name: 'Rich', normalLevel: 0, hardLevel: 3 },
      { name: 'Sponge', normalLevel: 0, hardLevel: 3 },
      { name: 'Kyeahoo', normalLevel: 0, hardLevel: 3 },
      { name: 'Teddy', normalLevel: 2, hardLevel: 3 },
      { name: 'Andil', normalLevel: 1, hardLevel: 3 },
    ],
  },
  {
    number: 3,
    name: '3단계 - 중간보스',
    isBoss: true,
    reward: 1000,
    enemies: [
      { name: 'Morgan', normalLevel: 3, hardLevel: 5 },
      { name: 'Croco', normalLevel: 3, hardLevel: 5 },
      { name: 'Clozer', normalLevel: 5, hardLevel: 5 },
      { name: 'Hype', normalLevel: 3, hardLevel: 5 },
      { name: 'Pollu', normalLevel: 3, hardLevel: 5 },
    ],
  },
  {
    number: 4,
    name: '4단계',
    isBoss: false,
    reward: 500,
    enemies: [
      { name: 'Kingen', normalLevel: 3, hardLevel: 5 },
      { name: 'GIDEON', normalLevel: 3, hardLevel: 5 },
      { name: 'Calix', normalLevel: 3, hardLevel: 5 },
      { name: 'Jiwoo', normalLevel: 3, hardLevel: 5 },
      { name: 'Lehends', normalLevel: 3, hardLevel: 5 },
    ],
  },
  {
    number: 5,
    name: '5단계',
    isBoss: false,
    reward: 3000,
    enemies: [
      { name: 'Siwoo', normalLevel: 1, hardLevel: 3 },
      { name: 'Lucid', normalLevel: 1, hardLevel: 3 },
      { name: 'ShowMaker', normalLevel: 3, hardLevel: 6 },
      { name: 'Aiming', normalLevel: 3, hardLevel: 6 },
      { name: 'BeryL', normalLevel: 1, hardLevel: 5 },
    ],
  },
  {
    number: 6,
    name: '6단계 - 중간보스',
    isBoss: true,
    reward: 5000,
    enemies: [
      { name: 'Clear', normalLevel: 5, hardLevel: 8 },
      { name: 'Raptor', normalLevel: 5, hardLevel: 8 },
      { name: 'VicLa', normalLevel: 5, hardLevel: 8 },
      { name: 'Diable', normalLevel: 5, hardLevel: 8 },
      { name: 'Kellin', normalLevel: 5, hardLevel: 8 },
    ],
  },
  {
    number: 7,
    name: '7단계 - 중간보스',
    isBoss: true,
    reward: 10000,
    enemies: [
      { name: 'PerfecT', normalLevel: 5, hardLevel: 8 },
      { name: 'Cuzz', normalLevel: 5, hardLevel: 8 },
      { name: 'Bdd', normalLevel: 5, hardLevel: 8 },
      { name: 'deokdam', normalLevel: 5, hardLevel: 8 },
      { name: 'Peter', normalLevel: 5, hardLevel: 8 },
    ],
  },
  {
    number: 8,
    name: '8단계',
    isBoss: false,
    reward: 5000,
    enemies: [
      { name: 'Zeus', normalLevel: 5, hardLevel: 8 },
      { name: 'Peanut', normalLevel: 5, hardLevel: 8 },
      { name: 'zeka', normalLevel: 3, hardLevel: 6 },
      { name: 'Viper', normalLevel: 3, hardLevel: 6 },
      { name: 'Delight', normalLevel: 3, hardLevel: 6 },
    ],
  },
  {
    number: 9,
    name: '9단계',
    isBoss: false,
    reward: 10000,
    enemies: [
      { name: 'Doran', normalLevel: 6, hardLevel: 8 },
      { name: 'Oner', normalLevel: 6, hardLevel: 8 },
      { name: 'Faker', normalLevel: 6, hardLevel: 8 },
      { name: 'Gumayusi', normalLevel: 6, hardLevel: 8 },
      { name: 'Keria', normalLevel: 6, hardLevel: 8 },
    ],
  },
  {
    number: 10,
    name: '10단계 - 최종보스',
    isBoss: true,
    reward: 50000,
    enemies: [
      { name: 'Kiin', normalLevel: 8, hardLevel: 10 },
      { name: 'Canyon', normalLevel: 8, hardLevel: 10 },
      { name: 'Chovy', normalLevel: 8, hardLevel: 10 },
      { name: 'Ruler', normalLevel: 8, hardLevel: 10 },
      { name: 'Duro', normalLevel: 8, hardLevel: 10 },
    ],
  },
];

export default function VSMode() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'normal' | 'hard'>('normal');
  const [stagesCleared, setStagesCleared] = useState<number[]>([]);
  const [hardStagesCleared, setHardStagesCleared] = useState<number[]>([]);
  const [hardModeUnlocked, setHardModeUnlocked] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/vsmode/stages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const prog = response.data.data.progress;
        setStagesCleared(prog.stages_cleared || []);
        setHardStagesCleared(prog.hard_stages_cleared || []);
        setHardModeUnlocked(prog.hard_mode_unlocked || false);
        setTotalPoints(prog.total_points_earned || 0);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
      toast.error('진행 상황을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = (stageNum: number) => {
    const isHard = selectedMode === 'hard';

    if (isHard && !hardModeUnlocked) {
      toast.error('일반 모드를 모두 클리어해야 하드 모드가 열립니다!');
      return;
    }

    if (stageNum > 1) {
      const cleared = isHard ? hardStagesCleared : stagesCleared;
      if (!cleared.includes(stageNum - 1)) {
        toast.error('이전 스테이지를 먼저 클리어해야 합니다!');
        return;
      }
    }

    navigate(`/vsmode/battle/${stageNum}?mode=${selectedMode}`);
  };

  const isUnlocked = (stageNum: number): boolean => {
    if (stageNum === 1) return true;
    const isHard = selectedMode === 'hard';
    if (isHard && !hardModeUnlocked) return false;
    const cleared = isHard ? hardStagesCleared : stagesCleared;
    return cleared.includes(stageNum - 1);
  };

  const isCleared = (stageNum: number): boolean => {
    const cleared = selectedMode === 'hard' ? hardStagesCleared : stagesCleared;
    return cleared.includes(stageNum);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">VS 모드</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            10단계의 도전을 클리어하고 레전드 확정팩을 획득하세요!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">일반 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stagesCleared.length} / 10
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">하드 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {hardStagesCleared.length} / 10
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">획득 포인트</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {totalPoints.toLocaleString()}P
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setSelectedMode('normal')}
              className={`px-6 py-2 rounded-md font-bold transition-colors ${
                selectedMode === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              일반 모드
            </button>
            <button
              onClick={() => setSelectedMode('hard')}
              className={`px-6 py-2 rounded-md font-bold transition-colors relative ${
                selectedMode === 'hard'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              disabled={!hardModeUnlocked}
            >
              하드 모드
              {!hardModeUnlocked && <Lock className="w-4 h-4 absolute -top-1 -right-1" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {STAGE_DATA.map((stage) => {
            const unlocked = isUnlocked(stage.number);
            const cleared = isCleared(stage.number);
            const reward = selectedMode === 'hard' ? stage.reward * 3 : stage.reward;

            return (
              <motion.div
                key={stage.number}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: stage.number * 0.05 }}
                className={`relative ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                onClick={() => unlocked && handleStageClick(stage.number)}
              >
                <div
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 transition-all hover:scale-105 ${
                    stage.isBoss
                      ? 'border-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
                      : cleared
                      ? 'border-green-500'
                      : unlocked
                      ? 'border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="text-center mb-4">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl ${
                        stage.isBoss
                          ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                          : cleared
                          ? 'bg-green-500 text-white'
                          : unlocked
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {cleared ? '✓' : stage.number}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-3">
                    {stage.name}
                    {stage.isBoss && <Star className="w-5 h-5 inline ml-2 text-red-500" />}
                  </h3>

                  <div className="space-y-1 mb-4">
                    {stage.enemies.map((enemy, idx) => (
                      <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                        <span>{enemy.name}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                          +{selectedMode === 'hard' ? enemy.hardLevel : enemy.normalLevel}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                      <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                        {reward.toLocaleString()}P
                      </span>
                    </div>
                  </div>

                  {!unlocked && (
                    <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
                      <Lock className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {selectedMode === 'hard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl p-8 text-center shadow-2xl"
          >
            <Zap className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">최종 보상</h2>
            <p className="text-xl text-white/90 mb-4">하드 모드 10단계 클리어 시</p>
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <Star className="w-8 h-8 text-yellow-300 mr-2" />
              <span className="text-2xl font-black text-white">레전드 확정팩</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
