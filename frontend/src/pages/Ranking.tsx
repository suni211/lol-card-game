import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

export default function Ranking() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-4">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            글로벌 랭킹
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최고의 플레이어들과 경쟁하세요
          </p>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
        >
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            아직 랭킹 데이터가 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            경기를 플레이하고 랭킹에 올라보세요!
          </p>
          <a
            href="/match"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-colors"
          >
            경기 시작하기
          </a>
        </motion.div>
      </div>
    </div>
  );
}
