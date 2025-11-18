import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import type { ClanWarSeason, ClanWarGuildStats, ClanWarContribution } from '../types';
import { Swords, Trophy, TrendingUp, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ClanWar: React.FC = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<ClanWarSeason | null>(null);
  const [guildStats, setGuildStats] = useState<ClanWarGuildStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<ClanWarGuildStats[]>([]);
  const [contributions, setContributions] = useState<ClanWarContribution[]>([]);
  const [myContribution, setMyContribution] = useState<ClanWarContribution | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token || !user?.guild_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch current season
      const seasonRes = await axios.get(`${API_URL}/clan-war/season/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSeason(seasonRes.data.data);

      if (!seasonRes.data.data) {
        setLoading(false);
        return;
      }

      // Fetch guild stats
      const statsRes = await axios.get(`${API_URL}/clan-war/stats/${user.guild_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGuildStats(statsRes.data.data);

      // Fetch leaderboard
      const leaderboardRes = await axios.get(`${API_URL}/clan-war/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(leaderboardRes.data.data);

      // Fetch guild contributions
      const contributionsRes = await axios.get(
        `${API_URL}/clan-war/contributions/guild/${user.guild_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setContributions(contributionsRes.data.data);

      // Fetch my contribution
      const myContribRes = await axios.get(`${API_URL}/clan-war/contributions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyContribution(myContribRes.data.data);
    } catch (error: any) {
      console.error('Failed to fetch clan war data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const startMatchmaking = async () => {
    if (!token) return;

    try {
      setIsMatchmaking(true);
      const response = await axios.post(
        `${API_URL}/clan-war/matchmaking/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data.status === 'WAITING') {
        toast.success('상대를 찾는 중입니다...');
        // Poll for match status
        pollMatchStatus();
      } else if (response.data.data.status === 'IN_PROGRESS') {
        toast.success('매칭 성공! 전투 시작!');
        // Navigate to VS mode or realtime match
        navigate('/vsmode');
      }
    } catch (error: any) {
      console.error('Matchmaking error:', error);
      toast.error(error.response?.data?.error || '매칭 실패');
      setIsMatchmaking(false);
    }
  };

  const cancelMatchmaking = async () => {
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/clan-war/matchmaking/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsMatchmaking(false);
      toast.success('매칭이 취소되었습니다');
    } catch (error: any) {
      console.error('Cancel matchmaking error:', error);
      toast.error('취소 실패');
    }
  };

  const pollMatchStatus = () => {
    // TODO: Implement polling or socket.io for match status
    // For now, just set timeout
    setTimeout(() => {
      setIsMatchmaking(false);
    }, 30000);
  };

  if (!user?.guild_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Swords className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-2xl font-bold mb-2">길드 전쟁</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            길드에 가입해야 참여할 수 있습니다
          </p>
          <button
            onClick={() => navigate('/guild')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            길드 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          현재 진행중인 시즌이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Swords className="w-8 h-8 text-red-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            길드 전쟁
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          다른 길드와 전투하여 명예와 보상을 획득하세요!
        </p>
      </motion.div>

      {/* Season Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-red-500 to-orange-600 rounded-lg p-6 mb-6 text-white"
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">시즌 {season.season_number}</h2>
            <p className="text-white/80">
              {new Date(season.start_date).toLocaleDateString()} ~{' '}
              {new Date(season.end_date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/80">내 길드</div>
            <div className="text-2xl font-bold">
              [{user.guild_tag}] {user.guild_name}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Matchmaking Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-center"
      >
        {!isMatchmaking ? (
          <button
            onClick={startMatchmaking}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xl font-bold rounded-lg hover:from-red-600 hover:to-orange-600 transform hover:scale-105 transition flex items-center gap-3 mx-auto"
          >
            <Play className="w-6 h-6" />
            전투 시작
          </button>
        ) : (
          <div className="inline-flex flex-col items-center gap-3">
            <div className="animate-pulse text-lg font-semibold">매칭 중...</div>
            <button
              onClick={cancelMatchmaking}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              취소
            </button>
          </div>
        )}
      </motion.div>

      {/* Guild Stats */}
      {guildStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">순위</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">
              {guildStats.rank_position || '-'}위
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">승점</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {guildStats.total_points}P
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-2">전적</h3>
            <p className="text-2xl font-bold">
              <span className="text-blue-600">{guildStats.wins}</span>
              <span className="text-gray-400"> / </span>
              <span className="text-red-600">{guildStats.losses}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              승률:{' '}
              {guildStats.total_matches > 0
                ? ((guildStats.wins / guildStats.total_matches) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-2">내 기여도</h3>
            <p className="text-2xl font-bold text-purple-600">
              {myContribution?.contribution_points || 0}P
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {myContribution?.matches_played || 0}경기 참여
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold mb-4">길드 순위</h2>
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((guild, index) => (
              <div
                key={guild.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  guild.guild_id === user.guild_id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-300 text-gray-700'
                        : index === 2
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">
                      [{guild.guild_tag}] {guild.guild_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {guild.wins}승 {guild.losses}패
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{guild.total_points}P</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Guild Contributors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold mb-4">길드 기여도</h2>
          <div className="space-y-3">
            {contributions.slice(0, 10).map((contrib, index) => (
              <div
                key={contrib.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  contrib.user_id === user.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{contrib.username}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {contrib.wins}승 {contrib.losses}패
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600">
                    {contrib.contribution_points}P
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {contrib.matches_played}경기
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 bg-blue-50 dark:bg-gray-700 rounded-lg p-6"
      >
        <h3 className="text-xl font-bold mb-4">길드 전쟁 안내</h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• 다른 길드 소속 플레이어와 매칭됩니다 (같은 길드끼리는 불가)</li>
          <li>• 승리 시 길드에 승점 3점이 추가됩니다</li>
          <li>• 개인 기여도는 승리당 100점이 지급됩니다</li>
          <li>• 매주 월요일 0시에 시즌이 초기화됩니다</li>
          <li>• 시즌 종료 시 순위에 따라 보상이 지급됩니다</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default ClanWar;
