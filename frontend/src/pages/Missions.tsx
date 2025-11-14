import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Calendar, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Mission {
  id: number;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  requirement: number;
  reward: number;
  progress: number;
  isCompleted: boolean;
  expiresAt: string;
}

export default function Missions() {
  const { token, user, updateUser } = useAuthStore();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/missions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMissions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
      toast.error('미션 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (missionId: number) => {
    if (!token) return;

    setClaiming(missionId);
    try {
      const response = await axios.post(
        `${API_URL}/missions/claim`,
        { missionId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const reward = response.data.data.reward;
        toast.success(`보상 ${reward}P 획득!`);

        // Update user points
        if (user) {
          updateUser({ points: user.points + reward });
        }

        // Refresh missions
        await fetchMissions();
      }
    } catch (error: any) {
      console.error('Failed to claim reward:', error);
      toast.error(error.response?.data?.error || '보상 수령 실패');
    } finally {
      setClaiming(null);
    }
  };

  const getMissionTypeColor = (type: string) => {
    switch (type) {
      case 'DAILY':
        return 'from-blue-500 to-cyan-500';
      case 'WEEKLY':
        return 'from-purple-500 to-pink-500';
      case 'MONTHLY':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getMissionTypeLabel = (type: string) => {
    switch (type) {
      case 'DAILY':
        return '일일';
      case 'WEEKLY':
        return '주간';
      case 'MONTHLY':
        return '월간';
      default:
        return '';
    }
  };

  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'DAILY':
        return Calendar;
      case 'WEEKLY':
        return Clock;
      case 'MONTHLY':
        return Trophy;
      default:
        return Target;
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return '만료됨';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}일 남음`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`;
    } else {
      return `${minutes}분 남음`;
    }
  };

  const groupedMissions = {
    DAILY: missions.filter((m) => m.type === 'DAILY'),
    WEEKLY: missions.filter((m) => m.type === 'WEEKLY'),
    MONTHLY: missions.filter((m) => m.type === 'MONTHLY'),
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
            <Target className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            미션
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            미션을 완료하고 보상을 받으세요!
          </p>
        </motion.div>

        {missions.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              현재 진행 중인 미션이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              게임을 플레이하면 미션이 자동으로 추적됩니다!
            </p>
          </motion.div>
        ) : (
          /* Mission Lists */
          <div className="space-y-8">
            {['DAILY', 'WEEKLY', 'MONTHLY'].map((type) => {
              const typeMissions = groupedMissions[type as keyof typeof groupedMissions];
              if (typeMissions.length === 0) return null;

              const Icon = getMissionTypeIcon(type);

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`inline-flex items-center justify-center p-2 bg-gradient-to-br ${getMissionTypeColor(type)} rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getMissionTypeLabel(type)} 미션
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {typeMissions.map((mission) => {
                      const progressPercent = Math.min(
                        (mission.progress / mission.requirement) * 100,
                        100
                      );
                      const isCompleted = mission.isCompleted || mission.progress >= mission.requirement;

                      return (
                        <motion.div
                          key={mission.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 transition-all ${
                            isCompleted
                              ? 'border-green-500 dark:border-green-400'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="p-6">
                            {/* Mission Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                  {mission.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {mission.description}
                                </p>
                              </div>
                              {isCompleted && (
                                <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400 flex-shrink-0 ml-2" />
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">진행도</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {mission.progress} / {mission.requirement}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                  className={`h-full bg-gradient-to-r ${getMissionTypeColor(mission.type)} rounded-full`}
                                />
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-4 h-4 text-yellow-500" />
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {mission.reward}P
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {getTimeRemaining(mission.expiresAt)}
                                </div>
                              </div>

                              {isCompleted && !mission.isCompleted ? (
                                <button
                                  onClick={() => claimReward(mission.id)}
                                  disabled={claiming === mission.id}
                                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                  {claiming === mission.id ? '수령 중...' : '보상 받기'}
                                </button>
                              ) : mission.isCompleted ? (
                                <span className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-lg">
                                  완료됨
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
