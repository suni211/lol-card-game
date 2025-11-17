import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, Gift, Star, Coins, CreditCard } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Milestone {
  id: number;
  required_mileage: number;
  reward_type: 'POINTS' | 'CARD_PACK' | 'CARD_GUARANTEED';
  reward_points: number;
  reward_card_min_overall: number | null;
  reward_card_guaranteed_overall: number | null;
  reward_card_count: number;
  reward_g2_probability: number;
  description: string;
}

export default function EventMilestones() {
  const { token, user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/event`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMilestones(response.data.data.milestones);
        setCurrentMileage(response.data.data.progress.totalMileage);
        setClaimedMilestones(response.data.data.claimedMilestones);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
      toast.error('마일스톤 정보 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const claimMilestone = async (milestoneId: number) => {
    if (!token) return;

    setClaiming(milestoneId);
    try {
      const response = await axios.post(
        `${API_URL}/event/claim`,
        { milestoneId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const { points, cards } = response.data.data;

        if (points > 0) {
          toast.success(`${points} 포인트 획득!`);
          if (user) {
            updateUser({ points: user.points + points });
          }
        }

        if (cards && cards.length > 0) {
          toast.success(`${cards.length}개의 카드를 획득했습니다!`);
        }

        // Refresh data
        await fetchData();
      }
    } catch (error: any) {
      console.error('Failed to claim milestone:', error);
      const errorMsg = error.response?.data?.error || '보상 수령 실패';
      toast.error(errorMsg);
    } finally {
      setClaiming(null);
    }
  };

  const getMilestoneIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'POINTS':
        return Coins;
      case 'CARD_PACK':
        return CreditCard;
      case 'CARD_GUARANTEED':
        return Star;
      default:
        return Gift;
    }
  };

  const getMilestoneColor = (rewardType: string) => {
    switch (rewardType) {
      case 'POINTS':
        return 'from-yellow-500 to-orange-500';
      case 'CARD_PACK':
        return 'from-blue-500 to-purple-500';
      case 'CARD_GUARANTEED':
        return 'from-pink-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
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
          className="mb-8"
        >
          <button
            onClick={() => navigate('/event')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>이벤트로 돌아가기</span>
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              마일스톤 보상
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              마일리지를 모아 보상을 받으세요!
            </p>
          </div>
        </motion.div>

        {/* Current Mileage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 mb-8 text-white text-center"
        >
          <p className="text-lg mb-2">현재 마일리지</p>
          <p className="text-4xl font-bold">{currentMileage} M</p>
        </motion.div>

        {/* Milestones */}
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const isClaimed = claimedMilestones.includes(milestone.id);
            const canClaim = currentMileage >= milestone.required_mileage && !isClaimed;
            const isLocked = currentMileage < milestone.required_mileage;
            const Icon = getMilestoneIcon(milestone.reward_type);
            const progressPercent = Math.min(
              (currentMileage / milestone.required_mileage) * 100,
              100
            );

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl shadow-lg border-2 transition-all ${
                  isClaimed
                    ? 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 opacity-75'
                    : canClaim
                    ? 'bg-white dark:bg-gray-800 border-green-500 dark:border-green-400'
                    : isLocked
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 p-4 rounded-xl bg-gradient-to-br ${getMilestoneColor(
                        milestone.reward_type
                      )}`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {/* Milestone Title */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {milestone.required_mileage} M 달성
                        </h3>
                        {isClaimed && (
                          <span className="px-3 py-1 bg-gray-500 text-white text-sm font-semibold rounded-full">
                            완료
                          </span>
                        )}
                        {canClaim && (
                          <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full animate-pulse">
                            수령 가능
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {milestone.description}
                      </p>

                      {/* Progress Bar */}
                      {!isClaimed && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">진행도</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {currentMileage} / {milestone.required_mileage} M
                            </span>
                          </div>
                          <div className="w-full rounded-full h-3 overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full bg-gradient-to-r ${getMilestoneColor(
                                milestone.reward_type
                              )}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Claim Button */}
                      {canClaim && (
                        <button
                          onClick={() => claimMilestone(milestone.id)}
                          disabled={claiming === milestone.id}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          {claiming === milestone.id ? '수령 중...' : '보상 받기'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
