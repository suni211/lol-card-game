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
  const [drawnCards, setDrawnCards] = useState<Player[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [show10Result, setShow10Result] = useState(false);
  const [dailyFreeUsed, setDailyFreeUsed] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0: loading, 1: position, 2: season, 3: team, 4: final

  const gachaOptions: GachaOption[] = [
    {
      cost: 0,
      label: '일일 무료',
      probabilities: {
        common: 94.879,
        rare: 5,
        epic: 0.1,
        legendary: 0.01,
        icon: 0.01,
        gr: 0.001,
      },
    },
    {
      cost: 100,
      label: '기본',
      probabilities: {
        common: 89.439,
        rare: 10,
        epic: 0.5,
        legendary: 0.05,
        icon: 0.01,
        gr: 0.001,
      },
    },
    {
      cost: 300,
      label: '고급',
      probabilities: {
        common: 78.785,
        rare: 18,
        epic: 3,
        legendary: 0.2,
        icon: 0.01,
        gr: 0.005,
      },
    },
    {
      cost: 500,
      label: '프리미엄',
      probabilities: {
        common: 68.48,
        rare: 25,
        epic: 6,
        legendary: 0.5,
        icon: 0.01,
        gr: 0.01,
      },
    },
    {
      cost: 3000,
      label: 'GR 프리미엄',
      probabilities: {
        common: 50,
        rare: 35.45,
        epic: 12,
        legendary: 2,
        icon: 0.05,
        gr: 0.5,
      },
      special: true,
    },
    {
      cost: 6500,
      label: '2017 SSG 월즈 우승',
      probabilities: {
        common: 0,
        rare: 0,
        epic: 90.48,
        legendary: 9.5,
        icon: 0.01,
        gr: 0.01,
      },
      special: true,
    },
    // Admin-only test packs
    ...(user?.isAdmin ? [
      {
        cost: 0,
        label: 'ICON 테스트팩',
        probabilities: {
          common: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
          icon: 100,
          gr: 0,
        },
        special: true,
      },
      {
        cost: 0,
        label: 'GR 테스트팩',
        probabilities: {
          common: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
          icon: 0,
          gr: 100,
        },
        special: true,
      }
    ] : []),
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GR':
        return 'from-pink-500 via-rose-500 to-red-600';
      case 'ICON':
        return 'from-cyan-400 via-blue-500 to-indigo-600';
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
      case 'GR':
        return 'GR';
      case 'ICON':
        return '아이콘';
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
      if (option.label === 'ICON 테스트팩') gachaType = 'icon_test';
      else if (option.label === 'GR 테스트팩') gachaType = 'gr_test';
      else if (option.cost === 0) gachaType = 'free';
      else if (option.cost === 300) gachaType = 'premium';
      else if (option.cost === 500) gachaType = 'ultra';
      else if (option.cost === 3000) gachaType = 'gr_premium';
      else if (option.cost === 6500) gachaType = 'ssg_2017';

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

        setDrawnCard(player);

        // GR 카드는 최고급 컷신
        if (player.tier === 'GR') {
          setTimeout(() => setRevealStep(1), 500);   // GOLDEN ROOKIE 텍스트
          setTimeout(() => setRevealStep(2), 2000);  // 시즌
          setTimeout(() => setRevealStep(3), 3000);  // 포지션
          setTimeout(() => setRevealStep(4), 4000);  // 팀
          setTimeout(() => setRevealStep(5), 5000);  // 선수 이름 + 미니페이스온
          setTimeout(() => {
            setRevealStep(6);  // Final card
            setIsDrawing(false);
            setShowResult(true);
          }, 6500);
        }
        // ICON 카드는 완전히 다른 컷신
        else if (player.tier === 'ICON') {
          setTimeout(() => setRevealStep(1), 500);   // 암전 + 균열 효과
          setTimeout(() => setRevealStep(2), 2000);  // ICON 텍스트
          setTimeout(() => setRevealStep(3), 3500);  // 선수 이름
          setTimeout(() => {
            setRevealStep(4);  // Final card
            setIsDrawing(false);
            setShowResult(true);
          }, 5500);
        } else {
          // 일반 카드 reveal sequence: position -> season -> team -> final
          setTimeout(() => setRevealStep(1), 500);   // Position
          setTimeout(() => setRevealStep(2), 1500);  // Season
          setTimeout(() => setRevealStep(3), 2500);  // Team
          setTimeout(() => {
            setRevealStep(4);  // Final card
            setIsDrawing(false);
            setShowResult(true);
          }, 3500);
        }

        // 타이머 후 처리
        const displayDelay = player.tier === 'GR' ? 6500 : player.tier === 'ICON' ? 5500 : 3500;
        setTimeout(() => {

          // 포인트 업데이트
          const newPoints = user.points - option.cost + (refundPoints || 0);
          updateUser({ points: newPoints });

          // 티어에 따라 다른 메시지
          if (player.tier === 'GR') {
            toast.success('👑 GREATEST ROOKIE 획득! 역대급 신인!', { duration: 10000 });
          } else if (player.tier === 'ICON') {
            toast.success('🏆 ICON 카드 획득! 전설의 선수!', { duration: 8000 });
          } else if (player.tier === 'LEGENDARY') {
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

          // Reset reveal step
          setRevealStep(0);
        }, displayDelay);
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

  const handleDraw10 = async (option: GachaOption) => {
    if (!user) {
      toast.error('로그인이 필요합니다!');
      return;
    }

    const totalCost = option.cost * 10;
    if (user.points < totalCost) {
      toast.error('포인트가 부족합니다!');
      return;
    }

    if (option.cost === 0) {
      toast.error('무료 뽑기는 10연차를 사용할 수 없습니다!');
      return;
    }

    setIsDrawing(true);
    setShow10Result(false);

    try {
      let gachaType = 'basic';
      if (option.label === 'ICON 테스트팩') gachaType = 'icon_test';
      else if (option.label === 'GR 테스트팩') gachaType = 'gr_test';
      else if (option.cost === 100) gachaType = 'basic';
      else if (option.cost === 300) gachaType = 'premium';
      else if (option.cost === 500) gachaType = 'ultra';
      else if (option.cost === 3000) gachaType = 'gr_premium';
      else if (option.cost === 6500) gachaType = 'ssg_2017';

      const response = await axios.post(
        `${API_URL}/gacha/draw-10`,
        { type: gachaType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const { results, totalRefund } = response.data.data;

        setDrawnCards(results.map((r: any) => r.player));

        setTimeout(() => {
          setIsDrawing(false);
          setShow10Result(true);

          // 업데이트된 유저 정보 가져오기
          axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((response) => {
            if (response.data.success) {
              updateUser(response.data.data);
            }
          });

          const duplicateCount = results.filter((r: any) => r.isDuplicate).length;
          if (duplicateCount > 0) {
            toast(`중복 ${duplicateCount}장! ${totalRefund}P 환급받았습니다.`, {
              icon: 'ℹ️',
            });
          }
        }, 2000);
      }
    } catch (error: any) {
      setIsDrawing(false);
      console.error('10연차 오류:', error);

      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('10연차 중 오류가 발생했습니다.');
      }
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setDrawnCard(null);
    setRevealStep(0);
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
                  {option.special && option.cost === 2500 && option.label.includes('월즈') && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 text-center">
                        25WW, 25WUD + 레어 이상 확정!
                      </p>
                    </div>
                  )}
                  {option.special && option.cost === 2500 && option.label.includes('MSI') && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 text-center">
                        MSI 카드 + 레어 이상 확정!
                      </p>
                    </div>
                  )}
                  {option.special && option.cost === 2200 && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 text-center">
                        RE 카드 + 레어 이상 확정!
                      </p>
                    </div>
                  )}
                  {option.special && option.cost === 6500 && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 text-center">
                        17SSG 카드 + 에픽 이상 확정!
                      </p>
                    </div>
                  )}
                  {option.probabilities.gr && option.probabilities.gr > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-pink-600 dark:text-pink-400 font-bold">🌟 GR</span>
                      <span className="font-bold text-pink-600 dark:text-pink-400">
                        {option.probabilities.gr}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">🏆 아이콘</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      {option.probabilities.icon}%
                    </span>
                  </div>
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

                <div className="space-y-2">
                  <button
                    onClick={() => handleDraw(option)}
                    disabled={isDrawing || (option.cost === 0 && dailyFreeUsed) || !!(user && user.points < option.cost)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {option.cost === 0 && dailyFreeUsed ? '내일 다시' : '1회 뽑기'}
                  </button>
                  {option.cost > 0 && (
                    <button
                      onClick={() => handleDraw10(option)}
                      disabled={isDrawing || !!(user && user.points < option.cost * 10)}
                      className="w-full py-2 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                    >
                      10연차 ({(option.cost * 10).toLocaleString()}P)
                    </button>
                  )}
                </div>
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
        {isDrawing && drawnCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="text-center relative">
              {/* Epic, Legendary, and ICON particle effects - shown from the start */}
              {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY' || drawnCard.tier === 'ICON') && (
                <>
                  {/* Left side particles - more natural cascade */}
                  <div className="absolute -left-20 top-0 w-40 h-screen overflow-visible pointer-events-none z-10">
                    {[...Array(drawnCard.tier === 'ICON' ? 80 : drawnCard.tier === 'LEGENDARY' ? 60 : 40)].map((_, i) => {
                      const delay = Math.random() * 5;
                      const xOffset = Math.random() * 200 + 100;
                      const yDistance = Math.random() * 800 + 600;
                      const duration = 2 + Math.random() * 2;
                      const size = 1 + Math.random() * 2;

                      return (
                        <motion.div
                          key={`left-${i}`}
                          className={`absolute rounded-full blur-[1px] ${
                            drawnCard.tier === 'ICON'
                              ? 'bg-gradient-to-br from-red-400 via-yellow-300 to-pink-400'
                              : drawnCard.tier === 'LEGENDARY'
                              ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400'
                              : 'bg-gradient-to-br from-purple-300 via-purple-400 to-pink-400'
                          }`}
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            left: `${Math.random() * 40}px`,
                            top: `${Math.random() * 100 - 50}px`,
                            boxShadow: drawnCard.tier === 'ICON'
                              ? '0 0 12px rgba(239, 68, 68, 0.9)'
                              : drawnCard.tier === 'LEGENDARY'
                              ? '0 0 8px rgba(251, 191, 36, 0.8)'
                              : '0 0 8px rgba(192, 132, 252, 0.8)',
                          }}
                          animate={{
                            x: [0, xOffset],
                            y: [0, yDistance],
                            scale: [1, 1.2, 0.8, 0],
                            opacity: [0, 1, 1, 0],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            delay: delay,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Right side particles - more natural cascade */}
                  <div className="absolute -right-20 top-0 w-40 h-screen overflow-visible pointer-events-none z-10">
                    {[...Array(drawnCard.tier === 'ICON' ? 80 : drawnCard.tier === 'LEGENDARY' ? 60 : 40)].map((_, i) => {
                      const delay = Math.random() * 5;
                      const xOffset = -(Math.random() * 200 + 100);
                      const yDistance = Math.random() * 800 + 600;
                      const duration = 2 + Math.random() * 2;
                      const size = 1 + Math.random() * 2;

                      return (
                        <motion.div
                          key={`right-${i}`}
                          className={`absolute rounded-full blur-[1px] ${
                            drawnCard.tier === 'ICON'
                              ? 'bg-gradient-to-br from-red-400 via-yellow-300 to-pink-400'
                              : drawnCard.tier === 'LEGENDARY'
                              ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400'
                              : 'bg-gradient-to-br from-purple-300 via-purple-400 to-pink-400'
                          }`}
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            right: `${Math.random() * 40}px`,
                            top: `${Math.random() * 100 - 50}px`,
                            boxShadow: drawnCard.tier === 'ICON'
                              ? '0 0 12px rgba(239, 68, 68, 0.9)'
                              : drawnCard.tier === 'LEGENDARY'
                              ? '0 0 8px rgba(251, 191, 36, 0.8)'
                              : '0 0 8px rgba(192, 132, 252, 0.8)',
                          }}
                          animate={{
                            x: [0, xOffset],
                            y: [0, yDistance],
                            scale: [1, 1.2, 0.8, 0],
                            opacity: [0, 1, 1, 0],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            delay: delay,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 0: Loading */}
              {revealStep === 0 && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative"
                >
                  {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY') && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${
                      drawnCard.tier === 'LEGENDARY'
                        ? 'from-yellow-400 via-orange-500 to-yellow-400'
                        : 'from-purple-400 via-pink-500 to-purple-400'
                    } rounded-xl blur-3xl opacity-75 animate-pulse`}></div>
                  )}
                  <div className={`relative w-48 h-64 bg-gradient-to-br ${
                    drawnCard.tier === 'LEGENDARY'
                      ? 'from-yellow-400 via-orange-500 to-yellow-600'
                      : drawnCard.tier === 'EPIC'
                      ? 'from-purple-500 via-pink-500 to-purple-600'
                      : 'from-primary-500 via-purple-500 to-pink-500'
                  } rounded-xl shadow-2xl`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-24 h-24 text-white animate-spin" />
                  </div>
                </motion.div>
              )}

              {/* Step 1: GR - GOLDEN ROOKIE 텍스트 OR ICON - 암전 + 균열 효과 OR 일반 - Position */}
              {revealStep === 1 && (
                drawnCard.tier === 'GR' ? (
                  <motion.div
                    key="gr-text"
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-screen flex items-center justify-center"
                  >
                    {/* 검은 배경 */}
                    <div className="absolute inset-0 bg-black" />

                    {/* 황금빛 원형 파동 효과 */}
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-96 h-96 rounded-full border-4 border-pink-400"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 2 + i * 0.3],
                          opacity: [0.8, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.2,
                          repeat: Infinity,
                          repeatDelay: 0.5,
                        }}
                        style={{
                          boxShadow: '0 0 60px 20px rgba(236, 72, 153, 0.6)'
                        }}
                      />
                    ))}

                    {/* GOLDEN ROOKIE 텍스트 */}
                    <motion.div
                      className="relative z-10 text-center"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    >
                      <motion.div
                        className="text-8xl font-black bg-gradient-to-r from-pink-300 via-rose-400 to-red-500 bg-clip-text text-transparent"
                        animate={{
                          textShadow: [
                            '0 0 30px rgba(236, 72, 153, 0.8)',
                            '0 0 50px rgba(236, 72, 153, 1)',
                            '0 0 30px rgba(236, 72, 153, 0.8)',
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        GOLDEN
                      </motion.div>
                      <motion.div
                        className="text-8xl font-black bg-gradient-to-r from-pink-300 via-rose-400 to-red-500 bg-clip-text text-transparent mt-4"
                        animate={{
                          textShadow: [
                            '0 0 30px rgba(236, 72, 153, 0.8)',
                            '0 0 50px rgba(236, 72, 153, 1)',
                            '0 0 30px rgba(236, 72, 153, 0.8)',
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                      >
                        ROOKIE
                      </motion.div>
                      <motion.div
                        className="text-2xl text-pink-200 mt-6 font-bold tracking-widest"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        전설의 신인 시절
                      </motion.div>
                    </motion.div>
                  </motion.div>
                ) : drawnCard.tier === 'ICON' ? (
                  <motion.div
                    key="icon-crack"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative w-full h-screen flex items-center justify-center"
                  >
                    {/* 완전 암전 배경 */}
                    <motion.div
                      className="absolute inset-0 bg-black"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                    />

                    {/* 황금빛 균열 효과 */}
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
                        style={{
                          width: `${Math.random() * 400 + 200}px`,
                          height: '4px',
                          left: '50%',
                          top: '50%',
                          transformOrigin: 'left center',
                          rotate: `${(360 / 12) * i}deg`,
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: [0, 1, 0.8] }}
                        transition={{
                          duration: 1.2,
                          delay: i * 0.08,
                          ease: 'easeOut',
                        }}
                      />
                    ))}

                    {/* 중앙 빛나는 점 */}
                    <motion.div
                      className="absolute w-4 h-4 bg-yellow-300 rounded-full"
                      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                      animate={{
                        scale: [1, 3, 2],
                        boxShadow: [
                          '0 0 20px 10px rgba(251, 191, 36, 0.8)',
                          '0 0 60px 30px rgba(251, 191, 36, 1)',
                          '0 0 40px 20px rgba(251, 191, 36, 0.9)',
                        ],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="position"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY') && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${
                        drawnCard.tier === 'LEGENDARY'
                          ? 'from-yellow-400 via-orange-500 to-yellow-400'
                          : 'from-purple-400 via-pink-500 to-purple-400'
                      } rounded-2xl blur-3xl opacity-60 animate-pulse`}></div>
                    )}
                    <div className={`relative inline-block ${getPositionColor(drawnCard.position)} rounded-2xl px-12 py-8 shadow-2xl`}>
                      <div className="text-white text-6xl font-bold mb-2">
                        {drawnCard.position}
                      </div>
                      <div className="text-white/80 text-xl">포지션</div>
                    </div>
                  </motion.div>
                )
              )}

              {/* Step 2: GR - Season OR ICON - "ICON" 텍스트 OR 일반 - Season */}
              {revealStep === 2 && (
                drawnCard.tier === 'GR' ? (
                  <motion.div
                    key="gr-season"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400 rounded-2xl blur-3xl opacity-75 animate-pulse"></div>
                    <div className="relative inline-block bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 rounded-2xl px-16 py-10 shadow-2xl">
                      <div className="text-white text-7xl font-bold mb-3">
                        {drawnCard.season || '2025'}
                      </div>
                      <div className="text-pink-100 text-2xl font-semibold">시즌</div>
                    </div>
                  </motion.div>
                ) : drawnCard.tier === 'ICON' ? (
                  <motion.div
                    key="icon-text"
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-screen flex items-center justify-center"
                  >
                    {/* 검은 배경 유지 */}
                    <div className="absolute inset-0 bg-black" />

                    {/* 빛나는 링 효과 */}
                    <motion.div
                      className="absolute w-96 h-96 rounded-full border-8 border-yellow-400"
                      initial={{ scale: 0, opacity: 0, rotate: 0 }}
                      animate={{
                        scale: [0, 1.2, 1],
                        opacity: [0, 0.8, 0.6],
                        rotate: 360,
                      }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      style={{
                        boxShadow: '0 0 60px 20px rgba(251, 191, 36, 0.6), inset 0 0 60px 20px rgba(251, 191, 36, 0.4)'
                      }}
                    />

                    {/* ICON 텍스트 */}
                    <motion.div
                      className="relative z-10 text-center"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    >
                      <motion.div
                        className="text-9xl font-black bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent"
                        animate={{
                          textShadow: [
                            '0 0 20px rgba(251, 191, 36, 0.8)',
                            '0 0 40px rgba(251, 191, 36, 1)',
                            '0 0 20px rgba(251, 191, 36, 0.8)',
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ICON
                      </motion.div>
                      <motion.div
                        className="text-2xl text-yellow-200 mt-4 font-bold tracking-widest"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        전설의 선수
                      </motion.div>
                    </motion.div>

                    {/* 반짝이는 별 효과 */}
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="season"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY') && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${
                        drawnCard.tier === 'LEGENDARY'
                          ? 'from-yellow-400 via-orange-500 to-yellow-400'
                          : 'from-purple-400 via-pink-500 to-purple-400'
                      } rounded-2xl blur-3xl opacity-60 animate-pulse`}></div>
                    )}
                    <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl px-12 py-8 shadow-2xl inline-block">
                      <div className="text-white text-6xl font-bold mb-2">
                        {drawnCard.season || '시즌 정보 없음'}
                      </div>
                      <div className="text-white/80 text-xl">시즌</div>
                    </div>
                  </motion.div>
                )
              )}

              {/* Step 3: GR - Position OR ICON - 선수 이름 OR 일반 - Team */}
              {revealStep === 3 && (
                drawnCard.tier === 'GR' ? (
                  <motion.div
                    key="gr-position"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400 rounded-2xl blur-3xl opacity-75 animate-pulse"></div>
                    <div className={`relative inline-block ${getPositionColor(drawnCard.position)} rounded-2xl px-16 py-10 shadow-2xl border-4 border-pink-300`}>
                      <div className="text-white text-7xl font-bold mb-3">
                        {drawnCard.position}
                      </div>
                      <div className="text-white/90 text-2xl font-semibold">포지션</div>
                    </div>
                  </motion.div>
                ) : drawnCard.tier === 'ICON' ? (
                  <motion.div
                    key="icon-player-name"
                    className="relative w-full h-screen flex items-center justify-center"
                  >
                    {/* 검은 배경 + 골드 그라데이션 */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-black via-yellow-900/20 to-black"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />

                    {/* 황금빛 입자들이 위로 올라감 */}
                    {[...Array(50)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          bottom: '0%',
                        }}
                        animate={{
                          y: [-100, -window.innerHeight],
                          opacity: [0, 1, 1, 0],
                          scale: [0, 1, 1, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                          ease: 'linear',
                        }}
                      />
                    ))}

                    {/* 선수 이름 */}
                    <motion.div
                      className="relative z-10 text-center"
                      initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    >
                      <motion.div
                        className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 mb-6"
                        style={{
                          textShadow: '0 0 80px rgba(251, 191, 36, 0.8)',
                          WebkitTextStroke: '2px rgba(251, 191, 36, 0.3)',
                        }}
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        {drawnCard.name}
                      </motion.div>

                      <motion.div
                        className="flex items-center justify-center gap-4 text-yellow-200 text-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <span className="font-bold">{drawnCard.team}</span>
                        <span>•</span>
                        <span className="font-bold">{drawnCard.position}</span>
                      </motion.div>
                    </motion.div>

                    {/* 방사형 빛 효과 */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                      }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="team"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY') && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${
                        drawnCard.tier === 'LEGENDARY'
                          ? 'from-yellow-400 via-orange-500 to-yellow-400'
                          : 'from-purple-400 via-pink-500 to-purple-400'
                      } rounded-2xl blur-3xl opacity-60 animate-pulse`}></div>
                    )}
                    <div className="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl px-12 py-8 shadow-2xl inline-block">
                      <div className="text-white text-6xl font-bold mb-2">
                        {drawnCard.team}
                      </div>
                      <div className="text-white/80 text-xl">소속팀</div>
                    </div>
                  </motion.div>
                )
              )}

              {/* Step 4: GR - Team OR ICON/일반 - Final Card */}
              {revealStep === 4 && (
                drawnCard.tier === 'GR' ? (
                  <motion.div
                    key="gr-team"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400 rounded-2xl blur-3xl opacity-75 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 rounded-2xl px-16 py-10 shadow-2xl inline-block border-4 border-pink-300">
                      <div className="text-white text-7xl font-bold mb-3">
                        {drawnCard.team}
                      </div>
                      <div className="text-pink-100 text-2xl font-semibold">소속팀</div>
                    </div>
                  </motion.div>
                ) : null
              )}

              {/* Step 5: GR - Player Image FIFA Style */}
              {revealStep === 5 && drawnCard.tier === 'GR' && (
                <motion.div
                  key="gr-player-faceoff"
                  className="relative w-full h-screen flex items-center justify-center overflow-hidden"
                >
                  {/* 검은 배경 */}
                  <div className="absolute inset-0 bg-black" />

                  {/* 핑크 방사형 그라데이션 배경 */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.3) 0%, rgba(0, 0, 0, 0.8) 50%, black 100%)',
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  {/* 선수 이미지 - FIFA 스타일로 크게 */}
                  <motion.div
                    className="relative z-10"
                    initial={{ opacity: 0, scale: 0.5, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <img
                      src={`/players/${drawnCard.name.toLowerCase().replace('gr ', '')}_${drawnCard.season || '25'}_gr.png`}
                      alt={drawnCard.name}
                      className="w-96 h-96 object-contain drop-shadow-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/players/placeholder.png';
                      }}
                      style={{
                        filter: 'drop-shadow(0 0 50px rgba(236, 72, 153, 0.8)) drop-shadow(0 0 100px rgba(236, 72, 153, 0.5))',
                      }}
                    />
                  </motion.div>

                  {/* 선수 이름 하단 */}
                  <motion.div
                    className="absolute bottom-32 left-0 right-0 text-center z-20"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <motion.div
                      className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-400 to-red-500 mb-4"
                      style={{
                        textShadow: '0 0 60px rgba(236, 72, 153, 1)',
                        WebkitTextStroke: '2px rgba(236, 72, 153, 0.5)',
                      }}
                      animate={{
                        textShadow: [
                          '0 0 60px rgba(236, 72, 153, 1)',
                          '0 0 80px rgba(236, 72, 153, 1)',
                          '0 0 60px rgba(236, 72, 153, 1)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {drawnCard.name}
                    </motion.div>

                    <motion.div
                      className="text-pink-200 text-2xl font-bold mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {drawnCard.team} • {drawnCard.position} • {drawnCard.season}
                    </motion.div>

                    <motion.div
                      className="inline-block bg-gradient-to-r from-pink-500 via-rose-500 to-red-600 text-white px-8 py-3 rounded-full text-lg font-black tracking-wider"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      GOLDEN ROOKIE
                    </motion.div>
                  </motion.div>

                  {/* 빛나는 링 효과 */}
                  <motion.div
                    className="absolute w-[800px] h-[800px] rounded-full border-4 border-pink-400/30"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />

                  {/* 반짝이는 입자들 */}
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-pink-400 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 2, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </motion.div>
              )}

              {/* Step 4/6: Final Card Reveal (will transition to showResult) */}
              {((revealStep === 4 && drawnCard.tier !== 'GR') || (revealStep === 6 && drawnCard.tier === 'GR')) && (
                <motion.div
                  key="final"
                  initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="relative"
                >
                  {/* ICON special effects - most dramatic */}
                  {drawnCard.tier === 'ICON' && (
                    <>
                      {/* Multiple layered glows for ICON */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-400 to-pink-500 rounded-2xl blur-3xl opacity-90 animate-pulse"></div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 rounded-2xl blur-2xl opacity-60"></div>
                      {/* Screen flash effect */}
                      <motion.div
                        className="fixed inset-0 bg-white pointer-events-none"
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      />
                    </>
                  )}
                  {/* Epic and Legendary effects */}
                  {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY') && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${
                      drawnCard.tier === 'LEGENDARY'
                        ? 'from-yellow-400 via-orange-500 to-yellow-400'
                        : 'from-purple-400 via-pink-500 to-purple-400'
                    } rounded-2xl blur-3xl opacity-75 animate-pulse`}></div>
                  )}

                  <div className={`relative w-48 h-64 bg-gradient-to-br ${getTierColor(drawnCard.tier)} rounded-2xl shadow-2xl p-1`}>
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-5xl font-bold bg-gradient-to-r ${getTierColor(drawnCard.tier)} bg-clip-text text-transparent`}>
                          {drawnCard.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
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
              className="max-w-md w-full relative"
            >
              {/* Epic, Legendary, and ICON effects for result modal */}
              {(drawnCard.tier === 'EPIC' || drawnCard.tier === 'LEGENDARY' || drawnCard.tier === 'ICON') && (
                <>
                  {/* Outer glow */}
                  <div className={`absolute -inset-4 bg-gradient-to-r ${
                    drawnCard.tier === 'ICON'
                      ? 'from-red-500 via-yellow-400 to-pink-500'
                      : drawnCard.tier === 'LEGENDARY'
                      ? 'from-yellow-400 via-orange-500 to-yellow-400'
                      : 'from-purple-400 via-pink-500 to-purple-400'
                  } rounded-3xl blur-2xl opacity-${drawnCard.tier === 'ICON' ? '80' : '60'} animate-pulse`}></div>

                  {/* Additional glow for ICON */}
                  {drawnCard.tier === 'ICON' && (
                    <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 rounded-3xl blur-3xl opacity-50 animate-pulse"></div>
                  )}

                  {/* Left side particles for modal - more natural cascade */}
                  <div className="absolute -left-32 top-0 w-40 h-full overflow-visible pointer-events-none">
                    {[...Array(drawnCard.tier === 'ICON' ? 60 : drawnCard.tier === 'LEGENDARY' ? 50 : 35)].map((_, i) => {
                      const delay = Math.random() * 5;
                      const xOffset = Math.random() * 180 + 80;
                      const yDistance = Math.random() * 600 + 400;
                      const duration = 2 + Math.random() * 2;
                      const size = 1 + Math.random() * 2;

                      return (
                        <motion.div
                          key={`modal-left-${i}`}
                          className={`absolute rounded-full blur-[1px] ${
                            drawnCard.tier === 'ICON'
                              ? 'bg-gradient-to-br from-red-400 via-yellow-300 to-pink-400'
                              : drawnCard.tier === 'LEGENDARY'
                              ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400'
                              : 'bg-gradient-to-br from-purple-300 via-purple-400 to-pink-400'
                          }`}
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            left: `${Math.random() * 40}px`,
                            top: `${Math.random() * 100 - 50}px`,
                            boxShadow: drawnCard.tier === 'ICON'
                              ? '0 0 12px rgba(239, 68, 68, 0.9)'
                              : drawnCard.tier === 'LEGENDARY'
                              ? '0 0 8px rgba(251, 191, 36, 0.8)'
                              : '0 0 8px rgba(192, 132, 252, 0.8)',
                          }}
                          animate={{
                            x: [0, xOffset],
                            y: [0, yDistance],
                            scale: [1, 1.2, 0.8, 0],
                            opacity: [0, 1, 1, 0],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            delay: delay,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Right side particles for modal - more natural cascade */}
                  <div className="absolute -right-32 top-0 w-40 h-full overflow-visible pointer-events-none">
                    {[...Array(drawnCard.tier === 'ICON' ? 60 : drawnCard.tier === 'LEGENDARY' ? 50 : 35)].map((_, i) => {
                      const delay = Math.random() * 5;
                      const xOffset = -(Math.random() * 180 + 80);
                      const yDistance = Math.random() * 600 + 400;
                      const duration = 2 + Math.random() * 2;
                      const size = 1 + Math.random() * 2;

                      return (
                        <motion.div
                          key={`modal-right-${i}`}
                          className={`absolute rounded-full blur-[1px] ${
                            drawnCard.tier === 'ICON'
                              ? 'bg-gradient-to-br from-red-400 via-yellow-300 to-pink-400'
                              : drawnCard.tier === 'LEGENDARY'
                              ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400'
                              : 'bg-gradient-to-br from-purple-300 via-purple-400 to-pink-400'
                          }`}
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            right: `${Math.random() * 40}px`,
                            top: `${Math.random() * 100 - 50}px`,
                            boxShadow: drawnCard.tier === 'ICON'
                              ? '0 0 12px rgba(239, 68, 68, 0.9)'
                              : drawnCard.tier === 'LEGENDARY'
                              ? '0 0 8px rgba(251, 191, 36, 0.8)'
                              : '0 0 8px rgba(192, 132, 252, 0.8)',
                          }}
                          animate={{
                            x: [0, xOffset],
                            y: [0, yDistance],
                            scale: [1, 1.2, 0.8, 0],
                            opacity: [0, 1, 1, 0],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            delay: delay,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <div className={`relative bg-gradient-to-br ${getTierColor(drawnCard.tier)} rounded-2xl p-1 shadow-2xl`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <div className="text-center mb-6">
                    <div className={`inline-block px-6 py-2 bg-gradient-to-r ${getTierColor(drawnCard.tier)} rounded-full text-white font-bold text-lg mb-4`}>
                      {getTierText(drawnCard.tier)}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {drawnCard.name}
                      {drawnCard.season && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold">
                          {drawnCard.season}
                        </span>
                      )}
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

      {/* 10연차 결과 모달 */}
      <AnimatePresence>
        {show10Result && drawnCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                  10연차 결과
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {drawnCards.map((card, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative bg-gradient-to-br ${getTierColor(card.tier)} rounded-lg p-3 shadow-lg`}
                    >
                      <div className="text-center">
                        <div className="text-xs font-bold text-white mb-1">
                          {getTierText(card.tier)}
                        </div>
                        <div className="text-sm font-bold text-white mb-1">
                          {card.name}
                        </div>
                        <div className="text-xs text-white/90">
                          {card.team}
                        </div>
                        <div className={`inline-block px-2 py-0.5 ${getPositionColor(card.position)} text-white text-xs font-bold rounded mt-1`}>
                          {card.position}
                        </div>
                        <div className="text-lg font-bold text-white mt-1">
                          {card.overall}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                    {['GR', 'ICON', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'].map((tier) => {
                      const count = drawnCards.filter(c => c.tier === tier).length;
                      if (count === 0) return null;
                      return (
                        <div key={tier} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {getTierText(tier)}
                          </div>
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {count}장
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShow10Result(false);
                    setDrawnCards([]);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
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
