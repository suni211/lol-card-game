import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Sword } from 'lucide-react';
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

const REGION_INFO: Record<string, { name: string; color: string; description: string }> = {
  LCP: { name: 'LCP', color: 'from-green-500 to-emerald-600', description: 'Easy - 입문자용' },
  LTA: { name: 'LTA', color: 'from-blue-500 to-cyan-600', description: 'Normal - 초보자용' },
  LEC: { name: 'LEC', color: 'from-purple-500 to-violet-600', description: 'Hard - 중급자용' },
  LPL: { name: 'LPL', color: 'from-red-500 to-rose-600', description: 'Hell - 고급자용' },
  LCK: { name: 'LCK', color: 'from-yellow-500 to-amber-600', description: 'Hell - 최고 보상' },
};

export default function Campaign() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<RegionStages>({});
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('LCP');

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

  const handleBattle = (stageId: number) => {
    // Navigate to battle screen
    navigate(`/campaign/battle/${stageId}`);
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
                className="w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white"
              >
                <Sword className="w-4 h-4" />
                {isCleared ? '재도전' : '전투'}
              </button>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
