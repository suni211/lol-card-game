import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Plus, Trash2, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Coupon {
  id: number;
  code: string;
  type: string;
  reward_value: number | null;
  reward_player_name: string | null;
  reward_pack_type: string | null;
  reward_pack_count: number;
  max_uses: number;
  max_users: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_by_username: string;
  created_at: string;
  redemption_count: number;
  unique_user_count: number;
}

export default function AdminCoupon() {
  const { token } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: 'POINTS',
    rewardValue: '',
    rewardPlayerId: '',
    rewardPackType: '',
    rewardPackCount: '1',
    maxUses: '1',
    maxUsers: '',
    expiresAt: '',
    description: '',
    customCode: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch(`${API_URL}/coupon/admin/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCoupons(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  const handleCreateCoupon = async () => {
    setLoading(true);
    try {
      const body: any = {
        type: createForm.type,
        maxUses: parseInt(createForm.maxUses) || 1,
        maxUsers: createForm.maxUsers ? parseInt(createForm.maxUsers) : null,
        description: createForm.description || null,
        customCode: createForm.customCode || null,
      };

      if (createForm.type === 'POINTS') {
        body.rewardValue = parseInt(createForm.rewardValue);
      } else if (createForm.type === 'CARD') {
        body.rewardPlayerId = parseInt(createForm.rewardPlayerId);
      } else if (createForm.type === 'PACK') {
        body.rewardPackType = createForm.rewardPackType;
        body.rewardPackCount = parseInt(createForm.rewardPackCount) || 1;
      }

      if (createForm.expiresAt) {
        body.expiresAt = new Date(createForm.expiresAt).toISOString();
      }

      const response = await fetch(`${API_URL}/coupon/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        alert(`쿠폰이 생성되었습니다!\n코드: ${data.data.code}`);
        setShowCreateModal(false);
        setCreateForm({
          type: 'POINTS',
          rewardValue: '',
          rewardPlayerId: '',
          rewardPackType: '',
          rewardPackCount: '1',
          maxUses: '1',
          maxUsers: '',
          expiresAt: '',
          description: '',
          customCode: '',
        });
        fetchCoupons();
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (couponId: number) => {
    if (!confirm('이 쿠폰을 비활성화하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_URL}/coupon/admin/deactivate/${couponId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('쿠폰이 비활성화되었습니다');
        fetchCoupons();
      }
    } catch (error) {
      alert('오류가 발생했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">쿠폰 관리</h1>
            <p className="text-gray-400 dark:text-gray-500">보상 쿠폰을 생성하고 관리합니다</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            쿠폰 생성
          </button>
        </div>

        {/* Coupons List */}
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border ${
                coupon.is_active ? 'border-white/20' : 'border-red-500/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <code className="text-2xl font-mono font-bold text-purple-400">
                      {coupon.code}
                    </code>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        coupon.type === 'POINTS'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : coupon.type === 'CARD'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {coupon.type}
                    </span>
                    {coupon.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  {coupon.description && (
                    <p className="text-white text-lg mb-3">{coupon.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">보상</p>
                      <p className="text-white font-bold">
                        {coupon.type === 'POINTS' && `${coupon.reward_value}P`}
                        {coupon.type === 'CARD' && coupon.reward_player_name}
                        {coupon.type === 'PACK' &&
                          `${coupon.reward_pack_type} x${coupon.reward_pack_count}`}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">사용 현황</p>
                      <p className="text-white font-bold">
                        {coupon.current_uses} / {coupon.max_uses || '∞'}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-1 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        사용자 수
                      </p>
                      <p className="text-white font-bold">
                        {coupon.unique_user_count} / {coupon.max_users || '∞'}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        만료일
                      </p>
                      <p className="text-white font-bold">
                        {coupon.expires_at
                          ? new Date(coupon.expires_at).toLocaleDateString('ko-KR')
                          : '무제한'}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">생성자</p>
                      <p className="text-white font-bold">{coupon.created_by_username}</p>
                    </div>
                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    생성일: {new Date(coupon.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                {coupon.is_active && (
                  <button
                    onClick={() => handleDeactivate(coupon.id)}
                    className="ml-4 bg-red-500/20 text-red-400 p-3 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="비활성화"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-white/20"
            >
              <h2 className="text-2xl font-bold text-white mb-4">새 쿠폰 생성</h2>

              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">보상 타입</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="POINTS">포인트</option>
                    <option value="CARD">카드</option>
                    <option value="PACK">팩</option>
                  </select>
                </div>

                {/* Reward Value based on Type */}
                {createForm.type === 'POINTS' && (
                  <div>
                    <label className="text-white text-sm font-bold mb-2 block">포인트</label>
                    <input
                      type="number"
                      value={createForm.rewardValue}
                      onChange={(e) => setCreateForm({ ...createForm, rewardValue: e.target.value })}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                      placeholder="1000"
                    />
                  </div>
                )}

                {createForm.type === 'CARD' && (
                  <div>
                    <label className="text-white text-sm font-bold mb-2 block">플레이어 ID</label>
                    <input
                      type="number"
                      value={createForm.rewardPlayerId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, rewardPlayerId: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                      placeholder="1"
                    />
                  </div>
                )}

                {createForm.type === 'PACK' && (
                  <>
                    <div>
                      <label className="text-white text-sm font-bold mb-2 block">팩 타입</label>
                      <input
                        type="text"
                        value={createForm.rewardPackType}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, rewardPackType: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                        placeholder="LEGENDARY"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-bold mb-2 block">팩 개수</label>
                      <input
                        type="number"
                        value={createForm.rewardPackCount}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, rewardPackCount: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                        placeholder="1"
                      />
                    </div>
                  </>
                )}

                {/* Max Uses */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">최대 사용 횟수</label>
                  <input
                    type="number"
                    value={createForm.maxUses}
                    onChange={(e) => setCreateForm({ ...createForm, maxUses: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                    placeholder="1"
                  />
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">총 사용 가능 횟수 (사용자 중복 포함)</p>
                </div>

                {/* Max Users */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">
                    최대 사용자 수 (선택)
                  </label>
                  <input
                    type="number"
                    value={createForm.maxUsers}
                    onChange={(e) => setCreateForm({ ...createForm, maxUsers: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                    placeholder="무제한"
                  />
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">쿠폰을 사용할 수 있는 최대 유저 수</p>
                </div>

                {/* Expires At */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">
                    만료일 (선택)
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.expiresAt}
                    onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">
                    설명 (선택)
                  </label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                    placeholder="이벤트 보상"
                  />
                </div>

                {/* Custom Code */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block">
                    커스텀 코드 (선택)
                  </label>
                  <input
                    type="text"
                    value={createForm.customCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customCode: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white font-mono"
                    placeholder="자동 생성"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateCoupon}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
                >
                  {loading ? '생성중...' : '생성'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
