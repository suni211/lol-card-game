import { useState, useEffect } from 'react';
import { Sword, Trophy, Crown, Target, Shield, Plus, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RaidBoss {
  id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  is_active: boolean;
  started_at: string;
  ended_at?: string;
  reward_multiplier: number;
  totalParticipants: number;
  totalDamage: number;
}

interface LeaderboardEntry {
  user_id: number;
  username: string;
  damage_dealt: number;
  attempts: number;
  level: number;
  rating: number;
  title_name?: string;
  title_color?: string;
}

interface MyStats {
  totalDamage: number;
  attempts: number;
  remainingAttacks: number;
  rank: number;
  lastAttackAt?: string;
}

export default function Raid() {
  const { token, user } = useAuthStore();
  const [raid, setRaid] = useState<RaidBoss | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: 'ICON, KING IS BACK',
    maxHp: 1000000,
    rewardMultiplier: 1.0,
  });

  useEffect(() => {
    fetchRaidData();
    const interval = setInterval(fetchRaidData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRaidData = async () => {
    try {
      const [raidRes, leaderboardRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/raid/current`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/raid/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/raid/my-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (raidRes.data.success) {
        setRaid(raidRes.data.data);
      }

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.data);
      }

      if (statsRes.data.success) {
        setMyStats(statsRes.data.data);
      }
    } catch (error: any) {
      console.error('Fetch raid data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const attack = async () => {
    try {
      setAttacking(true);
      const response = await axios.post(
        `${API_URL}/raid/attack`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { won, damage, isBossDefeated } = response.data.data;

        if (won) {
          toast.success(`AI 보스 격파! ${damage.toLocaleString()} 데미지!`, { duration: 4000 });
        } else {
          toast.error(`AI 보스에게 패배... ${damage.toLocaleString()} 데미지`, { duration: 4000 });
        }

        if (isBossDefeated) {
          toast.success('🎉 레이드 보스를 처치했습니다!', { duration: 5000 });
        }
        fetchRaidData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '공격에 실패했습니다');
    } finally {
      setAttacking(false);
    }
  };

  const startRaid = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/raid/admin/start`,
        adminForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowAdminModal(false);
        setAdminForm({ name: 'ICON, KING IS BACK', maxHp: 1000000, rewardMultiplier: 1.0 });
        fetchRaidData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '레이드 시작에 실패했습니다');
    }
  };

  const endRaid = async () => {
    if (!confirm('정말 레이드를 종료하고 보상을 지급하시겠습니까?')) return;

    try {
      const response = await axios.post(
        `${API_URL}/raid/admin/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchRaidData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '레이드 종료에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">레이드 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!raid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Shield className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              활성화된 레이드가 없습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              관리자가 새로운 레이드를 시작할 때까지 기다려주세요
            </p>
            {user?.isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                레이드 시작
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hpPercentage = (raid.current_hp / raid.max_hp) * 100;
  const estimatedReward = myStats?.totalDamage
    ? Math.max(
        100,
        Math.floor(
          (myStats.totalDamage / (raid.totalDamage || 1)) * 1000000 * raid.reward_multiplier
        )
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">레이드</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                협력하여 강력한 보스를 처치하세요
              </p>
            </div>
          </div>
          {user?.isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                새 레이드
              </button>
              <button
                onClick={endRaid}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                레이드 종료
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Boss Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Boss Card */}
            <div className="bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-xl shadow-2xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-12 h-12" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{raid.name}</h2>
                  <p className="text-white/80">
                    참여자: {raid.totalParticipants}명 | 누적 데미지: {raid.totalDamage.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* HP Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">HP</span>
                  <span className="font-bold">
                    {raid.current_hp.toLocaleString()} / {raid.max_hp.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-8 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-500 flex items-center justify-center font-bold"
                    style={{ width: `${hpPercentage}%` }}
                  >
                    {hpPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/70">
                시작: {new Date(raid.started_at).toLocaleString('ko-KR')}
              </p>
            </div>

            {/* My Stats */}
            {myStats && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">내 전적</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 데미지</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {myStats.totalDamage.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">순위</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      #{myStats.rank}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">남은 공격</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {myStats.remainingAttacks}/10
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">예상 보상</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {estimatedReward.toLocaleString()}P
                    </p>
                  </div>
                </div>
                <button
                  onClick={attack}
                  disabled={attacking || myStats.remainingAttacks === 0 || raid.current_hp === 0}
                  className="w-full mt-6 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Sword className="w-6 h-6" />
                  {attacking ? '공격 중...' : raid.current_hp === 0 ? '보스 처치 완료' : '공격하기'}
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                딜량 순위
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`p-3 rounded-lg ${
                      index < 3
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                            : index === 1
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                            : index === 2
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                            : 'bg-gray-400'
                        }`}
                      >
                        {index < 3 ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {entry.username}
                          </p>
                          {entry.title_name && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: entry.title_color || '#3B82F6' }}
                            >
                              {entry.title_name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.damage_dealt.toLocaleString()} 데미지
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {leaderboard.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    아직 참여자가 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Raid Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            레이드 안내
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <p>• 하루 최대 10회 공격 가능</p>
              <p>• AI 보스(파워 550)와 자동 배틀</p>
              <p>• 승리 시: 0.8~1.2배 데미지</p>
              <p>• 패배 시: 10% 데미지</p>
            </div>
            <div>
              <p>• 총 보상 풀: 1,000,000 포인트</p>
              <p>• 보상은 딜량 비율에 따라 분배</p>
              <p>• 최소 보상: 100 포인트</p>
              <p>• 레이드 종료 시 자동 보상 지급</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAdminModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              새 레이드 시작
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  보스 이름
                </label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  placeholder="예: ICON 올 10강"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  최대 HP
                </label>
                <input
                  type="number"
                  value={adminForm.maxHp}
                  onChange={(e) => setAdminForm({ ...adminForm, maxHp: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  보상 배율
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adminForm.rewardMultiplier}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, rewardMultiplier: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdminModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold transition-colors"
              >
                취소
              </button>
              <button
                onClick={startRaid}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors"
              >
                시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
