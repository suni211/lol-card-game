import { motion } from 'framer-motion';
import { Target, Calendar } from 'lucide-react';

export default function Missions() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
            <Target className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            미션
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            미션을 완료하고 보상을 받으세요!
          </p>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
        >
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            현재 진행 중인 미션이 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            곧 다양한 미션이 추가될 예정입니다!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
