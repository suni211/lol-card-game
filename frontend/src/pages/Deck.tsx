import { useState, useEffect, useMemo } from 'react';
import { Save, Info, Target, Users, Map, X, Eye, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { getPlayerImageUrl, getTeamLogoUrl, getSeriesLogo } from '../utils/playerImage';
import { calculateEnhancementBonus, getTierColor as getTierColorHelper, getPositionColor as getPositionColorHelper } from '../utils/cardHelpers';
import { getActiveCoachBuff, calculateTotalOverall } from '../utils/coachBuffs';

const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

interface Player {
  id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  region: string;
  tier: string;
  season?: string;
  imageUrl?: string;
  salary?: number;
  // 기존 4개 스탯
  laning?: number;
  teamfight?: number;
  macro?: number;
  mental?: number;
  // 8개 세부 스탯
  cs_ability?: number;
  lane_pressure?: number;
  damage_dealing?: number;
  survivability?: number;
  objective_control?: number;
  vision_control?: number;
  decision_making?: number;
  consistency?: number;
  // 특성
  trait1?: string;
  trait2?: string;
  trait3?: string;
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
  { value: 'SAFE', label: '안전한', description: '안정적인 성장으로 후반 대비', counters: ['PUSH'], weakTo: ['AGGRESSIVE'] },
  { value: 'TRADE', label: '트레이딩', description: '짧은 교환으로 체력 우위 확보', counters: ['SAFE'], weakTo: ['AGGRESSIVE'] },
  { value: 'AGGRESSIVE', label: '공격적', description: '적극적인 라인전으로 초반 우위 확보', counters: ['TRADE'], weakTo: ['PUSH'] },
  { value: 'PUSH', label: '푸쉬', description: '지속적인 라인 푸쉬로 타워 압박', counters: ['AGGRESSIVE'], weakTo: ['SAFE'] },
];

const TEAMFIGHT_STRATEGIES = [
  { value: 'ENGAGE', label: '이니시에이팅', description: '적극적인 교전 시작', counters: ['POKE'], weakTo: ['PROTECT'] },
  { value: 'POKE', label: '포킹', description: '원거리 견제로 상대 소모', counters: ['PROTECT'], weakTo: ['ENGAGE'] },
  { value: 'PICK', label: '픽', description: '고립된 적 척살', counters: ['ENGAGE'], weakTo: ['POKE'] },
  { value: 'PROTECT', label: '보호', description: '캐리 보호 중심의 플레이', counters: ['PICK'], weakTo: ['POKE'] },
];

const MACRO_STRATEGIES = [
  { value: 'OBJECTIVE', label: '오브젝트', description: '드래곤/바론 등 중요 목표 확보', counters: ['SPLIT'], weakTo: ['VISION'] },
  { value: 'SPLIT', label: '스플릿', description: '1-4 스플릿 푸쉬 운영', counters: ['VISION'], weakTo: ['OBJECTIVE'] },
  { value: 'VISION', label: '시야', description: '맵 장악 및 시야 싸움', counters: ['TEMPO'], weakTo: ['SPLIT'] },
  { value: 'TEMPO', label: '템포', description: '빠른 라인 이동으로 압박', counters: ['OBJECTIVE'], weakTo: ['VISION'] },
];

// Normalize team name (SKT and T1 are treated as same team, ROX and ROX Tigers and HLE are same team)
const normalizeTeamName = (team: string): string => {
  if (!team) return '';
  const upperTeam = team.toUpperCase();

  // SKT, T1 통합
  if (upperTeam === 'SKT' || upperTeam === 'T1') return 'T1';

  // ROX, ROX Tigers, HLE 통합
  if (upperTeam === 'ROX' || upperTeam === 'ROX TIGERS' || upperTeam === 'HLE') return 'HLE';

  return team;
};

// Calculate team synergy
const calculateTeamSynergy = (slots: DeckSlot[]) => {
  const teams: { [key: string]: number } = {};
  let totalPower = 0;

  slots.forEach(slot => {
    if (slot.card) {
      const power = slot.card.player.overall + slot.card.level;
      totalPower += power;

      // Debug: Log team info
      console.log(`[Synergy Debug] ${slot.card.player.name}: team="${slot.card.player.team}"`);

      // Check if team field contains multiple teams (comma-separated)
      if (slot.card.player.team && slot.card.player.team.includes(',')) {
        // Multiple teams (e.g., ICON Peanut with "T1,HLE,NS,GEN,LGD")
        const multipleTeams = slot.card.player.team.split(',').map(t => t.trim());
        console.log(`[Synergy Debug] Multiple teams detected:`, multipleTeams);
        multipleTeams.forEach(team => {
          const synergyTeam = normalizeTeamName(team);
          teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
        });
      } else {
        // Single team
        const synergyTeam = normalizeTeamName(slot.card.player.team);
        teams[synergyTeam] = (teams[synergyTeam] || 0) + 1;
      }
    }
  });

  let synergyBonus = 0;
  const synergyDetails: { team: string; count: number; bonus: number }[] = [];

  Object.entries(teams).forEach(([team, count]) => {
    let bonus = 0;
    if (count === 5) bonus = 5;
    else if (count === 4) bonus = 3;
    else if (count === 3) bonus = 1;

    if (bonus > 0) {
      synergyBonus += bonus;
      synergyDetails.push({ team, count, bonus });
    }
  });

  // Special synergies
  const names = slots.filter(s => s.card).map(s => s.card!.player.name);

  // 17SSG의 귀환
  const ssgPlayers = ['17SSG CuVee', '17SSG Ambition', '17SSG Crown', '17SSG Ruler', '17SSG CoreJJ'];
  if (ssgPlayers.every(name => names.includes(name))) {
    synergyBonus += 3;
    synergyDetails.push({ team: '17SSG의 귀환', count: 5, bonus: 3 });
  }

  // 25 도오페구케 우승
  const t1ChampPlayers = ['Zeus', 'Oner', 'Faker', 'Gumayusi', 'Keria'];
  const hasT1ChampSynergy = t1ChampPlayers.every(name => {
    const slot = slots.find(s => s.card && s.card.player.name === name);
    return slot && slot.card!.player.season === '25';
  });
  if (hasT1ChampSynergy) {
    synergyBonus += 2;
    synergyDetails.push({ team: '25 도오페구케 우승', count: 5, bonus: 2 });
  }

  // 대한민국 국가대표
  const hasZeus = names.includes('Zeus');
  const hasJungler = names.includes('Canyon') || names.includes('Oner');
  const hasMid = names.includes('Chovy') || names.includes('Faker');
  const hasRuler = names.includes('Ruler');
  const hasKeria = names.includes('Keria');
  if (hasZeus && hasJungler && hasMid && hasRuler && hasKeria) {
    synergyBonus += 1;
    synergyDetails.push({ team: '대한민국 국가대표', count: 5, bonus: 1 });
  }

  // 2019 G2 GOLDEN ROAD CLOSE
  const g2Players = ['Wunder', 'Jankos', 'Caps', 'Perkz', 'Mikyx'];
  const hasG2Synergy = g2Players.every(name => {
    const slot = slots.find(s => s.card && s.card.player.name === name);
    return slot && slot.card!.player.season === '19G2';
  });
  if (hasG2Synergy) {
    synergyBonus += 3;
    synergyDetails.push({ team: '19G2 GOLDEN ROAD CLOSE', count: 5, bonus: 3 });
  }

  return { totalPower, synergyBonus, synergyDetails };
};

interface EnhancementSynergy {
  bonus: number;
  tier: '1-4' | '5-7' | '8-10' | 'none';
  minLevel: number;
  description: string;
}

export default function Deck() {
  const { token } = useAuthStore();
  const [currentDeckSlot, setCurrentDeckSlot] = useState(1); // 현재 활성 덱 슬롯 (1-5)
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
  const [detailCard, setDetailCard] = useState<UserCard | null>(null);
  const [enhancementSynergy, setEnhancementSynergy] = useState<EnhancementSynergy>({
    bonus: 0,
    tier: 'none',
    minLevel: 0,
    description: '강화 시너지 없음',
  });
  const [coachBuff, setCoachBuff] = useState<any>(null);

  const { totalPower, synergyBonus, synergyDetails } = calculateTeamSynergy(deckSlots);

  // Helper function to calculate card OVR with position penalty
  const calculateCardOVR = (card: UserCard, _position: string) => {
    const enhancementBonus = calculateEnhancementBonus(card.level);
    const cardData = {
      position: card.player.position,
      team: card.player.team,
      overall: card.player.overall,
      level: card.level
    };
    const baseStat = calculateTotalOverall(card.player.overall, enhancementBonus, cardData, coachBuff);
    return baseStat;
  };

  // 필터링 및 정렬된 카드 목록을 미리 계산 (성능 최적화)
  const filteredAndSortedCards = useMemo(() => {
    if (!selectedPosition) return [];

    return myCards
      .filter((card) => !deckSlots.some((slot) =>
        slot.position !== selectedPosition &&
        (slot.card?.id === card.id ||
          slot.card?.player.name.normalize('NFKC').trim().toLocaleLowerCase() ===
          card.player.name.normalize('NFKC').trim().toLocaleLowerCase())
      ))
      .filter((card) => seasonFilter === 'ALL' || card.player.season === seasonFilter)
      .sort((a, b) => {
        // 포지션 매치 우선, 그 다음 OVR 높은 순
        const aMatch = a.player.position === selectedPosition;
        const bMatch = b.player.position === selectedPosition;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return calculateCardOVR(b, selectedPosition) - calculateCardOVR(a, selectedPosition);
      });
  }, [myCards, selectedPosition, deckSlots, seasonFilter]);

  // Calculate total salary
  const totalSalary = useMemo(() => {
    return deckSlots.reduce((sum, slot) => {
      return sum + (slot.card?.player?.salary || 0);
    }, 0);
  }, [deckSlots]);

  const SALARY_CAP = 115;
  const isOverSalaryCap = totalSalary > SALARY_CAP;

  useEffect(() => {
    fetchMyCards();
    fetchCoachBuff();
  }, []);

  // 덱 슬롯 변경 시 해당 슬롯의 덱 로드
  useEffect(() => {
    if (myCards.length > 0) {
      fetchDeckBySlot(currentDeckSlot);
    }
  }, [currentDeckSlot, myCards]);

  const fetchMyCards = async () => {
    try {
      setLoading(true);
      const cardsRes = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cardsRes.data.success) {
        setMyCards(cardsRes.data.data);
      }
    } catch (error: any) {
      console.error('Fetch cards error:', error);
      toast.error('카드 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeckBySlot = async (slot: number) => {
    try {
      const deckRes = await axios.get(`${API_URL}/deck/${slot}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deckRes.data.success && deckRes.data.data) {
        const deck = deckRes.data.data;

        setDeckSlots((prev) =>
          prev.map((slotItem) => {
            const posKey = slotItem.position.toLowerCase();
            const cardData = deck[posKey];

            if (cardData) {
              const fullCard = myCards.find((c: UserCard) => c.id === cardData.id);
              return { ...slotItem, card: fullCard || null };
            }
            return { ...slotItem, card: null };
          })
        );

        setLaningStrategy(deck.laningStrategy || 'SAFE');
        setTeamfightStrategy(deck.teamfightStrategy || 'ENGAGE');
        setMacroStrategy(deck.macroStrategy || 'OBJECTIVE');

        if (deck.enhancementSynergy) {
          setEnhancementSynergy(deck.enhancementSynergy);
        } else {
          setEnhancementSynergy({
            bonus: 0,
            tier: 'none',
            minLevel: 0,
            description: '강화 시너지 없음',
          });
        }
      } else {
        // 덱이 없는 경우 초기화
        setDeckSlots([
          { position: 'TOP', label: '탑', card: null },
          { position: 'JUNGLE', label: '정글', card: null },
          { position: 'MID', label: '미드', card: null },
          { position: 'ADC', label: '원딜', card: null },
          { position: 'SUPPORT', label: '서폿', card: null },
        ]);
        setLaningStrategy('SAFE');
        setTeamfightStrategy('ENGAGE');
        setMacroStrategy('OBJECTIVE');
        setEnhancementSynergy({
          bonus: 0,
          tier: 'none',
          minLevel: 0,
          description: '강화 시너지 없음',
        });
      }
    } catch (error: any) {
      console.error('Fetch deck error:', error);
    }
  };

  const fetchCoachBuff = async () => {
    if (!token) return;
    const buff = await getActiveCoachBuff(token);
    setCoachBuff(buff);
  };


  const handleSlotClick = (position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT') => {
    setSelectedPosition(position);
  };

  const handleCardSelect = (card: UserCard) => {
    if (!selectedPosition) return;

    const duplicatePlayer = deckSlots.some((slot) =>
      slot.position !== selectedPosition && slot.card &&
      (slot.card.id === card.id ||
       slot.card.player.name.normalize('NFKC').trim().toLocaleLowerCase() ===
       card.player.name.normalize('NFKC').trim().toLocaleLowerCase())
    );
    if (duplicatePlayer) {
      toast.error('같은 선수는 클래스·강화 등급이 달라도 한 덱에 1장만 편성할 수 있습니다.');
      return;
    }

    setDeckSlots((prev) =>
      prev.map((slot) =>
        slot.position === selectedPosition ? { ...slot, card } : slot
      )
    );

    setDetailCard(null);
    setSelectedPosition(null);
  };

  const handleCardClick = (card: UserCard) => {
    // Show detail modal
    setDetailCard(card);
  };

  const handleRemoveCard = (position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT') => {
    setDeckSlots((prev) =>
      prev.map((slot) =>
        slot.position === position ? { ...slot, card: null } : slot
      )
    );
  };

  const handleSaveDeck = async () => {
    const names=deckSlots.filter(s=>s.card).map(s=>s.card!.player.name.normalize('NFKC').trim().toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error('동일 선수를 한 덱에 2장 이상 저장할 수 없습니다.');
      return;
    }
    try {
      setSaving(true);

      const payload = {
        deckSlot: currentDeckSlot, // 현재 활성 덱 슬롯 지정
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
        toast.success(`덱 ${currentDeckSlot}이(가) 저장되었습니다!`);
      }
    } catch (error: any) {
      console.error('Save deck error:', error);
      toast.error(error.response?.data?.error || (error.response?.status === 500 ? '서버 덱 저장 오류입니다. 데이터베이스 컬럼 및 서버 로그를 확인하세요.' : '덱 저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const getTierColor = getTierColorHelper;
  const getPositionColor = getPositionColorHelper;

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

  const filledSlots = deckSlots.filter(s => s.card).length;

  return (
    <div className="min-h-screen relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:via-purple-900/20 dark:to-gray-900 bg-[length:200%_200%]"
      />

      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute text-primary-500/20 dark:text-primary-400/20 text-xl"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: 0,
          }}
        >
          ⭐
        </div>
      ))}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-2"
              >
                덱 편성
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                최강의 5인 로스터와 전략을 구성하세요
              </p>
              {/* Salary Display */}
              <div className={`mt-3 px-4 py-2 rounded-lg inline-block ${
                isOverSalaryCap
                  ? 'bg-red-100 dark:bg-red-900/30 border border-red-500'
                  : totalSalary >= SALARY_CAP * 0.9
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500'
                  : 'bg-green-100 dark:bg-green-900/30 border border-green-500'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${
                    isOverSalaryCap
                      ? 'text-red-700 dark:text-red-300'
                      : totalSalary >= SALARY_CAP * 0.9
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    급여: {totalSalary}/{SALARY_CAP}
                  </span>
                  {isOverSalaryCap && (
                    <span className="text-sm text-red-600 dark:text-red-400">
                      (한도 초과!)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveDeck}
              disabled={saving}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? '저장 중...' : '덱 저장'}
            </button>
          </div>

          {/* Deck Slot Selection */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">덱 슬롯 선택</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((slot) => (
                <button
                  key={slot}
                  onClick={() => setCurrentDeckSlot(slot)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    currentDeckSlot === slot
                      ? 'bg-primary-600 text-white shadow-lg scale-105'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  덱 {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Deck Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 파워</p>
                <p
                  key={totalPower}
                  className="text-3xl font-black bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400 bg-clip-text text-transparent"
                >
                  {totalPower}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">팀 시너지</p>
                <p
                  key={synergyBonus}
                  className="text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent"
                >
                  +{synergyBonus}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">강화 시너지</p>
                <p
                  key={enhancementSynergy.bonus}
                  className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent"
                >
                  +{enhancementSynergy.bonus}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">최종 파워</p>
                <p
                  key={totalPower + synergyBonus + enhancementSynergy.bonus}
                  className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent"
                >
                  {totalPower + synergyBonus + enhancementSynergy.bonus}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">덱 완성도</p>
                <p
                  key={filledSlots}
                  className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
                >
                  {filledSlots}/5
                </p>
              </div>
            </div>
          </div>

          {/* Team Synergy Details */}
          {synergyDetails.length > 0 && (
            <div
              className="mt-4 relative overflow-hidden rounded-xl p-4 shadow-lg"
            >
              {/* Animated gradient background */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-yellow-900/30 bg-[length:200%_100%]"
              />
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <div
                  >
                    <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="font-bold text-yellow-800 dark:text-yellow-200">팀 시너지 활성</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {synergyDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border-2 border-yellow-400 dark:border-yellow-600 shadow-md"
                    >
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{detail.team}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                        ({detail.count}명 = +{detail.bonus})
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 font-medium">
                  💡 같은 팀 3명 = +1 OVR, 4명 = +2 OVR, 5명 = +3 OVR 보너스
                </p>
              </div>
            </div>
          )}

          {/* Enhancement Synergy Details */}
          {enhancementSynergy.tier !== 'none' && (
            <div
              className="mt-4 relative overflow-hidden rounded-xl p-4 shadow-lg"
            >
              {/* Animated gradient background */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-orange-100 via-red-100 to-orange-100 dark:from-orange-900/30 dark:via-red-900/30 dark:to-orange-900/30 bg-[length:200%_100%]"
              />
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <div>
                    <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="font-bold text-orange-800 dark:text-orange-200">강화 시너지 활성</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border-2 border-orange-400 dark:border-orange-600 shadow-md">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{enhancementSynergy.tier}강</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                      (최소 +{enhancementSynergy.minLevel} = +{enhancementSynergy.bonus})
                    </span>
                  </div>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-2 font-medium">
                  🔥 {enhancementSynergy.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8"
        >
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>• 각 포지션을 클릭하여 카드를 선택하세요</p>
              <p>• 선수 카드 5장만 채우면 포지션이 달라도 AI 매치에 참가할 수 있습니다</p>
              <p>• 전략을 선택하면 경기에서 보너스를 받을 수 있습니다</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deck Slots */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-6"
                >
                  카드 구성
                </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deckSlots.map((slot) => (
                  <div
                    key={slot.position}
                    onClick={() => handleSlotClick(slot.position)}
                    className={`relative p-4 md:p-4 rounded-xl border-2 transition-all cursor-pointer active:scale-95 min-h-[120px] md:min-h-auto ${
                      selectedPosition === slot.position
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
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
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex gap-3">
                        {/* Player Face */}
                        <img
                          src={getPlayerImageUrl(slot.card.player.name, slot.card.player.season, slot.card.player.tier, slot.card.player.imageUrl)}
                          alt={slot.card.player.name}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/players/placeholder.png';
                          }}
                        />

                        {/* Card Info */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex items-center gap-2">
                            <img src={getSeriesLogo(slot.card.player.season)} alt={slot.card.player.season || '26'}
                              className="w-14 h-5 object-contain" />
                            <img src={getTeamLogoUrl(slot.card.player.team)} alt={slot.card.player.team + ' 로고'}
                              className="w-6 h-6 object-contain" onError={e => {e.currentTarget.style.display='none';}} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`inline-block px-2 py-1 bg-gradient-to-r ${getTierColor(slot.card.player.tier)} rounded text-white text-xs font-bold`}>
                                {slot.card.player.tier}
                              </div>
                              {slot.card.level > 0 && (
                                <div className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded text-white text-xs font-bold">
                                  +{slot.card.level}
                                </div>
                              )}
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
                                포지션 자유
                              </span>
                            )}
                          </div>
                          {coachBuff && (() => {
                            const enhancementBonus = calculateEnhancementBonus(slot.card.level);
                            const baseWithEnhancement = slot.card.player.overall + enhancementBonus;
                            const cardData = { position: slot.card.player.position, team: slot.card.player.team, overall: slot.card.player.overall, level: slot.card.level };
                            const totalWithCoach = calculateTotalOverall(slot.card.player.overall, enhancementBonus, cardData, coachBuff);
                            const coachBonus = totalWithCoach - baseWithEnhancement;
                            if (coachBonus > 0) {
                              return (
                                <div className="mt-1 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-0.5">
                                  <Sparkles className="w-3 h-3 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">코치 +{coachBonus}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="mt-2 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-1">
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">급여</span>
                            <span className="text-sm font-bold text-green-900 dark:text-green-100">{slot.card.player.salary || 5}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          카드를 선택하세요
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* Strategies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2
                  className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-400 dark:via-pink-400 dark:to-red-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-6"
                >
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
          </div>

          {/* Card Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-4">
              <div className="p-6">
                <h2
                  className="text-xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 dark:from-yellow-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-4"
                >
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
                <>
                  {/* 빠른 선택 버튼 */}
                  <button
                    onClick={() => {
                      const positionCards = filteredAndSortedCards.filter((card) => card.player.position === selectedPosition);

                      if (positionCards.length > 0) {
                        handleCardSelect(positionCards[0]); // 이미 정렬되어 있어서 첫번째가 최고
                      } else {
                        toast.error('해당 포지션에 사용 가능한 카드가 없습니다');
                      }
                    }}
                    className="w-full mb-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    최고 카드 자동 선택
                  </button>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredAndSortedCards.map((card) => {
                      const positionMatch = card.player.position === selectedPosition;
                      const displayOVR = calculateCardOVR(card, selectedPosition);

                      return (
                        <div
                          key={card.id}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            !positionMatch
                              ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                          }`}
                        >
                          <div className="flex gap-3">
                            {/* Player Image */}
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                              <img
                                src={getPlayerImageUrl(card.player.name, card.player.season, card.player.tier, card.player.imageUrl)}
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
                                    포지션 자유
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-0.5">
                                <span className="text-xs font-semibold text-green-700 dark:text-green-300">급여</span>
                                <span className="text-xs font-bold text-green-900 dark:text-green-100">{card.player.salary || 5}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons - 모바일 친화적 크기 */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(card);
                              }}
                              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 active:scale-95 min-h-[44px]"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">자세히</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardSelect(card);
                              }}
                              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold transition-colors active:scale-95 shadow-md min-h-[44px]"
                            >
                              선택
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {myCards.filter((card) => !deckSlots.some((s) => s.card?.id === card.id)).length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      사용 가능한 카드가 없습니다
                    </p>
                  )}
                  </div>
                </>
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

      {/* Player Detail Modal */}
      {detailCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailCard(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4 flex-1">
                <img
                  src={getPlayerImageUrl(detailCard.player.name, detailCard.player.season, detailCard.player.tier, detailCard.player.imageUrl)}
                  alt={detailCard.player.name}
                  className="w-24 h-24 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/players/placeholder.png';
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`inline-block px-3 py-1 bg-gradient-to-r ${getTierColor(detailCard.player.tier)} rounded text-white text-sm font-bold`}>
                      {detailCard.player.tier}
                    </div>
                    <div className={`inline-block px-3 py-1 ${getPositionColor(detailCard.player.position)} rounded text-white text-sm font-bold`}>
                      {detailCard.player.position}
                    </div>
                    {detailCard.level > 0 && (
                      <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded text-white text-sm font-bold">
                        +{detailCard.level}
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {detailCard.player.name}
                    {detailCard.player.season && (
                      <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-sm font-semibold">
                        {detailCard.player.season}
                      </span>
                    )}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {detailCard.player.team} • {detailCard.player.region}
                  </p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                    {(() => {
                      const enhancementBonus = calculateEnhancementBonus(detailCard.level);
                      const cardData = { position: detailCard.player.position, team: detailCard.player.team, overall: detailCard.player.overall, level: detailCard.level };
                      return calculateTotalOverall(detailCard.player.overall, enhancementBonus, cardData, coachBuff);
                    })()} OVR
                  </p>
                  {coachBuff && (() => {
                    const enhancementBonus = calculateEnhancementBonus(detailCard.level);
                    const baseWithEnhancement = detailCard.player.overall + enhancementBonus;
                    const cardData = { position: detailCard.player.position, team: detailCard.player.team, overall: detailCard.player.overall, level: detailCard.level };
                    const totalWithCoach = calculateTotalOverall(detailCard.player.overall, enhancementBonus, cardData, coachBuff);
                    const coachBonus = totalWithCoach - baseWithEnhancement;
                    if (coachBonus > 0) {
                      return (
                        <div className="mt-2 inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg px-3 py-1">
                          <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-semibold text-green-700 dark:text-green-300">코치 버프 +{coachBonus}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <button
                onClick={() => setDetailCard(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">세부 스탯</h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatBar label="CS 능력" value={(detailCard.player.cs_ability || 50) + calculateEnhancementBonus(detailCard.level)} color="blue" />
                  <StatBar label="라인 압박" value={(detailCard.player.lane_pressure || 50) + calculateEnhancementBonus(detailCard.level)} color="red" />
                  <StatBar label="딜량" value={(detailCard.player.damage_dealing || 50) + calculateEnhancementBonus(detailCard.level)} color="purple" />
                  <StatBar label="생존력" value={(detailCard.player.survivability || 50) + calculateEnhancementBonus(detailCard.level)} color="green" />
                  <StatBar label="오브젝트" value={(detailCard.player.objective_control || 50) + calculateEnhancementBonus(detailCard.level)} color="yellow" />
                  <StatBar label="시야 장악" value={(detailCard.player.vision_control || 50) + calculateEnhancementBonus(detailCard.level)} color="indigo" />
                  <StatBar label="판단력" value={(detailCard.player.decision_making || 50) + calculateEnhancementBonus(detailCard.level)} color="pink" />
                  <StatBar label="안정성" value={(detailCard.player.consistency || 50) + calculateEnhancementBonus(detailCard.level)} color="teal" />
                </div>
              </div>

              {/* Traits */}
              {(detailCard.player.trait1 || detailCard.player.trait2 || detailCard.player.trait3) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">특성</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailCard.player.trait1 && (
                      <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md">
                        {detailCard.player.trait1}
                      </div>
                    )}
                    {detailCard.player.trait2 && (
                      <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium shadow-md">
                        {detailCard.player.trait2}
                      </div>
                    )}
                    {detailCard.player.trait3 && (
                      <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium shadow-md">
                        {detailCard.player.trait3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDetailCard(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  닫기
                </button>
                {selectedPosition && !deckSlots.some((s) => s.card?.id === detailCard.id) && (
                  <button
                    onClick={() => handleCardSelect(detailCard)}
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                  >
                    이 카드 선택
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Bar Component
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
  };

  // Stats are on a 0-200 scale, convert to percentage for display
  const percentage = Math.min(100, (value / 200) * 100);

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color] || 'bg-gray-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
