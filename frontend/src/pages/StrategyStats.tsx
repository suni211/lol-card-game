import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3, RefreshCw, Users, Search, X, ShoppingBag, Coins } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface StrategyUsage {
  strategy: string;
  usage_count: number;
  usage_percentage: number;
}

interface StrategyBalance {
  strategy_type: string;
  strategy_name: string;
  balance_modifier: number;
  usage_count: number;
  win_rate: number;
}

interface Player {
  id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  region: string;
  tier: string;
  season: string;
  cs_ability: number;
  lane_pressure: number;
  damage_dealing: number;
  survivability: number;
  objective_control: number;
  vision_control: number;
  decision_making: number;
  consistency: number;
}

interface PlayerComparison {
  player1: any;
  player2: any;
  differences: {
    overall: number;
    csAbility: number;
    lanePressure: number;
    damageDealing: number;
    survivability: number;
    objectiveControl: number;
    visionControl: number;
    decisionMaking: number;
    consistency: number;
  };
}

interface ItemStat {
  item_id: string;
  item_name: string;
  usage_count: number;
  total_gold_spent: number;
  avg_gold_spent: number;
  win_rate: number;
}

interface ItemStats {
  overall: ItemStat[];
  byPosition: Record<string, ItemStat[]>;
  recentTrends: ItemStat[];
  goldStats: {
    total_matches: number;
    total_gold_spent: number;
    avg_gold_per_item: number;
  };
  tierStats: {
    item_tier: string;
    usage_count: number;
    total_gold: number;
  }[];
}

export default function StrategyStats() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [balancing, setBalancing] = useState(false);
  const [laning, setLaning] = useState<StrategyUsage[]>([]);
  const [teamfight, setTeamfight] = useState<StrategyUsage[]>([]);
  const [macro, setMacro] = useState<StrategyUsage[]>([]);
  const [balance, setBalance] = useState<StrategyBalance[]>([]);
  const [itemStats, setItemStats] = useState<ItemStats | null>(null);
  const [showItemStats, setShowItemStats] = useState(false);

  // Player comparison states
  const [showComparison, setShowComparison] = useState(false);
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchResults1, setSearchResults1] = useState<Player[]>([]);
  const [searchResults2, setSearchResults2] = useState<Player[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<Player | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<Player | null>(null);
  const [player1Level, setPlayer1Level] = useState(0);
  const [player2Level, setPlayer2Level] = useState(0);
  const [comparison, setComparison] = useState<PlayerComparison | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching strategy stats from:', `${API_URL}/strategy-stats/usage`);
      const response = await axios.get(`${API_URL}/strategy-stats/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Response:', response.data);

      if (response.data.success) {
        setLaning(response.data.data.laning || []);
        setTeamfight(response.data.data.teamfight || []);
        setMacro(response.data.data.macro || []);
        setBalance(response.data.data.balance || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch strategy stats:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || '통계 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemStats = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/strategy-stats/item-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setItemStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch item stats:', error);
    }
  };

  const handleAutoBalance = async () => {
    if (!user?.isAdmin) {
      toast.error('관리자만 사용 가능합니다');
      return;
    }

    setBalancing(true);
    try {
      const response = await axios.post(
        `${API_URL}/strategy-stats/auto-balance`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('자동 밸런싱 완료!');
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Auto balance error:', error);
      toast.error(error.response?.data?.error || '자동 밸런싱 실패');
    } finally {
      setBalancing(false);
    }
  };

  const searchPlayers = async (query: string, playerNumber: 1 | 2) => {
    if (query.length < 2) {
      if (playerNumber === 1) setSearchResults1([]);
      else setSearchResults2([]);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/strategy-stats/search-players`, {
        params: { query },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        if (playerNumber === 1) setSearchResults1(response.data.data);
        else setSearchResults2(response.data.data);
      }
    } catch (error: any) {
      console.error('Search error:', error);
    }
  };

  const comparePlayers = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) {
      toast.error('두 선수를 모두 선택해주세요');
      return;
    }

    setComparing(true);
    try {
      const response = await axios.post(
        `${API_URL}/strategy-stats/compare-players`,
        {
          player1Id: selectedPlayer1.id,
          player2Id: selectedPlayer2.id,
          player1Level,
          player2Level,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setComparison(response.data.data);
      }
    } catch (error: any) {
      console.error('Compare error:', error);
      toast.error(error.response?.data?.error || '비교 실패');
    } finally {
      setComparing(false);
    }
  };

  const getStrategyLabel = (strategy: string): string => {
    const labels: Record<string, string> = {
      // Laning
      AGGRESSIVE: '공격적',
      SAFE: '안전',
      ROAMING: '로밍',
      SCALING: '성장',
      PUSH: '푸쉬',
      FREEZE: '프리즈',
      TRADE: '트레이드',
      ALLKILL: '올킬',
      // Teamfight
      ENGAGE: '이니시',
      DISENGAGE: '이탈',
      POKE: '포크',
      PROTECT: '보호',
      SPLIT: '분산',
      FLANK: '측면',
      KITE: '카이팅',
      DIVE: '돌진',
      // Macro
      OBJECTIVE: '오브젝트',
      VISION: '시야',
      SPLITPUSH: '스플릿',
      GROUPING: '그룹',
      PICK: '픽',
      SIEGE: '공성',
      ROTATION: '로테이션',
      CONTROL: '제어',
    };
    return labels[strategy] || strategy;
  };

  const getBalanceIcon = (modifier: number) => {
    if (modifier > 1.02) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (modifier < 0.98) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getBalanceColor = (modifier: number) => {
    if (modifier > 1.02) return 'text-green-600 dark:text-green-400';
    if (modifier < 0.98) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const renderStrategyTable = (title: string, data: StrategyUsage[], type: string) => {
    const balanceData = balance.filter((b) => b.strategy_type === type);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-semibold">
                  전략
                </th>
                <th className="text-right py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-semibold">
                  사용률
                </th>
                <th className="text-right py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-semibold">
                  승률
                </th>
                <th className="text-center py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-semibold">
                  밸런스
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const balanceItem = balanceData.find((b) => b.strategy_name === item.strategy);
                const modifier = Number(balanceItem?.balance_modifier) || 1.0;
                const winRate = Number(balanceItem?.win_rate) || 0;

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-2 sm:px-3 font-medium text-gray-900 dark:text-white">
                      {getStrategyLabel(item.strategy)}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {(Number(item.usage_percentage) || 0).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({item.usage_count || 0})
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <span
                        className={`font-semibold ${
                          winRate > 52
                            ? 'text-green-600 dark:text-green-400'
                            : winRate < 48
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {(Number(winRate) || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getBalanceIcon(modifier)}
                        <span className={`font-semibold text-sm ${getBalanceColor(modifier)}`}>
                          {(modifier * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
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
          className="text-center mb-6 sm:mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-3 sm:mb-4">
            <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
            전략 통계 및 메타
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 px-4">
            현재 가장 많이 사용되는 전략과 밸런스 상태를 확인하세요
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-center items-center gap-3"
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 text-sm sm:text-base"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>선수 비교</span>
          </button>

          <button
            onClick={() => {
              setShowItemStats(!showItemStats);
              if (!itemStats) fetchItemStats();
            }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 text-sm sm:text-base"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>아이템 통계</span>
          </button>

          {user?.isAdmin && (
            <button
              onClick={handleAutoBalance}
              disabled={balancing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${balancing ? 'animate-spin' : ''}`} />
              <span>{balancing ? '밸런싱 중...' : '자동 밸런싱 실행'}</span>
            </button>
          )}
        </motion.div>

        {/* Player Comparison Modal */}
        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 sm:mb-8"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">선수 비교</h2>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Player 1 Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">선수 1</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery1}
                        onChange={(e) => {
                          setSearchQuery1(e.target.value);
                          searchPlayers(e.target.value, 1);
                        }}
                        placeholder="선수 이름 검색..."
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      />
                      <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>

                    {searchResults1.length > 0 && (
                      <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                        {searchResults1.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => {
                              setSelectedPlayer1(player);
                              setSearchQuery1(player.name);
                              setSearchResults1([]);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{player.team}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {player.position} • OVR {player.overall} • {player.tier}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedPlayer1 && (
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="font-bold text-gray-900 dark:text-white mb-2">{selectedPlayer1.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {selectedPlayer1.team} • {selectedPlayer1.position} • OVR {selectedPlayer1.overall}
                        </div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          강화 레벨: {player1Level}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={player1Level}
                          onChange={(e) => setPlayer1Level(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Player 2 Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">선수 2</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery2}
                        onChange={(e) => {
                          setSearchQuery2(e.target.value);
                          searchPlayers(e.target.value, 2);
                        }}
                        placeholder="선수 이름 검색..."
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      />
                      <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>

                    {searchResults2.length > 0 && (
                      <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                        {searchResults2.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => {
                              setSelectedPlayer2(player);
                              setSearchQuery2(player.name);
                              setSearchResults2([]);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{player.team}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {player.position} • OVR {player.overall} • {player.tier}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedPlayer2 && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                        <div className="font-bold text-gray-900 dark:text-white mb-2">{selectedPlayer2.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {selectedPlayer2.team} • {selectedPlayer2.position} • OVR {selectedPlayer2.overall}
                        </div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          강화 레벨: {player2Level}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={player2Level}
                          onChange={(e) => setPlayer2Level(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={comparePlayers}
                  disabled={!selectedPlayer1 || !selectedPlayer2 || comparing}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {comparing ? '비교 중...' : '비교하기'}
                </button>

                {/* Comparison Result */}
                {comparison && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 space-y-4"
                  >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">비교 결과</h3>

                    {/* Overall Comparison */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {comparison.player1.enhancedOverall}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            기본 {comparison.player1.baseOverall} + {comparison.player1.level}강
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            종합 능력치
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {comparison.player2.enhancedOverall}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            기본 {comparison.player2.baseOverall} + {comparison.player2.level}강
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <span className={`font-bold ${comparison.differences.overall > 0 ? 'text-blue-600 dark:text-blue-400' : comparison.differences.overall < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          차이: {comparison.differences.overall > 0 ? '+' : ''}{comparison.differences.overall}
                        </span>
                      </div>
                    </div>

                    {/* Stat Comparisons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'csAbility', label: 'CS 능력' },
                        { key: 'lanePressure', label: '라인 압박' },
                        { key: 'damageDealing', label: '딜량' },
                        { key: 'survivability', label: '생존력' },
                        { key: 'objectiveControl', label: '오브젝트 장악' },
                        { key: 'visionControl', label: '시야 장악' },
                        { key: 'decisionMaking', label: '판단력' },
                        { key: 'consistency', label: '안정성' }
                      ].map((stat) => {
                        const p1Value = comparison.player1[`enhanced${stat.key.charAt(0).toUpperCase() + stat.key.slice(1)}`];
                        const p2Value = comparison.player2[`enhanced${stat.key.charAt(0).toUpperCase() + stat.key.slice(1)}`];
                        const diff = comparison.differences[stat.key as keyof typeof comparison.differences];

                        return (
                          <div key={stat.key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
                              {stat.label}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{p1Value}</div>
                              <div className={`text-xs sm:text-sm font-bold ${diff > 0 ? 'text-blue-600 dark:text-blue-400' : diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </div>
                              <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{p2Value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Traits */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3">{comparison.player1.name} 특성</h4>
                        {comparison.player1.traits && comparison.player1.traits.length > 0 ? (
                          <div className="space-y-2">
                            {comparison.player1.traits.map((trait: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="font-semibold text-gray-900 dark:text-white">{trait.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{trait.description}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">{trait.effect}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">특성 없음</div>
                        )}
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3">{comparison.player2.name} 특성</h4>
                        {comparison.player2.traits && comparison.player2.traits.length > 0 ? (
                          <div className="space-y-2">
                            {comparison.player2.traits.map((trait: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="font-semibold text-gray-900 dark:text-white">{trait.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{trait.description}</div>
                                <div className="text-xs text-red-600 dark:text-red-400">{trait.effect}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">특성 없음</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item Stats Section */}
        <AnimatePresence>
          {showItemStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 sm:mb-8"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    아이템 사용 통계
                  </h2>
                  <button
                    onClick={() => setShowItemStats(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {!itemStats ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">로딩 중...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Gold Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">총 매치 수</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {itemStats.goldStats.total_matches?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">총 골드 사용량</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Coins className="w-5 h-5" />
                          {itemStats.goldStats.total_gold_spent?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">아이템당 평균 골드</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {itemStats.goldStats.avg_gold_per_item?.toLocaleString() || 0}G
                        </div>
                      </div>
                    </div>

                    {/* Top Items */}
                    <div>
                      <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">인기 아이템 TOP 10</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">#</th>
                              <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">아이템</th>
                              <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">사용 횟수</th>
                              <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">총 골드</th>
                              <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">승률</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemStats.overall.slice(0, 10).map((item, index) => (
                              <tr key={item.item_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{item.item_name}</td>
                                <td className="py-2 px-3 text-right text-gray-900 dark:text-white">{item.usage_count}</td>
                                <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{Number(item.total_gold_spent).toLocaleString()}G</td>
                                <td className={`py-2 px-3 text-right font-semibold ${
                                  Number(item.win_rate) > 52 ? 'text-green-600 dark:text-green-400' :
                                  Number(item.win_rate) < 48 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {Number(item.win_rate).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Position Stats */}
                    <div>
                      <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">포지션별 인기 아이템</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map(position => (
                          <div key={position} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{position}</h4>
                            <div className="space-y-1">
                              {(itemStats.byPosition[position] || []).slice(0, 3).map((item, idx) => (
                                <div key={item.item_id} className="text-xs flex justify-between">
                                  <span className="text-gray-700 dark:text-gray-300 truncate">{idx + 1}. {item.item_name}</span>
                                  <span className={`ml-1 ${
                                    Number(item.win_rate) > 52 ? 'text-green-600 dark:text-green-400' :
                                    Number(item.win_rate) < 48 ? 'text-red-600 dark:text-red-400' :
                                    'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {Number(item.win_rate).toFixed(0)}%
                                  </span>
                                </div>
                              ))}
                              {(!itemStats.byPosition[position] || itemStats.byPosition[position].length === 0) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">데이터 없음</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Trends */}
                    {itemStats.recentTrends.length > 0 && (
                      <div>
                        <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">최근 7일 트렌드</h3>
                        <div className="flex flex-wrap gap-2">
                          {itemStats.recentTrends.slice(0, 5).map(item => (
                            <div key={item.item_id} className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm">
                              <span className="font-medium text-gray-900 dark:text-white">{item.item_name}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">({item.usage_count}회)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Strategy Tables */}
        <div className="space-y-6 sm:space-y-8">
          {renderStrategyTable('라인전 전략', laning, 'LANING')}
          {renderStrategyTable('한타 전략', teamfight, 'TEAMFIGHT')}
          {renderStrategyTable('운영 전략', macro, 'MACRO')}
        </div>
      </div>
    </div>
  );
}
