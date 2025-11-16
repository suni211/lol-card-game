import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface GlobalMessage {
  id: number;
  username: string;
  message: string;
  created_at: string;
}

export default function GlobalMessageBanner() {
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchMessages();

    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    // Rotate through messages every 8 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/shop/megaphone/messages`);
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  if (messages.length === 0) return null;

  const currentMessage = messages[currentIndex];

  return (
    <div className="fixed top-20 left-0 right-0 z-40 pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMessage.id}
          initial={{ x: '100%' }}
          animate={{ x: '-100%' }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{
            duration: 12,
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
