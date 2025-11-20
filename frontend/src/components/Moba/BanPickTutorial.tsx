import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface BanPickTutorialProps {
  onClose: () => void;
}

export default function BanPickTutorial({ onClose }: BanPickTutorialProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">밴픽 가이드</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <div className="space-y-4 text-gray-300">
          <p>랭크전에서는 표준 5v5 드래프트 룰에 따라 밴픽을 진행합니다.</p>
          <div className="space-y-2">
            <div>
              <h3 className="font-bold text-lg text-yellow-400">1. 밴 페이즈 1 (총 6개 밴)</h3>
              <p className="text-sm">양 팀이 번갈아가며 3명의 챔피언을 금지(밴)합니다. 밴된 챔피언은 양 팀 모두 선택할 수 없습니다.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">2. 픽 페이즈 1 (총 6개 픽)</h3>
              <p className="text-sm">양 팀이 번갈아가며 3명의 챔피언을 선택(픽)합니다. (1-2-2-1 순서)</p>
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">3. 밴 페이즈 2 (총 4개 밴)</h3>
              <p className="text-sm">양 팀이 번갈아가며 2명의 챔피언을 추가로 밴합니다.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg text-yellow-400">4. 픽 페이즈 2 (총 4개 픽)</h3>
              <p className="text-sm">양 팀이 번갈아가며 나머지 2명의 챔피언을 선택하여 5명의 팀을 완성합니다.</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 pt-4 border-t border-gray-700">
            자신의 차례에 챔피언을 선택하고 '확정' 버튼을 눌러 밴 또는 픽을 완료하세요. 제한 시간 내에 선택하지 않으면 랜덤 챔피언이 자동으로 선택됩니다.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
