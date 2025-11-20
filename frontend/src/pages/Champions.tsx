import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Champion {
  id: number;
  name: string;
  skillName: string;
  skillDescription: string;
  cooldown: number;
  scalingType: 'AD' | 'AP';
  championClass: string;
}

export default function Champions() {
  const { token } = useAuthStore();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChampions = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/strategy-stats/champions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setChampions(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch champions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChampions();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            챔피언 소개
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임에 등장하는 모든 챔피언의 정보와 스킬을 확인하세요.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {champions.map((champion) => (
            <motion.div
              key={champion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: champion.id * 0.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{champion.name}</h2>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    champion.scalingType === 'AD'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                  }`}>
                    {champion.scalingType}
                  </span>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-1">{champion.skillName}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {champion.skillDescription}
                  </p>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-300">
                  <span>
                    <strong>클래스:</strong> {champion.championClass}
                  </span>
                  <span>
                    <strong>쿨타임:</strong> {champion.cooldown}턴
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
