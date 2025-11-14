import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import type { Player, GachaOption } from '../types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Gacha() {
  const { user, token, updateUser } = useAuthStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Player | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [dailyFreeUsed, setDailyFreeUsed] = useState(false);

  const gachaOptions: GachaOption[] = [
    {
      cost: 0,
      label: '일일 무료',
      probabilities: {
        common: 70,
        rare: 25,
        epic: 4.5,
        legendary: 0.5,
      },
    },
    {
      cost: 100,
      label: '기본',
      probabilities: {
        common: 65,
        rare: 28,
        epic: 6,
        legendary: 1,
      },
    },
    {
      cost: 300,
      label: '고급',
      probabilities: {
        common: 50,
        rare: 35,
        epic: 12,
        legendary: 3,
      },
    },
    {
      cost: 500,
      label: '프리미엄',
      probabilities: {
        common: 30,
        rare: 40,
        epic: 22,
        legendary: 8,
      },
    },
    {
      cost: 2500,
      label: '2025 월즈 우승',
      probabilities: {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 100,
      },
      special: true,
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

  const getTierText = (tier: string) => {
    switch (tier) {
      case 'LEGENDARY':
        return '레전드';
      case 'EPIC':
        return '에픽';
      case 'RARE':
        return '레어';
      default:
        return '일반';
    }
  };

  const handleDraw = async (option: GachaOption) => {
    if (!user) {
      toast.error('로그인이 필요합니다!');
      return;
    }

    if (user.points < option.cost) {
      toast.error('포인트가 부족합니다!');
      return;
    }

    setIsDrawing(true);
    setShowResult(false);

    try {
      // 가챠 타입 결정
      let gachaType = 'basic';
      if (option.cost === 0) gachaType = 'free';
      else if (option.cost === 300) gachaType = 'premium';
      else if (option.cost === 500) gachaType = 'ultra';
      else if (option.cost === 2500) gachaType = 'worlds_winner';

      // 백엔드 API 호출
      const response = await axios.post(
        `${API_URL}/gacha/draw`,
        { type: gachaType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const { player, isDuplicate, refundPoints } = response.data.data;

        // 애니메이션 시뮬레이션
        setTimeout(() => {
          setDrawnCard(player);
          setIsDrawing(false);
          setShowResult(true);

          // 포인트 업데이트
          const newPoints = user.points - option.cost + (refundPoints || 0);
          updateUser({ points: newPoints });

          // 티어에 따라 다른 메시지
          if (player.tier === 'LEGENDARY') {
            toast.success('🎉 레전드 카드 획득!', { duration: 5000 });
          } else if (player.tier === 'EPIC') {
            toast.success('⭐ 에픽 카드 획득!');
          }

          // 중복 카드 메시지
          if (isDuplicate) {
            toast(`중복 카드! ${refundPoints}P 환급받았습니다.`, {
              icon: 'ℹ️',
            });
          }

          if (option.cost === 0) {
            setDailyFreeUsed(true);
          }
        }, 3000);
      }
    } catch (error: any) {
      setIsDrawing(false);
      console.error('가챠 오류:', error);

      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('카드 뽑기 중 오류가 발생했습니다.');
      }
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setDrawnCard(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full mb-4">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            카드 뽑기
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            행운을 시험하고 최고의 선수 카드를 획득하세요!
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
              <Trophy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {user.points.toLocaleString()}
              </span>
              <span className="text-gray-600 dark:text-gray-400">포인트</span>
            </div>
          )}
        </motion.div>

        {/* Gacha Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {gachaOptions.map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 transition-all ${
                option.cost === 0 && dailyFreeUsed
                  ? 'border-gray-300 dark:border-gray-600 opacity-50'
                  : option.special
                  ? 'border-yellow-500 dark:border-yellow-400 hover:shadow-2xl hover:-translate-y-2'
                  : 'border-primary-500 dark:border-primary-400 hover:shadow-xl hover:-translate-y-2'
              }`}
            >
              {option.cost === 0 && (
                <div className="absolute top-0 right-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  FREE
                </div>
              )}
              {option.special && (
                <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  SPECIAL
                </div>
              )}

              <div className="p-6">
                <h3 className={`text-2xl font-bold mb-2 ${option.special ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                  {option.label}
                </h3>
                <div className={`text-3xl font-bold mb-4 ${option.special ? 'text-yellow-600 dark:text-yellow-400' : 'text-primary-600 dark:text-primary-400'}`}>
                  {option.cost === 0 ? '무료' : `${option.cost}P`}
                </div>

                {/* Probabilities */}
                <div className="space-y-2 mb-6">
                  {option.special && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 text-center">
                        25WW, 25WUD + 레어 이상 확정!
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-yellow-600 dark:text-yellow-400">레전드</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {option.probabilities.legendary}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-600 dark:text-purple-400">에픽</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {option.probabilities.epic}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600 dark:text-blue-400">레어</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {option.probabilities.rare}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">일반</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {option.probabilities.common}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDraw(option)}
                  disabled={isDrawing || (option.cost === 0 && dailyFreeUsed) || !!(user && user.points < option.cost)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {option.cost === 0 && dailyFreeUsed ? '내일 다시' : '뽑기'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
        >
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                카드 뽑기 안내
              </h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• 일일 무료 뽑기는 매일 자정(00:00)에 초기화됩니다</li>
                <li>• 중복 카드 획득 시 포인트의 50%가 환불됩니다</li>
                <li>• 경기에서 승리하면 100P, 패배하면 50P를 획득할 수 있습니다</li>
                <li>• 레어 이상 카드는 강화가 가능합니다</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Drawing Animation Modal */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="w-48 h-64 bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 rounded-xl shadow-2xl animate-card-glow"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-24 h-24 text-white animate-spin" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && drawnCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeResult}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div className={`bg-gradient-to-br ${getTierColor(drawnCard.tier)} rounded-2xl p-1 shadow-2xl`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <div className="text-center mb-6">
                    <div className={`inline-block px-6 py-2 bg-gradient-to-r ${getTierColor(drawnCard.tier)} rounded-full text-white font-bold text-lg mb-4`}>
                      {getTierText(drawnCard.tier)}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {drawnCard.name}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {drawnCard.team} • {drawnCard.position}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                        {drawnCard.overall}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Overall Rating
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={closeResult}
                    className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
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
