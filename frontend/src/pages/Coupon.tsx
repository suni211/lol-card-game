import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Gift, Ticket, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Redemption {
  id: number;
  code: string;
  type: string;
  description: string;
  reward_type: string;
  reward_details: string;
  redeemed_at: string;
}

export default function Coupon() {
  const { token } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/coupon/my-redemptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRedemptions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch redemptions:', error);
    }
  };

  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      setMessage({ type: 'error', text: '쿠폰 코드를 입력해주세요' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/coupon/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `쿠폰이 성공적으로 사용되었습니다! ${getRewardText(data.data)}`,
        });
        setCouponCode('');
        fetchRedemptions();
      } else {
        setMessage({ type: 'error', text: data.error || '쿠폰 사용 실패' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다' });
    } finally {
      setLoading(false);
    }
  };

  const getRewardText = (data: any) => {
    if (data.type === 'POINTS') {
      return `${data.reward.points}P 획득`;
    } else if (data.type === 'CARD') {
      return `${data.reward.player} (${data.reward.tier}) 카드 획득`;
    } else if (data.type === 'PACK') {
      return `${data.reward.packType} 팩 ${data.reward.count}개 획득`;
    }
    return '';
  };

  const formatRewardDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      if (parsed.points) return `${parsed.points}P`;
      if (parsed.player) return `${parsed.player} (${parsed.tier})`;
      if (parsed.packType) return `${parsed.packType} x${parsed.count}`;
    } catch {
      return details;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gift className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">쿠폰 사용</h1>
          </div>
          <p className="text-gray-400">쿠폰 코드를 입력하여 보상을 받으세요!</p>
        </motion.div>

        {/* Coupon Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <Ticket className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">쿠폰 코드 입력</h2>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="LOL-XXXX-XXXX-XXXX"
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors font-mono text-lg"
              maxLength={50}
              onKeyPress={(e) => e.key === 'Enter' && handleRedeem()}
            />
            <button
              onClick={handleRedeem}
              disabled={loading || !couponCode.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '처리중...' : '사용하기'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Redemption History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">사용 내역</h2>
          </div>

          {redemptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>아직 사용한 쿠폰이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <motion.div
                  key={redemption.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-purple-400 font-mono font-bold">
                          {redemption.code}
                        </code>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            redemption.reward_type === 'POINTS'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : redemption.reward_type === 'CARD'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {redemption.reward_type}
                        </span>
                      </div>
                      {redemption.description && (
                        <p className="text-gray-400 text-sm mb-1">{redemption.description}</p>
                      )}
                      <p className="text-green-400 font-bold">
                        보상: {formatRewardDetails(redemption.reward_details)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(redemption.redeemed_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
