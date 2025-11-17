import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Star, Trophy, Users, Target, Zap, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Coach {
  id: number;
  coach_id?: number;
  name: string;
  star_rating: number;
  buff_type: 'OVERALL' | 'POSITION' | 'TEAM' | 'STRATEGY';
  buff_value: number;
  buff_target: string | null;
  description: string;
  image_url: string | null;
  is_active?: boolean;
  obtained_at?: string;
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

export default function Coach() {
  const { token } = useAuthStore();
  const [myCoaches, setMyCoaches] = useState<Coach[]>([]);
  const [allCoaches, setAllCoaches] = useState<Coach[]>([]);
  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'my' | 'all'>('my');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [myCoachesRes, allCoachesRes, activeCoachRes] = await Promise.all([
        axios.get(`${API_URL}/coach/my-coaches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/coach`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/coach/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMyCoaches(myCoachesRes.data.data);
      setAllCoaches(allCoachesRes.data.data);
      setActiveCoach(activeCoachRes.data.data);
    } catch (error: any) {
      console.error('Fetch coaches error:', error);
      toast.error('코치 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const activateCoach = async (coachId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/coach/activate/${coachId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '코치 활성화 실패');
    }
  };

  const deactivateCoach = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/coach/deactivate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '코치 비활성화 실패');
    }
  };

  const renderCoachCard = (coach: Coach, owned: boolean = false) => {
    const Icon = buffTypeIcons[coach.buff_type];
    const colorClass = buffTypeColors[coach.buff_type];
    const isActive = activeCoach?.coach_id === coach.id || activeCoach?.id === coach.id;

    return (
      <motion.div
        key={coach.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`relative bg-gradient-to-br ${colorClass} p-1 rounded-xl ${
          isActive ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : ''
        }`}
      >
        <div className="bg-gray-900 rounded-lg p-6">
          {/* Star Rating */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: coach.star_rating }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {/* Name */}
          <h3 className="text-2xl font-bold text-white mb-2">{coach.name}</h3>

          {/* Buff Type */}
          <div className="flex items-center gap-2 mb-4">
            <Icon className="w-5 h-5 text-white" />
            <span className="text-white/80">{buffTypeNames[coach.buff_type]}</span>
          </div>

          {/* Description */}
          <p className="text-white/70 mb-4 min-h-[3rem]">{coach.description}</p>

          {/* Buff Details */}
          <div className="bg-white/10 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-white/80">버프 효과</span>
              <span className="text-xl font-bold text-white">
                +{coach.buff_value}
                {coach.buff_type === 'STRATEGY' ? '%' : ''}
              </span>
            </div>
            {coach.buff_target && (
              <div className="mt-2 text-sm text-white/60">
                대상: {coach.buff_target}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {owned && (
            <div className="space-y-2">
              {isActive ? (
                <button
                  onClick={deactivateCoach}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:from-red-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  비활성화
                </button>
              ) : (
                <button
                  onClick={() => activateCoach(coach.coach_id || coach.id)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  활성화
                </button>
              )}
            </div>
          )}

          {!owned && (
            <div className="text-center py-3 bg-gray-800 rounded-lg">
              <span className="text-white/40">미보유</span>
            </div>
          )}

          {isActive && (
            <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Zap className="w-4 h-4" />
              활성
            </div>
          )}
        </div>
      </motion.div>
    );
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          코치 관리
        </h1>
        <p className="text-white/60 mb-6">
          코치를 활성화하면 팀이 더욱 강력해집니다. 중복 카드를 뽑으면 코치를 획득할 수 있습니다.
        </p>

        {/* Active Coach Display */}
        {activeCoach && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-xl mb-6"
          >
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <Trophy className="w-12 h-12 text-yellow-400" />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    현재 활성 코치: {activeCoach.name}
                  </h3>
                  <p className="text-white/80">{activeCoach.description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('my')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              view === 'my'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-800 text-white/60 hover:text-white'
            }`}
          >
            보유 코치 ({myCoaches.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              view === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-800 text-white/60 hover:text-white'
            }`}
          >
            전체 코치 ({allCoaches.length})
          </button>
        </div>
      </div>

      {/* Coach Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {view === 'my' ? (
            myCoaches.length > 0 ? (
              myCoaches.map((coach) => renderCoachCard(coach, true))
            ) : (
              <div className="col-span-full text-center py-16">
                <p className="text-white/60 text-lg">보유한 코치가 없습니다.</p>
                <p className="text-white/40 mt-2">중복 카드를 뽑으면 코치를 획득할 수 있습니다!</p>
              </div>
            )
          ) : (
            allCoaches.map((coach) => {
              const owned = myCoaches.some((c) => c.coach_id === coach.id || c.id === coach.id);
              return renderCoachCard(coach, owned);
            })
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
