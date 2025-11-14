import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Trash2, TrendingUp } from 'lucide-react';
import { UserCard } from '../types';

export default function Collection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Mock data
  const mockCards: UserCard[] = [
    {
      id: 1,
      userId: 1,
      playerId: 1,
      level: 0,
      createdAt: new Date().toISOString(),
      player: {
        id: 1,
        name: 'Faker',
        team: 'T1',
        position: 'MID',
        overall: 98,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [
          { id: 1, name: 'Clutch', description: '중요한 순간에 빛나는', effect: '+10% 중요 순간' },
        ],
      },
    },
    {
      id: 2,
      userId: 1,
      playerId: 2,
      level: 2,
      createdAt: new Date().toISOString(),
      player: {
        id: 2,
        name: 'Chovy',
        team: 'GEN.G',
        position: 'MID',
        overall: 93,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [],
      },
    },
    {
      id: 3,
      userId: 1,
      playerId: 3,
      level: 1,
      createdAt: new Date().toISOString(),
      player: {
        id: 3,
        name: 'Keria',
        team: 'T1',
        position: 'SUPPORT',
        overall: 93,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [],
      },
    },
  ];

  const getTierColor = (tier: string) => {
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

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'TOP':
        return 'bg-red-500';
      case 'JUNGLE':
        return 'bg-green-500';
      case 'MID':
        return 'bg-blue-500';
      case 'ADC':
        return 'bg-yellow-500';
      case 'SUPPORT':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredCards = mockCards.filter((card) => {
    const matchesSearch = card.player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.player.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || card.player.tier === selectedTier;
    const matchesPosition = selectedPosition === 'ALL' || card.player.position === selectedPosition;
    const matchesRegion = selectedRegion === 'ALL' || card.player.region === selectedRegion;

    return matchesSearch && matchesTier && matchesPosition && matchesRegion;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            내 카드 컬렉션
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            총 {mockCards.length}장의 카드를 보유하고 있습니다
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="선수 또는 팀 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Tier Filter */}
            <div>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">모든 등급</option>
                <option value="LEGENDARY">레전드</option>
                <option value="EPIC">에픽</option>
                <option value="RARE">레어</option>
                <option value="COMMON">일반</option>
              </select>
            </div>

            {/* Position Filter */}
            <div>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">모든 포지션</option>
                <option value="TOP">탑</option>
                <option value="JUNGLE">정글</option>
                <option value="MID">미드</option>
                <option value="ADC">원딜</option>
                <option value="SUPPORT">서포터</option>
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">모든 리그</option>
                <option value="LCK">LCK</option>
                <option value="LPL">LPL</option>
                <option value="LEC">LEC</option>
                <option value="LCS">LCS</option>
                <option value="PCS">PCS</option>
                <option value="VCS">VCS</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className={`bg-gradient-to-br ${getTierColor(card.player.tier)} p-1 rounded-xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className={`${getPositionColor(card.player.position)} text-white text-xs font-bold px-2 py-1 rounded`}>
                      {card.player.position}
                    </div>
                    {card.level > 0 && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{card.level}</span>
                      </div>
                    )}
                  </div>

                  {/* Player Image Placeholder */}
                  <div className="w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-6xl font-bold text-gray-400 dark:text-gray-500">
                      {card.player.name[0]}
                    </span>
                  </div>

                  {/* Player Info */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {card.player.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {card.player.team} • {card.player.region}
                  </p>

                  {/* Overall Rating */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {card.player.overall + card.level}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Overall
                      </div>
                    </div>
                  </div>

                  {/* Traits */}
                  {card.player.traits.length > 0 && (
                    <div className="mb-3">
                      {card.player.traits.map((trait) => (
                        <div
                          key={trait.id}
                          className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded"
                        >
                          {trait.name}: {trait.effect}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                      덱에 추가
                    </button>
                    <button className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              검색 결과가 없습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
