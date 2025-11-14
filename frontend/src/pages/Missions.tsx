import { motion } from 'framer-motion';
import { Target, Calendar, CheckCircle, Trophy, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Mission } from '../types';

export default function Missions() {
  // Mock mission data
  const dailyMissions: Mission[] = [
    {
      id: 1,
      title: '일일 로그인',
      description: '게임에 로그인하세요',
      type: 'DAILY',
      requirement: 1,
      progress: 1,
      reward: 50,
      isCompleted: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 2,
      title: '카드 뽑기',
      description: '카드를 3번 뽑으세요',
      type: 'DAILY',
      requirement: 3,
      progress: 1,
      reward: 100,
      isCompleted: false,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 3,
      title: '경기 승리',
      description: '랭크 경기에서 2번 승리하세요',
      type: 'DAILY',
      requirement: 2,
      progress: 0,
      reward: 150,
      isCompleted: false,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  const weeklyMissions: Mission[] = [
    {
      id: 4,
      title: '주간 승리왕',
      description: '랭크 경기에서 10번 승리하세요',
      type: 'WEEKLY',
      requirement: 10,
      progress: 5,
      reward: 500,
      isCompleted: false,
      expiresAt: new Date(Date.now() + 604800000).toISOString(),
    },
    {
      id: 5,
      title: '카드 컬렉터',
      description: '새로운 카드를 15장 획득하세요',
      type: 'WEEKLY',
      requirement: 15,
      progress: 8,
      reward: 300,
      isCompleted: false,
      expiresAt: new Date(Date.now() + 604800000).toISOString(),
    },
    {
      id: 6,
      title: '덱 마스터',
      description: '3가지 다른 덱으로 승리하세요',
      type: 'WEEKLY',
      requirement: 3,
      progress: 1,
      reward: 400,
      isCompleted: false,
      expiresAt: new Date(Date.now() + 604800000).toISOString(),
    },
  ];

  const claimReward = (mission: Mission) => {
    if (!mission.isCompleted) {
      toast.error('미션을 완료해야 보상을 받을 수 있습니다!');
      return;
    }

    // TODO: API 연동
    toast.success(`${mission.reward} 포인트를 획득했습니다!`);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}시간 ${minutes}분`;
  };

  const MissionCard = ({ mission, index }: { mission: Mission; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 transition-all ${
        mission.isCompleted
          ? 'border-green-500 dark:border-green-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {mission.title}
            </h3>
            {mission.isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {mission.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>진행도</span>
              <span>{mission.progress} / {mission.requirement}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all"
                style={{ width: `${(mission.progress / mission.requirement) * 100}%` }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{getTimeRemaining(mission.expiresAt)} 남음</span>
          </div>
        </div>

        {/* Reward Section */}
        <div className="ml-4 text-right">
          <div className="flex items-center justify-end space-x-1 mb-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              +{mission.reward}P
            </span>
          </div>
          <button
            onClick={() => claimReward(mission)}
            disabled={!mission.isCompleted}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              mission.isCompleted
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {mission.isCompleted ? '보상 받기' : '미완료'}
          </button>
        </div>
      </div>
    </motion.div>
  );

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

        {/* Daily Missions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              일일 미션
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
              매일 자정 초기화
            </span>
          </div>

          <div className="space-y-4">
            {dailyMissions.map((mission, index) => (
              <MissionCard key={mission.id} mission={mission} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Weekly Missions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              주간 미션
            </h2>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
              매주 월요일 초기화
            </span>
          </div>

          <div className="space-y-4">
            {weeklyMissions.map((mission, index) => (
              <MissionCard key={mission.id} mission={mission} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {dailyMissions.filter(m => m.isCompleted).length}/{dailyMissions.length}
              </div>
              <div className="text-sm opacity-90">일일 미션 완료</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {weeklyMissions.filter(m => m.isCompleted).length}/{weeklyMissions.length}
              </div>
              <div className="text-sm opacity-90">주간 미션 완료</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {[...dailyMissions, ...weeklyMissions]
                  .filter(m => m.isCompleted)
                  .reduce((sum, m) => sum + m.reward, 0)}P
              </div>
              <div className="text-sm opacity-90">획득 가능 보상</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
