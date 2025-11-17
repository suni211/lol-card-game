import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Target, Gift, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Quest {
  id: number;
  title: string;
  description: string;
  quest_type: 'NORMAL_MATCH' | 'RANKED_MATCH' | 'AI_MATCH';
  requirement: number;
  reward_mileage: number;
  start_date: string;
  end_date: string;
}

interface EventProgress {
  normalMatchToday: number;
  rankedMatchToday: number;
  aiMatchToday: number;
  totalMileage: number;
}

export default function Event() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<EventProgress>({
    normalMatchToday: 0,
    rankedMatchToday: 0,
    aiMatchToday: 0,
    totalMileage: 0,
  });
  const [eventPeriod, setEventPeriod] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchEventData();
  }, []);

  const fetchEventData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/event`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setQuests(response.data.data.quests);
        setProgress(response.data.data.progress);
        setEventPeriod(response.data.data.eventPeriod);
      }
    } catch (error) {
      console.error('Failed to fetch event data:', error);
      toast.error('이벤트 정보 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const getQuestProgress = (quest: Quest): number => {
    switch (quest.quest_type) {
      case 'NORMAL_MATCH':
        return progress.normalMatchToday;
      case 'RANKED_MATCH':
        return progress.rankedMatchToday;
      case 'AI_MATCH':
        return progress.aiMatchToday;
      default:
        return 0;
    }
  };

  const getQuestTypeLabel = (type: string): string => {
    switch (type) {
      case 'NORMAL_MATCH':
        return '일반전';
      case 'RANKED_MATCH':
        return '랭킹전';
      case 'AI_MATCH':
        return 'AI 매치';
      default:
        return '';
    }
  };

  const getQuestTypeColor = (type: string): string => {
    switch (type) {
      case 'NORMAL_MATCH':
        return 'from-blue-500 to-cyan-500';
      case 'RANKED_MATCH':
        return 'from-purple-500 to-pink-500';
      case 'AI_MATCH':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getDaysRemaining = (): number => {
    const now = new Date();
    const end = new Date(eventPeriod.end);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
            <Gift className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            특별 이벤트
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            퀘스트를 완료하고 마일리지를 모아 보상을 받으세요!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {eventPeriod.start} ~ {eventPeriod.end} ({getDaysRemaining()}일 남음)
            </span>
          </div>
        </motion.div>

        {/* 현재 마일리지 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg p-8 mb-8 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">내 마일리지</h2>
              <p className="text-3xl font-bold">{progress.totalMileage} M</p>
            </div>
            <Trophy className="w-16 h-16 opacity-50" />
          </div>
          <button
            onClick={() => navigate('/event/milestones')}
            className="mt-4 w-full bg-white text-orange-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <span>마일스톤 보상 확인하기</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* 퀘스트 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="w-7 h-7" />
            데일리 퀘스트
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quests.map((quest) => {
              const currentProgress = getQuestProgress(quest);
              const progressPercent = Math.min(
                (currentProgress / quest.requirement) * 100,
                100
              );
              const isCompleted = currentProgress >= quest.requirement;

              return (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-xl shadow-lg border-2 transition-all ${
                    isCompleted
                      ? 'bg-white dark:bg-gray-800 border-green-500 dark:border-green-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="p-6">
                    {/* Quest Header */}
                    <div className="mb-4">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getQuestTypeColor(
                          quest.quest_type
                        )} mb-2`}
                      >
                        {getQuestTypeLabel(quest.quest_type)}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {quest.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {quest.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">진행도</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {currentProgress} / {quest.requirement}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-3 overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${getQuestTypeColor(
                            quest.quest_type
                          )}`}
                        />
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">보상</span>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-gray-900 dark:text-white">
                          {quest.reward_mileage} M
                        </span>
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="mt-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 px-4 rounded-lg text-center font-semibold">
                        완료!
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 이벤트 보상 인벤토리 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <button
            onClick={() => navigate('/event/rewards')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <Gift className="w-6 h-6" />
            <span>이벤트 보상 인벤토리</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
