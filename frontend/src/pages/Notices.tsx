import { motion } from 'framer-motion';
import { Bell, Pin, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { Notice } from '../types';

export default function Notices() {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // Empty notices - admin will create them
  const notices: Notice[] = [];

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
      default:
        return '공지';
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
                    <div className="flex items-center space-x-2 mb-3">
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
      </div>
    </div>
  );
}
