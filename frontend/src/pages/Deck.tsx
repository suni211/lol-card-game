import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Info, Target, Users, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { getPlayerImageUrl } from '../utils/playerImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Player {
  id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  region: string;
  tier: string;
  season?: string;
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

const LANING_STRATEGIES = [
  { value: 'AGGRESSIVE', label: '공격적', description: '적극적인 라인전으로 초반 우위 확보', counters: ['SAFE'], weakTo: ['SCALING'] },
  { value: 'SAFE', label: '안전한', description: '안정적인 성장으로 후반 대비', counters: ['PUSH'], weakTo: ['AGGRESSIVE'] },
  { value: 'ROAMING', label: '로밍', description: '라인을 빠르게 밀고 다른 라인 지원', counters: ['SCALING'], weakTo: ['PUSH'] },
  { value: 'SCALING', label: '성장', description: '극후반 캐리를 위한 성장 집중', counters: ['AGGRESSIVE'], weakTo: ['ROAMING'] },
  { value: 'PUSH', label: '푸쉬', description: '지속적인 라인 푸쉬로 타워 압박', counters: ['ROAMING'], weakTo: ['SAFE'] },
  { value: 'FREEZE', label: '프리징', description: '라인 프리징으로 상대 성장 차단', counters: ['PUSH'], weakTo: ['ROAMING'] },
  { value: 'TRADE', label: '트레이딩', description: '짧은 교환으로 체력 우위 확보', counters: ['SCALING'], weakTo: ['ALLKILL'] },
  { value: 'ALLKILL', label: '올킬', description: '킬 각 노리는 초공격적 라인전', counters: ['TRADE'], weakTo: ['SAFE'] },
];

const TEAMFIGHT_STRATEGIES = [
  { value: 'ENGAGE', label: '이니시에이팅', description: '적극적인 교전 시작', counters: ['POKE'], weakTo: ['DISENGAGE'] },
  { value: 'DISENGAGE', label: '디스인게이지', description: '불리한 교전 회피 및 역관광', counters: ['ENGAGE'], weakTo: ['POKE'] },
  { value: 'POKE', label: '포킹', description: '원거리 견제로 상대 소모', counters: ['DISENGAGE'], weakTo: ['ENGAGE'] },
  { value: 'PROTECT', label: '보호', description: '캐리 보호 중심의 플레이', counters: ['DIVE'], weakTo: ['POKE'] },
  { value: 'SPLIT', label: '분산', description: '다수의 라인에서 동시 압박', counters: ['PROTECT'], weakTo: ['ENGAGE'] },
  { value: 'FLANK', label: '측면', description: '측후방에서 기습 진입', counters: ['PROTECT'], weakTo: ['KITE'] },
  { value: 'KITE', label: '카이팅', description: '뒤로 빠지며 지속 딜', counters: ['ENGAGE'], weakTo: ['FLANK'] },
  { value: 'DIVE', label: '다이브', description: '백라인 강습', counters: ['KITE'], weakTo: ['PROTECT'] },
];

const MACRO_STRATEGIES = [
  { value: 'OBJECTIVE', label: '오브젝트', description: '드래곤/바론 등 중요 목표 확보', counters: ['SPLITPUSH'], weakTo: ['PICK'] },
  { value: 'VISION', label: '시야', description: '맵 장악 및 시야 싸움', counters: ['PICK'], weakTo: ['SPLITPUSH'] },
  { value: 'SPLITPUSH', label: '스플릿', description: '1-4 스플릿 푸쉬 운영', counters: ['GROUPING'], weakTo: ['OBJECTIVE'] },
  { value: 'GROUPING', label: '그룹핑', description: '5인 뭉쳐서 한 방향 압박', counters: ['VISION'], weakTo: ['SPLITPUSH'] },
  { value: 'PICK', label: '픽', description: '고립된 적 척살', counters: ['OBJECTIVE'], weakTo: ['VISION'] },
  { value: 'SIEGE', label: '시즈', description: '포위 후 타워 철거', counters: ['GROUPING'], weakTo: ['ROTATION'] },
  { value: 'ROTATION', label: '로테이션', description: '빠른 라인 이동으로 압박', counters: ['SIEGE'], weakTo: ['CONTROL'] },
  { value: 'CONTROL', label: '컨트롤', description: '정글 및 중립 지역 장악', counters: ['ROTATION'], weakTo: ['GROUPING'] },
];

export default function Deck() {
  const { token } = useAuthStore();
  const [deckSlots, setDeckSlots] = useState<DeckSlot[]>([
    { position: 'TOP', label: '탑', card: null },
    { position: 'JUNGLE', label: '정글', card: null },
    { position: 'MID', label: '미드', card: null },
    { position: 'ADC', label: '원딜', card: null },
    { position: 'SUPPORT', label: '서폿', card: null },
  ]);
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT' | null>(null);
  const [laningStrategy, setLaningStrategy] = useState('SAFE');
  const [teamfightStrategy, setTeamfightStrategy] = useState('ENGAGE');
  const [macroStrategy, setMacroStrategy] = useState('OBJECTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchDeckAndCards();
  }, []);

  const fetchDeckAndCards = async () => {
    try {
      setLoading(true);

      const cardsRes = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cardsRes.data.success) {
        setMyCards(cardsRes.data.data);
      }

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
              const fullCard = cardsRes.data.data.find((c: UserCard) => c.id === cardData.id);
              return { ...slot, card: fullCard || null };
            }
            return slot;
          })
        );

        setLaningStrategy(deck.laningStrategy || 'SAFE');
        setTeamfightStrategy(deck.teamfightStrategy || 'ENGAGE');
        setMacroStrategy(deck.macroStrategy || 'OBJECTIVE');
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
        laningStrategy,
        teamfightStrategy,
        macroStrategy,
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

  const calculateCardOVR = (card: UserCard, position: string) => {
    const baseStat = card.player.overall;
    const positionMatch = card.player.position === position;
    return positionMatch ? baseStat : baseStat - 10;
  };

  const calculateTotalOVR = () => {
    return deckSlots.reduce((total, slot) => {
      if (!slot.card) return total;
      return total + calculateCardOVR(slot.card, slot.position);
    }, 0);
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

  const totalOVR = calculateTotalOVR();
  const filledSlots = deckSlots.filter(s => s.card).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                덱 편성
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                최강의 5인 로스터와 전략을 구성하세요
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

          {/* Deck Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 OVR</p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{totalOVR}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">평균 OVR</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {filledSlots > 0 ? Math.round(totalOVR / filledSlots) : 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">덱 완성도</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{filledSlots}/5</p>
            </div>
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
              <p>• 잘못된 포지션에 배치하면 **OVR -10 페널티**가 적용됩니다</p>
              <p>• 전략을 선택하면 경기에서 보너스를 받을 수 있습니다</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deck Slots */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                카드 구성
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
                      <span className={`${getPositionColor(slot.position)} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                        {slot.label}
                      </span>
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
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 h-40 flex flex-col justify-between">
                        <div>
                          <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(slot.card.player.tier)} rounded text-white text-xs font-bold mb-2`}>
                            {slot.card.player.tier}
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                            {slot.card.player.name}
                            {slot.card.player.season && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold">
                                {slot.card.player.season}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {slot.card.player.team} • {slot.card.player.position}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-2xl font-bold ${slot.card.player.position === slot.position ? 'text-primary-600 dark:text-primary-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {calculateCardOVR(slot.card, slot.position)} OVR
                          </p>
                          {slot.card.player.position !== slot.position && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                              -10 페널티
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          카드를 선택하세요
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Strategies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                전략 선택
              </h2>

              <div className="space-y-6">
                {/* Laning Strategy */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">라인전 전략</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {LANING_STRATEGIES.map((strategy) => (
                      <button
                        key={strategy.value}
                        onClick={() => setLaningStrategy(strategy.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          laningStrategy === strategy.value
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                        }`}
                        title={strategy.description}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{strategy.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {LANING_STRATEGIES.find(s => s.value === laningStrategy)?.description}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-green-600 dark:text-green-400 font-bold">카운터: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {LANING_STRATEGIES.find(s => s.value === laningStrategy)?.counters.map(c =>
                            LANING_STRATEGIES.find(s => s.value === c)?.label
                          ).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400 font-bold">약점: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {LANING_STRATEGIES.find(s => s.value === laningStrategy)?.weakTo.map(w =>
                            LANING_STRATEGIES.find(s => s.value === w)?.label
                          ).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teamfight Strategy */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">한타 전략</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TEAMFIGHT_STRATEGIES.map((strategy) => (
                      <button
                        key={strategy.value}
                        onClick={() => setTeamfightStrategy(strategy.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          teamfightStrategy === strategy.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                        title={strategy.description}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{strategy.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {TEAMFIGHT_STRATEGIES.find(s => s.value === teamfightStrategy)?.description}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-green-600 dark:text-green-400 font-bold">카운터: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {TEAMFIGHT_STRATEGIES.find(s => s.value === teamfightStrategy)?.counters.map(c =>
                            TEAMFIGHT_STRATEGIES.find(s => s.value === c)?.label
                          ).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400 font-bold">약점: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {TEAMFIGHT_STRATEGIES.find(s => s.value === teamfightStrategy)?.weakTo.map(w =>
                            TEAMFIGHT_STRATEGIES.find(s => s.value === w)?.label
                          ).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Macro Strategy */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Map className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">운영 전략</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {MACRO_STRATEGIES.map((strategy) => (
                      <button
                        key={strategy.value}
                        onClick={() => setMacroStrategy(strategy.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          macroStrategy === strategy.value
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                        }`}
                        title={strategy.description}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{strategy.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {MACRO_STRATEGIES.find(s => s.value === macroStrategy)?.description}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-green-600 dark:text-green-400 font-bold">카운터: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {MACRO_STRATEGIES.find(s => s.value === macroStrategy)?.counters.map(c =>
                            MACRO_STRATEGIES.find(s => s.value === c)?.label
                          ).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400 font-bold">약점: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {MACRO_STRATEGIES.find(s => s.value === macroStrategy)?.weakTo.map(w =>
                            MACRO_STRATEGIES.find(s => s.value === w)?.label
                          ).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedPosition ? `${deckSlots.find(s => s.position === selectedPosition)?.label} 선택` : '내 카드'}
              </h2>

              {/* Season Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  시즌 필터
                </label>
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">전체</option>
                  {Array.from(new Set(myCards.map(card => card.player.season).filter(Boolean))).sort().reverse().map((season) => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>

              {selectedPosition ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {myCards
                    .filter((card) => !deckSlots.some((s) => s.card?.id === card.id))
                    .filter((card) => seasonFilter === 'ALL' || card.player.season === seasonFilter)
                    .map((card) => {
                      const positionMatch = card.player.position === selectedPosition;
                      const displayOVR = calculateCardOVR(card, selectedPosition);

                      return (
                        <motion.div
                          key={card.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleCardSelect(card)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            !positionMatch
                              ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                          }`}
                        >
                          <div className="flex gap-3">
                            {/* Player Image */}
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                              <img
                                src={getPlayerImageUrl(card.player.name)}
                                alt={card.player.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.fallback-text')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-text text-2xl font-bold text-gray-400 dark:text-gray-500';
                                    fallback.textContent = card.player.name[0];
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            </div>

                            {/* Card Info */}
                            <div className="flex-1 min-w-0">
                              <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(card.player.tier)} rounded text-white text-xs font-bold mb-1`}>
                                {card.player.tier}
                              </div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                {card.player.name}
                                {card.player.season && (
                                  <span className="ml-1 px-1 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold">
                                    {card.player.season}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {card.player.team} • {card.player.position}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className={`text-lg font-bold ${positionMatch ? 'text-primary-600 dark:text-primary-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  {displayOVR}
                                </span>
                                {!positionMatch && (
                                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    -10 페널티
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

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
