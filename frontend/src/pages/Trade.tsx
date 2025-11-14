import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Check, X, Search, Send } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { UserCard } from '../types';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Trade {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_card_id: number;
  receiver_card_id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at?: string;
  sender_username?: string;
  receiver_username?: string;
  sender_tier?: string;
  receiver_tier?: string;
  sender_rating?: number;
  receiver_rating?: number;
  sender_player_name: string;
  sender_player_team: string;
  sender_player_position: string;
  sender_player_overall: number;
  sender_player_tier: string;
  sender_card_level: number;
  receiver_player_name: string;
  receiver_player_team: string;
  receiver_player_position: string;
  receiver_player_overall: number;
  receiver_player_tier: string;
  receiver_card_level: number;
}

export default function Trade() {
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'history'>('received');
  const { user, token } = useAuthStore();

  // Send trade state
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [selectedMyCard, setSelectedMyCard] = useState<UserCard | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [targetCards, setTargetCards] = useState<UserCard[]>([]);
  const [selectedTargetCard, setSelectedTargetCard] = useState<UserCard | null>(null);
  const [loadingTargetCards, setLoadingTargetCards] = useState(false);

  // Received trades
  const [receivedTrades, setReceivedTrades] = useState<Trade[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);

  // Trade history
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'send') {
      fetchMyCards();
    } else if (activeTab === 'received') {
      fetchReceivedTrades();
    } else if (activeTab === 'history') {
      fetchTradeHistory();
    }
  }, [activeTab]);

  const fetchMyCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyCards(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch my cards:', error);
      toast.error('카드 목록을 불러오지 못했습니다');
    }
  };

  const fetchTargetUserCards = async () => {
    if (!targetUsername.trim()) {
      toast.error('사용자명을 입력하세요');
      return;
    }

    try {
      setLoadingTargetCards(true);
      const response = await axios.get(`${API_URL}/gacha/user-cards/${targetUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTargetCards(response.data.data || []);
      if (response.data.data.length === 0) {
        toast('해당 사용자가 보유한 카드가 없습니다', { icon: 'ℹ️' });
      }
    } catch (error: any) {
      console.error('Failed to fetch target user cards:', error);
      if (error.response?.status === 404) {
        toast.error('사용자를 찾을 수 없습니다');
      } else {
        toast.error('카드 목록을 불러오지 못했습니다');
      }
      setTargetCards([]);
    } finally {
      setLoadingTargetCards(false);
    }
  };

  const fetchReceivedTrades = async () => {
    try {
      setLoadingReceived(true);
      const response = await axios.get(`${API_URL}/trade/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceivedTrades(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch received trades:', error);
      toast.error('받은 트레이드를 불러오지 못했습니다');
    } finally {
      setLoadingReceived(false);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(`${API_URL}/trade/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTradeHistory(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      toast.error('트레이드 기록을 불러오지 못했습니다');
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendTradeRequest = async () => {
    if (!selectedMyCard || !selectedTargetCard) {
      toast.error('교환할 카드를 모두 선택하세요');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/trade/send`,
        {
          receiverUsername: targetUsername,
          senderCardId: selectedMyCard.id,
          receiverCardId: selectedTargetCard.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('트레이드 요청을 보냈습니다!');
      setSelectedMyCard(null);
      setSelectedTargetCard(null);
      setTargetUsername('');
      setTargetCards([]);
    } catch (error: any) {
      console.error('Failed to send trade:', error);
      toast.error(error.response?.data?.error || '트레이드 요청 실패');
    }
  };

  const acceptTrade = async (tradeId: number) => {
    try {
      await axios.post(
        `${API_URL}/trade/${tradeId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('트레이드를 수락했습니다!');
      fetchReceivedTrades();
    } catch (error: any) {
      console.error('Failed to accept trade:', error);
      toast.error(error.response?.data?.error || '트레이드 수락 실패');
    }
  };

  const rejectTrade = async (tradeId: number) => {
    try {
      await axios.post(
        `${API_URL}/trade/${tradeId}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('트레이드를 거절했습니다');
      fetchReceivedTrades();
    } catch (error: any) {
      console.error('Failed to reject trade:', error);
      toast.error(error.response?.data?.error || '트레이드 거절 실패');
    }
  };

  const cancelTrade = async (tradeId: number) => {
    try {
      await axios.post(
        `${API_URL}/trade/${tradeId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('트레이드를 취소했습니다');
    } catch (error: any) {
      console.error('Failed to cancel trade:', error);
      toast.error(error.response?.data?.error || '트레이드 취소 실패');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'LEGENDARY':
        return 'from-yellow-400 to-orange-500';
      case 'EPIC':
        return 'from-purple-400 to-pink-500';
      case 'RARE':
        return 'from-blue-400 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'TOP':
        return 'bg-red-500';
      case 'JUNGLE':
        return 'bg-green-500';
      case 'MID':
        return 'bg-blue-500';
      case 'ADC':
        return 'bg-yellow-500';
      case 'SUPPORT':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold">수락됨</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-semibold">거절됨</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold">취소됨</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs font-semibold">대기중</span>;
    }
  };

  const renderCard = (card: UserCard, onClick?: () => void, isSelected?: boolean) => (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-4 ring-primary-500 scale-105' : 'hover:scale-105'
      }`}
    >
      <div className={`bg-gradient-to-br ${getTierColor(card.player.tier)} p-1 rounded-lg`}>
        <div className="bg-white dark:bg-gray-800 rounded-md p-2">
          <div className="flex justify-between items-center mb-1">
            <span className={`${getPositionColor(card.player.position)} text-white text-xs px-1 py-0.5 rounded`}>
              {card.player.position}
            </span>
            {card.level > 0 && (
              <span className="text-xs font-bold text-yellow-600">+{card.level}</span>
            )}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-1">
              {card.player.name[0]}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {card.player.name}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {card.player.team}
            </div>
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">
              {card.player.overall + card.level}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTradeCard = (trade: Trade, isReceived: boolean) => {
    const senderCard = {
      player_name: trade.sender_player_name,
      player_team: trade.sender_player_team,
      player_position: trade.sender_player_position,
      player_overall: trade.sender_player_overall,
      player_tier: trade.sender_player_tier,
      card_level: trade.sender_card_level,
    };

    const receiverCard = {
      player_name: trade.receiver_player_name,
      player_team: trade.receiver_player_team,
      player_position: trade.receiver_player_position,
      player_overall: trade.receiver_player_overall,
      player_tier: trade.receiver_player_tier,
      card_level: trade.receiver_card_level,
    };

    return (
      <div key={trade.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isReceived ? '보낸 사람' : '받는 사람'}: <span className="font-semibold text-gray-900 dark:text-white">
                {isReceived ? trade.sender_username : trade.receiver_username}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {new Date(trade.created_at).toLocaleString('ko-KR')}
            </div>
          </div>
          {getStatusBadge(trade.status)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sender's card */}
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">
              {isReceived ? '상대방 카드' : '내 카드'}
            </div>
            <div className={`bg-gradient-to-br ${getTierColor(senderCard.player_tier)} p-1 rounded-lg`}>
              <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`${getPositionColor(senderCard.player_position)} text-white text-xs px-2 py-0.5 rounded`}>
                    {senderCard.player_position}
                  </span>
                  {senderCard.card_level > 0 && (
                    <span className="text-xs font-bold text-yellow-600">+{senderCard.card_level}</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mb-1">
                    {senderCard.player_name[0]}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {senderCard.player_name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {senderCard.player_team}
                  </div>
                  <div className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                    {senderCard.player_overall + senderCard.card_level}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRightLeft className="w-8 h-8 text-gray-400" />
          </div>

          {/* Receiver's card */}
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">
              {isReceived ? '내 카드' : '상대방 카드'}
            </div>
            <div className={`bg-gradient-to-br ${getTierColor(receiverCard.player_tier)} p-1 rounded-lg`}>
              <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`${getPositionColor(receiverCard.player_position)} text-white text-xs px-2 py-0.5 rounded`}>
                    {receiverCard.player_position}
                  </span>
                  {receiverCard.card_level > 0 && (
                    <span className="text-xs font-bold text-yellow-600">+{receiverCard.card_level}</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mb-1">
                    {receiverCard.player_name[0]}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {receiverCard.player_name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {receiverCard.player_team}
                  </div>
                  <div className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                    {receiverCard.player_overall + receiverCard.card_level}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {trade.status === 'PENDING' && (
          <div className="flex space-x-2 mt-4">
            {isReceived ? (
              <>
                <button
                  onClick={() => acceptTrade(trade.id)}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>수락</span>
                </button>
                <button
                  onClick={() => rejectTrade(trade.id)}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>거절</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => cancelTrade(trade.id)}
                className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                취소
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mb-4">
            <ArrowRightLeft className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            트레이드
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            다른 유저와 카드를 교환하세요
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'received'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              받은 요청
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 보내기
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 기록
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Send Trade Tab */}
          {activeTab === 'send' && (
            <motion.div
              key="send"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Search for user */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  1. 트레이드 상대 찾기
                </h3>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="사용자명 입력..."
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && fetchTargetUserCards()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={fetchTargetUserCards}
                    disabled={loadingTargetCards}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                  >
                    {loadingTargetCards ? '검색 중...' : '검색'}
                  </button>
                </div>
              </div>

              {/* Select my card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  2. 내 카드 선택
                </h3>
                {myCards.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                    보유한 카드가 없습니다
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {myCards.map((card) => renderCard(card, () => setSelectedMyCard(card), selectedMyCard?.id === card.id))}
                  </div>
                )}
              </div>

              {/* Select target card */}
              {targetCards.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    3. 상대방 카드 선택
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {targetCards.map((card) => renderCard(card, () => setSelectedTargetCard(card), selectedTargetCard?.id === card.id))}
                  </div>
                </div>
              )}

              {/* Send button */}
              {selectedMyCard && selectedTargetCard && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-primary-500"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">내 카드</div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {selectedMyCard.player.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedMyCard.player.team}
                      </div>
                    </div>
                    <ArrowRightLeft className="w-8 h-8 text-primary-600 mx-4" />
                    <div className="flex-1 text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">상대방 카드</div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {selectedTargetCard.player.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedTargetCard.player.team}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={sendTradeRequest}
                    className="w-full py-3 px-6 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <Send className="w-5 h-5" />
                    <span>트레이드 요청 보내기</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Received Trades Tab */}
          {activeTab === 'received' && (
            <motion.div
              key="received"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loadingReceived ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : receivedTrades.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                  <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    받은 트레이드 요청이 없습니다
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    트레이드 요청이 오면 여기에 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {receivedTrades.map((trade) => renderTradeCard(trade, true))}
                </div>
              )}
            </motion.div>
          )}

          {/* Trade History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loadingHistory ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : tradeHistory.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                  <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    트레이드 기록이 없습니다
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    완료된 트레이드 내역이 여기에 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tradeHistory.map((trade) => {
                    const isReceived = trade.receiver_id === user?.id;
                    return renderTradeCard(trade, isReceived);
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
