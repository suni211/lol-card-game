import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import type { ReferralInfo } from '../types';
import { Gift, Users, TrendingUp, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Referral: React.FC = () => {
  const { token } = useAuthStore();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralInfo();
  }, []);

  const fetchReferralInfo = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/referral/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReferralInfo(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch referral info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!referralInfo) return;
    navigator.clipboard.writeText(referralInfo.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBonusTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SIGNUP: '가입 보너스',
      MATCH_1: '첫 매치 보너스',
      MATCH_5: '5경기 보너스',
      MATCH_10: '10경기 보너스',
      MATCH_20: '20경기 보너스',
      MATCH_50: '50경기 보너스',
      MATCH_100: '100경기 보너스',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          친구 추천 시스템
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          친구를 초대하고 함께 보상을 받으세요!
        </p>
      </motion.div>

      {/* Referral Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6" />
          <h2 className="text-2xl font-bold">내 추천 코드</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-white/20 rounded-lg px-6 py-4 text-2xl font-mono font-bold tracking-wider">
            {referralInfo?.referralCode || 'Loading...'}
          </div>
          <button
            onClick={copyReferralCode}
            className="bg-white text-blue-600 px-6 py-4 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                복사됨!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                복사
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold">총 추천 인원</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {referralInfo?.totalReferrals || 0}명
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold">총 획득 보너스</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {referralInfo?.totalBonus.toLocaleString() || 0}P
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold">가입 보너스</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">500P</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            양측 모두 획득
          </p>
        </motion.div>
      </div>

      {/* Reward Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
      >
        <h2 className="text-2xl font-bold mb-4">매치 보너스 마일스톤</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          추천한 친구가 게임을 플레이할 때마다 양측 모두 보너스를 받습니다!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { matches: 1, bonus: 100 },
            { matches: 5, bonus: 250 },
            { matches: 10, bonus: 500 },
            { matches: 20, bonus: 1000 },
            { matches: 50, bonus: 2500 },
            { matches: 100, bonus: 5000 },
          ].map((milestone) => (
            <div
              key={milestone.matches}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 text-center"
            >
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {milestone.matches}경기
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {milestone.bonus}P
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Referred Users */}
      {referralInfo && referralInfo.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">내가 추천한 친구들</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">닉네임</th>
                  <th className="text-left py-3 px-4">티어</th>
                  <th className="text-left py-3 px-4">레벨</th>
                  <th className="text-right py-3 px-4">플레이한 경기</th>
                  <th className="text-right py-3 px-4">총 보너스</th>
                  <th className="text-left py-3 px-4">가입일</th>
                </tr>
              </thead>
              <tbody>
                {referralInfo.referrals.map((referred) => (
                  <tr
                    key={referred.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-4 font-semibold">{referred.username}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {referred.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">{referred.level}</td>
                    <td className="py-3 px-4 text-right">
                      {referred.referred_match_count}경기
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                      {(referred.signup_bonus_points + referred.total_match_bonus).toLocaleString()}P
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(referred.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Recent Bonuses */}
      {referralInfo && referralInfo.recentBonuses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold mb-4">최근 보너스 내역</h2>
          <div className="space-y-3">
            {referralInfo.recentBonuses.map((bonus, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-semibold">{getBonusTypeLabel(bonus.bonus_type)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {bonus.referred_username}
                    {bonus.match_count > 0 && ` • ${bonus.match_count}경기 달성`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 dark:text-green-400">
                    +{bonus.referrer_bonus.toLocaleString()}P
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(bonus.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 bg-blue-50 dark:bg-gray-700 rounded-lg p-6"
      >
        <h3 className="text-xl font-bold mb-4">친구 추천 방법</h3>
        <ol className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>1. 위의 추천 코드를 복사하여 친구에게 전달하세요.</li>
          <li>2. 친구가 회원가입 시 추천 코드를 입력합니다.</li>
          <li>3. 가입 즉시 양측 모두 500P를 받습니다!</li>
          <li>4. 친구가 게임을 플레이할 때마다 추가 보너스를 받습니다.</li>
          <li className="text-red-600 dark:text-red-400 font-semibold">
            ⚠ 주의: 동일한 IP에서는 추천 코드를 사용할 수 없습니다.
          </li>
        </ol>
      </motion.div>
    </div>
  );
};

export default Referral;
