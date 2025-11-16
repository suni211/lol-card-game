import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface GlobalMessage {
  id: number;
  username: string;
  message: string;
  created_at: string;
}

export default function GlobalMessageBanner() {
  const [currentMessage, setCurrentMessage] = useState<GlobalMessage | null>(null);

  useEffect(() => {
    // Connect to socket.io for real-time messages
    const socket = io(SOCKET_URL);

    socket.on('global_message', (newMessage: GlobalMessage) => {
      // Show new message immediately
      setCurrentMessage(newMessage);

      // Hide message after 5 seconds
      setTimeout(() => {
        setCurrentMessage(null);
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!currentMessage) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-40 pointer-events-none overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={currentMessage.id}
          initial={{ x: '100%' }}
          animate={{ x: '-100%' }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{
            duration: 5,
            ease: 'linear',
          }}
          className="flex items-center gap-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 text-white py-3 px-6 shadow-lg whitespace-nowrap"
        >
          <Megaphone size={24} className="flex-shrink-0" />
          <span className="font-bold text-lg">[{currentMessage.username}]</span>
          <span className="text-lg">{currentMessage.message}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
