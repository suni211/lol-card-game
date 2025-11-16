import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Send, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface GlobalMessage {
  id: number;
  username: string;
  message: string;
  created_at: string;
}

export default function MegaphoneShop() {
  const { user, token, updateUser } = useAuthStore();
  const [megaphoneCount, setMegaphoneCount] = useState(0);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMegaphoneCount();
    fetchMessages();

    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMegaphoneCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/shop/megaphone`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMegaphoneCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch megaphone count:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/shop/megaphone/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handlePurchase = async () => {
    if (purchaseQuantity < 1 || purchaseQuantity > 100) {
      toast.error('1~100개까지 구매 가능합니다');
      return;
    }

    const totalCost = 1000 * purchaseQuantity;
    if (!user || user.points < totalCost) {
      toast.error('포인트가 부족합니다');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/shop/megaphone/purchase`,
        { quantity: purchaseQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMegaphoneCount(response.data.megaphones);
        updateUser({ points: response.data.points });
        toast.success(`확성기 ${purchaseQuantity}개 구매 완료!`);
        setPurchaseQuantity(1);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '구매 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('메시지를 입력해주세요');
      return;
    }

    if (broadcastMessage.length > 200) {
      toast.error('메시지는 200자 이하로 입력해주세요');
      return;
    }

    if (megaphoneCount < 1) {
      toast.error('확성기가 부족합니다');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/shop/megaphone/broadcast`,
        { message: broadcastMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMegaphoneCount(response.data.megaphones);
        toast.success('전체 메시지를 전송했습니다!');
        setBroadcastMessage('');
        setShowBroadcastModal(false);
        fetchMessages();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '전송 실패');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    return `${Math.floor(diff / 3600)}시간 전`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone size={32} />
              확성기 상점
            </h2>
            <p className="text-yellow-100 mt-2">전체 유저에게 메시지를 보내보세요!</p>
          </div>
          <div className="text-right">
            <p className="text-yellow-100">보유 확성기</p>
            <p className="text-4xl font-bold">{megaphoneCount}개</p>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">확성기 구매</h3>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              구매 수량
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={purchaseQuantity}
              onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              가격
            </label>
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-bold">
              {(1000 * purchaseQuantity).toLocaleString()}P
            </div>
          </div>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            구매하기
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>• 확성기 1개당 1,000P</p>
          <p>• 확성기 사용 시 모든 유저에게 메시지가 30분간 표시됩니다</p>
          <p>• 최대 200자까지 입력 가능합니다</p>
        </div>
      </motion.div>

      {/* Broadcast Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
      >
        <button
          onClick={() => setShowBroadcastModal(true)}
          disabled={megaphoneCount < 1}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <Megaphone size={24} />
            전체 메시지 보내기 ({megaphoneCount}개 보유)
          </span>
        </button>
      </motion.div>

      {/* Global Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">최근 전체 메시지</h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              아직 전체 메시지가 없습니다
            </p>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-yellow-600" />
                    <span className="font-bold text-gray-900 dark:text-white">{msg.username}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-gray-800 dark:text-gray-200">{msg.message}</p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBroadcastModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Megaphone className="text-yellow-500" />
                  전체 메시지 보내기
                </h3>
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    메시지 (최대 200자)
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value.slice(0, 200))}
                    placeholder="모든 유저에게 보낼 메시지를 입력하세요..."
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {broadcastMessage.length} / 200
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    • 확성기 1개가 사용됩니다
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    • 메시지는 30분간 모든 유저에게 표시됩니다
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBroadcastModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleBroadcast}
                    disabled={loading || !broadcastMessage.trim()}
                    className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    전송하기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
