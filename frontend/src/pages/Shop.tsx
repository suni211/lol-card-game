import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Clock, Sparkles, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  item_type: 'consumable' | 'permanent' | 'pack';
  effect_type: string;
  effect_value: string;
  duration_minutes: number;
  stock_limit: number;
  is_active: boolean;
}

interface UserItem {
  id: number;
  quantity: number;
  purchased_at: string;
  name: string;
  description: string;
  item_type: string;
  effect_type: string;
  effect_value: string;
  duration_minutes: number;
  sell_price: number; // New property for sell price
}

interface ActiveEffect {
  id: number;
  used_at: string;
  effect_expires_at: string;
  name: string;
  effect_type: string;
  effect_value: string;
  duration_minutes: number;
}

export default function Shop() {
  const { user, token, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory' | 'effects'>('shop');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<UserItem[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [selling, setSelling] = useState<number | null>(null);
  const [showNameChangeModal, setShowNameChangeModal] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchShopData();
  }, [activeTab]);

  const fetchShopData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'shop') {
        const response = await axios.get(`${API_URL}/shop/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(response.data.data || []);
      } else if (activeTab === 'inventory') {
        const response = await axios.get(`${API_URL}/shop/inventory`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInventory(response.data.data || []);
      } else if (activeTab === 'effects') {
        const response = await axios.get(`${API_URL}/shop/active-effects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveEffects(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch shop data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId: number) => {
    try {
      setPurchasing(itemId);

      const response = await axios.post(
        `${API_URL}/shop/purchase`,
        { itemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        updateUser({ points: response.data.data.remainingPoints });
        fetchShopData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '구매에 실패했습니다');
    } finally {
      setPurchasing(null);
    }
  };

  const handleUseItem = async (userItemId: number, effectType: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/shop/use`,
        { userItemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);

        // If it's a name change item, show modal
        if (effectType === 'name_change') {
          setShowNameChangeModal(true);
        }

        fetchShopData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '아이템 사용에 실패했습니다');
    }
  };

  const handleSellItem = async (userItemId: number) => {
    try {
      setSelling(userItemId);

      const response = await axios.post(
        `${API_URL}/shop/sell`,
        { userItemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        updateUser({ points: response.data.data.remainingPoints });
        fetchShopData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '아이템 판매에 실패했습니다');
    } finally {
      setSelling(null);
    }
  };

  const handleChangeName = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/shop/change-name`,
        { newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        updateUser({ username: newName });
        setShowNameChangeModal(false);
        setNewName('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '이름 변경에 실패했습니다');
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'consumable':
        return 'bg-blue-500';
      case 'permanent':
        return 'bg-purple-500';
      case 'pack':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'consumable':
        return '소모품';
      case 'permanent':
        return '영구';
      case 'pack':
        return '팩';
      default:
        return type;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return '만료됨';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 남음`;
    }
    return `${minutes}분 남음`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
          포인트 상점
        </h1>
        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Sparkles className="text-yellow-400" />
          <span>{user?.points?.toLocaleString() || 0} P</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
            activeTab === 'shop'
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ShoppingCart size={20} />
            <span>상점</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
            activeTab === 'inventory'
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Package size={20} />
            <span>보관함</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
            activeTab === 'effects'
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock size={20} />
            <span>활성 효과</span>
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      ) : (
        <>
          {/* Shop Tab */}
          {activeTab === 'shop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700 hover:border-yellow-500 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold">{item.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getItemTypeColor(item.item_type)}`}>
                      {getItemTypeLabel(item.item_type)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 min-h-[3rem]">{item.description}</p>
                  {item.duration_minutes > 0 && (
                    <p className="text-blue-400 text-xs mb-2">⏱️ 지속시간: {item.duration_minutes}분</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-yellow-400">{item.price.toLocaleString()} P</span>
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={purchasing === item.id || (user?.points || 0) < item.price}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchasing === item.id ? '구매 중...' : '구매'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <Package size={64} className="mx-auto mb-4 opacity-50" />
                  <p>보유 중인 아이템이 없습니다</p>
                </div>
              ) : (
                inventory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold">{item.name}</h3>
                      <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-bold">
                        x{item.quantity}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                    {item.duration_minutes > 0 && (
                      <p className="text-blue-400 text-xs mb-2">⏱️ 지속시간: {item.duration_minutes}분</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xl font-bold text-green-400">판매가: {item.sell_price.toLocaleString()} P</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUseItem(item.id, item.effect_type)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all"
                        >
                          사용하기
                        </button>
                        <button
                          onClick={() => handleSellItem(item.id)}
                          disabled={selling === item.id}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {selling === item.id ? '판매 중...' : '판매'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Active Effects Tab */}
          {activeTab === 'effects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEffects.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <Clock size={64} className="mx-auto mb-4 opacity-50" />
                  <p>활성화된 효과가 없습니다</p>
                </div>
              ) : (
                activeEffects.map((effect) => (
                  <motion.div
                    key={effect.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 border-2 border-purple-500"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="text-yellow-400" />
                      <h3 className="text-xl font-bold">{effect.name}</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-blue-300 text-sm">효과: {effect.effect_value}배</p>
                      <p className="text-yellow-300 text-sm font-bold">
                        ⏰ {formatTimeRemaining(effect.effect_expires_at)}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Name Change Modal */}
      {showNameChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-lg p-8 max-w-md w-full border-2 border-yellow-500"
          >
            <h2 className="text-2xl font-bold mb-4 text-center">이름 변경</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 이름 입력 (2-20자)"
              maxLength={20}
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-3 mb-4 focus:border-yellow-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNameChangeModal(false);
                  setNewName('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
              >
                취소
              </button>
              <button
                onClick={handleChangeName}
                disabled={!newName || newName.length < 2}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                변경
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
