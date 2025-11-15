import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Flame, Star, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Stage {
  id: number;
  stage_number: number;
  stage_name: string;
  is_boss: boolean;
  reward_points: number;
  hard_mode_multiplier: number;
  enemies: Array<{
    player_name: string;
    enhancement_level: number;
    hard_enhancement_level: number;
    position_order: number;
  }>;
}

interface Progress {
  current_stage: number;
  hard_mode_unlocked: boolean;
  stages_cleared: number[];
  hard_stages_cleared: number[];
  total_points_earned: number;
}

export default function VSMode() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [progress, setProgress] = useState<Progress>({
    current_stage: 1,
    hard_mode_unlocked: false,
    stages_cleared: [],
    hard_stages_cleared: [],
    total_points_earned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'normal' | 'hard'>('normal');

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/vsmode/stages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStages(response.data.data.stages || []);
        const progressData = response.data.data.progress;

        // Ensure arrays are properly formatted
        if (progressData) {
          setProgress({
            ...progressData,
            stages_cleared: Array.isArray(progressData.stages_cleared)
              ? progressData.stages_cleared
              : [],
            hard_stages_cleared: Array.isArray(progressData.hard_stages_cleared)
              ? progressData.hard_stages_cleared
              : [],
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stages:', error);
      toast.error('스테이지 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = (stage: Stage) => {
    const isHardMode = selectedMode === 'hard';

    // Check if hard mode is unlocked
    if (isHardMode && !progress.hard_mode_unlocked) {
      toast.error('일반 모드를 모두 클리어해야 하드 모드가 열립니다!');
      return;
    }

    // Check if stage is unlocked
    if (stage.stage_number > 1) {
      const clearedStages = isHardMode ? progress.hard_stages_cleared : progress.stages_cleared;
      if (!clearedStages.includes(stage.stage_number - 1)) {
        toast.error('이전 스테이지를 먼저 클리어해야 합니다!');
        return;
      }
    }

    // Navigate to battle
    navigate(`/vsmode/battle/${stage.stage_number}?mode=${selectedMode}`);
  };

  const isStageUnlocked = (stageNumber: number): boolean => {
    if (stageNumber === 1) return true;

    const isHardMode = selectedMode === 'hard';
    if (isHardMode && !progress.hard_mode_unlocked) return false;

    const clearedStages = isHardMode ? progress.hard_stages_cleared : progress.stages_cleared;
    return clearedStages.includes(stageNumber - 1);
  };

  const isStageCleared = (stageNumber: number): boolean => {
    const isHardMode = selectedMode === 'hard';
    const clearedStages = isHardMode ? progress.hard_stages_cleared : progress.stages_cleared;
    return clearedStages.includes(stageNumber);
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            VS 모드
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            10단계의 도전을 클리어하고 레전드 확정팩을 획득하세요!
          </p>

          {/* Progress Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">일반 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.stages_cleared.length} / 10
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">하드 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.hard_stages_cleared.length} / 10
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">획득 포인트</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {progress.total_points_earned.toLocaleString()}P
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setSelectedMode('normal')}
              className={`px-6 py-2 rounded-md font-bold transition-colors ${
                selectedMode === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              일반 모드
            </button>
            <button
              onClick={() => setSelectedMode('hard')}
              className={`px-6 py-2 rounded-md font-bold transition-colors relative ${
                selectedMode === 'hard'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              disabled={!progress.hard_mode_unlocked}
            >
              하드 모드
              {!progress.hard_mode_unlocked && (
                <Lock className="w-4 h-4 absolute -top-1 -right-1" />
              )}
            </button>
          </div>
        </div>

        {/* Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.isArray(stages) && stages.map((stage) => {
            const unlocked = isStageUnlocked(stage.stage_number);
            const cleared = isStageCleared(stage.stage_number);
            const isHardMode = selectedMode === 'hard';
            const reward = isHardMode
              ? stage.reward_points * stage.hard_mode_multiplier
              : stage.reward_points;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: stage.stage_number * 0.05 }}
                className={`relative ${
                  unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
                onClick={() => unlocked && handleStageClick(stage)}
              >
                <div
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 transition-all hover:scale-105 ${
                    stage.is_boss
                      ? 'border-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
                      : cleared
                      ? 'border-green-500'
                      : unlocked
                      ? 'border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {/* Stage Number */}
                  <div className="text-center mb-4">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl ${
                        stage.is_boss
                          ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                          : cleared
                          ? 'bg-green-500 text-white'
                          : unlocked
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {cleared ? '✓' : stage.stage_number}
                    </div>
                  </div>

                  {/* Stage Name */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-3">
                    {stage.stage_name}
                    {stage.is_boss && (
                      <span className="ml-2 text-red-500">
                        <Star className="w-5 h-5 inline" />
                      </span>
                    )}
                  </h3>

                  {/* Enemies */}
                  <div className="space-y-1 mb-4">
                    {Array.isArray(stage.enemies) && stage.enemies.map((enemy) => (
                      <div
                        key={enemy.position_order}
                        className="text-xs text-gray-700 dark:text-gray-300 flex justify-between"
                      >
                        <span>{enemy.player_name}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                          +{isHardMode ? enemy.hard_enhancement_level : enemy.enhancement_level}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Reward */}
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                      <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                        {reward.toLocaleString()}P
                      </span>
                    </div>
                  </div>

                  {/* Lock Overlay */}
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

        {/* Final Reward */}
        {selectedMode === 'hard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl p-8 text-center shadow-2xl"
          >
            <Zap className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">최종 보상</h2>
            <p className="text-xl text-white/90 mb-4">
              하드 모드 10단계 클리어 시
            </p>
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <Star className="w-8 h-8 text-yellow-300 mr-2" />
              <span className="text-2xl font-black text-white">
                레전드 확정팩
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
