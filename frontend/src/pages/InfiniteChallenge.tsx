import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import type { InfiniteChallengeProgress, InfiniteChallengeLeaderboard } from '../types';
import { Zap, Play, RotateCcw, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InfiniteChallenge: React.FC = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<InfiniteChallengeProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<InfiniteChallengeLeaderboard[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Fetch progress
      const progressRes = await axios.get(`${API_URL}/infinite-challenge/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgress(progressRes.data.data);

      // Fetch leaderboard
      const leaderboardRes = await axios.get(`${API_URL}/infinite-challenge/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(leaderboardRes.data.data);
    } catch (error: any) {
      console.error('Failed to fetch infinite challenge data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async () => {
    if (!token) return;

    try {
      const response = await axios.post(
        `${API_URL}/infinite-challenge/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setProgress(response.data.data);
      toast.success('무한 도전 시작!');

      // Navigate to AI battle with infinite challenge mode
      navigate('/ai-battle', { state: { infiniteMode: true, stage: 1 } });
    } catch (error: any) {
      console.error('Start challenge error:', error);
      toast.error('시작 실패');
    }
  };

  const continueChallenge = () => {
    if (!progress) return;

    // Navigate to AI battle with current stage
    navigate('/ai-battle', {
      state: { infiniteMode: true, stage: progress.current_stage },
    });
  };

  const calculateReward = (stage: number): number => {
    return stage * 50 + stage * stage * 10;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
          <Zap className="w-8 h-8 text-purple-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            무한 도전
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          AI의 난이도는 끝없이 상승합니다. 당신의 한계를 시험하세요!
        </p>
      </motion.div>

      {/* Current Progress */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 mb-6 text-white"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">현재 스테이지</h2>
              <p className="text-white/80">
                {progress.is_active ? '진행 중' : '대기 중'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{progress.current_stage}</div>
              <div className="text-sm text-white/80">STAGE</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-sm text-white/80">최고 기록</div>
              <div className="text-3xl font-bold">{progress.highest_stage}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-sm text-white/80">총 획득 보상</div>
              <div className="text-3xl font-bold">
                {progress.total_rewards.toLocaleString()}P
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-sm text-white/80">다음 보상</div>
              <div className="text-3xl font-bold">
                {progress.nextReward?.toLocaleString() || 0}P
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 flex gap-4 justify-center"
      >
        {progress?.is_active ? (
          <button
            onClick={continueChallenge}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition flex items-center gap-3"
          >
            <Play className="w-6 h-6" />
            계속하기
          </button>
        ) : (
          <button
            onClick={startChallenge}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition flex items-center gap-3"
          >
            <RotateCcw className="w-6 h-6" />
            새로 시작
          </button>
        )}
      </motion.div>

      {/* Reward Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
      >
        <h2 className="text-2xl font-bold mb-4">보상 테이블</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 5, 10, 20, 30, 50, 70, 100, 150, 200, 300, 500].map((stage) => (
            <div
              key={stage}
              className={`p-4 rounded-lg text-center ${
                progress && progress.highest_stage >= stage
                  ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Stage {stage}
              </div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {calculateReward(stage).toLocaleString()}P
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          보상 공식: Stage × 50 + (Stage² × 10)
        </p>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">주간 리더보드</h2>
        </div>
        <div className="space-y-3">
          {leaderboard.slice(0, 20).map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                entry.user_id === user?.id
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500'
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
                  <div className="font-semibold flex items-center gap-2">
                    {entry.guild_tag && (
                      <span className="text-purple-600 dark:text-purple-400">
                        [{entry.guild_tag}]
                      </span>
                    )}
                    {entry.username}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Lv.{entry.level} • {entry.tier}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-purple-600">
                  Stage {entry.highest_stage}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.total_rewards.toLocaleString()}P 획득
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-purple-50 dark:bg-gray-700 rounded-lg p-6"
      >
        <h3 className="text-xl font-bold mb-4">무한 도전 안내</h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• AI의 난이도는 스테이지마다 상승합니다 (75 → 100+)</li>
          <li>• 한 번 패배하면 도전이 종료되며 처음부터 다시 시작해야 합니다</li>
          <li>• 스테이지를 클리어할 때마다 포인트 보상을 받습니다</li>
          <li>• 보상은 스테이지가 높을수록 기하급수적으로 증가합니다</li>
          <li>
            • 주간 리더보드는 매주 월요일 0시에 초기화되며, 순위에 따라 추가 보상이 지급됩니다
          </li>
          <li className="text-purple-600 dark:text-purple-400 font-semibold">
            • 당신은 몇 스테이지까지 도달할 수 있을까요?
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default InfiniteChallenge;
