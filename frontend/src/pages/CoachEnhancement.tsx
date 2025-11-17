import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Star, ArrowUp, AlertCircle, TrendingUp, Target, Users, Trophy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Coach {
  id: number;
  coach_id: number;
  name: string;
  star_rating: number;
  buff_type: 'OVERALL' | 'POSITION' | 'TEAM' | 'STRATEGY';
  buff_value: number;
  current_buff_value: number;
  enhancement_level: number;
  buff_target: string | null;
  description: string;
  image_url: string | null;
  is_active: boolean;
}

const buffTypeIcons = {
  OVERALL: TrendingUp,
  POSITION: Target,
  TEAM: Users,
  STRATEGY: Trophy,
};

const buffTypeColors = {
  OVERALL: 'from-purple-500 to-pink-500',
  POSITION: 'from-blue-500 to-cyan-500',
  TEAM: 'from-green-500 to-emerald-500',
  STRATEGY: 'from-yellow-500 to-orange-500',
};

const buffTypeNames = {
  OVERALL: '전체 버프',
  POSITION: '포지션 버프',
  TEAM: '팀 버프',
  STRATEGY: '전략 버프',
};

export default function CoachEnhancement() {
  const { token } = useAuthStore();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [targetCoach, setTargetCoach] = useState<Coach | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const MAX_ENHANCEMENT_LEVEL = 10;

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/coach/my-coaches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCoaches(response.data.data);
    } catch (error: any) {
      console.error('Fetch coaches error:', error);
      toast.error('코치 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTarget = (coach: Coach) => {
    if (coach.enhancement_level >= MAX_ENHANCEMENT_LEVEL) {
      toast.error('이미 최대 강화 레벨입니다.');
      return;
    }
    setTargetCoach(coach);
    setSelectedMaterials([]);
  };

  const handleSelectMaterial = (coachId: number) => {
    if (selectedMaterials.includes(coachId)) {
      setSelectedMaterials(selectedMaterials.filter((id) => id !== coachId));
    } else {
      setSelectedMaterials([...selectedMaterials, coachId]);
    }
  };

  const handleEnhance = async () => {
    if (!targetCoach) {
      toast.error('강화할 코치를 선택해주세요.');
      return;
    }

    if (selectedMaterials.length === 0) {
      toast.error('재료 코치를 선택해주세요.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/coach/enhance/${targetCoach.id}`,
        { materialCoachIds: selectedMaterials },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const { buffIncrease, newEnhancementLevel } = response.data.data;
        toast.success(
          `코치 강화 성공!\n강화 레벨: ${newEnhancementLevel}\n버프 증가: +${buffIncrease}`
        );
        setTargetCoach(null);
        setSelectedMaterials([]);
        fetchCoaches();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '코치 강화 실패');
    }
  };

  const getAvailableMaterials = () => {
    if (!targetCoach) return [];
    return coaches.filter(
      (c) => c.id !== targetCoach.id && !c.is_active && !selectedMaterials.includes(c.id)
    );
  };

  const getSelectedMaterialCoaches = () => {
    return coaches.filter((c) => selectedMaterials.includes(c.id));
  };

  const calculateEnhancementPreview = () => {
    if (!targetCoach || selectedMaterials.length === 0) return null;

    const materialCoaches = getSelectedMaterialCoaches();
    const buffIncrease = materialCoaches.reduce((sum, c) => sum + c.star_rating, 0);
    const newLevel = Math.min(
      targetCoach.enhancement_level + materialCoaches.length,
      MAX_ENHANCEMENT_LEVEL
    );
    const newBuffValue = targetCoach.current_buff_value + buffIncrease;

    return {
      buffIncrease,
      newLevel,
      newBuffValue,
    };
  };

  const renderCoachCard = (coach: Coach, variant: 'target' | 'material' | 'selected') => {
    const Icon = buffTypeIcons[coach.buff_type];
    const colorClass = buffTypeColors[coach.buff_type];
    const isSelected = variant === 'target' ? targetCoach?.id === coach.id : selectedMaterials.includes(coach.id);

    return (
      <motion.div
        key={coach.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={() => {
          if (variant === 'target') handleSelectTarget(coach);
          else if (variant === 'material') handleSelectMaterial(coach.id);
        }}
        className={`relative bg-gradient-to-br ${colorClass} p-1 rounded-xl cursor-pointer transition-all ${
          isSelected ? 'ring-4 ring-white scale-105' : 'hover:scale-102'
        }`}
      >
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex gap-1 mb-2">
            {Array.from({ length: coach.star_rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {coach.enhancement_level > 0 && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white font-bold text-xs">
                <ArrowUp className="w-3 h-3" />+{coach.enhancement_level}
              </span>
            </div>
          )}

          <h3 className="text-lg font-bold text-white mb-1">{coach.name}</h3>

          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-white" />
            <span className="text-white/80 text-sm">{buffTypeNames[coach.buff_type]}</span>
          </div>

          <div className="bg-white/10 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">버프</span>
              <span className="text-white font-bold">
                +{coach.current_buff_value}
                {coach.buff_type === 'STRATEGY' ? '%' : ''}
              </span>
            </div>
          </div>

          {coach.is_active && (
            <div className="mt-2 text-center py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs font-bold">
              활성화됨
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const preview = calculateEnhancementPreview();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/60">코치 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  const availableTargets = coaches.filter((c) => c.enhancement_level < MAX_ENHANCEMENT_LEVEL);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          코치 강화
        </h1>
        <p className="text-white/60">
          다른 코치를 재료로 사용하여 코치를 강화할 수 있습니다. 재료 코치의 성급만큼 버프가 증가합니다.
        </p>
      </div>

      {/* Step 1: Select Target */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
            1
          </span>
          강화할 코치 선택
        </h2>

        {availableTargets.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-white/60">강화 가능한 코치가 없습니다.</p>
            <p className="text-white/40 mt-2">모든 코치가 최대 레벨이거나 코치를 보유하고 있지 않습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {availableTargets.map((coach) => renderCoachCard(coach, 'target'))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Step 2: Select Materials */}
      {targetCoach && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
              2
            </span>
            재료 코치 선택
          </h2>

          {getAvailableMaterials().length === 0 ? (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
              <p className="text-white/60">사용 가능한 재료 코치가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {getAvailableMaterials().map((coach) => renderCoachCard(coach, 'material'))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Enhancement Preview & Button */}
      {targetCoach && selectedMaterials.length > 0 && preview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-xl"
        >
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <ArrowUp className="w-6 h-6" />
              강화 미리보기
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white/80 mb-2">현재</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">강화 레벨</span>
                    <span className="text-white font-bold">+{targetCoach.enhancement_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">버프 값</span>
                    <span className="text-white font-bold">
                      +{targetCoach.current_buff_value}
                      {targetCoach.buff_type === 'STRATEGY' ? '%' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-green-400 mb-2">강화 후</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">강화 레벨</span>
                    <span className="text-green-400 font-bold">
                      +{preview.newLevel}
                      <span className="text-sm ml-2">(+{preview.newLevel - targetCoach.enhancement_level})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">버프 값</span>
                    <span className="text-green-400 font-bold">
                      +{preview.newBuffValue}
                      {targetCoach.buff_type === 'STRATEGY' ? '%' : ''}
                      <span className="text-sm ml-2">(+{preview.buffIncrease})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-bold">재료 코치 소모</p>
                  <p className="text-yellow-300/80 text-sm">
                    선택한 {selectedMaterials.length}개의 코치가 영구적으로 소모됩니다.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleEnhance}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition flex items-center justify-center gap-2 text-lg"
            >
              <ArrowUp className="w-6 h-6" />
              코치 강화하기
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
