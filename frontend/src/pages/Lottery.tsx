import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Gift, Star, History, X } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LotteryNumber {
  number: number;
  picked: boolean;
  grade: string | null;
  reward: any | null;
}

interface LotteryResult {
  grade: string;
  reward: any;
  pointsGained?: number;
  card?: any;
  boardReset?: boolean;
  newPoints: number;
}

interface HistoryItem {
  id: number;
  number: number;
  grade: string;
  reward: any;
  createdAt: string;
}

export default function Lottery() {
  const { token, updateUser } = useAuthStore();
  const [board, setBoard] = useState<LotteryNumber[]>([]);
  const [pickedCount, setPicked] = useState(0);
  const [ticketCost, setTicketCost] = useState(25000);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [result, setResult] = useState<LotteryResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchBoard();
    fetchHistory();
  }, []);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/lottery/board`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setBoard(response.data.data.board);
        setPicked(response.data.data.pickedCount);
        setTicketCost(response.data.data.ticketCost);
      }
    } catch (error: any) {
      console.error('Fetch lottery board error:', error);
      toast.error('복권판을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/lottery/history?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error('Fetch lottery history error:', error);
    }
  };

  const handlePick = async (number: number) => {
    if (picking) return;

    const item = board.find(b => b.number === number);
    if (item?.picked) {
      toast.error('이미 선택한 번호입니다.');
      return;
    }

    try {
      setPicking(true);
      const response = await axios.post(
        `${API_URL}/lottery/pick`,
        { number },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setResult(response.data.data);
        setShowResult(true);

        // Update user points
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.data.success) {
          updateUser(userResponse.data.data);
        }

        // Refresh board
        if (response.data.data.boardReset) {
          toast.success('SSR 당첨! 복권판이 리셋되었습니다!', { duration: 5000 });
        }
        fetchBoard();
        fetchHistory();
      }
    } catch (error: any) {
      console.error('Pick lottery number error:', error);
      toast.error(error.response?.data?.error || '선택에 실패했습니다.');
    } finally {
      setPicking(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'SSR':
        return 'from-yellow-400 via-orange-500 to-red-500';
      case 'SS':
        return 'from-purple-500 to-pink-500';
      case 'S':
        return 'from-blue-500 to-cyan-500';
      case 'A':
        return 'from-green-500 to-emerald-500';
      case 'B':
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getGradeBgColor = (grade: string) => {
    switch (grade) {
      case 'SSR':
        return 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-400';
      case 'SS':
        return 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-400';
      case 'S':
        return 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-400';
      case 'A':
        return 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400';
      case 'B':
      default:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-300';
    }
  };

  const formatReward = (reward: any) => {
    if (!reward) return '';
    if (reward.type === 'points') return reward.name;
    if (reward.type === 'pack') return reward.name;
    if (reward.type === 'icon') return reward.name;
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
            <Ticket className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            럭키 드로우
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            1~49번 중 하나를 선택하여 보상을 획득하세요!
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <span className="text-sm text-gray-600 dark:text-gray-400">뽑기권 가격:</span>
            <span className="font-bold text-orange-600">{ticketCost.toLocaleString()}P</span>
          </div>
        </motion.div>

        {/* Grade Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            등급별 확률
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { grade: 'B', prob: '70%', desc: '1,000P~, 88+팩' },
              { grade: 'A', prob: '20%', desc: '3,000P~, 92+팩' },
              { grade: 'S', prob: '6.25%', desc: '10,000P~, 100+팩' },
              { grade: 'SS', prob: '3.75%', desc: '150,000P~, 103+팩' },
              { grade: 'SSR', prob: '1개 보장', desc: '500,000P~, 110+팩' },
            ].map(({ grade, prob, desc }) => (
              <div
                key={grade}
                className={`p-3 rounded-lg border-2 ${getGradeBgColor(grade)}`}
              >
                <div className={`text-lg font-bold bg-gradient-to-r ${getGradeColor(grade)} bg-clip-text text-transparent`}>
                  {grade}
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{prob}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            * SSR은 49개 중 반드시 1개가 존재하며, SSR 당첨 시 복권판이 리셋됩니다.
          </p>
        </motion.div>

        {/* History Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <History className="w-4 h-4" />
            <span>기록 보기</span>
          </button>
        </div>

        {/* Lottery Board */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              번호 선택
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              선택: {pickedCount} / 49
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {board.map((item) => (
              <motion.button
                key={item.number}
                onClick={() => handlePick(item.number)}
                disabled={item.picked || picking}
                whileHover={!item.picked ? { scale: 1.05 } : {}}
                whileTap={!item.picked ? { scale: 0.95 } : {}}
                className={`
                  aspect-square rounded-lg font-bold text-lg transition-all relative
                  ${item.picked
                    ? `${getGradeBgColor(item.grade || 'B')} border-2 cursor-default`
                    : 'bg-gradient-to-br from-primary-500 to-purple-600 text-white hover:from-primary-600 hover:to-purple-700 shadow-md hover:shadow-lg cursor-pointer'
                  }
                  ${picking ? 'opacity-50' : ''}
                `}
              >
                <span className={item.picked ? `bg-gradient-to-r ${getGradeColor(item.grade || 'B')} bg-clip-text text-transparent` : ''}>
                  {item.number}
                </span>
                {item.picked && item.grade && (
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gradient-to-r ${getGradeColor(item.grade)} bg-clip-text text-transparent`}>
                    {item.grade}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Result Modal */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowResult(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 ${
                  result.grade === 'SSR' ? 'border-yellow-400 animate-pulse' :
                  result.grade === 'SS' ? 'border-purple-400' :
                  result.grade === 'S' ? 'border-blue-400' :
                  result.grade === 'A' ? 'border-green-400' :
                  'border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className={`text-6xl font-black mb-4 bg-gradient-to-r ${getGradeColor(result.grade)} bg-clip-text text-transparent`}>
                    {result.grade}
                  </div>
                  <div className="flex justify-center mb-4">
                    <Gift className={`w-16 h-16 ${
                      result.grade === 'SSR' ? 'text-yellow-500 animate-bounce' :
                      result.grade === 'SS' ? 'text-purple-500' :
                      result.grade === 'S' ? 'text-blue-500' :
                      result.grade === 'A' ? 'text-green-500' :
                      'text-gray-500'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {formatReward(result.reward)}
                  </h3>
                  {result.card && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {result.card.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {result.card.team} | {result.card.position} | OVR {result.card.overall}
                      </div>
                    </div>
                  )}
                  {result.pointsGained && (
                    <div className="mt-4 text-lg font-bold text-orange-600">
                      +{result.pointsGained.toLocaleString()}P
                    </div>
                  )}
                  {result.boardReset && (
                    <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <span className="text-yellow-700 dark:text-yellow-300 font-bold">
                        SSR 당첨! 복권판이 리셋되었습니다!
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowResult(false)}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold rounded-lg hover:from-primary-700 hover:to-purple-700 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowHistory(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    뽑기 기록
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    기록이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${getGradeBgColor(item.grade)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              #{item.number}
                            </span>
                            <span className={`font-bold bg-gradient-to-r ${getGradeColor(item.grade)} bg-clip-text text-transparent`}>
                              {item.grade}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatReward(item.reward)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(item.createdAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
