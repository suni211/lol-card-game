import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Lock, Sword } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Stage {
  id: number;
  stageNumber: number;
  difficulty: string;
  requiredPower: number;
  pointsReward: number;
  firstClearBonus: number;
  threeStarBonus: number;
  stars: number;
  bestScore: number;
  completedAt: string | null;
}

interface RegionStages {
  [region: string]: Stage[];
}

interface BattleResult {
  won: boolean;
  stars?: number;
  playerPower: number;
  stagePower: number;
  pointsEarned: number;
  isFirstClear?: boolean;
  isFirst3Stars?: boolean;
}

const REGION_INFO: Record<string, { name: string; color: string; description: string }> = {
  LCP: { name: 'LCP', color: 'from-green-500 to-emerald-600', description: 'Easy - 입문자용' },
  LTA: { name: 'LTA', color: 'from-blue-500 to-cyan-600', description: 'Normal - 초보자용' },
  LEC: { name: 'LEC', color: 'from-purple-500 to-violet-600', description: 'Hard - 중급자용' },
  LPL: { name: 'LPL', color: 'from-red-500 to-rose-600', description: 'Hell - 고급자용' },
  LCK: { name: 'LCK', color: 'from-yellow-500 to-amber-600', description: 'Hell - 최고 보상' },
};

export default function Campaign() {
  const [stages, setStages] = useState<RegionStages>({});
  const [loading, setLoading] = useState(true);
  const [battling, setBattling] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('LCP');
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_URL}/campaign/stages`);
      if (response.data.success) {
        setStages(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '스테이지 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleBattle = async (stageId: number) => {
    if (battling) return;

    setBattling(true);
    try {
      const response = await axios.post(`${API_URL}/campaign/battle`, { stageId });
      if (response.data.success) {
        setBattleResult(response.data.data);
        setShowResultModal(true);

        if (response.data.data.won) {
          toast.success(`승리! ${response.data.data.pointsEarned.toLocaleString()}P 획득`);

          // Refresh stages (user points updated via socket.io)
          await fetchStages();
        } else {
          toast.error('패배! 더 강한 덱이 필요합니다');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '전투 실패');
    } finally {
      setBattling(false);
    }
  };

  const renderStars = (stars: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= stars
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
          캠페인
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          지역을 선택하고 스테이지를 클리어하여 보상을 획득하세요
        </p>
      </div>

      {/* Region Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.keys(REGION_INFO).map((region) => {
          const regionData = REGION_INFO[region];
          const regionStages = stages[region] || [];
          const totalStars = regionStages.reduce((sum, stage) => sum + stage.stars, 0);
          const maxStars = regionStages.length * 3;

          return (
            <motion.button
              key={region}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRegion(region)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedRegion === region
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`text-2xl font-bold bg-gradient-to-r ${regionData.color} bg-clip-text text-transparent mb-2`}>
                {regionData.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {regionData.description}
              </div>
              <div className="flex items-center justify-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{totalStars}/{maxStars}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {(stages[selectedRegion] || []).map((stage) => {
          const isCleared = stage.completedAt !== null;
          const regionColor = REGION_INFO[selectedRegion].color;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative p-4 rounded-xl border-2 ${
                isCleared
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Stage Number */}
              <div className={`text-2xl font-bold bg-gradient-to-r ${regionColor} bg-clip-text text-transparent mb-2`}>
                {stage.stageNumber}
              </div>

              {/* Stars */}
              <div className="mb-3">
                {renderStars(stage.stars)}
              </div>

              {/* Info */}
              <div className="space-y-1 text-xs mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">요구 파워</span>
                  <span className="font-bold">{stage.requiredPower.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">기본 보상</span>
                  <span className="font-bold text-primary-600">{stage.pointsReward.toLocaleString()}P</span>
                </div>
                {!isCleared && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">첫 클리어</span>
                    <span className="font-bold text-green-600">+{stage.firstClearBonus.toLocaleString()}P</span>
                  </div>
                )}
                {stage.stars < 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">3성 보너스</span>
                    <span className="font-bold text-yellow-600">+{stage.threeStarBonus.toLocaleString()}P</span>
                  </div>
                )}
              </div>

              {/* Best Score */}
              {stage.bestScore > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  최고 점수: {stage.bestScore.toLocaleString()}
                </div>
              )}

              {/* Battle Button */}
              <button
                onClick={() => handleBattle(stage.id)}
                disabled={battling}
                className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  battling
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white'
                }`}
              >
                <Sword className="w-4 h-4" />
                {battling ? '전투 중...' : isCleared ? '재도전' : '전투'}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Battle Result Modal */}
      {showResultModal && battleResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full"
          >
            <div className="text-center mb-6">
              {battleResult.won ? (
                <>
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    승리!
                  </h2>
                  {battleResult.isFirstClear && (
                    <div className="inline-block px-4 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 text-sm font-bold mb-2">
                      첫 클리어!
                    </div>
                  )}
                  {battleResult.isFirst3Stars && (
                    <div className="inline-block px-4 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400 text-sm font-bold mb-2 ml-2">
                      3성 달성!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                    패배
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    더 강한 덱을 구성해보세요
                  </p>
                </>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">내 파워</span>
                <span className="text-xl font-bold">{battleResult.playerPower.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">적 파워</span>
                <span className="text-xl font-bold">{battleResult.stagePower.toLocaleString()}</span>
              </div>
              {battleResult.won && (
                <>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">획득 별</span>
                    <div>{renderStars(battleResult.stars || 0)}</div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg">
                    <span className="font-bold">획득 포인트</span>
                    <span className="text-2xl font-bold text-primary-600">
                      +{battleResult.pointsEarned.toLocaleString()}P
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowResultModal(false)}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
            >
              확인
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
