import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatPopup from '../Chat/ChatPopup';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface NoticePopup {
  id: number;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
}

export default function Layout() {
  const [noticePopup, setNoticePopup] = useState<NoticePopup | null>(null);

  useEffect(() => {
    // Connect to socket.io for global events (notice alerts)
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Listen for new notice broadcasts
    socket.on('new_notice', (notice) => {
      console.log('New notice received:', notice);

      // Show large popup
      setNoticePopup(notice);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setNoticePopup(null);
      }, 5000);
    });

    // Cleanup on unmount
    return () => {
      socket.off('new_notice');
      socket.disconnect();
    };
  }, []);

  const getNoticeTypeInfo = (type: string) => {
    const typeMap = {
      NOTICE: { emoji: '📢', bg: 'bg-blue-500', text: '공지사항' },
      EVENT: { emoji: '🎉', bg: 'bg-purple-500', text: '이벤트' },
      PATCH: { emoji: '🔧', bg: 'bg-orange-500', text: '패치노트' },
      UPDATE: { emoji: '🔄', bg: 'bg-green-500', text: '업데이트' },
      MAINTENANCE: { emoji: '⚠️', bg: 'bg-red-500', text: '점검' },
    };
    return typeMap[type as keyof typeof typeMap] || typeMap.NOTICE;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatPopup />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 3000,
        }}
      />

      {/* Large Notice Popup */}
      <AnimatePresence>
        {noticePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setNoticePopup(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${getNoticeTypeInfo(noticePopup.type).bg} text-white px-8 py-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">{getNoticeTypeInfo(noticePopup.type).emoji}</span>
                    <div>
                      <div className="text-sm font-medium opacity-90">
                        {getNoticeTypeInfo(noticePopup.type).text}
                        {noticePopup.isPinned && ' 📌'}
                      </div>
                      <h2 className="text-3xl font-bold mt-1">새로운 공지가 올라왔습니다!</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setNoticePopup(null)}
                    className="text-white/80 hover:text-white text-3xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {noticePopup.title}
                </h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {noticePopup.content}
                </p>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  이 팝업은 5초 후 자동으로 사라집니다
                </p>
                <button
                  onClick={() => setNoticePopup(null)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
