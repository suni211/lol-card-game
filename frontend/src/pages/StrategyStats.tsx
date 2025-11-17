import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3, RefreshCw } from 'lucide-react';
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

export default function StrategyStats() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [balancing, setBalancing] = useState(false);
  const [laning, setLaning] = useState<StrategyUsage[]>([]);
  const [teamfight, setTeamfight] = useState<StrategyUsage[]>([]);
  const [macro, setMacro] = useState<StrategyUsage[]>([]);
  const [balance, setBalance] = useState<StrategyBalance[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/strategy-stats/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setLaning(response.data.data.laning);
        setTeamfight(response.data.data.teamfight);
        setMacro(response.data.data.macro);
        setBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch strategy stats:', error);
      toast.error('통계 불러오기 실패');
    } finally {
      setLoading(false);
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
                const modifier = balanceItem?.balance_modifier || 1.0;
                const winRate = balanceItem?.win_rate || 0;

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
                        {item.usage_percentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({item.usage_count})
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
                        {winRate.toFixed(1)}%
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

        {/* Auto Balance Button */}
        {user?.isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8 text-center"
          >
            <button
              onClick={handleAutoBalance}
              disabled={balancing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 mx-auto text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${balancing ? 'animate-spin' : ''}`} />
              <span>{balancing ? '밸런싱 중...' : '자동 밸런싱 실행'}</span>
            </button>
          </motion.div>
        )}

        {/* Strategy Tables */}
        <div className="space-y-6 sm:space-y-8">
          {renderStrategyTable('라인전 전략', laning, 'LANING')}
          {renderStrategyTable('한타 전략', teamfight, 'TEAMFIGHT')}
          {renderStrategyTable('운영 전략', macro, 'MACRO')}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">범례</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">
                버프됨 (&gt;102%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                밸런스 (98-102%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-gray-700 dark:text-gray-300">
                너프됨 (&lt;98%)
              </span>
            </div>
          </div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            * 사용률이 평균보다 20% 이상 높고 승률이 55% 이상이면 자동으로 너프됩니다.
            <br />* 사용률이 평균보다 50% 이상 낮고 승률이 45% 이하면 자동으로 버프됩니다.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
