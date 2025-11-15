import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Swords, Trophy, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VSBattle() {
  const { stageNumber } = useParams<{ stageNumber: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'normal';
  const isHardMode = mode === 'hard';

  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [userDecks, setUserDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);
  const [battling, setBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('VSBattle mounted, stage:', stageNumber, 'mode:', mode);
    fetchUserDecks();
  }, []);

  const fetchUserDecks = async () => {
    try {
      console.log('Fetching user decks...');
      const response = await axios.get(`${API_URL}/deck`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Decks response:', response.data);

      if (response.data.success) {
        const decksData = response.data.data;
        // Check if it's an array or object
        let decksArray = Array.isArray(decksData) ? decksData : [decksData];

        // Transform deck data to flat structure
        decksArray = decksArray.map((deck: any) => ({
          id: deck.id,
          name: deck.name,
          top_name: deck.top?.player?.name || 'Unknown',
          top_overall: deck.top?.player?.overall || 0,
          top_level: deck.top?.level || 0,
          jungle_name: deck.jungle?.player?.name || 'Unknown',
          jungle_overall: deck.jungle?.player?.overall || 0,
          jungle_level: deck.jungle?.level || 0,
          mid_name: deck.mid?.player?.name || 'Unknown',
          mid_overall: deck.mid?.player?.overall || 0,
          mid_level: deck.mid?.level || 0,
          adc_name: deck.adc?.player?.name || 'Unknown',
          adc_overall: deck.adc?.player?.overall || 0,
          adc_level: deck.adc?.level || 0,
          support_name: deck.support?.player?.name || 'Unknown',
          support_overall: deck.support?.player?.overall || 0,
          support_level: deck.support?.level || 0,
        }));

        console.log('Transformed decks:', decksArray);
        setUserDecks(decksArray);
        if (decksArray.length > 0 && decksArray[0]) {
          setSelectedDeck(decksArray[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch decks:', error);
      toast.error('덱 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startBattle = async () => {
    if (!selectedDeck) {
      toast.error('덱을 선택해주세요!');
      return;
    }

    try {
      setBattling(true);

      const battleResponse = await axios.post(
        `${API_URL}/vsmode/battle/${stageNumber}`,
        { isHardMode, userDeckId: selectedDeck },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (battleResponse.data.success) {
        await simulateBattle(battleResponse.data.data);
      }
    } catch (error: any) {
      setBattling(false);
      console.error('Battle error:', error);
      toast.error(error.response?.data?.error || '배틀 시작 실패');
    }
  };

  const simulateBattle = async (battleData: any) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userDeck = battleData.userDeck;
    const userPower =
      (userDeck.top_overall + userDeck.top_level) +
      (userDeck.jungle_overall + userDeck.jungle_level) +
      (userDeck.mid_overall + userDeck.mid_level) +
      (userDeck.adc_overall + userDeck.adc_level) +
      (userDeck.support_overall + userDeck.support_level);

    const enemyPower = battleData.enemies.reduce(
      (sum: number, enemy: any) => sum + enemy.overall + enemy.level,
      0
    );

    const userScore = userPower + Math.floor(Math.random() * 50);
    const enemyScore = enemyPower + Math.floor(Math.random() * 50);
    const isVictory = userScore > enemyScore;

    try {
      const completeResponse = await axios.post(
        `${API_URL}/vsmode/battle/${stageNumber}/complete`,
        { isHardMode, isVictory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (completeResponse.data.success) {
        setBattleResult({
          ...completeResponse.data.data,
          isVictory,
          userScore,
          enemyScore,
        });
      }
    } catch (error) {
      console.error('Failed to complete battle:', error);
    }

    setBattling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/vsmode')}
          className="mb-6 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          스테이지 목록으로
        </button>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Stage {stageNumber}</h1>
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-lg">
            <span className={`px-3 py-1 rounded-md font-bold ${isHardMode ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              {isHardMode ? '하드 모드' : '일반 모드'}
            </span>
          </div>
        </motion.div>

        <AnimatePresence>
          {battleResult && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="mb-8">
              <div className={`bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl border-4 ${battleResult.isVictory ? 'border-green-500' : 'border-red-500'}`}>
                <div className="text-center">
                  <div className="text-6xl mb-4">{battleResult.isVictory ? '🎉' : '💔'}</div>
                  <h2 className={`text-4xl font-black mb-4 ${battleResult.isVictory ? 'text-green-500' : 'text-red-500'}`}>
                    {battleResult.isVictory ? '승리!' : '패배...'}
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">내 점수</div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{battleResult.userScore}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">적 점수</div>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">{battleResult.enemyScore}</div>
                    </div>
                  </div>

                  {battleResult.isVictory && battleResult.rewardPoints && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-2" />
                        <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                          +{battleResult.rewardPoints.toLocaleString()}P
                        </span>
                      </div>
                    </div>
                  )}

                  {battleResult.legendaryPackAwarded && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 mb-4">
                      <div className="text-2xl font-black text-white">🎁 레전드 확정팩 획득!</div>
                    </div>
                  )}

                  <button onClick={() => navigate('/vsmode')} className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors">
                    스테이지 목록으로
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!battling && !battleResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">덱 선택</h2>

            {userDecks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">등록된 덱이 없습니다.</p>
                <button onClick={() => navigate('/deck')} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
                  덱 만들기
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {userDecks.map((deck) => (
                    <div
                      key={deck.id}
                      onClick={() => setSelectedDeck(deck.id)}
                      className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                        selectedDeck === deck.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{deck.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          총 파워: {deck.top_overall + deck.top_level + deck.jungle_overall + deck.jungle_level + deck.mid_overall + deck.mid_level + deck.adc_overall + deck.adc_level + deck.support_overall + deck.support_level}
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                          <div className="font-bold text-gray-900 dark:text-white">{deck.top_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">+{deck.top_level}</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                          <div className="font-bold text-gray-900 dark:text-white">{deck.jungle_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">+{deck.jungle_level}</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                          <div className="font-bold text-gray-900 dark:text-white">{deck.mid_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">+{deck.mid_level}</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                          <div className="font-bold text-gray-900 dark:text-white">{deck.adc_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">+{deck.adc_level}</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                          <div className="font-bold text-gray-900 dark:text-white">{deck.support_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">+{deck.support_level}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={startBattle}
                  disabled={!selectedDeck}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Swords className="w-6 h-6 mr-2" />
                  배틀 시작
                </button>
              </>
            )}
          </motion.div>
        )}

        {battling && !battleResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Swords className="w-24 h-24 text-orange-500 mx-auto" />
            </motion.div>

            <motion.h2
              className="text-3xl font-bold text-gray-900 dark:text-white mt-8"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              배틀 진행 중...
            </motion.h2>
          </motion.div>
        )}
      </div>
    </div>
  );
}
