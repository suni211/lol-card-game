import { motion } from 'framer-motion';
import { Swords, Layers } from 'lucide-react';

export default function Match() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900/20 dark:to-orange-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
            <Swords className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            랭크 경기
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최고의 실력자들과 경쟁하세요!
          </p>
        </motion.div>

        {/* Empty State - Need Deck */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
        >
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            경기를 시작하려면 덱이 필요합니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            먼저 카드를 모으고 덱을 구성한 후 전략을 설정해야 합니다
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/gacha"
              className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-lg transition-colors"
            >
              카드 뽑기
            </a>
            <a
              href="/deck"
              className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              덱 편성하기
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
