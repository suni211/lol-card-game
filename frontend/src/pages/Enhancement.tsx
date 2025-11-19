import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, AlertCircle, TrendingUp, TrendingDown, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Card {
  id: number;
  userId: number;
  playerId: number;
  level: number;
  isLocked?: boolean;
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

interface EnhancementPreview {
  baseRate: number;
  successRate: number;
  cost: number;
  ovrDowngrade: number;
  materialCards: Array<{
    id: number;
    isSamePlayer: boolean;
    tier: string;
    overall: number;
    level: number;
    name: string;
  }>;
}

export default function Enhancement() {
  const { user, token, updateUser } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [targetCard, setTargetCard] = useState<Card | null>(null);
  const [materialCards, setMaterialCards] = useState<Card[]>([]);
  const [preview, setPreview] = useState<EnhancementPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchCards();
    }
  }, [user, token]);

  useEffect(() => {
    if (targetCard && materialCards.length > 0) {
      fetchPreview();
    } else {
      setPreview(null);
    }
  }, [targetCard, materialCards]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
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

  const toggleLock = async (cardId: number, currentLockStatus: boolean) => {
    try {
      const response = await axios.post(
        `${API_URL}/gacha/card/lock/${cardId}`,
        { isLocked: !currentLockStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update local cards state
        setCards(cards.map(c =>
          c.id === cardId ? { ...c, isLocked: !currentLockStatus } : c
        ));
        toast.success(!currentLockStatus ? '카드가 잠겼습니다' : '카드 잠금이 해제되었습니다');
      }
    } catch (error: any) {
      console.error('Lock toggle error:', error);
      toast.error('잠금 상태 변경에 실패했습니다');
    }
  };

  const fetchPreview = async () => {
    if (!targetCard || materialCards.length === 0) return;

    try {
      const response = await axios.post(
        `${API_URL}/gacha/enhance/preview`,
        {
          targetCardId: targetCard.id,
          materialCardIds: materialCards.map(c => c.id)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPreview(response.data.data);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error.response?.data?.error || '미리보기 실패');
    }
  };

  const handleEnhance = async () => {
    if (!targetCard || materialCards.length === 0 || !preview) {
      toast.error('강화할 카드와 재료 카드를 선택하세요');
      return;
    }

    if (user && user.points < preview.cost) {
      toast.error('포인트가 부족합니다');
      return;
    }

    setEnhancing(true);

    try {
      const response = await axios.post(
        `${API_URL}/gacha/enhance`,
        {
          targetCardId: targetCard.id,
          materialCardIds: materialCards.map(c => c.id)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const data = response.data.data;
        setResult(data);
        setShowResult(true);

        // Update user points
        if (user) {
          updateUser({ points: user.points - data.cost });
        }

        // Refresh cards
        await fetchCards();
        setTargetCard(null);
        setMaterialCards([]);
        setPreview(null);

        if (data.isSuccess) {
          toast.success(`강화 성공! ${data.playerName} +${data.newLevel}`);
        } else {
          if (data.levelDowngraded) {
            toast.error(`강화 실패... 재료 카드 소멸 + 강화 레벨 -${data.levelLost} (현재: +${data.newLevel})`);
          } else {
            toast.error(`강화 실패... 재료 카드 ${materialCards.length}개가 소멸되었습니다`);
          }
        }

        // 코치 획득 메시지
        if (data.coach) {
          toast.success(`🎓 코치 획득! ${data.coach.name} (${data.coach.star_rating}성) - ${data.coach.description}`, {
            duration: 7000,
          });
        }
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.response?.data?.error || '강화 중 오류가 발생했습니다');
    } finally {
      setEnhancing(false);
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

  const CardDisplay = ({ card, onClick, selected, disabled, label }: any) => {
    const cardOverall = card.player.overall + card.level;

    return (
      <motion.div
        whileHover={!disabled ? { scale: 1.05 } : {}}
        onClick={!disabled ? onClick : undefined}
        className={`relative cursor-pointer rounded-xl overflow-hidden transition-all ${
          selected
            ? 'ring-4 ring-orange-500 shadow-2xl'
            : disabled
            ? 'opacity-30 cursor-not-allowed'
            : card.isLocked
            ? 'opacity-60'
            : 'hover:shadow-xl'
        }`}
      >
        {label && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
            {label}
          </div>
        )}
        {/* Lock/Unlock Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLock(card.id, card.isLocked || false);
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded z-10 transition-all"
        >
          {card.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
        <div className={`bg-gradient-to-br ${getTierColor(card.player.tier)} p-0.5`}>
          <div className="bg-white dark:bg-gray-800 p-4">
            <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(card.player.tier)} rounded text-white text-xs font-bold mb-2`}>
              {getTierText(card.player.tier)}
            </div>

            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">
              {card.player.name}
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {card.player.team} • {card.player.position}
            </p>

            <div className="flex items-center justify-between text-sm mb-2">
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

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded p-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">급여</span>
                <span className="text-xs font-bold text-green-900 dark:text-green-100">{card.player.salary || 5}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            카드 강화
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            재료 카드를 사용하여 카드를 강화하세요!
          </p>
        </motion.div>

        {/* Enhancement Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                강화 안내 (초반 쉬움, 후반 극악)
              </h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li className="text-purple-600 dark:text-purple-400 font-bold">• 재료 카드를 최대 3개까지 사용 가능! (보너스 합산)</li>
                <li className="text-green-600 dark:text-green-400 font-bold">• 기본 성공률: +0강 80%, +1강 70%, +2강 60%, +3강 50%, +4강 40%</li>
                <li className="text-orange-600 dark:text-orange-400">• 후반 성공률: +5강 30%, +6강 15%, +7강 8%, +8강 3%, +9강 1%</li>
                <li>• 같은 선수 카드 사용 시: 각 재료당 +5%</li>
                <li>• 재료 오버롤 60+: 10마다 +1% (60=0%, 70=+1%, 80=+2%, 90=+3%, 100=+4%)</li>
                <li>• 재료 강화도: 1강당 +0.3% (예: +5강 재료 = +1.5%)</li>
                <li>• 강화 비용: (현재 강화도 + 1) × 100P</li>
                <li className="text-red-600 dark:text-red-400 font-bold">⚠️ 실패 시 모든 재료 카드 소멸 + 강화 레벨 하락 위험!</li>
                <li className="text-red-600 dark:text-red-400">• 레벨 하락: 1-3강 50% 확률로 -1, 4-6강 70% 확률로 -1, 7-10강 100% 확률로 -1</li>
                <li>• 최대 강화: +10강 (최대 성공률 70%)</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Enhancement Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Target Card Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              1. 강화할 카드 선택
            </h2>
            {targetCard ? (
              <CardDisplay
                card={targetCard}
                onClick={() => setTargetCard(null)}
                selected={true}
                label="강화 대상"
              />
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">아래에서 카드를 선택하세요</p>
              </div>
            )}
          </div>

          {/* Material Card Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              2. 재료 카드 선택 (최대 3개)
            </h2>
            <div className="space-y-3">
              {materialCards.length > 0 ? (
                <>
                  {materialCards.map((card, index) => (
                    <CardDisplay
                      key={card.id}
                      card={card}
                      onClick={() => setMaterialCards(materialCards.filter((_, i) => i !== index))}
                      selected={true}
                      label={`재료 ${index + 1} (소멸됨)`}
                    />
                  ))}
                  {materialCards.length < 3 && (
                    <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400">추가 재료 선택 ({materialCards.length}/3)</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">아래에서 카드를 선택하세요</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview & Enhance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              3. 강화 확인
            </h2>
            {preview ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">기본 성공률</span>
                    <span className="font-bold text-gray-900 dark:text-white">{preview.baseRate}%</span>
                  </div>

                  {preview.materialCards && preview.materialCards.map((mat: any, idx: number) => (
                    <div key={idx} className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">재료 {idx + 1}: {mat.name}</div>

                      {mat.isSamePlayer && (
                        <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                          <span className="text-xs">같은 선수</span>
                          <span className="font-bold text-xs">+5%</span>
                        </div>
                      )}

                      {mat.overall >= 60 && (
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                          <span className="text-xs">오버롤 ({mat.overall})</span>
                          <span className="font-bold text-xs">+{Math.floor(Math.max(0, mat.overall - 60) / 10)}%</span>
                        </div>
                      )}

                      {mat.level > 0 && (
                        <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                          <span className="text-xs">강화도 (+{mat.level})</span>
                          <span className="font-bold text-xs">+{(mat.level * 0.3).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {targetCard && targetCard.level >= 1 && (
                    <div className="flex items-center justify-between mb-2 text-yellow-600 dark:text-yellow-400">
                      <span className="text-sm font-bold">⚠️ 실패 시 강화 레벨 하락 가능</span>
                      <span className="font-bold text-xs">
                        {targetCard.level >= 7 ? '100%' : targetCard.level >= 4 ? '70%' : '50%'}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-300 dark:border-gray-600 mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-white">최종 성공률</span>
                      <div className="flex items-center space-x-2">
                        {preview.successRate > preview.baseRate ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : preview.successRate < preview.baseRate ? (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        ) : null}
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {preview.successRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">강화 비용</span>
                    <span className="font-bold text-gray-900 dark:text-white">{preview.cost}P</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">보유 포인트</span>
                    <span className="font-bold text-gray-900 dark:text-white">{user?.points || 0}P</span>
                  </div>
                </div>

                <button
                  onClick={handleEnhance}
                  disabled={enhancing || !user || user.points < preview.cost}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {enhancing ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span>강화 중...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>강화하기</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">카드를 선택하면<br/>성공률을 확인할 수 있습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Card Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">카드 불러오는 중...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">내 카드</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cards.map((card) => {
                const isTarget = targetCard?.id === card.id;
                const isMaterial = materialCards.some(m => m.id === card.id);
                const isDisabled = (targetCard && card.id === targetCard.id) ||
                                   (targetCard && card.level >= 10 && !isTarget);

                return (
                  <CardDisplay
                    key={card.id}
                    card={card}
                    onClick={() => {
                      // Cannot use locked card as material
                      if (card.isLocked && !isTarget && !isMaterial && targetCard) {
                        toast.error('잠긴 카드는 재료로 사용할 수 없습니다');
                        return;
                      }

                      if (isTarget) {
                        setTargetCard(null);
                      } else if (isMaterial) {
                        setMaterialCards(materialCards.filter(m => m.id !== card.id));
                      } else if (!targetCard) {
                        setTargetCard(card);
                      } else if (targetCard && materialCards.length < 3 && card.id !== targetCard.id) {
                        setMaterialCards([...materialCards, card]);
                      }
                    }}
                    selected={isTarget || isMaterial}
                    disabled={isDisabled}
                  />
                );
              })}
            </div>
          </>
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
              <div className={`bg-gradient-to-br ${result.isSuccess ? 'from-green-400 to-blue-500' : 'from-red-400 to-orange-500'} rounded-2xl p-1 shadow-2xl`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <div className="text-center">
                    {result.isSuccess ? (
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {result.isSuccess ? '강화 성공!' : '강화 실패...'}
                    </h2>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {result.playerName}
                      </h3>
                      <div className="text-3xl font-bold">
                        {result.isSuccess ? (
                          <span className="text-green-600 dark:text-green-400">+{result.newLevel}</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">+{result.newLevel} (유지)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>기본 성공률: {result.baseRate}%</p>
                      <p>최종 성공률: {result.successRate}%</p>
                      <p className="text-red-600 dark:text-red-400 mt-2">
                        {result.materialCardName} 카드가 소멸되었습니다
                      </p>
                      {result.levelDowngraded && (
                        <p className="text-red-600 dark:text-red-400 font-bold mt-2">
                          ⚠️ 강화 레벨 하락: -{result.levelLost} (현재: +{result.newLevel})
                        </p>
                      )}
                      {!result.isSuccess && !result.levelDowngraded && (
                        <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                          강화 레벨 하락 없음 (다행!)
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowResult(false)}
                      className={`w-full py-3 px-4 ${
                        result.isSuccess
                          ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                          : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                      } text-white font-bold rounded-lg transition-all`}
                    >
                      확인
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Enhancement Button */}
      {selectedCard && selectedMaterials.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-once">
          <button
            onClick={handleEnhance}
            disabled={enhancing}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-full
              shadow-2xl backdrop-blur-sm
              transition-all duration-300 transform hover:scale-105
              ${enhancing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600'
              }
              text-white font-bold text-lg
            `}
          >
            {enhancing ? (
              <>
                <Sparkles className="w-6 h-6 animate-spin" />
                <span>강화 중...</span>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                <span>강화하기 ({selectedMaterials.length}/3)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
