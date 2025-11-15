import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Lock, CheckCircle, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Achievement {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  requirement_type: string;
  requirement_value: number;
  reward: number;
  icon?: string;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at?: string;
  expires_at: string;
}

export default function Achievements() {
  const { user, token } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  useEffect(() => {
    if (user && token) {
      fetchAchievements();
    }
  }, [user, token]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/achievements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setAchievements(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch achievements:', error);
      toast.error('업적 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (achievementId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/achievements/claim`,
        { achievementId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`${response.data.data.reward}P 획득!`);

        // Update user points in auth store
        const updatedUser = { ...user!, points: user!.points + response.data.data.reward };
        useAuthStore.setState({ user: updatedUser });

        fetchAchievements(); // Refresh achievements
      }
    } catch (error: any) {
      console.error('Claim achievement error:', error);
      toast.error(error.response?.data?.error || '보상 수령에 실패했습니다');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BATTLE':
        return <Trophy className="w-5 h-5" />;
      case 'COLLECTION':
        return <Star className="w-5 h-5" />;
      case 'GACHA':
        return <Gift className="w-5 h-5" />;
      case 'MILESTONE':
        return <Award className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BATTLE':
        return 'from-red-500 to-orange-500';
      case 'COLLECTION':
        return 'from-blue-500 to-cyan-500';
      case 'GACHA':
        return 'from-purple-500 to-pink-500';
      case 'MILESTONE':
        return 'from-yellow-500 to-amber-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    return difficulty === 'HARD'
      ? 'from-red-600 to-red-700'
      : 'from-green-500 to-green-600';
  };

  const getCategoryName = (category: string) => {
    const names: any = {
      'BATTLE': '전투',
      'COLLECTION': '수집',
      'GACHA': '가챠',
      'MILESTONE': '마일스톤',
      'SOCIAL': '소셜',
    };
    return names[category] || category;
  };

  const filteredAchievements = achievements.filter((achievement) => {
    const categoryMatch = filter === 'ALL' || achievement.category === filter;
    const difficultyMatch = difficultyFilter === 'ALL' || achievement.difficulty === difficultyFilter;
    return categoryMatch && difficultyMatch;
  });

  // Separate claimable achievements (completed but not claimed)
  const claimableAchievements = filteredAchievements.filter(
    (a) => a.is_completed && !a.is_claimed
  );
  const otherAchievements = filteredAchievements.filter(
    (a) => !a.is_completed || a.is_claimed
  );

  const stats = {
    total: achievements.length,
    completed: achievements.filter((a) => a.is_completed).length,
    claimed: achievements.filter((a) => a.is_claimed).length,
    totalRewards: achievements
      .filter((a) => a.is_claimed)
      .reduce((sum, a) => sum + a.reward, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-yellow-900/20 dark:to-orange-900/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            업적
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            목표를 달성하고 보상을 획득하세요!
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">전체 업적</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {stats.completed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">완료</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {stats.claimed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">보상 수령</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              {stats.totalRewards.toLocaleString()}P
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">획득 포인트</div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                카테고리
              </label>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'BATTLE', 'COLLECTION', 'GACHA', 'MILESTONE'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === cat
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat === 'ALL' ? '전체' : getCategoryName(cat)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                난이도
              </label>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'EASY', 'HARD'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      difficultyFilter === diff
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {diff === 'ALL' ? '전체' : diff === 'EASY' ? '쉬움' : '어려움'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">업적 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* Claimable Achievements Section */}
            {claimableAchievements.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    보상 받기 ({claimableAchievements.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {claimableAchievements.map((achievement) => {
                    const progressPercent = Math.min(
                      (achievement.progress / achievement.requirement_value) * 100,
                      100
                    );

                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg ring-4 ring-green-500 animate-pulse"
                      >
                        {/* Header */}
                        <div
                          className={`bg-gradient-to-r ${getCategoryColor(
                            achievement.category
                          )} p-4 text-white`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(achievement.category)}
                              <span className="text-sm font-medium">
                                {getCategoryName(achievement.category)}
                              </span>
                            </div>
                            <div
                              className={`px-2 py-1 bg-gradient-to-r ${getDifficultyColor(
                                achievement.difficulty
                              )} rounded text-xs font-bold`}
                            >
                              {achievement.difficulty === 'EASY' ? '쉬움' : '어려움'}
                            </div>
                          </div>
                          <h3 className="font-bold text-lg">{achievement.title}</h3>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {achievement.description}
                          </p>

                          {/* Progress */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-gray-400">진행도</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                완료!
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                          </div>

                          {/* Reward */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">보상</span>
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                              {achievement.reward.toLocaleString()}P
                            </span>
                          </div>

                          {/* Claim Button */}
                          <button
                            onClick={() => handleClaim(achievement.id)}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                          >
                            <Gift className="w-5 h-5" />
                            <span>보상 받기</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other Achievements Section */}
            {otherAchievements.length > 0 && (
              <div>
                {claimableAchievements.length > 0 && (
                  <div className="flex items-center space-x-3 mb-4">
                    <Trophy className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      모든 업적
                    </h2>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherAchievements.map((achievement) => {
              const progressPercent = Math.min(
                (achievement.progress / achievement.requirement_value) * 100,
                100
              );

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg ${
                    achievement.is_completed ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  {/* Header */}
                  <div
                    className={`bg-gradient-to-r ${getCategoryColor(
                      achievement.category
                    )} p-4 text-white`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(achievement.category)}
                        <span className="text-sm font-medium">
                          {getCategoryName(achievement.category)}
                        </span>
                      </div>
                      <div
                        className={`px-2 py-1 bg-gradient-to-r ${getDifficultyColor(
                          achievement.difficulty
                        )} rounded text-xs font-bold`}
                      >
                        {achievement.difficulty === 'EASY' ? '쉬움' : '어려움'}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{achievement.title}</h3>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {achievement.description}
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">진행도</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {achievement.progress} / {achievement.requirement_value}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${getCategoryColor(
                            achievement.category
                          )} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">보상</span>
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">
                        {achievement.reward.toLocaleString()}P
                      </span>
                    </div>

                    {/* Action Button */}
                    {achievement.is_claimed ? (
                      <div className="flex items-center justify-center space-x-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">보상 수령 완료</span>
                      </div>
                    ) : achievement.is_completed ? (
                      <button
                        onClick={() => handleClaim(achievement.id)}
                        className="w-full py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all transform hover:scale-105"
                      >
                        보상 받기
                      </button>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                        <Lock className="w-5 h-5" />
                        <span className="font-medium">진행 중</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
                </div>
              </div>
            )}
          </>
        )}

        {filteredAchievements.length === 0 && !loading && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">해당하는 업적이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
