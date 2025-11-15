import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Gift, ArrowRight, Star, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  action: string;
  route: string;
  requirement: string;
}

interface TutorialProgress {
  user_id: number;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  reward_claimed: boolean;
}

export default function Tutorial() {
  const { user, token, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [reward, setReward] = useState(0);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchProgress();
    }
  }, [user, token]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/tutorial/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setProgress(response.data.data.progress);
        setSteps(response.data.data.steps);
        setTotalSteps(response.data.data.totalSteps);
        setReward(response.data.data.reward);
      }
    } catch (error: any) {
      console.error('Failed to fetch tutorial progress:', error);
      toast.error('튜토리얼 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    try {
      setClaiming(true);
      const response = await axios.post(
        `${API_URL}/tutorial/claim-reward`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        if (user) {
          updateUser({ points: user.points + reward });
        }
        await fetchProgress();
      }
    } catch (error: any) {
      console.error('Claim reward error:', error);
      toast.error(error.response?.data?.error || '보상 받기 실패');
    } finally {
      setClaiming(false);
    }
  };

  const handleSkipTutorial = async () => {
    if (!confirm('튜토리얼을 건너뛰시겠습니까? (보상을 받을 수 없습니다)')) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/tutorial/skip`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('튜토리얼을 건너뛰었습니다');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Skip tutorial error:', error);
      toast.error('튜토리얼 건너뛰기 실패');
    }
  };

  const handleStepAction = (step: TutorialStep) => {
    navigate(step.route);
  };

  const isStepCompleted = (stepId: number) => {
    return progress?.completed_steps.includes(stepId) || false;
  };

  const isStepCurrent = (stepId: number) => {
    return progress?.current_step === stepId;
  };

  const isStepLocked = (stepId: number) => {
    return progress && stepId > progress.current_step;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">튜토리얼 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = progress ? (progress.completed_steps.length / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            튜토리얼
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임의 주요 기능을 배우고 {reward.toLocaleString()} 포인트를 받으세요!
          </p>

          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                진행률
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {progress?.completed_steps.length || 0} / {totalSteps}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Tutorial Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => {
            const completed = isStepCompleted(step.id);
            const current = isStepCurrent(step.id);
            const locked = isStepLocked(step.id);

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${
                  locked ? 'opacity-50' : ''
                } ${current ? 'ring-4 ring-blue-500' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Step Number/Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      completed
                        ? 'bg-green-500'
                        : current
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    {completed ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white font-bold">{step.id}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {step.description}
                    </p>

                    {!completed && !locked && (
                      <button
                        onClick={() => handleStepAction(step)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                      >
                        <span>{step.action}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {completed && (
                      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">완료!</span>
                      </div>
                    )}

                    {locked && (
                      <div className="text-gray-500 dark:text-gray-500">
                        🔒 이전 단계를 먼저 완료하세요
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reward Section */}
        {progress?.is_completed && !progress?.reward_claimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 text-center shadow-2xl"
          >
            <Trophy className="w-16 h-16 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold text-white mb-4">
              축하합니다! 🎉
            </h2>
            <p className="text-white text-lg mb-6">
              모든 튜토리얼을 완료했습니다!
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-white">
                <Gift className="w-8 h-8" />
                <span className="text-4xl font-bold">{reward.toLocaleString()}</span>
                <span className="text-2xl">포인트</span>
              </div>
            </div>
            <button
              onClick={handleClaimReward}
              disabled={claiming}
              className="px-8 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {claiming ? '받는 중...' : '보상 받기'}
            </button>
          </motion.div>
        )}

        {progress?.reward_claimed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
          >
            <Star className="w-12 h-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
              보상을 받았습니다!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              이제 자유롭게 게임을 즐기세요!
            </p>
          </motion.div>
        )}

        {/* Skip Button */}
        {!progress?.is_completed && (
          <div className="text-center mt-8">
            <button
              onClick={handleSkipTutorial}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
            >
              튜토리얼 건너뛰기 (보상 없음)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
