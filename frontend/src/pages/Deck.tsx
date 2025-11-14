import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

export default function Deck() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            덱 편성
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최강의 5인 로스터를 구성하세요
          </p>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
        >
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            덱 편성 기능은 준비 중입니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            먼저 카드를 수집하고 나중에 덱을 구성해보세요!
          </p>
          <a
            href="/gacha"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-colors"
          >
            카드 뽑기
          </a>
        </motion.div>
      </div>
    </div>
  );
}
