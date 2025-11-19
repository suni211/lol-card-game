import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Clock,
  Trophy,
  Target,
  CheckCircle,
  X,
  Info,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { getPlayerImageUrl } from '../utils/playerImage';
import { calculateEnhancementBonus, getPositionColor } from '../utils/cardHelpers';
import { getActiveCoachBuff, calculateTotalOverall } from '../utils/coachBuffs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Player {
  id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  region: string;
  season?: string;
  salary?: number;
  trait1?: string;
}

interface UserCard {
  id: number;
  userId: number;
  playerId: number;
  level: number;
  player: Player;
}

interface AgentStatus {
  daily: {
    available: boolean;
    nextAvailable: string | null;
  };
  weekly: {
    available: boolean;
    nextAvailable: string | null;
  };
  monthly: {
    available: boolean;
    nextAvailable: string | null;
  };
}

interface AgentConfig {
  name: string;
  minOverall: number;
  minCards: number;
  maxCards: number;
  cooldownHours: number;
  rewards: Array<{
    type: string;
    value: string | number;
    chance: number;
  }>;
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  daily: {
    name: '일일 에이전트',
    minOverall: 300,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 24,
    rewards: [
      { type: 'points', value: 300, chance: 50.0 },
      { type: 'points', value: 2000, chance: 35.0 },
      { type: 'points', value: 5000, chance: 10.0 },
      { type: 'pack', value: '105+ OVR 확정팩', chance: 3.22 },
      { type: 'pack', value: '108+ OVR 확정팩', chance: 1.5 },
      { type: 'pack', value: '109+ OVR 확정팩', chance: 0.2 },
      { type: 'points', value: 300000, chance: 0.07999153 },
      { type: 'pack', value: 'ICON 5강 확정팩', chance: 0.00000947 },
    ]
  },
  weekly: {
    name: '주간 에이전트',
    minOverall: 400,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 168,
    rewards: [
      { type: 'points', value: 5000, chance: 90.0 },
      { type: 'points', value: 10000, chance: 5.3 },
      { type: 'points', value: 20000, chance: 3.5 },
      { type: 'pack', value: '101+ OVR 확정팩', chance: 0.77 },
      { type: 'pack', value: '103+ OVR ICON 포함 팩', chance: 0.4221 },
      { type: 'pack', value: '110+ OVR ICON 포함 팩', chance: 0.0079 },
    ]
  },
  monthly: {
    name: '월간 에이전트',
    minOverall: 510,
    minCards: 3,
    maxCards: 5,
    cooldownHours: 720,
    rewards: [
      { type: 'points', value: 20000, chance: 50.0 },
      { type: 'points', value: 50000, chance: 49.533 },
      { type: 'points', value: 100000, chance: 0.311 },
      { type: 'points', value: 500000, chance: 0.156 },
    ]
  }
};

export default function Agent() {
  const { token, user, updateUser } = useAuthStore();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [deckCardIds, setDeckCardIds] = useState<number[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState<any>(null);
  const [coachBuff, setCoachBuff] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
    fetchUserCards();
    fetchDeckCards();
    fetchCoachBuff();
  }, []);

  const fetchCoachBuff = async () => {
    if (!token) return;
    const buff = await getActiveCoachBuff(token);
    setCoachBuff(buff);
  };

  const fetchStatus = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/agent/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
      toast.error('에이전트 상태 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCards = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/deck/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setUserCards(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };

  const fetchDeckCards = async () => {
    if (!token) return;

    try {
      // Fetch all 5 decks and collect card IDs
      const deckPromises = [1, 2, 3, 4, 5].map(slot =>
        axios.get(`${API_URL}/deck/${slot}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const responses = await Promise.all(deckPromises);
      const allDeckCardIds: number[] = [];

      responses.forEach(response => {
        if (response.data.success && response.data.data) {
          const deck = response.data.data;
          if (deck.top_card_id) allDeckCardIds.push(deck.top_card_id);
          if (deck.jungle_card_id) allDeckCardIds.push(deck.jungle_card_id);
          if (deck.mid_card_id) allDeckCardIds.push(deck.mid_card_id);
          if (deck.adc_card_id) allDeckCardIds.push(deck.adc_card_id);
          if (deck.support_card_id) allDeckCardIds.push(deck.support_card_id);
        }
      });

      setDeckCardIds(allDeckCardIds);
    } catch (error) {
      console.error('Failed to fetch deck cards:', error);
    }
  };

  const handleAgentSelect = (agentType: string) => {
    if (!status) return;

    const agentStatus = status[agentType as keyof AgentStatus];
    if (!agentStatus.available) {
      const nextTime = new Date(agentStatus.nextAvailable!).toLocaleString('ko-KR');
      toast.error(`다음 사용 가능 시간: ${nextTime}`);
      return;
    }

    setSelectedAgent(agentType);
    setSelectedCards([]);
  };

  const handleCardToggle = (cardId: number) => {
    const config = AGENT_CONFIGS[selectedAgent!];

    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      if (selectedCards.length >= config.maxCards) {
        toast.error(`최대 ${config.maxCards}명까지 선택 가능합니다.`);
        return;
      }
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const calculateTotalOverallForAgent = () => {
    return selectedCards.reduce((sum, cardId) => {
      const card = userCards.find(c => c.id === cardId);
      if (!card) return sum;
      const enhancementBonus = calculateEnhancementBonus(card.level);
      const cardData = {
        position: card.player.position,
        team: card.player.team,
        overall: card.player.overall,
        level: card.level
      };
      return sum + calculateTotalOverall(card.player.overall, enhancementBonus, cardData, coachBuff);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!token || !selectedAgent) return;

    const config = AGENT_CONFIGS[selectedAgent];

    if (selectedCards.length < config.minCards) {
      toast.error(`최소 ${config.minCards}명의 선수가 필요합니다.`);
      return;
    }

    const totalOverall = calculateTotalOverallForAgent();
    if (totalOverall < config.minOverall) {
      toast.error(`총 오버롤 ${config.minOverall} 이상이 필요합니다. (현재: ${totalOverall})`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/agent/submit`,
        {
          agentType: selectedAgent,
          cardIds: selectedCards,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const reward = response.data.data.reward;
        setRewardData(reward);
        setShowReward(true);

        // Update user points if reward is points
        if (reward.type === 'points' && user) {
          updateUser({ points: user.points + reward.value });
        }

        // Refresh status
        await fetchStatus();

        // Close agent selection
        setSelectedAgent(null);
        setSelectedCards([]);
      }
    } catch (error: any) {
      console.error('Agent submit error:', error);
      toast.error(error.response?.data?.error || '미션 제출 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const getAgentTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'from-blue-500 to-cyan-500';
      case 'weekly':
        return 'from-purple-500 to-pink-500';
      case 'monthly':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return <Target className="w-8 h-8" />;
      case 'weekly':
        return <Trophy className="w-8 h-8" />;
      case 'monthly':
        return <Briefcase className="w-8 h-8" />;
      default:
        return <Target className="w-8 h-8" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          에이전트 미션
        </h1>
        <p className="text-gray-400">
          선수 카드를 파견하여 보상을 획득하세요!
        </p>
      </motion.div>

      {/* Agent Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(AGENT_CONFIGS).map(([type, config]) => {
          const agentStatus = status?.[type as keyof AgentStatus];
          const isAvailable = agentStatus?.available ?? false;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: isAvailable ? 1.05 : 1 }}
              className={`relative overflow-hidden rounded-xl ${
                isAvailable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => handleAgentSelect(type)}
            >
              <div className={`bg-gradient-to-br ${getAgentTypeColor(type)} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 rounded-full p-3">
                    {getAgentTypeIcon(type)}
                  </div>
                  {isAvailable ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Clock className="w-6 h-6 text-white/60" />
                  )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{config.name}</h3>

                <div className="space-y-1 text-white/90 text-sm mb-4">
                  <p>필요 오버롤: {config.minOverall}</p>
                  <p>필요 인원: {config.minCards}~{config.maxCards}명</p>
                  <p>쿨타임: {config.cooldownHours}시간</p>
                </div>

                {!isAvailable && agentStatus?.nextAvailable && (
                  <div className="bg-black/20 rounded-lg p-3 text-white/80 text-sm">
                    <Clock className="w-4 h-4 inline mr-2" />
                    {new Date(agentStatus.nextAvailable).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>

              {/* Rewards Preview */}
              <div className="bg-gray-800 p-4">
                <p className="text-xs text-gray-400 mb-2">보상 확률</p>
                <div className="space-y-1">
                  {config.rewards.slice(0, 3).map((reward, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-300">
                        {reward.type === 'points' ? `${reward.value}P` : reward.value}
                      </span>
                      <span className="text-gray-500">{reward.chance}%</span>
                    </div>
                  ))}
                  {config.rewards.length > 3 && (
                    <p className="text-xs text-gray-500">외 {config.rewards.length - 3}개...</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Card Selection Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${getAgentTypeColor(selectedAgent)} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    {AGENT_CONFIGS[selectedAgent].name}
                  </h2>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">
                      {selectedCards.length}/{AGENT_CONFIGS[selectedAgent].maxCards}명 선택
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">
                      총 오버롤: {calculateTotalOverallForAgent()}/{AGENT_CONFIGS[selectedAgent].minOverall}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {userCards.map((card) => {
                    const isSelected = selectedCards.includes(card.id);
                    const isInDeck = deckCardIds.includes(card.id);
                    const enhancementBonus = calculateEnhancementBonus(card.level);
                    const cardData = {
                      position: card.player.position,
                      team: card.player.team,
                      overall: card.player.overall,
                      level: card.level
                    };
                    const finalOverall = calculateTotalOverall(card.player.overall, enhancementBonus, cardData, coachBuff);

                    return (
                      <motion.div
                        key={card.id}
                        whileHover={{ scale: isInDeck ? 1 : 1.05 }}
                        whileTap={{ scale: isInDeck ? 1 : 0.95 }}
                        onClick={() => !isInDeck && handleCardToggle(card.id)}
                        className={`relative rounded-lg overflow-hidden ${
                          isInDeck
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          isSelected ? 'ring-4 ring-yellow-400' : ''
                        }`}
                      >
                        <div className="relative aspect-[3/4] bg-gray-800">
                          <img
                            src={getPlayerImageUrl(card.player.name, card.player.season)}
                            alt={card.player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-player.png';
                            }}
                          />

                          {/* Overall Badge */}
                          <div className="absolute top-2 left-2 bg-black/80 rounded-full px-3 py-1">
                            <span className="text-yellow-400 font-bold">{finalOverall}</span>
                          </div>

                          {/* Coach Buff Badge */}
                          {coachBuff && (() => {
                            const baseWithEnhancement = card.player.overall + enhancementBonus;
                            const coachBonus = finalOverall - baseWithEnhancement;
                            if (coachBonus > 0) {
                              return (
                                <div className="absolute top-12 left-2 bg-green-600/90 rounded-full px-2 py-0.5 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-white" />
                                  <span className="text-white text-xs font-bold">+{coachBonus}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Level Badge */}
                          {card.level > 0 && (
                            <div className="absolute top-2 right-2 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">+{card.level}</span>
                            </div>
                          )}

                          {/* In Deck Indicator */}
                          {isInDeck && (
                            <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center">
                              <div className="bg-black/80 px-4 py-2 rounded-lg">
                                <p className="text-white font-bold text-sm">덱 편성 중</p>
                              </div>
                            </div>
                          )}

                          {/* Selected Indicator */}
                          {isSelected && !isInDeck && (
                            <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center">
                              <CheckCircle className="w-12 h-12 text-yellow-400" />
                            </div>
                          )}

                          {/* Player Info */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                            <p className="text-white font-bold text-sm truncate">
                              {card.player.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${getPositionColor(card.player.position)}`}>
                                {card.player.position}
                              </span>
                              <span className="text-xs text-gray-300">{card.player.team}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-800 border-t border-gray-700">
                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    selectedCards.length < AGENT_CONFIGS[selectedAgent].minCards ||
                    calculateTotalOverallForAgent() < AGENT_CONFIGS[selectedAgent].minOverall
                  }
                  className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                    submitting ||
                    selectedCards.length < AGENT_CONFIGS[selectedAgent].minCards ||
                    calculateTotalOverallForAgent() < AGENT_CONFIGS[selectedAgent].minOverall
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {submitting ? '제출 중...' : '미션 시작'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward Modal */}
      <AnimatePresence>
        {showReward && rewardData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowReward(false)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-4">미션 성공!</h2>

                {rewardData.type === 'points' ? (
                  <div className="bg-white/20 rounded-xl p-6 mb-6">
                    <p className="text-white text-lg mb-2">보상</p>
                    <p className="text-5xl font-bold text-white">
                      {rewardData.value.toLocaleString()}P
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/20 rounded-xl p-6 mb-6">
                    <p className="text-white text-lg mb-2">보상</p>
                    <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-lg overflow-hidden">
                      <img
                        src={getPlayerImageUrl(rewardData.card.player.name, rewardData.card.player.season)}
                        alt={rewardData.card.player.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-player.png';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/80 rounded-full px-3 py-1">
                        <span className="text-yellow-400 font-bold">
                          {rewardData.card.player.overall}
                        </span>
                      </div>
                      {rewardData.card.level > 0 && (
                        <div className="absolute top-2 right-2 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            +{rewardData.card.level}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                        <p className="text-white font-bold">{rewardData.card.player.name}</p>
                        <p className="text-gray-300 text-sm">{rewardData.card.player.team}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowReward(false)}
                  className="w-full bg-white text-orange-600 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
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
