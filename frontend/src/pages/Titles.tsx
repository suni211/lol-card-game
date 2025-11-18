import { useState, useEffect } from 'react';
import { Award, Crown, Star, Sparkles, Lock, Check, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Title {
  id: number;
  name: string;
  description: string;
  color: string;
  icon?: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'SPECIAL';
  equipped?: boolean;
  acquired_at?: string;
}

const RARITY_COLORS = {
  COMMON: 'from-gray-400 to-gray-500',
  RARE: 'from-blue-400 to-blue-600',
  EPIC: 'from-purple-400 to-purple-600',
  LEGENDARY: 'from-yellow-400 to-orange-500',
  SPECIAL: 'from-pink-400 to-rose-500',
};

const RARITY_TEXT_COLORS = {
  COMMON: 'text-gray-600 dark:text-gray-400',
  RARE: 'text-blue-600 dark:text-blue-400',
  EPIC: 'text-purple-600 dark:text-purple-400',
  LEGENDARY: 'text-yellow-600 dark:text-yellow-400',
  SPECIAL: 'text-pink-600 dark:text-pink-400',
};

export default function Titles() {
  const { token, user } = useAuthStore();
  const [allTitles, setAllTitles] = useState<Title[]>([]);
  const [myTitles, setMyTitles] = useState<Title[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    rarity: 'COMMON',
  });

  useEffect(() => {
    fetchTitles();
  }, []);

  const fetchTitles = async () => {
    try {
      setLoading(true);
      const [all, my] = await Promise.all([
        axios.get(`${API_URL}/titles`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/titles/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (all.data.success) {
        setAllTitles(all.data.data);
      }

      if (my.data.success) {
        setMyTitles(my.data.data);
      }
    } catch (error: any) {
      console.error('Fetch titles error:', error);
      toast.error('칭호 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const equipTitle = async (titleId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/titles/${titleId}/equip`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('칭호를 장착했습니다');
        fetchTitles();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '칭호 장착에 실패했습니다');
    }
  };

  const unequipTitle = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/titles/unequip`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('칭호를 해제했습니다');
        fetchTitles();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '칭호 해제에 실패했습니다');
    }
  };

  const createTitle = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/titles/admin/create`,
        adminForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('칭호가 생성되었습니다');
        setShowAdminModal(false);
        setAdminForm({ name: '', description: '', color: '#3B82F6', rarity: 'COMMON' });
        fetchTitles();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '칭호 생성에 실패했습니다');
    }
  };

  const deleteTitle = async (titleId: number) => {
    if (!confirm('정말 이 칭호를 삭제하시겠습니까?')) return;

    try {
      const response = await axios.delete(`${API_URL}/titles/admin/${titleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchTitles();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '칭호 삭제에 실패했습니다');
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return <Crown className="w-6 h-6" />;
      case 'EPIC':
        return <Sparkles className="w-6 h-6" />;
      case 'SPECIAL':
        return <Star className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">칭호 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const myTitleIds = new Set(myTitles.map((t) => t.id));
  const equippedTitle = myTitles.find((t) => t.equipped);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Award className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">칭호</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  나만의 칭호를 장착하세요
                </p>
              </div>
            </div>
            {user?.isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                칭호 생성
              </button>
            )}
          </div>

          {/* Equipped Title Display */}
          {equippedTitle && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${RARITY_COLORS[equippedTitle.rarity]} flex items-center justify-center text-white`}
                  >
                    {getRarityIcon(equippedTitle.rarity)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">현재 장착 중</p>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {equippedTitle.name}
                    </h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {equippedTitle.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={unequipTitle}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                >
                  해제
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'my'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            내 칭호 ({myTitles.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            전체 칭호 ({allTitles.length})
          </button>
        </div>

        {/* Titles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'my' &&
            myTitles.map((title) => (
              <div
                key={title.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 p-6 transition-all ${
                  title.equipped
                    ? 'border-yellow-400 dark:border-yellow-600'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${RARITY_COLORS[title.rarity]} flex items-center justify-center text-white`}
                  >
                    {getRarityIcon(title.rarity)}
                  </div>
                  {title.equipped && (
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      장착 중
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {title.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {title.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${RARITY_TEXT_COLORS[title.rarity]}`}>
                    {title.rarity}
                  </span>
                  {!title.equipped && (
                    <button
                      onClick={() => equipTitle(title.id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      장착
                    </button>
                  )}
                </div>
              </div>
            ))}

          {activeTab === 'all' &&
            allTitles.map((title) => {
              const owned = myTitleIds.has(title.id);

              return (
                <div
                  key={title.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 ${
                    !owned ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${RARITY_COLORS[title.rarity]} flex items-center justify-center text-white`}
                    >
                      {owned ? getRarityIcon(title.rarity) : <Lock className="w-6 h-6" />}
                    </div>
                    {user?.isAdmin && (
                      <button
                        onClick={() => deleteTitle(title.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {title.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {title.description}
                  </p>
                  <span className={`text-xs font-bold ${RARITY_TEXT_COLORS[title.rarity]}`}>
                    {title.rarity}
                  </span>
                </div>
              );
            })}
        </div>

        {activeTab === 'my' && myTitles.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">보유한 칭호가 없습니다</p>
          </div>
        )}
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
              새 칭호 생성
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  칭호 이름
                </label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={adminForm.description}
                  onChange={(e) => setAdminForm({ ...adminForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  색상
                </label>
                <input
                  type="color"
                  value={adminForm.color}
                  onChange={(e) => setAdminForm({ ...adminForm, color: e.target.value })}
                  className="w-full h-12 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  희귀도
                </label>
                <select
                  value={adminForm.rarity}
                  onChange={(e) => setAdminForm({ ...adminForm, rarity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="COMMON">COMMON</option>
                  <option value="RARE">RARE</option>
                  <option value="EPIC">EPIC</option>
                  <option value="LEGENDARY">LEGENDARY</option>
                  <option value="SPECIAL">SPECIAL</option>
                </select>
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
                onClick={createTitle}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
