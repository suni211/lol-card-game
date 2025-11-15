import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Flame, Star, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VSMode() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'normal' | 'hard'>('normal');
  const [normalCleared, setNormalCleared] = useState<number[]>([]);
  const [hardCleared, setHardCleared] = useState<number[]>([]);
  const [hardUnlocked, setHardUnlocked] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/vsmode/stages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const p = res.data.data.progress;
        setNormalCleared(p.stages_cleared || []);
        setHardCleared(p.hard_stages_cleared || []);
        setHardUnlocked(p.hard_mode_unlocked || false);
        setPoints(p.total_points_earned || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const clickStage = (num: number) => {
    const hard = selectedMode === 'hard';
    if (hard && !hardUnlocked) {
      toast.error('일반 모드 올클 필요!');
      return;
    }
    if (num > 1) {
      const cleared = hard ? hardCleared : normalCleared;
      if (!cleared.includes(num - 1)) {
        toast.error('이전 스테이지 먼저 클리어!');
        return;
      }
    }
    navigate(`/vsmode/battle/${num}?mode=${selectedMode}`);
  };

  const unlocked = (num: number): boolean => {
    if (num === 1) return true;
    const hard = selectedMode === 'hard';
    if (hard && !hardUnlocked) return false;
    const cleared = hard ? hardCleared : normalCleared;
    return cleared.includes(num - 1);
  };

  const cleared = (num: number): boolean => {
    const c = selectedMode === 'hard' ? hardCleared : normalCleared;
    return c.includes(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  // 스테이지 정의
  const stage1 = { num: 1, name: '1단계 - 조합', boss: false, pts: 100, enemies: ['DuDu +0', 'Pyosik +0', 'BuLLDoG +0', 'Berserker +0', 'Life +0'], enemiesHard: ['DuDu +2', 'Pyosik +2', 'BuLLDoG +2', 'Berserker +2', 'Life +2'] };
  const stage2 = { num: 2, name: '2단계', boss: false, pts: 200, enemies: ['Rich +0', 'Sponge +0', 'Kyeahoo +0', 'Teddy +2', 'Andil +1'], enemiesHard: ['Rich +3', 'Sponge +3', 'Kyeahoo +3', 'Teddy +3', 'Andil +3'] };
  const stage3 = { num: 3, name: '3단계 - 중간보스', boss: true, pts: 1000, enemies: ['Morgan +3', 'Croco +3', 'Clozer +5', 'Hype +3', 'Pollu +3'], enemiesHard: ['Morgan +5', 'Croco +5', 'Clozer +5', 'Hype +5', 'Pollu +5'] };
  const stage4 = { num: 4, name: '4단계', boss: false, pts: 500, enemies: ['Kingen +3', 'GIDEON +3', 'Calix +3', 'Jiwoo +3', 'Lehends +3'], enemiesHard: ['Kingen +5', 'GIDEON +5', 'Calix +5', 'Jiwoo +5', 'Lehends +5'] };
  const stage5 = { num: 5, name: '5단계', boss: false, pts: 3000, enemies: ['Siwoo +1', 'Lucid +1', 'ShowMaker +3', 'Aiming +3', 'BeryL +1'], enemiesHard: ['Siwoo +3', 'Lucid +3', 'ShowMaker +6', 'Aiming +6', 'BeryL +5'] };
  const stage6 = { num: 6, name: '6단계 - 중간보스', boss: true, pts: 5000, enemies: ['Clear +5', 'Raptor +5', 'VicLa +5', 'Diable +5', 'Kellin +5'], enemiesHard: ['Clear +8', 'Raptor +8', 'VicLa +8', 'Diable +8', 'Kellin +8'] };
  const stage7 = { num: 7, name: '7단계 - 중간보스', boss: true, pts: 10000, enemies: ['PerfecT +5', 'Cuzz +5', 'Bdd +5', 'deokdam +5', 'Peter +5'], enemiesHard: ['PerfecT +8', 'Cuzz +8', 'Bdd +8', 'deokdam +8', 'Peter +8'] };
  const stage8 = { num: 8, name: '8단계', boss: false, pts: 5000, enemies: ['Zeus +5', 'Peanut +5', 'zeka +3', 'Viper +3', 'Delight +3'], enemiesHard: ['Zeus +8', 'Peanut +8', 'zeka +6', 'Viper +6', 'Delight +6'] };
  const stage9 = { num: 9, name: '9단계', boss: false, pts: 10000, enemies: ['Doran +6', 'Oner +6', 'Faker +6', 'Gumayusi +6', 'Keria +6'], enemiesHard: ['Doran +8', 'Oner +8', 'Faker +8', 'Gumayusi +8', 'Keria +8'] };
  const stage10 = { num: 10, name: '10단계 - 최종보스', boss: true, pts: 50000, enemies: ['Kiin +8', 'Canyon +8', 'Chovy +8', 'Ruler +8', 'Duro +8'], enemiesHard: ['Kiin +10', 'Canyon +10', 'Chovy +10', 'Ruler +10', 'Duro +10'] };

  const allStages = [stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8, stage9, stage10];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">VS 모드</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">10단계의 도전을 클리어하고 레전드 확정팩을 획득하세요!</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">일반 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{normalCleared.length} / 10</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">하드 모드</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{hardCleared.length} / 10</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">획득 포인트</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{points.toLocaleString()}P</div>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button onClick={() => setSelectedMode('normal')} className={`px-6 py-2 rounded-md font-bold transition-colors ${selectedMode === 'normal' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>일반 모드</button>
            <button onClick={() => setSelectedMode('hard')} className={`px-6 py-2 rounded-md font-bold transition-colors relative ${selectedMode === 'hard' ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-400'}`} disabled={!hardUnlocked}>
              하드 모드
              {!hardUnlocked && <Lock className="w-4 h-4 absolute -top-1 -right-1" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {allStages.map((s) => {
            const u = unlocked(s.num);
            const c = cleared(s.num);
            const r = selectedMode === 'hard' ? s.pts * 3 : s.pts;
            const e = selectedMode === 'hard' ? s.enemiesHard : s.enemies;

            return (
              <motion.div key={s.num} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: s.num * 0.05 }} className={`relative ${u ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} onClick={() => u && clickStage(s.num)}>
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 transition-all hover:scale-105 ${s.boss ? 'border-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20' : c ? 'border-green-500' : u ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl ${s.boss ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : c ? 'bg-green-500 text-white' : u ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                      {c ? '✓' : s.num}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-3">
                    {s.name}
                    {s.boss && <Star className="w-5 h-5 inline ml-2 text-red-500" />}
                  </h3>
                  <div className="space-y-1 mb-4">
                    {e.map((enemy, i) => (
                      <div key={i} className="text-xs text-gray-700 dark:text-gray-300">
                        {enemy}
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                      <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{r.toLocaleString()}P</span>
                    </div>
                  </div>
                  {!u && (
                    <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
                      <Lock className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {selectedMode === 'hard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl p-8 text-center shadow-2xl">
            <Zap className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">최종 보상</h2>
            <p className="text-xl text-white/90 mb-4">하드 모드 10단계 클리어 시</p>
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <Star className="w-8 h-8 text-yellow-300 mr-2" />
              <span className="text-2xl font-black text-white">레전드 확정팩</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
