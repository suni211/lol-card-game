import { motion } from 'framer-motion';
import { Trophy, Target, Flame, Award, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { user } = useAuthStore();

  if (!user) return null;

  // Mock stats
  const stats = {
    totalMatches: 50,
    wins: 32,
    losses: 18,
    winRate: 64,
    currentStreak: 5,
    longestWinStreak: 12,
    totalCards: 45,
    legendaryCards: 5,
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'CHALLENGER':
        return 'from-yellow-400 to-orange-500';
      case 'MASTER':
        return 'from-purple-400 to-pink-500';
      case 'DIAMOND':
        return 'from-blue-400 to-cyan-500';
      case 'PLATINUM':
        return 'from-green-400 to-emerald-500';
      case 'GOLD':
        return 'from-yellow-300 to-yellow-500';
      case 'SILVER':
        return 'from-gray-300 to-gray-400';
      case 'BRONZE':
        return 'from-orange-300 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl shadow-lg p-8 mb-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white/30">
                <span className="text-5xl font-bold text-white">
                  {user.username[0]}
                </span>
              </div>
              <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r ${getTierColor(user.tier)} rounded-full text-white text-sm font-bold shadow-lg`}>
                {user.tier}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold mb-2">{user.username}</h1>
              <p className="text-white/80 mb-6">{user.email}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold mb-1">{user.rating}</div>
                  <div className="text-xs text-white/80">레이팅</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold mb-1">{user.points.toLocaleString()}</div>
                  <div className="text-xs text-white/80">포인트</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold mb-1">{stats.totalCards}</div>
                  <div className="text-xs text-white/80">보유 카드</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold mb-1">{stats.wins}</div>
                  <div className="text-xs text-white/80">총 승리</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.winRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">승률</div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              {stats.wins}승 {stats.losses}패
            </div>
          </motion.div>

          {/* Current Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">현재 연승</div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              최고 연승: {stats.longestWinStreak}
            </div>
          </motion.div>

          {/* Total Matches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.totalMatches}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">총 경기 수</div>
          </motion.div>

          {/* Legendary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.legendaryCards}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">레전드 카드</div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              전체 {stats.totalCards}장 중
            </div>
          </motion.div>
        </div>

        {/* Recent Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            최근 경기
          </h2>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, index) => {
              const isWin = Math.random() > 0.4;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    isWin
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                      isWin ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isWin ? 'W' : 'L'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        vs Player{index + 1}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.floor(Math.random() * 7) + 1}일 전
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold ${
                      isWin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isWin ? '+25' : '-15'} Rating
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isWin ? '+100P' : '+50P'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
