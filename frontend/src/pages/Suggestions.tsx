import { motion } from 'framer-motion';
import { MessageSquare, Plus, X, Check, AlertCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { Suggestion } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { user, token } = useAuthStore();
  const isAdmin = user?.isAdmin || false;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'OTHER' as Suggestion['category'],
  });

  const [adminReplyData, setAdminReplyData] = useState({
    status: 'PENDING' as Suggestion['status'],
    adminReply: '',
  });

  // Fetch suggestions
  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSuggestions(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch suggestions:', error);
      toast.error('건의사항을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('제목과 내용을 입력해주세요');
      return;
    }

    try {
      await axios.post(`${API_URL}/suggestions`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('건의사항이 등록되었습니다');
      setShowModal(false);
      setFormData({ title: '', content: '', category: 'OTHER' });
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '건의사항 등록에 실패했습니다');
    }
  };

  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSuggestion) return;

    try {
      await axios.put(
        `${API_URL}/suggestions/${selectedSuggestion.id}/status`,
        adminReplyData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('건의사항이 업데이트되었습니다');
      setShowAdminModal(false);
      setSelectedSuggestion(null);
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '업데이트에 실패했습니다');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await axios.delete(`${API_URL}/suggestions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('건의사항이 삭제되었습니다');
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '삭제에 실패했습니다');
    }
  };

  const openAdminModal = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setAdminReplyData({
      status: suggestion.status,
      adminReply: suggestion.adminReply || '',
    });
    setShowAdminModal(true);
  };

  const getCategoryLabel = (category: Suggestion['category']) => {
    const labels = {
      BUG: '버그',
      FEATURE: '기능 제안',
      BALANCE: '밸런스',
      UI: 'UI/UX',
      OTHER: '기타',
    };
    return labels[category];
  };

  const getStatusLabel = (status: Suggestion['status']) => {
    const labels = {
      PENDING: '대기중',
      REVIEWING: '검토중',
      ACCEPTED: '승인됨',
      REJECTED: '거절됨',
      COMPLETED: '완료',
    };
    return labels[status];
  };

  const getStatusColor = (status: Suggestion['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      case 'REVIEWING':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'ACCEPTED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'COMPLETED':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    }
  };

  const getStatusIcon = (status: Suggestion['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'REVIEWING':
        return <AlertCircle className="w-4 h-4" />;
      case 'ACCEPTED':
      case 'COMPLETED':
        return <Check className="w-4 h-4" />;
      case 'REJECTED':
        return <X className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <MessageSquare className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            건의사항
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임 개선을 위한 의견을 들려주세요
          </p>

          {/* Create Button */}
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>건의하기</span>
          </button>
        </motion.div>

        {/* Suggestions List */}
        {suggestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              등록된 건의사항이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              첫 번째 건의사항을 등록해보세요!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(suggestion.status)} flex items-center space-x-1`}>
                      {getStatusIcon(suggestion.status)}
                      <span>{getStatusLabel(suggestion.status)}</span>
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {getCategoryLabel(suggestion.category)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <button
                        onClick={() => openAdminModal(suggestion)}
                        className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                      >
                        관리
                      </button>
                    )}
                    {(isAdmin || suggestion.userId === user?.id) && (
                      <button
                        onClick={() => handleDelete(suggestion.id)}
                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {suggestion.title}
                </h3>

                <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                  {suggestion.content}
                </p>

                {suggestion.adminReply && (
                  <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">
                      운영자 답변
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {suggestion.adminReply}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>작성자: {suggestion.username}</span>
                  <span>{formatDate(suggestion.createdAt)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  건의사항 작성
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Suggestion['category'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="BUG">버그</option>
                    <option value="FEATURE">기능 제안</option>
                    <option value="BALANCE">밸런스</option>
                    <option value="UI">UI/UX</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    내용
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    작성
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Admin Modal */}
        {showAdminModal && selectedSuggestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  건의사항 관리
                </h2>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {selectedSuggestion.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedSuggestion.content}
                  </p>
                </div>

                <form onSubmit={handleAdminUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      상태
                    </label>
                    <select
                      value={adminReplyData.status}
                      onChange={(e) => setAdminReplyData({ ...adminReplyData, status: e.target.value as Suggestion['status'] })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="PENDING">대기중</option>
                      <option value="REVIEWING">검토중</option>
                      <option value="ACCEPTED">승인됨</option>
                      <option value="REJECTED">거절됨</option>
                      <option value="COMPLETED">완료</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      운영자 답변
                    </label>
                    <textarea
                      value={adminReplyData.adminReply}
                      onChange={(e) => setAdminReplyData({ ...adminReplyData, adminReply: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="답변을 입력하세요 (선택사항)"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
