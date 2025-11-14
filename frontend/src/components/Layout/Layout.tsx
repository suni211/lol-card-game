import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function Layout() {
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

      // Show notification based on notice type
      const noticeTypeEmoji = {
        NOTICE: '📢',
        EVENT: '🎉',
        UPDATE: '🔄',
        MAINTENANCE: '🔧',
      };

      const emoji = noticeTypeEmoji[notice.type as keyof typeof noticeTypeEmoji] || '📢';

      toast.success(`${emoji} 새로운 공지사항: ${notice.title}`, {
        duration: 5000,
        style: {
          background: notice.isPinned ? '#3b82f6' : '#10b981',
          color: '#fff',
          fontWeight: 'bold',
        },
      });
    });

    // Cleanup on unmount
    return () => {
      socket.off('new_notice');
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 3000,
        }}
      />
    </div>
  );
}
