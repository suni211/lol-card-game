import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, Gift, X } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Pack {
  pack_type: string;
  quantity: number;
  received_at: string;
}

interface OpenedCard {
  id: number;
  player_id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  season: string;
  tier: string;
  level: number;
}

export default function Packs() {
  const { token } = useAuthStore();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [openedCards, setOpenedCards] = useState<OpenedCard[]>([]);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      const response = await axios.get(`${API_URL}/packs/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setPacks(response.data.data);
      }
    } catch (error: any) {
      console.error('Load packs error:', error);
      toast.error('팩 인벤토리 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const openPack = async (packType: string, count: number = 1) => {
    if (opening) return;

    setOpening(true);
    try {
      const response = await axios.post(
        `${API_URL}/packs/open`,
        { packType, count },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOpenedCards(response.data.data.cards);
        setShowResult(true);
        loadPacks(); // Reload pack inventory
        toast.success(`${count}개의 팩을 열었습니다!`);
      }
    } catch (error: any) {
      console.error('Open pack error:', error);
      toast.error(error.response?.data?.error || '팩 개봉 실패');
    } finally {
      setOpening(false);
    }
  };

  const getPackInfo = (packType: string) => {
    const packInfoMap: any = {
      STANDARD: {
        name: '일반 팩',
        emoji: '📦',
        bg: 'from-gray-500 to-gray-600',
        description: '5장의 카드 (50-90 OVR)',
      },
      PREMIUM: {
        name: '프리미엄 팩',
        emoji: '🎁',
        bg: 'from-blue-500 to-purple-600',
        description: '5장의 카드 (70-100 OVR, RARE 이상 1장 보장)',
      },
      LEGENDARY: {
        name: '전설 팩',
        emoji: '💎',
        bg: 'from-yellow-500 to-orange-600',
        description: '5장의 카드 (85-110 OVR, EPIC 이상 1장 보장)',
      },
    };

    return packInfoMap[packType] || packInfoMap.STANDARD;
  };

  const getTierColor = (tier: string) => {
    const tierColors: any = {
      COMMON: 'text-gray-500 dark:text-gray-400',
      RARE: 'text-blue-500 dark:text-blue-400',
      EPIC: 'text-purple-500 dark:text-purple-400',
      LEGENDARY: 'text-yellow-500 dark:text-yellow-400',
      ICON: 'text-pink-500 dark:text-pink-400',
    };
    return tierColors[tier] || tierColors.COMMON;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Package className="w-16 h-16 text-primary-500 animate-bounce mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              내 팩 인벤토리
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            쿠폰으로 받은 팩을 개봉하여 카드를 획득하세요!
          </p>
        </motion.div>

        {/* Packs Grid */}
        {packs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Gift className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              보유한 팩이 없습니다
            </h2>
            <p className="text-gray-500 dark:text-gray-500">
              쿠폰을 사용하여 팩을 획득하세요!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack, index) => {
              const packInfo = getPackInfo(pack.pack_type);
              return (
                <motion.div
                  key={pack.pack_type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700"
                >
                  {/* Pack Header */}
                  <div className={`bg-gradient-to-r ${packInfo.bg} p-6 text-white`}>
                    <div className="text-center">
                      <div className="text-6xl mb-3">{packInfo.emoji}</div>
                      <h3 className="text-2xl font-bold">{packInfo.name}</h3>
                      <p className="text-sm opacity-90 mt-2">{packInfo.description}</p>
                    </div>
                  </div>

                  {/* Pack Body */}
                  <div className="p-6">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                        {pack.quantity}개
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        보유 수량
                      </p>
                    </div>

                    {/* Open Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => openPack(pack.pack_type, 1)}
                        disabled={opening || pack.quantity < 1}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        1개 개봉
                      </button>

                      {pack.quantity >= 5 && (
                        <button
                          onClick={() => openPack(pack.pack_type, 5)}
                          disabled={opening || pack.quantity < 5}
                          className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          5개 한번에 개봉
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pack Opening Result Modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-purple-500 p-6 text-white sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8" />
                    <h2 className="text-3xl font-bold">획득한 카드</h2>
                  </div>
                  <button
                    onClick={() => setShowResult(false)}
                    className="text-white/80 hover:text-white"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {openedCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600"
                  >
                    <div className="text-center">
                      <div className={`text-sm font-bold mb-1 ${getTierColor(card.tier)}`}>
                        {card.tier}
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {card.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {card.team}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        {card.position} • {card.season}
                      </div>
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {card.overall} OVR
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 sticky bottom-0">
                <button
                  onClick={() => setShowResult(false)}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
