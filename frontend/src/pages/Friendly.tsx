import { useState, useEffect } from 'react';
import { Search, Send, Check, X, Swords, Users, Trophy, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface User {
  id: number;
  username: string;
  rating: number;
  level: number;
  points: number;
  title_name?: string;
  title_color?: string;
  title_rarity?: string;
}

interface Invite {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: string;
  created_at: string;
  sender_username: string;
  sender_rating: number;
  sender_level: number;
  sender_title_name?: string;
  sender_title_color?: string;
  receiver_username?: string;
  receiver_rating?: number;
  receiver_level?: number;
}

export default function Friendly() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'received' | 'sent'>('users');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchInvites, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchInvites()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/friendly/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery || undefined },
      });

      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchInvites = async () => {
    try {
      const [received, sent] = await Promise.all([
        axios.get(`${API_URL}/friendly/invites`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/friendly/invites/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (received.data.success) {
        setReceivedInvites(received.data.data);
      }

      if (sent.data.success) {
        setSentInvites(sent.data.data);
      }
    } catch (error: any) {
      console.error('Fetch invites error:', error);
    }
  };

  const sendInvite = async (receiverId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/friendly/invite`,
        { receiverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '초대 전송에 실패했습니다');
    }
  };

  const acceptInvite = async (inviteId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/friendly/accept/${inviteId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('매치가 생성되었습니다!');
        // Navigate to match page
        navigate(`/match`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '초대 수락에 실패했습니다');
      fetchInvites();
    }
  };

  const declineInvite = async (inviteId: number) => {
    try {
      const response = await axios.delete(`${API_URL}/friendly/invite/${inviteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '초대 처리에 실패했습니다');
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Swords className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">1:1 친선전</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">친구와 대결하세요</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'users'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            유저 목록
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors relative ${
              activeTab === 'received'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Clock className="w-5 h-5 inline mr-2" />
            받은 초대
            {receivedInvites.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {receivedInvites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'sent'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Send className="w-5 h-5 inline mr-2" />
            보낸 초대
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="유저 이름으로 검색..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors"
                >
                  검색
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {users.map((user) => {
                const hasSentInvite = sentInvites.some((inv) => inv.receiver_id === user.id);

                return (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {user.username}
                            </h3>
                            {user.title_name && (
                              <span
                                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: user.title_color || '#3B82F6' }}
                              >
                                {user.title_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-4 h-4" />
                              {user.rating} RP
                            </span>
                            <span>레벨 {user.level}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => sendInvite(user.id)}
                        disabled={hasSentInvite}
                        className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                          hasSentInvite
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                        }`}
                      >
                        {hasSentInvite ? '초대 전송됨' : '대전 초대'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {users.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-4">
            {receivedInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
                      {invite.sender_username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {invite.sender_username}
                        </h3>
                        {invite.sender_title_name && (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: invite.sender_title_color || '#3B82F6' }}
                          >
                            {invite.sender_title_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {invite.sender_rating} RP
                        </span>
                        <span>레벨 {invite.sender_level}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(invite.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptInvite(invite.id)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      수락
                    </button>
                    <button
                      onClick={() => declineInvite(invite.id)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      거절
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {receivedInvites.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">받은 초대가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-4">
            {sentInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                      {invite.receiver_username![0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {invite.receiver_username}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {invite.receiver_rating} RP
                        </span>
                        <span>레벨 {invite.receiver_level}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(invite.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => declineInvite(invite.id)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ))}

            {sentInvites.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">보낸 초대가 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
