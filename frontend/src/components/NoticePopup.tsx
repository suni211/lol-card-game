import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, AlertCircle } from 'lucide-react';

interface NoticePopupProps {
  onClose: () => void;
}

export default function NoticePopup({ onClose }: NoticePopupProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Content */}
          <div className="relative p-8">
            {/* Header */}
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full">
                <Gift className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              긴급 공지
            </h2>

            <p className="text-center text-gray-400 mb-8">
              시스템 업데이트 보상 지급
            </p>

            {/* Notice content */}
            <div className="space-y-6">
              <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed mb-4">
                  안녕하세요, 운영자입니다.
                </p>
                <p className="text-gray-300 leading-relaxed mb-4">
                  데이터베이스 구조 개선 작업 중 일부 데이터 손실이 발생하여
                  모든 유저분들께 사과의 의미로 보상을 지급합니다.
                </p>

                {/* Compensation box */}
                <div className="my-6 p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-yellow-400 mr-2" />
                    <h3 className="text-xl font-bold text-yellow-400">보상 내용</h3>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-2">
                      전체 유저 1,000,000 포인트 지급
                    </p>
                    <p className="text-sm text-gray-400">즉시 지급 완료</p>
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed mb-2">
                  불편을 드려 진심으로 사과드립니다.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  항상 즐거운 게임 되시길 바랍니다!
                </p>
              </div>

              {/* Additional info */}
              <div className="text-center text-sm text-gray-500">
                <p>업데이트 내용:</p>
                <ul className="mt-2 space-y-1">
                  <li>• 18WC 시즌 추가 (126명의 2018 월드챔피언십 선수)</li>
                  <li>• 멀티 덱 시스템 (최대 5개 덱 저장 가능)</li>
                  <li>• 데이터베이스 최적화 완료</li>
                </ul>
              </div>
            </div>

            {/* Close button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                확인
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
