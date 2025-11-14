import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserCard } from '../types';

export default function Deck() {
  const [deck, setDeck] = useState<{
    top: UserCard | null;
    jungle: UserCard | null;
    mid: UserCard | null;
    adc: UserCard | null;
    support: UserCard | null;
  }>({
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  });

  const [teamSynergy, setTeamSynergy] = useState(0);

  // Mock available cards
  const mockCards: UserCard[] = [
    {
      id: 1,
      userId: 1,
      playerId: 1,
      level: 0,
      createdAt: new Date().toISOString(),
      player: {
        id: 1,
        name: 'Faker',
        team: 'T1',
        position: 'MID',
        overall: 98,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [],
      },
    },
    {
      id: 2,
      userId: 1,
      playerId: 2,
      level: 0,
      createdAt: new Date().toISOString(),
      player: {
        id: 2,
        name: 'Zeus',
        team: 'HLE',
        position: 'TOP',
        overall: 93,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [],
      },
    },
    {
      id: 3,
      userId: 1,
      playerId: 3,
      level: 0,
      createdAt: new Date().toISOString(),
      player: {
        id: 3,
        name: 'Oner',
        team: 'T1',
        position: 'JUNGLE',
        overall: 93,
        region: 'LCK',
        tier: 'LEGENDARY',
        traits: [],
      },
    },
  ];

  const positions = [
    { key: 'top' as const, label: '탑', color: 'bg-red-500' },
    { key: 'jungle' as const, label: '정글', color: 'bg-green-500' },
    { key: 'mid' as const, label: '미드', color: 'bg-blue-500' },
    { key: 'adc' as const, label: '원딜', color: 'bg-yellow-500' },
    { key: 'support' as const, label: '서포터', color: 'bg-purple-500' },
  ];

  const calculateSynergy = (newDeck: typeof deck) => {
    const cards = Object.values(newDeck).filter(Boolean) as UserCard[];
    if (cards.length === 0) return 0;

    const teams = cards.map(c => c.player.team);
    const teamCounts: { [key: string]: number } = {};

    teams.forEach(team => {
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    });

    let synergy = 0;
    Object.values(teamCounts).forEach(count => {
      if (count === 3) synergy += 5;
      if (count === 4) synergy += 12;
      if (count === 5) synergy += 25;
    });

    return synergy;
  };

  const addToD = (position: keyof typeof deck, card: UserCard) => {
    if (card.player.position !== position.toUpperCase()) {
      toast.error(`이 선수는 ${position.toUpperCase()} 포지션이 아닙니다!`);
      return;
    }

    const newDeck = { ...deck, [position]: card };
    setDeck(newDeck);
    const synergy = calculateSynergy(newDeck);
    setTeamSynergy(synergy);
    toast.success(`${card.player.name}을(를) ${position.toUpperCase()}에 배치했습니다!`);
  };

  const removeFromDeck = (position: keyof typeof deck) => {
    const newDeck = { ...deck, [position]: null };
    setDeck(newDeck);
    const synergy = calculateSynergy(newDeck);
    setTeamSynergy(synergy);
    toast.success('카드를 제거했습니다');
  };

  const saveDeck = () => {
    const filledPositions = Object.values(deck).filter(Boolean).length;
    if (filledPositions < 5) {
      toast.error('모든 포지션을 채워주세요!');
      return;
    }

    // TODO: API 연동
    toast.success('덱이 저장되었습니다!');
  };

  const getTotalPower = () => {
    return Object.values(deck)
      .filter(Boolean)
      .reduce((sum, card) => sum + (card as UserCard).player.overall, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            덱 편성
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            최강의 5인 로스터를 구성하세요
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deck Builder */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                현재 덱 구성
              </h2>

              <div className="space-y-4">
                {positions.map((pos) => (
                  <div
                    key={pos.key}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`${pos.color} text-white text-xs font-bold px-3 py-1 rounded`}>
                          {pos.label}
                        </div>
                        {deck[pos.key] && deck[pos.key]!.player.overall - 10 < 0 && (
                          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">잘못된 포지션 (-10 OVR)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {deck[pos.key] ? (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-gray-600 dark:text-gray-300">
                              {deck[pos.key]!.player.name[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {deck[pos.key]!.player.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {deck[pos.key]!.player.team} • OVR {deck[pos.key]!.player.overall}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromDeck(pos.key)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        >
                          제거
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                        {pos.label} 카드를 선택하세요
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={saveDeck}
                className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>덱 저장</span>
              </button>
            </motion.div>
          </div>

          {/* Stats & Card Selection */}
          <div className="space-y-6">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl shadow-lg p-6 text-white"
            >
              <h3 className="text-xl font-bold mb-4">덱 능력치</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm opacity-90 mb-1">총 전력</div>
                  <div className="text-4xl font-bold">{getTotalPower()}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90 mb-1 flex items-center space-x-1">
                    <Sparkles className="w-4 h-4" />
                    <span>팀 시너지</span>
                  </div>
                  <div className="text-3xl font-bold">+{teamSynergy}%</div>
                </div>
                <div className="pt-4 border-t border-white/20">
                  <div className="text-sm opacity-90 mb-2">시너지 보너스</div>
                  <ul className="text-xs space-y-1 opacity-90">
                    <li>• 3명 같은 팀: +5%</li>
                    <li>• 4명 같은 팀: +12%</li>
                    <li>• 5명 같은 팀: +25%</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Available Cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                보유 카드
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mockCards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => addToD(card.player.position.toLowerCase() as keyof typeof deck, card)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                            {card.player.name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">
                            {card.player.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {card.player.position} • {card.player.overall}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
