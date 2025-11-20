import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Trophy, Users, Eye, ChevronRight, Shield, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface DeckInfo {
  slot: number;
  name: string;
  isComplete: boolean;
  totalOverall: number;
}

export default function MatchSelect() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/deck/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const deckInfos: DeckInfo[] = [];
        for (let slot = 1; slot <= 5; slot++) {
          const deck = response.data.data.find((d: any) => d.deck_slot === slot);
          if (deck) {
            const isComplete = !!(
              deck.top_card_id &&
              deck.jungle_card_id &&
              deck.mid_card_id &&
              deck.adc_card_id &&
              deck.support_card_id
            );
            deckInfos.push({
              slot,
              name: deck.name || `덱 ${slot}`,
              isComplete,
              totalOverall: deck.total_overall || 0,
            });
          } else {
            deckInfos.push({
              slot,
              name: `덱 ${slot}`,
              isComplete: false,
              totalOverall: 0,
            });
          }
        }
        setDecks(deckInfos);

        // Select first complete deck
        const completeDeck = deckInfos.find(d => d.isComplete);
        if (completeDeck) {
          setSelectedDeck(completeDeck.slot);
        }
      }
    } catch (error) {
      console.error('Fetch decks error:', error);
      toast.error('덱 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startMatch = (type: 'RANKED' | 'NORMAL') => {
    const deck = decks.find(d => d.slot === selectedDeck);
    if (!deck?.isComplete) {
      toast.error('완성된 덱을 선택해주세요.');
      return;
    }

    navigate(`/moba-match?type=${type}&deck=${selectedDeck}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
            <Swords className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">대전</h1>
          <p className="text-gray-400">덱을 선택하고 매치를 시작하세요</p>
        </motion.div>

        {/* Deck Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            덱 선택
          </h2>

          <div className="grid grid-cols-5 gap-3">
            {decks.map(deck => (
              <button
                key={deck.slot}
                onClick={() => deck.isComplete && setSelectedDeck(deck.slot)}
                disabled={!deck.isComplete}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDeck === deck.slot
                    ? 'border-primary-500 bg-primary-900/30'
                    : deck.isComplete
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-white font-bold mb-1">덱 {deck.slot}</div>
                {deck.isComplete ? (
                  <div className="text-xs text-green-400">OVR {deck.totalOverall}</div>
                ) : (
                  <div className="text-xs text-red-400">미완성</div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/deck')}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              덱 편성 바로가기 →
            </button>
          </div>
        </motion.div>

        {/* Match Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Ranked */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border border-yellow-700"
          >
            <div className="flex items-center mb-4">
              <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <h3 className="text-2xl font-bold text-white">랭크전</h3>
                <p className="text-yellow-300 text-sm">경쟁 모드</p>
              </div>
            </div>

            <div className="space-y-2 text-gray-300 text-sm mb-6">
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                <span>승리: 5,000P / 패배: 1,000P</span>
              </div>
              <div className="flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                <span>레이팅 변동: ±25</span>
              </div>
            </div>

            <button
              onClick={() => startMatch('RANKED')}
              className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-700 hover:to-orange-700 flex items-center justify-center gap-2"
            >
              랭크전 시작
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Normal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-xl p-6 border border-blue-700"
          >
            <div className="flex items-center mb-4">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <h3 className="text-2xl font-bold text-white">일반전</h3>
                <p className="text-blue-300 text-sm">연습 모드</p>
              </div>
            </div>

            <div className="space-y-2 text-gray-300 text-sm mb-6">
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2 text-blue-500" />
                <span>승리: 1,500P / 패배: 300P</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-blue-500" />
                <span>레이팅 영향 없음</span>
              </div>
            </div>

            <button
              onClick={() => startMatch('NORMAL')}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-cyan-700 flex items-center justify-center gap-2"
            >
              일반전 시작
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>

        {/* Spectate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-6 h-6 text-purple-500 mr-3" />
              <div>
                <h3 className="text-lg font-bold text-white">관전</h3>
                <p className="text-gray-400 text-sm">진행 중인 경기 관전하기</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/spectator')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              관전하기
            </button>
          </div>
        </motion.div>

        {/* Game Rules */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gray-800/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-white mb-4">게임 규칙</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <h4 className="text-white font-medium mb-2">승리 조건</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>상대 넥서스 파괴</li>
                <li>항복 유도 (15턴 이후)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">이벤트 (한타)</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>3턴: 유충 (포탑 데미지↑)</li>
                <li>5턴: 용 (공격력↑)</li>
                <li>7턴: 전령 (포탑 파괴)</li>
                <li>9턴+: 바론 (종합 버프)</li>
                <li>12턴+: 장로 (적 전멸 가능)</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
