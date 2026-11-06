import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, TrendingUp, Zap, X, Sparkles } from 'lucide-react';
import type { UserCard } from '../types';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getPlayerImageUrl, getSeriesLogo } from '../utils/playerImage';
import { calculateEnhancementBonus, getTeamColor, getTierColor as getTierColorHelper, getPositionColor as getPositionColorHelper } from '../utils/cardHelpers';
import { getActiveCoachBuff, calculateTotalOverall } from '../utils/coachBuffs';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton';
import PremiumCard from '../components/ui/PremiumCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ENHANCEMENT_RATES = [80, 65, 60, 50, 45, 40, 20, 10, 5, 1];

export default function Collection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<string>('ALL');
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancementMode, setEnhancementMode] = useState(false);
  const [targetCard, setTargetCard] = useState<UserCard | null>(null);
  const [materialCard, setMaterialCard] = useState<UserCard | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [showMerging, setShowMerging] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<{
    isSuccess: boolean;
    newLevel: number;
    playerName: string;
    successRate: number;
  } | null>(null);
  const { token, user, updateUser } = useAuthStore();
  const [coachBuff, setCoachBuff] = useState<any>(null);
  const [showCullModal, setShowCullModal] = useState(false);
  const [cullThreshold, setCullThreshold] = useState(0);
  const [cullCount, setCullCount] = useState(0);

  useEffect(() => {
    fetchCards();
    fetchCoachBuff();
  }, []);

  const fetchCoachBuff = async () => {
    if (!token) return;
    const buff = await getActiveCoachBuff(token);
    setCoachBuff(buff);
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = getTierColorHelper;
  const getPositionColor = getPositionColorHelper;

  const handleEnhancement = async () => {
    if (!targetCard || !materialCard || !user) return;

    const cost = (targetCard.level + 1) * 100;
    if (user.points < cost) {
      toast.error('포인트가 부족합니다!');
      return;
    }

    try {
      setEnhancing(true);
      setShowMerging(true);

      // Phase 1: Merging animation (1.5s)
      setTimeout(() => {
        setShowMerging(false);
      }, 1500);

      const response = await axios.post(
        `${API_URL}/gacha/enhance`,
        {
          targetCardId: targetCard.id,
          materialCardId: materialCard.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data.data;

      // Phase 2: Suspense (1s after merging)
      setTimeout(() => {
        setEnhancementResult(result);
        setShowResult(true);

        // Update user points
        updateUser({ points: user.points - cost });
      }, 1500);

      // Phase 3: Show result and cleanup (2s after result shown)
      setTimeout(() => {
        setEnhancing(false);
        setShowResult(false);

        if (result.isSuccess) {
          toast.success(`강화 성공! ${result.playerName} +${result.newLevel}`);
        } else {
          toast.error(`강화 실패... (성공률 ${result.successRate}%)`);
        }

        // Reset and refresh
        setTargetCard(null);
        setMaterialCard(null);
        setEnhancementMode(false);
        setEnhancementResult(null);
        fetchCards();
      }, 4500);
    } catch (error: any) {
      setEnhancing(false);
      setShowMerging(false);
      setShowResult(false);
      toast.error(error.response?.data?.error || '강화 실패');
    }
  };

  const handleDismantle = async (cardId: number) => {
    if (!window.confirm('정말 이 카드를 분해하시겠습니까?')) return;

    try {
      const response = await axios.delete(`${API_URL}/gacha/dismantle/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const refund = response.data.data.refund;
      toast.success(`카드를 분해했습니다! +${refund}P`);

      if (user) {
        updateUser({ points: user.points + refund });
      }

      fetchCards();
    } catch (error) {
      toast.error('카드 분해 실패');
    }
  };

  const getAvailableMaterials = (target: UserCard | null) => {
    if (!target) return [];
    return cards.filter(
      (card) =>
        card.id !== target.id &&
        card.player.id === target.player.id
    );
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch = card.player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.player.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || card.player.tier === selectedTier;
    const matchesPosition = selectedPosition === 'ALL' || card.player.position === selectedPosition;
    const matchesRegion = selectedRegion === 'ALL' || card.player.region === selectedRegion;
    const matchesSeason = selectedSeason === 'ALL' || card.player.season === selectedSeason;

    return matchesSearch && matchesTier && matchesPosition && matchesRegion && matchesSeason;
  });

  return (
    <div className="min-h-screen relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-0 bg-gradient-to-br from-gray-50 via-purple-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-purple-900/20 dark:via-blue-900/20 dark:to-gray-900 bg-[length:200%_200%]"
      />

      {/* Collection Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-20, -80, -20],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          className="absolute text-purple-500/20 dark:text-purple-400/20 text-xl"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: 0,
          }}
        >
          ✨
        </motion.div>
      ))}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <motion.h1
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 dark:from-purple-400 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-2"
            >
              내 카드 컬렉션
            </motion.h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              총 {cards.length}장의 카드를 보유하고 있습니다
            </p>
          </div>
          <PremiumButton
            onClick={() => setEnhancementMode(!enhancementMode)}
            variant={enhancementMode ? "danger" : "gold"}
            size="lg"
            icon={<Zap className="w-5 h-5" />}
            className="mr-2"
          >
            {enhancementMode ? '강화 모드 종료' : '카드 강화'}
          </PremiumButton>
          <PremiumButton
            onClick={() => setShowCullModal(true)}
            variant="danger"
            size="lg"
            icon={<Trash2 className="w-5 h-5" />}
          >
            카드 정리
          </PremiumButton>
        </motion.div>

        {/* Filters */}
        <PremiumCard gradient="blue" glow>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 mb-8"
          >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="선수 또는 팀 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Season Filter */}
            <div>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">모든 시즌</option>
                {Array.from(new Set(cards.map(card => card.player.season).filter(Boolean))).sort().reverse().map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
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
        </PremiumCard>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">카드를 불러오는 중...</p>
          </div>
        ) : cards.length === 0 ? (
          /* Empty State */
          <PremiumCard gradient="dark" glow hover3D>
            <div className="text-center py-20">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                📦
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                아직 보유한 카드가 없습니다
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                가챠를 통해 첫 번째 카드를 획득해보세요!
              </p>
              <a href="/gacha">
                <PremiumButton variant="gold" size="lg" icon={<Sparkles className="w-5 h-5" />}>
                  카드 뽑기
                </PremiumButton>
              </a>
            </div>
          </PremiumCard>
        ) : (
          /* Cards Grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <div className={`bg-gradient-to-br ${getTierColor(card.player.season || card.player.tier)} p-1 rounded-xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2`}>
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

                      {/* Player Image */}
                      <div className="w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={getPlayerImageUrl(card.player.name, card.player.season, card.player.tier, card.player.imageUrl)}
                          alt={card.player.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.fallback-text')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-text text-6xl font-bold text-gray-400 dark:text-gray-500';
                              fallback.textContent = card.player.name[0];
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>

                      <img src={getSeriesLogo(card.player.season)} alt={card.player.season || '26 LIVE'} className="w-32 h-10 object-contain mb-2" />
                      {/* Player Info */}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {card.player.name}
                        {card.player.season && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold">
                            {card.player.season}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm mb-3 flex items-center gap-2">
                        <span className={`${getTeamColor(card.player.team)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                          {card.player.team}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {card.player.region}
                        </span>
                      </p>

                      {/* Overall Rating */}
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {(() => {
                              const enhancementBonus = calculateEnhancementBonus(card.level);
                              const cardData = { position: card.player.position, team: card.player.team, overall: card.player.overall, level: card.level };
                              return calculateTotalOverall(card.player.overall, enhancementBonus, cardData, coachBuff);
                            })()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Overall
                            {card.level > 0 && (
                              <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                ({card.player.overall}+{calculateEnhancementBonus(card.level)})
                              </span>
                            )}
                            {coachBuff && (() => {
                              const enhancementBonus = calculateEnhancementBonus(card.level);
                              const baseWithEnhancement = card.player.overall + enhancementBonus;
                              const cardData = { position: card.player.position, team: card.player.team, overall: card.player.overall, level: card.level };
                              const totalWithCoach = calculateTotalOverall(card.player.overall, enhancementBonus, cardData, coachBuff);
                              const coachBonus = totalWithCoach - baseWithEnhancement;
                              if (coachBonus > 0) {
                                return (
                                  <span className="ml-1 text-green-600 dark:text-green-400">
                                    +{coachBonus} 코치
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Salary */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300">급여</span>
                          <span className="text-sm font-bold text-green-900 dark:text-green-100">{card.player.salary || 5}</span>
                        </div>
                      </div>

                      {/* Player Stats */}
                      {card.player.laning && (
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                            <div className="text-yellow-700 dark:text-yellow-300 font-semibold">라인전</div>
                            <div className="text-yellow-900 dark:text-yellow-100 font-bold">{card.player.laning}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                            <div className="text-blue-700 dark:text-blue-300 font-semibold">한타</div>
                            <div className="text-blue-900 dark:text-blue-100 font-bold">{card.player.teamfight}</div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                            <div className="text-purple-700 dark:text-purple-300 font-semibold">운영</div>
                            <div className="text-purple-900 dark:text-purple-100 font-bold">{card.player.macro}</div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                            <div className="text-green-700 dark:text-green-300 font-semibold">멘탈</div>
                            <div className="text-green-900 dark:text-green-100 font-bold">{card.player.mental}</div>
                          </div>
                        </div>
                      )}

                      {/* Traits */}
                      {card.player.traits && card.player.traits.length > 0 && (
                        <div className="mb-3">
                          {card.player.traits.map((trait: any) => (
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
                        {enhancementMode ? (
                          <>
                            <button
                              onClick={() => setTargetCard(card)}
                              disabled={card.level >= 10}
                              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                                card.level >= 10
                                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                  : targetCard?.id === card.id
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {card.level >= 10 ? 'MAX' : targetCard?.id === card.id ? '선택됨 (대상)' : '강화 대상'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                              덱에 추가
                            </button>
                            <button
                              onClick={() => handleDismantle(card.id)}
                              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredCards.length === 0 && cards.length > 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </>
        )}

        {/* Enhancement Modal */}
        <AnimatePresence>
          {targetCard && enhancementMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => {
                if (!enhancing) {
                  setTargetCard(null);
                  setMaterialCard(null);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* Enhancement Animation */}
                {enhancing ? (
                  <div className="text-center py-20">
                    {/* Phase 1: Cards Merging */}
                    {showMerging && targetCard && materialCard && (
                      <div className="relative h-96 flex items-center justify-center mb-8">
                        {/* Target Card - Left */}
                        <motion.div
                          initial={{ x: -200, opacity: 1, scale: 1 }}
                          animate={{ x: 0, opacity: 0.5, scale: 0.8 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                          className={`absolute bg-gradient-to-br ${getTierColor(targetCard.player.tier)} p-1 rounded-xl`}
                          style={{ left: '20%' }}
                        >
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-48">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {targetCard.player.name}
                            </h4>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                              +{targetCard.level}
                            </div>
                          </div>
                        </motion.div>

                        {/* Material Card - Right */}
                        <motion.div
                          initial={{ x: 200, opacity: 1, scale: 1 }}
                          animate={{ x: 0, opacity: 0.5, scale: 0.8 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                          className={`absolute bg-gradient-to-br ${getTierColor(materialCard.player.tier)} p-1 rounded-xl`}
                          style={{ right: '20%' }}
                        >
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-48">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {materialCard.player.name}
                            </h4>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                              +{materialCard.level}
                            </div>
                          </div>
                        </motion.div>

                        {/* Merging Effect */}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
                          transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                          className="absolute"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full blur-2xl opacity-75 animate-pulse"></div>
                            <Zap className="relative w-32 h-32 text-yellow-400" />
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {/* Phase 2: Suspense - No result yet */}
                    {!showMerging && !showResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: "reverse",
                          }}
                        >
                          <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full blur-3xl opacity-60 animate-pulse"></div>
                            <div className="relative w-40 h-40 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                              <span className="text-6xl">❓</span>
                            </div>
                          </div>
                        </motion.div>
                        <motion.h2
                          className="text-3xl font-bold text-gray-900 dark:text-white mt-8"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        >
                          강화 중...
                        </motion.h2>
                        <motion.p
                          className="text-lg text-gray-600 dark:text-gray-400 mt-4"
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          결과를 확인하고 있습니다...
                        </motion.p>
                      </motion.div>
                    )}

                    {/* Phase 3: Result Display */}
                    {showResult && enhancementResult && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", duration: 0.8 }}
                        className="py-20"
                      >
                        {enhancementResult.isSuccess ? (
                          <>
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0],
                              }}
                              transition={{ duration: 0.6 }}
                              className="relative inline-block"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 rounded-full blur-3xl opacity-75"></div>
                              <div className="relative text-9xl">✨</div>
                            </motion.div>
                            <motion.h2
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="text-5xl font-black text-green-500 mt-6 mb-4"
                            >
                              강화 성공!
                            </motion.h2>
                            <motion.div
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.5 }}
                              className="text-3xl font-bold text-gray-900 dark:text-white"
                            >
                              {enhancementResult.playerName} +{enhancementResult.newLevel}
                            </motion.div>
                          </>
                        ) : (
                          <>
                            <motion.div
                              animate={{
                                scale: [1, 0.9, 1],
                              }}
                              transition={{ duration: 0.6 }}
                              className="relative inline-block"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-full blur-3xl opacity-60"></div>
                              <div className="relative text-9xl">💔</div>
                            </motion.div>
                            <motion.h2
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="text-5xl font-black text-red-500 mt-6 mb-4"
                            >
                              강화 실패...
                            </motion.h2>
                            <motion.div
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.5 }}
                              className="text-xl text-gray-600 dark:text-gray-400"
                            >
                              성공률 {enhancementResult.successRate}%
                            </motion.div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        카드 강화
                      </h2>
                      <button
                        onClick={() => {
                          setTargetCard(null);
                          setMaterialCard(null);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        같은 카드를 재료로 사용하여 강화할 수 있습니다. 강화 실패 시 재료 카드와 포인트만 소모됩니다.
                      </p>
                    </div>

                    {/* Target Card */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        강화 대상 카드
                      </h3>
                      <div className={`bg-gradient-to-br ${getTierColor(targetCard.player.tier)} p-1 rounded-xl inline-block`}>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 min-w-[250px]">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`${getPositionColor(targetCard.player.position)} text-white text-xs font-bold px-2 py-1 rounded`}>
                              {targetCard.player.position}
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              +{targetCard.level} → +{targetCard.level + 1}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                            {targetCard.player.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {targetCard.player.team}
                          </p>
                          <div className="mt-2">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {targetCard.player.overall + targetCard.level} → {targetCard.player.overall + targetCard.level + 1}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Overall</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhancement Info */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">비용</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {(targetCard.level + 1) * 100}P
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">성공률</div>
                        <div className="text-xl font-bold text-green-500">
                          {ENHANCEMENT_RATES[targetCard.level]}%
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">보유 포인트</div>
                        <div className="text-xl font-bold text-blue-500">
                          {user?.points || 0}P
                        </div>
                      </div>
                    </div>

                    {/* Material Selection */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        재료 카드 선택
                      </h3>
                      {getAvailableMaterials(targetCard).length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-gray-600 dark:text-gray-400">
                            같은 카드가 없습니다. 가챠를 통해 더 많은 카드를 획득하세요!
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {getAvailableMaterials(targetCard).map((card) => (
                            <motion.div
                              key={card.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setMaterialCard(card)}
                              className={`cursor-pointer ${
                                materialCard?.id === card.id
                                  ? 'ring-4 ring-green-500'
                                  : 'ring-1 ring-gray-300 dark:ring-gray-600'
                              } bg-gradient-to-br ${getTierColor(card.player.tier)} p-1 rounded-xl`}
                            >
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`${getPositionColor(card.player.position)} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
                                    {card.player.position}
                                  </span>
                                  {card.level > 0 && (
                                    <span className="text-xs font-bold text-yellow-500">+{card.level}</span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                  {card.player.name}
                                </h4>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                  {card.player.overall + card.level}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Enhance Button */}
                    <PremiumButton
                      onClick={handleEnhancement}
                      disabled={!materialCard || (user?.points || 0) < (targetCard.level + 1) * 100}
                      variant="gold"
                      size="lg"
                      icon={<Zap className="w-5 h-5" />}
                      className="w-full"
                    >
                      {!materialCard
                        ? '재료 카드를 선택하세요'
                        : (user?.points || 0) < (targetCard.level + 1) * 100
                        ? '포인트가 부족합니다'
                        : `강화하기 (${ENHANCEMENT_RATES[targetCard.level]}%)`}
                    </PremiumButton>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cull Cards Modal */}
        <AnimatePresence>
          {showCullModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCullModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    카드 정리
                  </h2>
                  <button
                    onClick={() => setShowCullModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    지정한 오버롤 미만의 모든 카드를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                  <label htmlFor="cullThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    오버롤 임계값 (이 값 미만의 카드 삭제)
                  </label>
                  <input
                    type="number"
                    id="cullThreshold"
                    value={cullThreshold}
                    onChange={(e) => setCullThreshold(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <PremiumButton
                    onClick={async () => {
                      try {
                        const response = await axios.post(`${API_URL}/collection/cull-cards/preview`, { overallThreshold: cullThreshold }, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        setCullCount(response.data.data.count);
                        toast.success(`${response.data.data.count}장의 카드가 삭제될 예정입니다.`);
                      } catch (error: any) {
                        toast.error(error.response?.data?.error || '미리보기 실패');
                      }
                    }}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    삭제 미리보기 ({cullCount}장)
                  </PremiumButton>

                  <PremiumButton
                    onClick={async () => {
                      if (!window.confirm(`${cullCount}장의 카드를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
                      try {
                        const response = await axios.post(`${API_URL}/collection/cull-cards/confirm`, { overallThreshold: cullThreshold }, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        toast.success(`${response.data.data.count}장의 카드를 성공적으로 삭제했습니다.`);
                        setShowCullModal(false);
                        fetchCards(); // Refresh cards
                      } catch (error: any) {
                        toast.error(error.response?.data?.error || '카드 삭제 실패');
                      }
                    }}
                    disabled={cullCount === 0}
                    variant="danger"
                    size="lg"
                    className="w-full"
                  >
                    {cullCount > 0 ? `${cullCount}장 카드 삭제 확정` : '삭제할 카드 없음'}
                  </PremiumButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
