import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Trophy, Star, ArrowLeft, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RoundResult {
  round: number;
  playerPower: number;
  enemyPower: number;
  playerWon: boolean;
}

export default function CampaignBattle() {
  const navigate = useNavigate();
  const { stageId } = useParams();

  const [loading, setLoading] = useState(true);
  const [battling, setBattling] = useState(false);
  const [stage, setStage] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [battleComplete, setBattleComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);

  useEffect(() => {
    loadBattle();
  }, [stageId]);

  const loadBattle = async () => {
    try {
      // Get stage info
      const stageRes = await axios.get(`${API_URL}/campaign/stages`);

      if (stageRes.data.success) {
        // Find the specific stage
        const allStages = Object.values(stageRes.data.data).flat() as any[];
        const foundStage = allStages.find((s: any) => s.id === parseInt(stageId || '0'));

        if (!foundStage) {
          toast.error('스테이지를 찾을 수 없습니다');
          navigate('/campaign');
          return;
        }

        setStage(foundStage);
      }
    } catch (error: any) {
      console.error('Load battle error:', error);
      toast.error('전투 로드 실패: ' + (error.response?.data?.error || error.message));
      navigate('/campaign');
    } finally {
      setLoading(false);
    }
  };

  const startBattle = async () => {
    if (!stage || battling) return;

    setBattling(true);

    try {
      // First, get actual battle results from backend
      const response = await axios.post(`${API_URL}/campaign/battle`, {
        stageId: parseInt(stageId || '0')
      });

      if (response.data.success) {
        const battleData = response.data.data;

        // Animate the rounds using actual backend results
        for (let i = 0; i < battleData.roundResults.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setCurrentRound(i + 1);

          const roundResult = battleData.roundResults[i];

          // Update HP
          const damage = 34; // ~33% per round
          if (roundResult.playerWon) {
            setEnemyHP(prev => Math.max(0, prev - damage));
          } else {
            setPlayerHP(prev => Math.max(0, prev - damage));
          }

          setRoundResults(prev => [...prev, roundResult]);

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Show final result
        setFinalResult(battleData);
        setBattleComplete(true);

        if (battleData.won) {
          toast.success(`승리! ${battleData.pointsEarned.toLocaleString()}P 획득`);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '전투 실패');
    } finally {
      setBattling(false);
    }
  };

  const getRoundName = (round: number) => {
    const names = ['', '라이닝 페이즈', '팀파이트 페이즈', '최종 결전'];
    return names[round] || `라운드 ${round}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/campaign')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            <span className="text-white">돌아가기</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-1">
              {stage.region} - Stage {stage.stageNumber}
            </h1>
            <p className="text-gray-300">요구 파워: {stage.requiredPower.toLocaleString()}</p>
          </div>

          <div className="w-32"></div>
        </div>

        {/* HP Bars */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Player HP */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">내 팀</span>
              <span className="text-green-400 font-bold">{playerHP}%</span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                initial={{ width: '100%' }}
                animate={{ width: `${playerHP}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Enemy HP */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">적 팀</span>
              <span className="text-red-400 font-bold">{enemyHP}%</span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                initial={{ width: '100%' }}
                animate={{ width: `${enemyHP}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Battle Arena */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 mb-6">
          {!battling && currentRound === 0 && (
            <div className="text-center">
              <Swords className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">전투 준비</h2>
              <p className="text-gray-300 mb-6">
                덱 파워로 적을 물리치고 승리하세요!
              </p>
              <button
                onClick={startBattle}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all transform hover:scale-105"
              >
                전투 시작
              </button>
            </div>
          )}

          {battling && (
            <div className="text-center">
              <motion.div
                key={currentRound}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6"
              >
                <div className="text-yellow-400 text-xl font-bold mb-2">
                  {getRoundName(currentRound)}
                </div>
                <Zap className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
              </motion.div>

              <div className="text-white text-lg">
                전투 진행 중...
              </div>
            </div>
          )}

          {battleComplete && finalResult && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {finalResult.won ? (
                <>
                  <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-green-400 mb-4">승리!</h2>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={`w-8 h-8 ${
                          i <= (finalResult.stars || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-2xl text-white mb-2">
                    +{finalResult.pointsEarned.toLocaleString()}P
                  </div>
                  {finalResult.isFirstClear && (
                    <div className="inline-block px-4 py-1 bg-green-500/20 rounded-full text-green-400 text-sm font-bold mb-2">
                      첫 클리어!
                    </div>
                  )}
                  {finalResult.isFirst3Stars && (
                    <div className="inline-block px-4 py-1 bg-yellow-500/20 rounded-full text-yellow-400 text-sm font-bold ml-2">
                      3성 달성!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">💀</div>
                  <h2 className="text-4xl font-bold text-red-400 mb-4">패배</h2>
                  <p className="text-gray-300">더 강한 덱을 구성해보세요</p>
                </>
              )}

              <button
                onClick={() => navigate('/campaign')}
                className="mt-6 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-all"
              >
                캠페인으로 돌아가기
              </button>
            </motion.div>
          )}
        </div>

        {/* Round Results */}
        {roundResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roundResults.map((result) => (
              <motion.div
                key={result.round}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${
                  result.playerWon
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-red-500/20 border-2 border-red-500'
                }`}
              >
                <div className="text-white font-bold mb-2">
                  {getRoundName(result.round)}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>내 팀:</span>
                    <span className="font-bold">{result.playerPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>적 팀:</span>
                    <span className="font-bold">{result.enemyPower.toLocaleString()}</span>
                  </div>
                  <div className={`text-center font-bold ${result.playerWon ? 'text-green-400' : 'text-red-400'}`}>
                    {result.playerWon ? '승리!' : '패배'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
