import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Trade as TradeType, UserCard } from '../types';

export default function Trade() {
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'history'>('send');
  const [selectedMyCard, setSelectedMyCard] = useState<UserCard | null>(null);
  const [searchUsername, setSearchUsername] = useState('');

  // Mock data
  const mockMyCards: UserCard[] = [
    {
      id: 1,
      userId: 1,
      playerId: 1,
      level: 0,
      createdAt: new Date().toISOString(),
      player: {
        id: 1,
        name: 'Doran',
        team: 'T1',
        position: 'TOP',
        overall: 89,
        region: 'LCK',
        tier: 'EPIC',
        traits: [],
      },
    },
    {
      id: 2,
      userId: 1,
      playerId: 2,
      level: 1,
      createdAt: new Date().toISOString(),
      player: {
        id: 2,
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

  const mockPendingTrades: TradeType[] = [
    {
      id: 1,
      senderId: 2,
      receiverId: 1,
      sender: {
        id: 2,
        username: 'TraderPro',
        email: 'trader@test.com',
        points: 2000,
        tier: 'GOLD',
        rating: 1600,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      },
      receiver: {
        id: 1,
        username: 'TestUser',
        email: 'test@test.com',
        points: 1000,
        tier: 'SILVER',
        rating: 1500,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      },
      senderCardId: 5,
      receiverCardId: 1,
      senderCard: {
        id: 5,
        userId: 2,
        playerId: 5,
        level: 2,
        createdAt: new Date().toISOString(),
        player: {
          id: 5,
          name: 'Chovy',
          team: 'GEN.G',
          position: 'MID',
          overall: 93,
          region: 'LCK',
          tier: 'LEGENDARY',
          traits: [],
        },
      },
      receiverCard: mockMyCards[0],
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  ];

  const handleAcceptTrade = (tradeId: number) => {
    // TODO: API 연동
    toast.success('트레이드가 수락되었습니다!');
  };

  const handleRejectTrade = (tradeId: number) => {
    // TODO: API 연동
    toast.success('트레이드가 거절되었습니다.');
  };

  const handleSendTrade = () => {
    if (!selectedMyCard) {
      toast.error('교환할 카드를 선택해주세요!');
      return;
    }

    if (!searchUsername) {
      toast.error('상대방 닉네임을 입력해주세요!');
      return;
    }

    // TODO: API 연동
    toast.success('트레이드 요청을 보냈습니다!');
    setSelectedMyCard(null);
    setSearchUsername('');
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mb-4">
            <ArrowRightLeft className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            트레이드
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            다른 유저와 카드를 교환하세요
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 보내기
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all relative ${
                activeTab === 'received'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              받은 요청
              {mockPendingTrades.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {mockPendingTrades.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 기록
            </button>
          </div>
        </motion.div>

        {/* Send Trade Tab */}
        {activeTab === 'send' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* My Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                내 카드
              </h2>
              <div className="space-y-4">
                {mockMyCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedMyCard(card)}
                    className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                      selectedMyCard?.id === card.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-20 bg-gradient-to-br ${getTierColor(card.player.tier)} rounded-lg flex items-center justify-center`}>
                        <span className="text-2xl font-bold text-white">
                          {card.player.name[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {card.player.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {card.player.team} • {card.player.position}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          OVR {card.player.overall + card.level}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                트레이드 요청
              </h2>

              <div className="space-y-6">
                {/* Search User */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    상대방 닉네임
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="닉네임 검색..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Selected Card Preview */}
                {selectedMyCard && (
                  <div className="border-2 border-primary-500 dark:border-primary-400 rounded-lg p-4 bg-primary-50 dark:bg-primary-900/20">
                    <div className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                      선택한 카드
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-16 bg-gradient-to-br ${getTierColor(selectedMyCard.player.tier)} rounded-lg flex items-center justify-center`}>
                        <span className="text-xl font-bold text-white">
                          {selectedMyCard.player.name[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {selectedMyCard.player.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          OVR {selectedMyCard.player.overall + selectedMyCard.level}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSendTrade}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                >
                  트레이드 요청 보내기
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Received Trades Tab */}
        {activeTab === 'received' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {mockPendingTrades.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  받은 트레이드 요청이 없습니다
                </p>
              </div>
            ) : (
              mockPendingTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {trade.sender.username}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {trade.sender.tier} • {trade.sender.rating}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6">
                    {/* Their Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        상대방 카드
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-16 bg-gradient-to-br ${getTierColor(trade.senderCard.player.tier)} rounded-lg flex items-center justify-center`}>
                          <span className="text-xl font-bold text-white">
                            {trade.senderCard.player.name[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                            {trade.senderCard.player.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            OVR {trade.senderCard.player.overall}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRightLeft className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>

                    {/* Your Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        내 카드
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-16 bg-gradient-to-br ${getTierColor(trade.receiverCard.player.tier)} rounded-lg flex items-center justify-center`}>
                          <span className="text-xl font-bold text-white">
                            {trade.receiverCard.player.name[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                            {trade.receiverCard.player.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            OVR {trade.receiverCard.player.overall}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleAcceptTrade(trade.id)}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>수락</span>
                    </button>
                    <button
                      onClick={() => handleRejectTrade(trade.id)}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>거절</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              트레이드 기록이 없습니다
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
