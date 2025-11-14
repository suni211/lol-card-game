import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, TrendingDown } from 'lucide-react';
import { LeaderboardEntry } from '../types';

export default function Ranking() {
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Mock leaderboard data
  const mockLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: 1,
      username: 'FakerFan2025',
      tier: 'CHALLENGER',
      rating: 2500,
      wins: 150,
      losses: 45,
      winRate: 76.9,
    },
    {
      rank: 2,
      userId: 2,
      username: 'T1Forever',
      tier: 'MASTER',
      rating: 2350,
      wins: 130,
      losses: 50,
      winRate: 72.2,
    },
    {
      rank: 3,
      userId: 3,
      username: 'GenGSupporter',
      tier: 'MASTER',
      rating: 2200,
      wins: 120,
      losses: 55,
      winRate: 68.6,
    },
    {
      rank: 4,
      userId: 4,
      username: 'LCKLegend',
      tier: 'DIAMOND',
      rating: 2100,
      wins: 110,
      losses: 60,
      winRate: 64.7,
    },
    {
      rank: 5,
      userId: 5,
      username: 'CardMaster',
      tier: 'DIAMOND',
      rating: 2050,
      wins: 100,
      losses: 55,
      winRate: 64.5,
    },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Medal className="w-8 h-8 text-orange-600" />;
      default:
        return (
          <div className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold">
            {rank}
          </div>
        );
    }
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-wrap gap-2">
            {['ALL', 'LCK', 'LPL', 'LEC', 'LCS'].map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedRegion === region
                    ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {region === 'ALL' ? '전체' : region}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {mockLeaderboard.slice(0, 3).map((entry, index) => {
            const heights = ['h-64', 'h-56', 'h-48'];
            const delays = [0.2, 0.15, 0.25];

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays[index] }}
                className={`${index === 1 ? 'order-first' : index === 0 ? 'order-2' : 'order-last'}`}
              >
                <div className={`bg-gradient-to-br ${getTierColor(entry.tier)} p-1 rounded-xl shadow-lg ${heights[index]}`}>
                  <div className="bg-white dark:bg-gray-800 h-full rounded-lg p-6 flex flex-col items-center justify-center">
                    <div className="mb-4">{getRankIcon(entry.rank)}</div>
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-white">
                        {entry.username[0]}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">
                      {entry.username}
                    </h3>
                    <div className={`px-3 py-1 bg-gradient-to-r ${getTierColor(entry.tier)} rounded-full text-white text-xs font-bold mb-3`}>
                      {entry.tier}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {entry.rating}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.wins}승 {entry.losses}패
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      승률 {entry.winRate}%
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    플레이어
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    티어
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    레이팅
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    전적
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    승률
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {mockLeaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {entry.username[0]}
                          </span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {entry.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 bg-gradient-to-r ${getTierColor(entry.tier)} rounded-full text-white text-xs font-bold`}>
                        {entry.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {entry.rating}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <span className="text-green-600 dark:text-green-400">{entry.wins}승</span>
                        {' / '}
                        <span className="text-red-600 dark:text-red-400">{entry.losses}패</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className={`font-semibold ${
                          entry.winRate >= 60
                            ? 'text-green-600 dark:text-green-400'
                            : entry.winRate >= 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {entry.winRate}%
                        </span>
                        {entry.winRate >= 60 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : entry.winRate < 50 ? (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Your Rank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">내 순위</div>
              <div className="text-3xl font-bold">#42</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90 mb-1">내 레이팅</div>
              <div className="text-3xl font-bold">1500</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
