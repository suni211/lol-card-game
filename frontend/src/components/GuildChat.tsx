import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface ChatMessage {
  id: number;
  username: string;
  message: string;
  tier?: string;
  guildTag?: string;
  timestamp: string;
}

interface GuildChatProps {
  guildId: number;
  guildTag: string;
}

const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    IRON: 'text-gray-400',
    BRONZE: 'text-orange-400',
    SILVER: 'text-gray-300',
    GOLD: 'text-yellow-400',
    PLATINUM: 'text-cyan-400',
    DIAMOND: 'text-blue-400',
    MASTER: 'text-purple-400',
    CHALLENGER: 'text-red-400',
  };
  return colors[tier] || 'text-gray-400';
};

export default function GuildChat({ guildId, guildTag }: GuildChatProps) {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!guildId) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('[Guild Chat] Connected to socket:', newSocket.id);
      // Join guild chat room
      newSocket.emit('guild_chat_join', { guildId });
    });

    newSocket.on('guild_chat_history', (history: ChatMessage[]) => {
      console.log('[Guild Chat] Received history:', history);
      setMessages(history);
    });

    newSocket.on('guild_chat_message', (msg: ChatMessage) => {
      console.log('[Guild Chat] New message:', msg);
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('disconnect', () => {
      console.log('[Guild Chat] Disconnected from socket');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('guild_chat_leave', { guildId });
        newSocket.disconnect();
      }
    };
  }, [guildId]);

  const handleSendMessage = () => {
    if (!socket || !message.trim() || !user) return;

    socket.emit('guild_chat_message', {
      guildId,
      username: user.username,
      message: message.trim(),
      tier: user.tier,
      guildTag,
    });

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <MessageCircle className="w-6 h-6 text-purple-400" />
        <h3 className="text-2xl font-bold text-white">길드 채팅</h3>
      </div>

      {/* Chat messages */}
      <div className="bg-gray-900/50 rounded-lg p-4 h-[400px] overflow-y-auto mb-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              아직 메시지가 없습니다
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-gray-800/50 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {msg.guildTag && (
                      <span className="px-2 py-0.5 bg-purple-600 text-white font-bold rounded text-xs">
                        [{msg.guildTag}]
                      </span>
                    )}
                    <span className="font-bold text-white">{msg.username}</span>
                    {msg.tier && (
                      <span className={`text-xs font-bold ${getTierColor(msg.tier)}`}>
                        {msg.tier}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-gray-300 break-words">{msg.message}</p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          maxLength={200}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center space-x-2"
        >
          <Send className="w-5 h-5" />
          <span>전송</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
