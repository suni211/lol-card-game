import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Clock } from 'lucide-react';

export default function Trade() {
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'history'>('send');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mb-4">
            <ArrowRightLeft className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            트레이드
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            다른 유저와 카드를 교환하세요
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 보내기
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'received'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              받은 요청
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              트레이드 기록
            </button>
          </div>
        </motion.div>

        {/* Empty State for all tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700"
        >
          <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {activeTab === 'send' && '트레이드 기능은 준비 중입니다'}
            {activeTab === 'received' && '받은 트레이드 요청이 없습니다'}
            {activeTab === 'history' && '트레이드 기록이 없습니다'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === 'send' && '곧 다른 유저와 카드를 교환할 수 있습니다!'}
            {activeTab === 'received' && '트레이드 요청이 오면 여기에 표시됩니다'}
            {activeTab === 'history' && '완료된 트레이드 내역이 여기에 표시됩니다'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
