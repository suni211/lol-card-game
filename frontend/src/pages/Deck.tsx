import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, User, Trophy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Player {
  id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  region: string;
  tier: string;
}

interface UserCard {
  id: number;
  userId: number;
  playerId: number;
  level: number;
  player: Player;
}

interface DeckSlot {
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  label: string;
  card: UserCard | null;
}

export default function Deck() {
  const { user, token } = useAuthStore();
  const [deckSlots, setDeckSlots] = useState<DeckSlot[]>([
    { position: 'TOP', label: '탑', card: null },
    { position: 'JUNGLE', label: '정글', card: null },
    { position: 'MID', label: '미드', card: null },
    { position: 'ADC', label: '원딜', card: null },
    { position: 'SUPPORT', label: '서폿', card: null },
  ]);
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeckAndCards();
  }, []);

  const fetchDeckAndCards = async () => {
    try {
      setLoading(true);

      // Fetch user's cards
      const cardsRes = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cardsRes.data.success) {
        setMyCards(cardsRes.data.data);
      }

      // Fetch current deck
      const deckRes = await axios.get(`${API_URL}/deck`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deckRes.data.success && deckRes.data.data) {
        const deck = deckRes.data.data;

        setDeckSlots((prev) =>
          prev.map((slot) => {
            const posKey = slot.position.toLowerCase();
            const cardData = deck[posKey];

            if (cardData) {
              // Find full card info from myCards
              const fullCard = cardsRes.data.data.find((c: UserCard) => c.id === cardData.id);
              return { ...slot, card: fullCard || null };
            }
            return slot;
          })
        );
      }
    } catch (error: any) {
      console.error('Fetch deck error:', error);
      toast.error('덱 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT') => {
    setSelectedPosition(position);
  };

  const handleCardSelect = (card: UserCard) => {
    if (!selectedPosition) return;

    // Check if card is already in deck
    const alreadyInDeck = deckSlots.some((slot) => slot.card?.id === card.id);
    if (alreadyInDeck) {
      toast.error('이 카드는 이미 덱에 있습니다');
      return;
    }

    setDeckSlots((prev) =>
      prev.map((slot) =>
        slot.position === selectedPosition ? { ...slot, card } : slot
      )
    );

    setSelectedPosition(null);
  };

  const handleRemoveCard = (position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT') => {
    setDeckSlots((prev) =>
      prev.map((slot) =>
        slot.position === position ? { ...slot, card: null } : slot
      )
    );
  };

  const handleSaveDeck = async () => {
    try {
      setSaving(true);

      const payload = {
        name: 'My Deck',
        topCardId: deckSlots.find((s) => s.position === 'TOP')?.card?.id || null,
        jungleCardId: deckSlots.find((s) => s.position === 'JUNGLE')?.card?.id || null,
        midCardId: deckSlots.find((s) => s.position === 'MID')?.card?.id || null,
        adcCardId: deckSlots.find((s) => s.position === 'ADC')?.card?.id || null,
        supportCardId: deckSlots.find((s) => s.position === 'SUPPORT')?.card?.id || null,
      };

      const response = await axios.put(`${API_URL}/deck`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('덱이 저장되었습니다!');
      }
    } catch (error: any) {
      console.error('Save deck error:', error);
      toast.error('덱 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">덱 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                덱 편성
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                최강의 5인 로스터를 구성하세요
              </p>
            </div>
            <button
              onClick={handleSaveDeck}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? '저장 중...' : '덱 저장'}</span>
            </button>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8"
        >
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>• 각 포지션을 클릭하여 카드를 선택하세요</p>
              <p>• 같은 카드는 중복으로 배치할 수 없습니다</p>
              <p>• 잘못된 포지션에 배치하면 경기에서 -10 OVR 페널티가 적용됩니다</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deck Slots */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                현재 덱
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deckSlots.map((slot) => (
                  <motion.div
                    key={slot.position}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSlotClick(slot.position)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedPosition === slot.position
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`${getPositionColor(slot.position)} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                          {slot.label}
                        </span>
                      </div>
                      {slot.card && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCard(slot.position);
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          제거
                        </button>
                      )}
                    </div>

                    {slot.card ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(slot.card.player.tier)} rounded text-white text-xs font-bold mb-2`}>
                          {slot.card.player.tier}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white mb-1">
                          {slot.card.player.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {slot.card.player.team} • {slot.card.player.position}
                        </p>
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                          {slot.card.player.overall} OVR
                        </p>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          카드를 선택하세요
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Card Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedPosition ? `${deckSlots.find(s => s.position === selectedPosition)?.label} 선택` : '내 카드'}
              </h2>

              {selectedPosition ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {myCards
                    .filter((card) => !deckSlots.some((s) => s.card?.id === card.id))
                    .map((card) => (
                      <motion.div
                        key={card.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleCardSelect(card)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          card.player.position !== selectedPosition
                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                        }`}
                      >
                        <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(card.player.tier)} rounded text-white text-xs font-bold mb-1`}>
                          {card.player.tier}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {card.player.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {card.player.team} • {card.player.position}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {card.player.overall}
                          </span>
                          {card.player.position !== selectedPosition && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              포지션 불일치 -10
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}

                  {myCards.filter((card) => !deckSlots.some((s) => s.card?.id === card.id)).length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      사용 가능한 카드가 없습니다
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  포지션을 선택하여<br />카드를 배치하세요
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
