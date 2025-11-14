import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Flame, Award, TrendingUp, Calendar, Gift } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Profile() {
  const { user, token, updateUser } = useAuthStore();
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    longestWinStreak: 0,
    totalCards: 0,
    legendaryCards: 0,
  });
  const [checkingIn, setCheckingIn] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [consecutiveDays, setConsecutiveDays] = useState(0);

  useEffect(() => {
    fetchStats();
    checkCanCheckIn();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user cards to calculate card stats
      const cardsResponse = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cards = cardsResponse.data.data || [];

      setStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        longestWinStreak: 0,
        totalCards: cards.length,
        legendaryCards: cards.filter((card: any) => card.tier === 'LEGENDARY').length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const checkCanCheckIn = () => {
    if (!user?.lastCheckIn) {
      setCanCheckIn(true);
      setConsecutiveDays(user?.consecutiveDays || 0);
      return;
    }

    const lastCheckIn = new Date(user.lastCheckIn);
    const today = new Date();
    lastCheckIn.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    setCanCheckIn(lastCheckIn.getTime() < today.getTime());
    setConsecutiveDays(user?.consecutiveDays || 0);
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);

      const response = await axios.post(
        `${API_URL}/profile/checkin`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const { reward, milestone, milestoneBonus, consecutiveDays } = response.data.data;

        // Update user data
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.data.success) {
          updateUser(userResponse.data.data);
        }

        setCanCheckIn(false);
        setConsecutiveDays(consecutiveDays);

        if (milestone) {
          toast.success(`🎉 ${milestone} 달성! +${reward}P (보너스 +${milestoneBonus}P)`, {
            duration: 5000,
          });
        } else {
          toast.success(`출석 체크 완료! +${reward}P`);
        }
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      if (error.response?.data?.error === 'Already checked in today') {
        toast.error('오늘 이미 출석 체크를 했습니다!');
      } else {
        toast.error('출석 체크 실패');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  if (!user) return null;

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

        {/* Check-in Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 mb-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-4 bg-white/20 backdrop-blur rounded-full">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">출석 체크</h3>
                <p className="text-white/90 text-sm">
                  연속 {consecutiveDays}일째 출석 중
                </p>
                <p className="text-white/70 text-xs mt-1">
                  다음 마일스톤: {consecutiveDays < 7 ? '7일' : consecutiveDays < 30 ? '30일' : consecutiveDays < 90 ? '90일' : consecutiveDays < 180 ? '180일' : '365일'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn || checkingIn}
                className="px-8 py-3 bg-white text-green-600 font-bold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Gift className="w-5 h-5" />
                <span>{canCheckIn ? '출석 체크' : '체크 완료'}</span>
              </button>
              <div className="text-center">
                <div className="text-sm text-white/90">기본 50P + 마일스톤 보너스 500P</div>
                <div className="text-xs text-white/70">(7, 30, 90, 180, 365일)</div>
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

          {stats.totalMatches === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                아직 경기 기록이 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                덱을 편성하고 첫 번째 경기를 시작해보세요!
              </p>
              <a
                href="/deck"
                className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors"
              >
                덱 편성하기
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Match history will be displayed here when implemented */}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
