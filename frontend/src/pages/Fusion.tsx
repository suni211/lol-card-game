import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Card {
  id: number;
  userId: number;
  playerId: number;
  level: number;
  createdAt: string;
  player: {
    id: number;
    name: string;
    team: string;
    position: string;
    overall: number;
    region: string;
    tier: string;
    season?: string;
    imageUrl?: string;
    traits?: any[];
  };
}

export default function Fusion() {
  const { user, token } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [fusing, setFusing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchCards();
    }
  }, [user, token]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        // Sort by tier and overall
        const sorted = response.data.data.sort((a: Card, b: Card) => {
          const tierOrder: any = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
          if (tierOrder[a.player.tier] !== tierOrder[b.player.tier]) {
            return tierOrder[b.player.tier] - tierOrder[a.player.tier];
          }
          return b.player.overall - a.player.overall;
        });
        setCards(sorted);
      }
    } catch (error: any) {
      console.error('Failed to fetch cards:', error);
      toast.error('카드 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ICON':
        return 'from-red-500 via-yellow-400 to-pink-500';
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

  const getTierText = (tier: string) => {
    switch (tier) {
      case 'ICON': return '아이콘';
      case 'LEGENDARY': return '레전드';
      case 'EPIC': return '에픽';
      case 'RARE': return '레어';
      default: return '일반';
    }
  };

  const toggleCardSelection = (card: Card) => {
    if (selectedCards.find(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else if (selectedCards.length < 5) {
      setSelectedCards([...selectedCards, card]);
    } else {
      toast.error('최대 5장까지 선택할 수 있습니다');
    }
  };

  const calculateTotalOverall = () => {
    return selectedCards.reduce((sum, card) => sum + card.player.overall + card.level, 0);
  };

  const getExpectedTier = (totalOverall: number) => {
    if (totalOverall >= 450) return 'EPIC / LEGENDARY';
    if (totalOverall >= 400) return 'RARE / EPIC';
    if (totalOverall >= 350) return 'COMMON / RARE';
    return 'COMMON';
  };

  const handleFusion = async () => {
    if (selectedCards.length < 2) {
      toast.error('최소 2장의 카드를 선택해야 합니다');
      return;
    }

    setFusing(true);

    try {
      const response = await axios.post(
        `${API_URL}/fusion/fuse`,
        { cardIds: selectedCards.map(c => c.id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { player, isDuplicate, refundPoints } = response.data.data;
        setResult({ player, isDuplicate, refundPoints });
        setShowResult(true);

        // Refresh cards
        await fetchCards();
        setSelectedCards([]);

        if (player.tier === 'ICON') {
          toast.success('🏆 ICON 카드 획득! 전설의 선수!', { duration: 8000 });
        } else if (player.tier === 'LEGENDARY') {
          toast.success('🎉 레전드 카드 획득!', { duration: 5000 });
        } else if (player.tier === 'EPIC') {
          toast.success('⭐ 에픽 카드 획득!');
        }

        if (isDuplicate) {
          toast(`중복 카드! ${refundPoints}P 환급받았습니다.`, { icon: 'ℹ️' });
        }
      }
    } catch (error: any) {
      console.error('Fusion error:', error);
      toast.error(error.response?.data?.error || '합성 중 오류가 발생했습니다');
    } finally {
      setFusing(false);
    }
  };

  const totalOverall = calculateTotalOverall();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-purple-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            카드 합성
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            카드를 합쳐 더 강력한 카드를 획득하세요!
          </p>
        </motion.div>

        {/* Fusion Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                합성 안내
              </h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• 2~5장의 카드를 선택하여 합성할 수 있습니다</li>
                <li>• 합산 오버롤 450 이상: 에픽/레전드 확정 (70% 에픽, 30% 레전드)</li>
                <li>• 합산 오버롤 400-449: 레어/에픽 (60% 레어, 40% 에픽)</li>
                <li>• 합산 오버롤 350-399: 일반/레어 (50% 일반, 50% 레어)</li>
                <li>• 합산 오버롤 350 미만: 일반</li>
                <li>• 중복 카드 획득 시 100P 환급</li>
                <li>• 합성에 사용된 카드는 소멸됩니다</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Selected Cards Summary */}
        {selectedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 mb-8 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">
                  선택된 카드: {selectedCards.length}/5
                </h3>
                <p className="text-white/80">총 오버롤: {totalOverall}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/80 mb-1">예상 등급</p>
                <p className="text-lg font-bold">{getExpectedTier(totalOverall)}</p>
              </div>
            </div>

            <button
              onClick={handleFusion}
              disabled={fusing || selectedCards.length < 2}
              className="w-full py-3 px-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {fusing ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>합성 중...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>카드 합성하기</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Card Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">카드 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((card) => {
              const isSelected = selectedCards.find(c => c.id === card.id);
              const cardOverall = card.player.overall + card.level;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => toggleCardSelection(card)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? 'ring-4 ring-orange-500 shadow-2xl'
                      : 'hover:shadow-xl'
                  }`}
                >
                  <div className={`bg-gradient-to-br ${getTierColor(card.player.tier)} p-0.5`}>
                    <div className="bg-white dark:bg-gray-800 p-4">
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(card.player.tier)} rounded text-white text-xs font-bold mb-2`}>
                        {getTierText(card.player.tier)}
                      </div>

                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {card.player.name}
                      </h3>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {card.player.team} • {card.player.position}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">OVR</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {cardOverall}
                          {card.level > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                              +{card.level}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div className={`bg-gradient-to-br ${getTierColor(result.player.tier)} rounded-2xl p-1 shadow-2xl`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <div className="text-center mb-6">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      합성 완료!
                    </h2>
                    <div className={`inline-block px-6 py-2 bg-gradient-to-r ${getTierColor(result.player.tier)} rounded-full text-white font-bold text-lg mb-4`}>
                      {getTierText(result.player.tier)}
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {result.player.name}
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {result.player.team} • {result.player.position}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                        {result.player.overall}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Overall Rating
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowResult(false)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-lg transition-all"
                  >
                    확인
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
