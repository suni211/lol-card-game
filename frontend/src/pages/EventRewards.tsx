import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, ArrowLeft, Star } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RewardCard {
  id: number;
  user_card_id: number;
  is_claimed: boolean;
  created_at: string;
  player_id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  region: string;
  season: string | null;
  level: number;
}

export default function EventRewards() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [cards, setCards] = useState<RewardCard[]>([]);

  useEffect(() => {
    fetchRewardCards();
  }, []);

  const fetchRewardCards = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/event/rewards/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setCards(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reward cards:', error);
      toast.error('보상 카드 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const claimCard = async (rewardCardId: number) => {
    if (!token) return;

    setClaiming(rewardCardId);
    try {
      const response = await axios.post(
        `${API_URL}/event/rewards/cards/claim`,
        { rewardCardId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('카드를 받았습니다!');
        // Remove claimed card from list
        setCards(cards.filter((card) => card.id !== rewardCardId));
      }
    } catch (error: any) {
      console.error('Failed to claim card:', error);
      toast.error(error.response?.data?.error || '카드 받기 실패');
    } finally {
      setClaiming(null);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'COMMON':
        return 'from-gray-400 to-gray-500';
      case 'RARE':
        return 'from-blue-400 to-blue-600';
      case 'EPIC':
        return 'from-purple-400 to-purple-600';
      case 'LEGENDARY':
        return 'from-yellow-400 to-orange-600';
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
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
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
          className="mb-8"
        >
          <button
            onClick={() => navigate('/event')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>이벤트로 돌아가기</span>
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
              <Gift className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              이벤트 보상 인벤토리
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              획득한 카드를 확인하고 받아가세요!
            </p>
          </div>
        </motion.div>

        {/* Cards Grid */}
        {cards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              받을 수 있는 카드가 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              마일스톤을 달성하고 카드 보상을 받으세요!
            </p>
            <button
              onClick={() => navigate('/event/milestones')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              마일스톤 보기
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all"
              >
                {/* Card Header */}
                <div
                  className={`h-32 bg-gradient-to-br ${getTierColor(
                    card.tier
                  )} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-white text-6xl font-bold">{card.overall}</p>
                      <p className="text-white text-sm font-semibold uppercase">
                        {card.tier}
                      </p>
                    </div>
                  </div>
                  {card.season === '19G2' && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      G2
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {card.name}
                    </h3>
                    <span
                      className={`px-2 py-1 ${getPositionColor(
                        card.position
                      )} text-white text-xs font-semibold rounded`}
                    >
                      {card.position}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">팀</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {card.team}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">지역</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {card.region}
                      </span>
                    </div>
                    {card.season && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">시즌</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {card.season}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">강화</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        +{card.level}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => claimCard(card.id)}
                    disabled={claiming === card.id}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {claiming === card.id ? '받는 중...' : '카드 받기'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
