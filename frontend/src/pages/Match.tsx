import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Target, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function Match() {
  const { user, updateUser } = useAuthStore();
  const [isSearching, setIsSearching] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<{
    won: boolean;
    myScore: number;
    opponentScore: number;
    pointsChange: number;
    ratingChange: number;
  } | null>(null);

  const [opponent] = useState({
    username: 'OpponentPlayer',
    tier: 'GOLD',
    rating: 1550,
  });

  const startSearch = () => {
    setIsSearching(true);
    // 매칭 시뮬레이션
    setTimeout(() => {
      setIsSearching(false);
      setMatchFound(true);
      toast.success('상대를 찾았습니다!');
    }, 2000);
  };

  const startBattle = () => {
    setMatchFound(false);
    setIsBattling(true);

    // 전투 시뮬레이션
    setTimeout(() => {
      const won = Math.random() > 0.5;
      const myScore = won ? 3 : 1;
      const opponentScore = won ? 1 : 3;
      const pointsChange = won ? 100 : 50;
      const ratingChange = won ? 25 : -15;

      setBattleResult({
        won,
        myScore,
        opponentScore,
        pointsChange,
        ratingChange,
      });

      if (user) {
        updateUser({
          points: user.points + pointsChange,
          rating: user.rating + ratingChange,
        });
      }

      setIsBattling(false);
    }, 5000);
  };

  const playAgain = () => {
    setBattleResult(null);
    setMatchFound(false);
    setIsSearching(false);
  };

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

        {/* User Stats */}
        {user && !isSearching && !matchFound && !isBattling && !battleResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {user.tier}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">현재 티어</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {user.rating}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">레이팅</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {user.points.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">포인트</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Match State */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          {/* Idle State */}
          {!isSearching && !matchFound && !isBattling && !battleResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Target className="w-24 h-24 text-primary-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                대전 준비 완료
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                랭크 경기를 시작하려면 아래 버튼을 클릭하세요
              </p>
              <button
                onClick={startSearch}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                매칭 시작
              </button>
            </motion.div>
          )}

          {/* Searching */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Target className="w-24 h-24 text-primary-500 mx-auto mb-6" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  상대를 찾는 중...
                </h2>
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-primary-500 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-3 h-3 bg-primary-500 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-3 h-3 bg-primary-500 rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Match Found */}
          <AnimatePresence>
            {matchFound && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
                  상대를 찾았습니다!
                </h2>

                <div className="grid grid-cols-3 gap-4 items-center mb-8">
                  {/* Player */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-white">
                        {user?.username[0]}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {user?.username}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {user?.tier} • {user?.rating}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                      VS
                    </div>
                  </div>

                  {/* Opponent */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-white">
                        {opponent.username[0]}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {opponent.username}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {opponent.tier} • {opponent.rating}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startBattle}
                  className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg text-lg transition-all transform hover:scale-105"
                >
                  대전 시작
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Battling */}
          <AnimatePresence>
            {isBattling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Swords className="w-24 h-24 text-red-500 mx-auto mb-6" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  치열한 접전 중...
                </h2>
                <motion.div
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                  initial={{ width: 0 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5 }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Battle Result */}
          <AnimatePresence>
            {battleResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-8"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className={`inline-flex items-center justify-center p-6 rounded-full mb-4 ${
                      battleResult.won
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}
                  >
                    <Trophy className="w-16 h-16 text-white" />
                  </motion.div>
                  <h2 className={`text-4xl font-bold mb-2 ${
                    battleResult.won ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {battleResult.won ? '승리!' : '패배'}
                  </h2>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {battleResult.myScore} : {battleResult.opponentScore}
                  </div>
                </div>

                {/* Rewards */}
                <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Trophy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          +{battleResult.pointsChange}P
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        획득 포인트
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Zap className={`w-5 h-5 ${battleResult.ratingChange > 0 ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`text-2xl font-bold ${
                          battleResult.ratingChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {battleResult.ratingChange > 0 ? '+' : ''}{battleResult.ratingChange}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        레이팅 변화
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={playAgain}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
                  >
                    다시 하기
                  </button>
                  <button
                    onClick={() => window.location.href = '/ranking'}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                  >
                    랭킹 보기
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
