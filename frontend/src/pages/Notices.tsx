import { motion } from 'framer-motion';
import { Bell, Pin, Calendar, Plus, Edit, Trash, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { Notice } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Notices() {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const { user, token } = useAuthStore();
  const isAdmin = user?.isAdmin || false;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'NOTICE' as Notice['type'],
    isPinned: false,
  });

  // Fetch notices
  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await axios.get(`${API_URL}/notices`);
      if (response.data.success) {
        setNotices(response.data.data);
        if (response.data.data.length > 0 && !selectedNotice) {
          setSelectedNotice(response.data.data[0]);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch notices:', error);
      toast.error('공지사항을 불러오는데 실패했습니다');
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
      if (editingNotice) {
        // Update
        await axios.put(
          `${API_URL}/notices/${editingNotice.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('공지사항이 수정되었습니다');
      } else {
        // Create
        await axios.post(
          `${API_URL}/notices`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('공지사항이 등록되었습니다');
      }

      setShowModal(false);
      setEditingNotice(null);
      setFormData({ title: '', content: '', type: 'NOTICE', isPinned: false });
      fetchNotices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '공지사항 저장에 실패했습니다');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await axios.delete(`${API_URL}/notices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('공지사항이 삭제되었습니다');
      if (selectedNotice?.id === id) {
        setSelectedNotice(null);
      }
      fetchNotices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '삭제에 실패했습니다');
    }
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      isPinned: notice.isPinned,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormData({ title: '', content: '', type: 'NOTICE', isPinned: false });
    setShowModal(true);
  };

  const getNoticeTypeColor = (type: Notice['type']) => {
    switch (type) {
      case 'EVENT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'MAINTENANCE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    }
  };

  const getNoticeTypeLabel = (type: Notice['type']) => {
    switch (type) {
      case 'EVENT':
        return '이벤트';
      case 'PATCH':
        return '패치';
      case 'MAINTENANCE':
        return '점검';
      case 'UPDATE':
        return '업데이트';
      default:
        return '공지';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Invalid date, return original string
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
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
            <Bell className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            공지사항
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임 소식과 업데이트를 확인하세요
          </p>

          {/* Admin Create Button */}
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>공지사항 작성</span>
            </button>
          )}
        </motion.div>

        {notices.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              등록된 공지사항이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              새로운 소식이 있으면 이곳에 표시됩니다
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Notice List */}
            <div className="lg:col-span-1 space-y-4">
              {notices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedNotice(notice)}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all border-2 hover:shadow-lg ${
                    selectedNotice?.id === notice.id
                      ? 'border-primary-500 dark:border-primary-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {notice.isPinned && (
                      <Pin className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getNoticeTypeColor(notice.type)}`}>
                          {getNoticeTypeLabel(notice.type)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {notice.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(notice.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Notice Detail */}
            <div className="lg:col-span-2">
              {selectedNotice ? (
                <motion.div
                  key={selectedNotice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
                >
                  {/* Header */}
                  <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getNoticeTypeColor(selectedNotice.type)}`}>
                          {getNoticeTypeLabel(selectedNotice.type)}
                        </span>
                        {selectedNotice.isPinned && (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center space-x-1">
                            <Pin className="w-4 h-4" />
                            <span>고정됨</span>
                          </span>
                        )}
                      </div>

                      {/* Admin Buttons */}
                      {isAdmin && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(selectedNotice)}
                            className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(selectedNotice.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {selectedNotice.title}
                    </h2>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(selectedNotice.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {selectedNotice.content}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                  <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    공지사항을 선택해주세요
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingNotice ? '공지사항 수정' : '공지사항 작성'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingNotice(null);
                  }}
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
                    내용
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      타입
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Notice['type'] })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="NOTICE">공지</option>
                      <option value="EVENT">이벤트</option>
                      <option value="PATCH">패치</option>
                      <option value="UPDATE">업데이트</option>
                      <option value="MAINTENANCE">점검</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">상단 고정</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingNotice(null);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {editingNotice ? '수정' : '작성'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
