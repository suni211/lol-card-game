import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, DollarSign, Minus, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AdminLog {
  id: number;
  admin_username: string;
  action: string;
  target_username: string;
  details: string;
  created_at: string;
}

export default function Admin() {
  const { token } = useAuthStore();
  const [username, setUsername] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await axios.get(`${API_URL}/admin/logs?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('관리자 권한이 없습니다.');
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleGivePoints = async () => {
    if (!username || !points) {
      toast.error('유저명과 포인트를 입력해주세요.');
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      toast.error('유효한 포인트를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/admin/give-points`,
        { username, points: pointsNum, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setUsername('');
        setPoints('');
        setReason('');
        fetchLogs();
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('관리자 권한이 없습니다.');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('포인트 지급 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeductPoints = async () => {
    if (!username || !points) {
      toast.error('유저명과 포인트를 입력해주세요.');
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      toast.error('유효한 포인트를 입력해주세요.');
      return;
    }

    if (!confirm(`${username}님의 포인트 ${pointsNum}P를 차감하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/admin/deduct-points`,
        { username, points: pointsNum, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setUsername('');
        setPoints('');
        setReason('');
        fetchLogs();
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('관리자 권한이 없습니다.');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('포인트 차감 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'GIVE_POINTS':
        return '포인트 지급';
      case 'DEDUCT_POINTS':
        return '포인트 차감';
      default:
        return action;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            관리자 패널
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            포인트 관리 및 운영 도구
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Point Management */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-green-600" />
              포인트 관리
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  유저명
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="유저명 입력"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  포인트
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="포인트 입력"
                  min="0"
                  max="1000000"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  사유 (선택)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="지급/차감 사유"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGivePoints}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  <DollarSign className="w-5 h-5 inline mr-2" />
                  포인트 지급
                </button>
                <button
                  onClick={handleDeductPoints}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  <Minus className="w-5 h-5 inline mr-2" />
                  포인트 차감
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">주의사항</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>모든 작업은 로그에 기록됩니다</li>
                    <li>포인트 차감은 되돌릴 수 없습니다</li>
                    <li>최대 1,000,000P까지 지급 가능합니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Admin Logs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              관리자 로그
            </h2>

            {loadingLogs ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">로그가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.map((log) => {
                  let details: any = {};
                  try {
                    details = JSON.parse(log.details);
                  } catch (e) {
                    // ignore
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              log.action === 'GIVE_POINTS'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {getActionText(log.action)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-900 dark:text-white">
                        <p>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {log.admin_username}
                          </span>
                          {' → '}
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {log.target_username}
                          </span>
                        </p>
                        {details.points && (
                          <p className="mt-1">
                            포인트:{' '}
                            <span className="font-bold">
                              {details.points.toLocaleString()}P
                            </span>
                          </p>
                        )}
                        {details.reason && details.reason !== '없음' && (
                          <p className="mt-1 text-gray-600 dark:text-gray-400">
                            사유: {details.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
