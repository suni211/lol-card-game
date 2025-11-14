import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Award, X, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RankingUser {
  rank: number;
  userId: number;
  username: string;
  tier: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface PlayerCard {
  user_card_id: number;
  player_id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  region: string;
  tier: string;
  level: number;
}

interface UserProfile {
  user: {
    id: number;
    username: string;
    tier: string;
    rating: number;
  };
  stats: {
    total_matches: number;
    wins: number;
    losses: number;
    winRate: number;
    totalCards: number;
    legendaryCards: number;
  };
  activeDeck: {
    id: number;
    name: string;
    cards: {
      top: PlayerCard | null;
      jungle: PlayerCard | null;
      mid: PlayerCard | null;
      adc: PlayerCard | null;
      support: PlayerCard | null;
    };
  } | null;
}

export default function Ranking() {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await axios.get(`${API_URL}/ranking`);
      if (response.data.success) {
        setRankings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: number) => {
    setLoadingProfile(true);
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSelectedUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const getCardTierColor = (tier: string) => {
    switch (tier) {
      case 'LEGENDARY':
        return 'from-yellow-400 to-orange-500';
      case 'EPIC':
        return 'from-purple-400 to-pink-500';
      case 'RARE':
        return 'from-blue-400 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'CHALLENGER':
        return 'from-red-500 to-orange-500';
      case 'MASTER':
        return 'from-purple-500 to-pink-500';
      case 'DIAMOND':
        return 'from-blue-400 to-cyan-500';
      case 'PLATINUM':
        return 'from-teal-400 to-green-500';
      case 'GOLD':
        return 'from-yellow-400 to-orange-400';
      case 'SILVER':
        return 'from-gray-300 to-gray-400';
      case 'BRONZE':
        return 'from-orange-700 to-orange-800';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600 dark:text-gray-400">#{rank}</span>;
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
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            글로벌 랭킹
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최고의 플레이어들과 경쟁하세요
          </p>
        </motion.div>

        {rankings.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              아직 랭킹 데이터가 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              경기를 플레이하고 랭킹에 올라보세요!
            </p>
            <a
              href="/match"
              className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              경기 시작하기
            </a>
          </motion.div>
        ) : (
          /* Rankings List */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      순위
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      플레이어
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      티어
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      레이팅
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      전적
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      승률
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rankings.map((user, index) => (
                    <motion.tr
                      key={user.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(user.rank)}
                        </div>
                      </td>

                      {/* Player */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {user.username}
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getTierColor(user.tier)}`}>
                          {user.tier}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-primary-500" />
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {user.rating}
                          </span>
                        </div>
                      </td>

                      {/* Record */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <span className="text-green-600 dark:text-green-400 font-semibold">{user.wins}승</span>
                          {' '}
                          <span className="text-red-600 dark:text-red-400 font-semibold">{user.losses}패</span>
                        </div>
                      </td>

                      {/* Win Rate */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {user.winRate}%
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => fetchUserProfile(user.userId)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>덱 보기</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* User Profile Modal */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                {loadingProfile ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-6 rounded-t-xl relative">
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>

                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white/30">
                          <span className="text-3xl font-bold text-white">
                            {selectedUser.user.username[0]}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {selectedUser.user.username}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getTierColor(selectedUser.user.tier)}`}>
                              {selectedUser.user.tier}
                            </span>
                            <span className="text-white/90 text-sm">
                              레이팅: {selectedUser.user.rating}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-white">{selectedUser.stats.wins}</div>
                          <div className="text-xs text-white/80">승</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-white">{selectedUser.stats.losses}</div>
                          <div className="text-xs text-white/80">패</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-white">{selectedUser.stats.winRate}%</div>
                          <div className="text-xs text-white/80">승률</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-white">{selectedUser.stats.totalCards}</div>
                          <div className="text-xs text-white/80">보유 카드</div>
                        </div>
                      </div>
                    </div>

                    {/* Deck */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        활성 덱
                      </h3>

                      {selectedUser.activeDeck ? (
                        <div>
                          <div className="mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {selectedUser.activeDeck.name}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {['top', 'jungle', 'mid', 'adc', 'support'].map((position) => {
                              const card = selectedUser.activeDeck!.cards[position as keyof typeof selectedUser.activeDeck.cards];

                              return (
                                <div key={position} className="text-center">
                                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    {position}
                                  </div>
                                  {card ? (
                                    <div className={`bg-gradient-to-br ${getCardTierColor(card.tier)} p-0.5 rounded-lg`}>
                                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                          {card.name}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                          {card.team}
                                        </div>
                                        <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                          {card.overall}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                          Lv. {card.level}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 h-32 flex items-center justify-center">
                                      <span className="text-xs text-gray-400">빈 슬롯</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-600 dark:text-gray-400">
                            활성화된 덱이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
