import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trophy,
  Star,
  Crown,
  Shield,
  UserPlus,
  LogOut,
  CheckCircle,
  Clock,
  Settings,
  X,
  Check,
  Trash2,
  Bell,
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { Guild, GuildMission, GuildJoinRequest } from '../types';
import GuildChat from '../components/GuildChat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    IRON: 'text-gray-400',
    BRONZE: 'text-orange-400',
    SILVER: 'text-gray-300',
    GOLD: 'text-yellow-400',
    PLATINUM: 'text-cyan-400',
    DIAMOND: 'text-blue-400',
    MASTER: 'text-purple-400',
    CHALLENGER: 'text-red-400',
  };
  return colors[tier] || 'text-gray-400';
};

export default function GuildPage() {
  const { user, token, updateUser } = useAuthStore();
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [missions, setMissions] = useState<GuildMission[]>([]);
  const [joinRequests, setJoinRequests] = useState<GuildJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGuildList, setShowGuildList] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // 길드 생성 폼
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    description: '',
  });

  // 길드 설정 폼
  const [settingsForm, setSettingsForm] = useState({
    auto_accept: false,
    description: '',
  });

  useEffect(() => {
    fetchMyGuild();
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (myGuild) {
      fetchMissions();
      if (myGuild.myRole === 'LEADER' || myGuild.myRole === 'OFFICER') {
        fetchJoinRequests();
      }
      setSettingsForm({
        auto_accept: myGuild.auto_accept || false,
        description: myGuild.description || '',
      });
    }
  }, [myGuild]);

  const fetchMyGuild = async () => {
    if (!token) return;
    try {
      console.log('[Guild] Fetching my guild...');
      const response = await axios.get(`${API_URL}/guild/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Guild] My guild response:', response.data);
      if (response.data.data) {
        setMyGuild(response.data.data);
        // user 정보도 업데이트
        if (user) {
          updateUser({
            guild_id: response.data.data.id,
            guild_name: response.data.data.name,
            guild_tag: response.data.data.tag,
          });
        }
      } else {
        setMyGuild(null);
        // 길드가 없으면 user 정보에서도 제거
        if (user && user.guild_id) {
          updateUser({
            guild_id: undefined,
            guild_name: undefined,
            guild_tag: undefined,
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch my guild:', error);
      console.error('Error details:', error.response?.data);
      alert('내 길드 정보를 불러오는데 실패했습니다: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchGuilds = async () => {
    if (!token) return;
    try {
      console.log('[Guild] Fetching guilds list...');
      const response = await axios.get(`${API_URL}/guild`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Guild] Guilds list response:', response.data);
      setGuilds(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch guilds:', error);
      console.error('Error details:', error.response?.data);
      alert('길드 목록을 불러오는데 실패했습니다: ' + (error.response?.data?.error || error.message));
    }
  };

  const fetchMissions = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/guild/missions/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMissions(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch missions:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/guild/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJoinRequests(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const handleCreateGuild = async () => {
    if (!token) return;
    try {
      if (!createForm.name || !createForm.tag) {
        alert('길드 이름과 태그를 입력해주세요.');
        return;
      }

      if (createForm.tag.length !== 3) {
        alert('길드 태그는 정확히 3글자여야 합니다.');
        return;
      }

      if (!user || user.points < 50000) {
        alert('길드 생성에 필요한 포인트가 부족합니다. (필요: 50,000)');
        return;
      }

      const response = await axios.post(`${API_URL}/guild/create`, createForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowCreateModal(false);
        setCreateForm({ name: '', tag: '', description: '' });
        if (user && response.data.data) {
          updateUser({
            points: response.data.data.pointsRemaining,
            guild_id: response.data.data.guildId,
            guild_name: response.data.data.name,
            guild_tag: response.data.data.tag,
          });
        }
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '길드 생성에 실패했습니다.');
    }
  };

  const handleJoinGuild = async (guildId: number) => {
    if (!token) return;
    try {
      const response = await axios.post(`${API_URL}/guild/join/${guildId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowGuildList(false);
        // user 정보 즉시 업데이트
        if (user && response.data.data) {
          updateUser({
            guild_id: response.data.data.guildId,
            guild_name: response.data.data.guildName,
            guild_tag: response.data.data.guildTag,
          });
        }
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '길드 가입에 실패했습니다.');
    }
  };

  const handleLeaveGuild = async () => {
    if (!token) return;
    if (!confirm('정말로 길드를 탈퇴하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/guild/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(response.data.message);
        setMyGuild(null);
        // user 정보에서 길드 정보 제거
        if (user) {
          updateUser({
            guild_id: undefined,
            guild_name: undefined,
            guild_tag: undefined,
          });
        }
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '길드 탈퇴에 실패했습니다.');
    }
  };

  const handleDisbandGuild = async () => {
    if (!token) return;
    if (!confirm('정말로 길드를 해체하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    if (!confirm('모든 멤버가 탈퇴되고 길드 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/guild/disband`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(response.data.message);
        setMyGuild(null);
        // user 정보에서 길드 정보 제거
        if (user) {
          updateUser({
            guild_id: undefined,
            guild_name: undefined,
            guild_tag: undefined,
          });
        }
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '길드 해체에 실패했습니다.');
    }
  };

  const handleUpdateSettings = async () => {
    if (!token) return;
    try {
      const response = await axios.patch(`${API_URL}/guild/settings`, settingsForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowSettingsModal(false);
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '설정 업데이트에 실패했습니다.');
    }
  };

  const handleJoinRequest = async (requestId: number, action: 'accept' | 'reject') => {
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_URL}/guild/requests/${requestId}/${action}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchJoinRequests();
        fetchMyGuild();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '처리에 실패했습니다.');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'LEADER':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'OFFICER':
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return <UserPlus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'LEADER':
        return '길드장';
      case 'OFFICER':
        return '부길드장';
      default:
        return '멤버';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'HARD':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '쉬움';
      case 'MEDIUM':
        return '보통';
      case 'HARD':
        return '어려움';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Users className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">길드</h1>
          </div>

          {!myGuild && (
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGuildList(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>길드 목록</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>길드 생성 (50,000P)</span>
              </motion.button>
            </div>
          )}

          {myGuild && (myGuild.myRole === 'LEADER' || myGuild.myRole === 'OFFICER') && (
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  fetchJoinRequests();
                  setShowRequestsModal(true);
                }}
                className="relative flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span>가입 신청</span>
                {joinRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {joinRequests.length}
                  </span>
                )}
              </motion.button>
              {myGuild.myRole === 'LEADER' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>설정</span>
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* 길드 없을 때 */}
        {!myGuild ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-12 text-center"
          >
            <Users className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">길드에 가입하세요!</h2>
            <p className="text-gray-300 mb-8">
              길드에 가입하여 다른 플레이어들과 함께 주간 미션을 완료하고 보상을 받으세요.
            </p>
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGuildList(true)}
                className="flex items-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-lg"
              >
                <Users className="w-5 h-5" />
                <span>길드 찾기</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors text-lg"
              >
                <Plus className="w-5 h-5" />
                <span>길드 만들기</span>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          // 길드 있을 때
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 길드 정보 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 길드 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-3xl font-bold text-white">{myGuild.name}</h2>
                      <span className="px-3 py-1 bg-purple-600 text-white font-bold rounded-lg text-sm">
                        [{myGuild.tag}]
                      </span>
                      {myGuild.auto_accept && (
                        <span className="px-3 py-1 bg-green-600 text-white font-bold rounded-lg text-xs">
                          자동 가입
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300">{myGuild.description || '길드 설명이 없습니다.'}</p>
                  </div>
                  <div className="flex space-x-2">
                    {myGuild.myRole !== 'LEADER' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLeaveGuild}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>탈퇴</span>
                      </motion.button>
                    )}
                    {myGuild.myRole === 'LEADER' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDisbandGuild}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>해체</span>
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm">길드 레벨</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{myGuild.level}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-blue-400 mb-2">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">길드 포인트</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{myGuild.points.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">멤버</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {myGuild.member_count}/{myGuild.max_members}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-purple-400 mb-2">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm">내 역할</span>
                    </div>
                    <div className="text-lg font-bold text-white">{getRoleLabel(myGuild.myRole || 'MEMBER')}</div>
                  </div>
                </div>
              </motion.div>

              {/* 주간 미션 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                  <h3 className="text-2xl font-bold text-white">주간 미션</h3>
                </div>

                <div className="space-y-4">
                  {missions.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">주간 미션이 없습니다.</div>
                  ) : (
                    missions.map((mission) => (
                      <motion.div
                        key={mission.weekly_mission_id}
                        whileHover={{ scale: 1.02 }}
                        className={`bg-gradient-to-r ${
                          mission.is_completed
                            ? 'from-green-900/30 to-emerald-900/30 border-green-500/30'
                            : 'from-gray-900/50 to-gray-800/50 border-gray-700/30'
                        } border rounded-xl p-4`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg font-bold text-white">{mission.title}</span>
                              <span className={`text-xs font-bold ${getDifficultyColor(mission.difficulty)}`}>
                                [{getDifficultyLabel(mission.difficulty)}]
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{mission.description}</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {mission.is_completed ? (
                              <CheckCircle className="w-6 h-6 text-green-400" />
                            ) : (
                              <Clock className="w-6 h-6 text-yellow-400" />
                            )}
                          </div>
                        </div>

                        {/* 진행도 바 */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">진행도</span>
                            <span className="text-white font-bold">
                              {mission.current_progress} / {mission.requirement}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min((mission.current_progress / mission.requirement) * 100, 100)}%`,
                              }}
                              className={`h-full ${
                                mission.is_completed
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">보상</span>
                          <span className="text-lg font-bold text-yellow-400">
                            +{mission.reward_points.toLocaleString()}P
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* 멤버 목록 및 채팅 */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h3 className="text-2xl font-bold text-white">멤버 ({myGuild.member_count})</h3>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myGuild.members && myGuild.members.length > 0 ? (
                    myGuild.members.map((member) => (
                      <motion.div
                        key={member.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            <span className="font-bold text-white">{member.username}</span>
                            {member.level && (
                              <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded">
                                LV {member.level}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-bold ${getTierColor(member.tier)}`}>{member.tier}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">
                            {member.wins}승 {member.losses}패
                          </span>
                          <span className="text-purple-400 font-bold">{member.contribution.toLocaleString()} 기여도</span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">멤버가 없습니다.</div>
                  )}
                </div>
              </motion.div>

              {/* 길드 채팅 */}
              <GuildChat guildId={myGuild.id} guildTag={myGuild.tag} />
            </div>
          </div>
        )}

        {/* 길드 생성 모달 */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500 rounded-2xl p-8 max-w-md w-full"
              >
                <h2 className="text-3xl font-bold text-white mb-6">길드 생성</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">길드 이름</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      maxLength={50}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="길드 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">길드 태그 (3글자)</label>
                    <input
                      type="text"
                      value={createForm.tag}
                      onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                      maxLength={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-bold focus:outline-none focus:border-purple-500"
                      placeholder="예: AAA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">길드 설명 (선택)</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      maxLength={200}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                      placeholder="길드 소개를 입력하세요"
                    />
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      <strong>비용: 50,000 포인트</strong>
                      <br />
                      현재 보유: {user?.points.toLocaleString() || 0} 포인트
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateGuild}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition-colors"
                  >
                    생성하기
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                  >
                    취소
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 길드 목록 모달 */}
        <AnimatePresence>
          {showGuildList && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowGuildList(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">길드 목록</h2>

                <div className="space-y-3">
                  {guilds.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">길드가 없습니다.</div>
                  ) : (
                    guilds.map((guild) => (
                      <motion.div
                        key={guild.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xl font-bold text-white">{guild.name}</span>
                                <span className="px-2 py-0.5 bg-purple-600 text-white font-bold rounded text-sm">
                                  [{guild.tag}]
                                </span>
                                {guild.auto_accept && (
                                  <span className="px-2 py-0.5 bg-green-600 text-white font-bold rounded text-xs">
                                    자동 가입
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">{guild.description || '길드 설명이 없습니다.'}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-center">
                              <div className="text-gray-400">레벨</div>
                              <div className="text-yellow-400 font-bold">{guild.level}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-400">멤버</div>
                              <div className="text-green-400 font-bold">
                                {guild.member_count}/{guild.max_members}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-400">포인트</div>
                              <div className="text-blue-400 font-bold">{guild.points.toLocaleString()}</div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinGuild(guild.id);
                              }}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
                              disabled={guild.member_count >= guild.max_members}
                            >
                              {guild.member_count >= guild.max_members ? '정원 초과' : '가입'}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="mt-6 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowGuildList(false)}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                  >
                    닫기
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 길드 설정 모달 */}
        <AnimatePresence>
          {showSettingsModal && myGuild && myGuild.myRole === 'LEADER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowSettingsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500 rounded-2xl p-8 max-w-md w-full"
              >
                <h2 className="text-3xl font-bold text-white mb-6">길드 설정</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-bold text-white mb-1">자동 가입 승인</div>
                      <div className="text-sm text-gray-400">가입 신청 시 자동으로 승인됩니다</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.auto_accept}
                        onChange={(e) => setSettingsForm({ ...settingsForm, auto_accept: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">길드 설명</label>
                    <textarea
                      value={settingsForm.description}
                      onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                      maxLength={200}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                      placeholder="길드 소개를 입력하세요"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateSettings}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition-colors"
                  >
                    저장
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                  >
                    취소
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 가입 신청 모달 */}
        <AnimatePresence>
          {showRequestsModal && (myGuild?.myRole === 'LEADER' || myGuild?.myRole === 'OFFICER') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowRequestsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500 rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">가입 신청 ({joinRequests.length})</h2>

                <div className="space-y-4">
                  {joinRequests.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">대기 중인 가입 신청이 없습니다.</div>
                  ) : (
                    joinRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xl font-bold text-white">{request.username}</span>
                                {request.level && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded">
                                    LV {request.level}
                                  </span>
                                )}
                                <span className={`text-xs font-bold ${getTierColor(request.tier)}`}>
                                  {request.tier}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                {request.wins}승 {request.losses}패 · 레이팅 {request.rating}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleJoinRequest(request.id, 'accept')}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>수락</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleJoinRequest(request.id, 'reject')}
                              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>거절</span>
                            </motion.button>
                          </div>
                        </div>

                        {request.message && (
                          <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">가입 메시지</div>
                            <div className="text-sm text-white">{request.message}</div>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          신청일: {new Date(request.created_at).toLocaleString('ko-KR')}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="mt-6 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowRequestsModal(false)}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                  >
                    닫기
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
