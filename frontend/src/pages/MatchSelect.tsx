import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Trophy, Users, Eye, ChevronRight, Shield, Zap, Check, X } from 'lucide-react';
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

  const selectedDeckInfo = decks.find(d => d.slot === selectedDeck);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-3">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">MOBA 대전</h1>
          <p className="text-gray-400 text-sm">덱을 선택하고 매치를 시작하세요</p>
        </motion.div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Deck Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 border border-gray-700">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-primary-400" />
                덱 선택
              </h2>

              <div className="space-y-2">
                {decks.map(deck => (
                  <button
                    key={deck.slot}
                    onClick={() => deck.isComplete && setSelectedDeck(deck.slot)}
                    disabled={!deck.isComplete}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      selectedDeck === deck.slot
                        ? 'border-primary-500 bg-primary-900/40 shadow-lg shadow-primary-500/20'
                        : deck.isComplete
                        ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                        : 'border-gray-700 bg-gray-800/50 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedDeck === deck.slot
                          ? 'bg-primary-500 text-white'
                          : deck.isComplete
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-700 text-gray-500'
                      }`}>
                        {deck.slot}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">덱 {deck.slot}</div>
                        {deck.isComplete ? (
                          <div className="text-xs text-primary-400 font-bold">OVR {deck.totalOverall}</div>
                        ) : (
                          <div className="text-xs text-gray-500">미완성</div>
                        )}
                      </div>
                    </div>
                    <div>
                      {deck.isComplete ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/deck')}
                className="w-full mt-3 py-2 text-primary-400 hover:text-primary-300 text-sm border border-primary-500/30 rounded-lg hover:bg-primary-500/10 transition-colors"
              >
                덱 편성 바로가기 →
              </button>
            </div>
          </motion.div>

          {/* Right Column - Match Types */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Selected Deck Info */}
            {selectedDeckInfo?.isComplete && (
              <div className="bg-gray-800/60 backdrop-blur rounded-lg p-3 border border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-400" />
                  <span className="text-gray-300 text-sm">선택된 덱:</span>
                  <span className="text-white font-bold">덱 {selectedDeck}</span>
                </div>
                <div className="text-primary-400 font-bold">
                  OVR {selectedDeckInfo.totalOverall}
                </div>
              </div>
            )}

            {/* Match Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ranked */}
              <div className="bg-gradient-to-br from-yellow-900/60 to-orange-900/60 backdrop-blur rounded-xl p-5 border border-yellow-600/50 hover:border-yellow-500 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">랭크전</h3>
                    <p className="text-yellow-300/80 text-xs">경쟁 모드</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">승리 보상</span>
                    <span className="text-yellow-300 font-bold">5,000P</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">패배 보상</span>
                    <span className="text-gray-300">1,000P</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">레이팅</span>
                    <span className="text-yellow-300">±25</span>
                  </div>
                </div>

                <button
                  onClick={() => startMatch('RANKED')}
                  className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
                >
                  랭크전 시작
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Normal */}
              <div className="bg-gradient-to-br from-blue-900/60 to-cyan-900/60 backdrop-blur rounded-xl p-5 border border-blue-600/50 hover:border-blue-500 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">일반전</h3>
                    <p className="text-blue-300/80 text-xs">연습 모드</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">승리 보상</span>
                    <span className="text-blue-300 font-bold">1,500P</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">패배 보상</span>
                    <span className="text-gray-300">300P</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">레이팅</span>
                    <span className="text-gray-400">영향 없음</span>
                  </div>
                </div>

                <button
                  onClick={() => startMatch('NORMAL')}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg hover:from-blue-600 hover:to-cyan-600 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  일반전 시작
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Spectate */}
            <div className="bg-gray-800/60 backdrop-blur rounded-xl p-4 border border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">관전</h3>
                  <p className="text-gray-400 text-xs">진행 중인 경기 관전</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/spectator')}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                관전하기
              </button>
            </div>

            {/* Game Rules - Compact */}
            <div className="bg-gray-800/40 backdrop-blur rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                게임 규칙
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">승리 조건</p>
                  <p className="text-gray-300">상대 넥서스 파괴 또는 항복</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">이벤트</p>
                  <p className="text-gray-300">유충(3턴) → 용(5턴) → 전령(7턴) → 바론(9턴+)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
