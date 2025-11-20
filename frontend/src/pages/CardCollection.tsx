import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import {
  Book,
  Search,
  Filter,
  Trophy,
  Star,
  CheckCircle,
  Circle,
  Gift,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Player {
  id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  tier: string;
  season: string;
  image_url: string | null;
  collected?: boolean;
  first_obtained_at?: string;
  total_obtained?: number;
}

interface CollectionStats {
  collected_count: number;
  total_count: number;
}

interface Milestone {
  id: number;
  required_cards: number;
  reward_points: number;
  milestone_type: string;
  filter_value: string | null;
  description: string;
  claimed: boolean;
}

interface Progress {
  tier: string;
  collected: number;
  total: number;
}

const tierColors: { [key: string]: string } = {
  ICON: 'from-red-500 to-pink-500',
  GR: 'from-yellow-500 to-orange-500',
  LEGENDARY: 'from-purple-500 to-pink-500',
  EPIC: 'from-blue-500 to-cyan-500',
  RARE: 'from-green-500 to-emerald-500',
  COMMON: 'from-gray-500 to-gray-600',
};

export default function CardCollection() {
  const { token } = useAuthStore();
  const [cards, setCards] = useState<Player[]>([]);
  const [stats, setStats] = useState<CollectionStats>({ collected_count: 0, total_count: 0 });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tierProgress, setTierProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [showOnlyCollected, setShowOnlyCollected] = useState(false);

  // Delete cards state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteThreshold, setDeleteThreshold] = useState(80);
  const [deletePreview, setDeletePreview] = useState<{
    count: number;
    pointsToGain: number;
    cards: any[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCollection();
    fetchProgress();
    fetchMilestones();
  }, [filterTier, filterSeason, filterTeam, filterPosition, searchTerm]);

  const fetchCollection = async () => {
    try {
      setLoading(true);

      const params: any = {};
      if (filterTier) params.tier = filterTier;
      if (filterSeason) params.season = filterSeason;
      if (filterTeam) params.team = filterTeam;
      if (filterPosition) params.position = filterPosition;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_URL}/collection`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.success) {
        setCards(response.data.data.cards);
        setStats(response.data.data.stats);
      }
    } catch (error: any) {
      console.error('Fetch collection error:', error);
      toast.error('도감 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API_URL}/collection/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setTierProgress(response.data.data.tierProgress);
      }
    } catch (error: any) {
      console.error('Fetch progress error:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await axios.get(`${API_URL}/collection/milestones`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMilestones(response.data.data);
      }
    } catch (error: any) {
      console.error('Fetch milestones error:', error);
    }
  };

  const claimMilestone = async (milestoneId: number) => {
    try {
      const response = await axios.post(
        `${API_URL}/collection/milestones/claim`,
        { milestoneId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchMilestones();
        fetchProgress();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '보상 수령 실패');
    }
  };

  const fetchDeletePreview = async (threshold: number) => {
    try {
      const response = await axios.get(`${API_URL}/collection/delete-below-overall/preview`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { threshold },
      });

      if (response.data.success) {
        setDeletePreview(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '미리보기 실패');
    }
  };

  const handleDeleteCards = async () => {
    if (!deletePreview || deletePreview.count === 0) return;

    setIsDeleting(true);
    try {
      const response = await axios.post(
        `${API_URL}/collection/delete-below-overall`,
        { threshold: deleteThreshold },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowDeleteModal(false);
        setDeletePreview(null);
        fetchCollection();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '삭제 실패');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    fetchDeletePreview(deleteThreshold);
  };

  const filteredCards = showOnlyCollected ? cards.filter((c) => c.collected) : cards;

  const collectionRate = stats.total_count > 0
    ? ((stats.collected_count / stats.total_count) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
          <Book className="w-10 h-10 text-purple-400" />
          카드 도감
        </h1>

        {/* Collection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-xl"
          >
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 mb-1">수집 진행도</p>
                  <p className="text-3xl font-bold text-white">
                    {stats.collected_count} / {stats.total_count}
                  </p>
                </div>
                <div className="text-5xl font-bold text-white/20">{collectionRate}%</div>
              </div>
              <div className="mt-4 bg-white/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${collectionRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                />
              </div>
            </div>
          </motion.div>

          {/* Tier Progress */}
          {tierProgress.slice(0, 2).map((progress, index) => (
            <motion.div
              key={progress.tier}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-r ${tierColors[progress.tier]} p-1 rounded-xl`}
            >
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-white/60 mb-1">{progress.tier} 티어</p>
                <p className="text-3xl font-bold text-white">
                  {progress.collected} / {progress.total}
                </p>
                <div className="mt-2 text-white/80">
                  {((progress.collected / progress.total) * 100).toFixed(0)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Milestones */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            마일스톤 보상
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.slice(0, 6).map((milestone) => {
              const canClaim = stats.collected_count >= milestone.required_cards && !milestone.claimed;

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`relative bg-white/5 backdrop-blur-lg rounded-xl p-4 border-2 ${
                    milestone.claimed
                      ? 'border-green-500'
                      : canClaim
                      ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-bold">{milestone.description}</p>
                      <p className="text-white/60 text-sm">
                        {milestone.required_cards}장 수집
                      </p>
                    </div>
                    {milestone.claimed ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-white/40" />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">
                        {milestone.reward_points.toLocaleString()}P
                      </span>
                    </div>

                    {canClaim && (
                      <button
                        onClick={() => claimMilestone(milestone.id)}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition text-sm"
                      >
                        수령
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-bold text-white">필터</h3>
            </div>
            <button
              onClick={openDeleteModal}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              카드 일괄 삭제
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="선수 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Tier Filter */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">모든 티어</option>
              <option value="ICON">ICON</option>
              <option value="GR">GR</option>
              <option value="LEGENDARY">LEGENDARY</option>
              <option value="EPIC">EPIC</option>
              <option value="RARE">RARE</option>
              <option value="COMMON">COMMON</option>
            </select>

            {/* Season Filter */}
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">모든 시즌</option>
              <option value="25">25</option>
              <option value="25HW">25HW</option>
              <option value="25MSI">25MSI</option>
              <option value="19G2">19G2</option>
              <option value="GR">GR</option>
              <option value="T1">T1</option>
              <option value="RE">RE</option>
              <option value="ICON">ICON</option>
            </select>

            {/* Position Filter */}
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">모든 포지션</option>
              <option value="TOP">TOP</option>
              <option value="JUN">JUN</option>
              <option value="MID">MID</option>
              <option value="ADC">ADC</option>
              <option value="SUP">SUP</option>
            </select>

            {/* Show Collected Only */}
            <label className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg cursor-pointer hover:bg-white/15 transition">
              <input
                type="checkbox"
                checked={showOnlyCollected}
                onChange={(e) => setShowOnlyCollected(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-white">보유만</span>
            </label>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/60">도감 로딩 중...</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`relative ${
                  card.collected
                    ? `bg-gradient-to-br ${tierColors[card.tier]} p-1`
                    : 'bg-gray-800'
                } rounded-xl`}
              >
                <div className="bg-gray-900 rounded-lg p-4 h-full">
                  {/* Collected Badge */}
                  {card.collected && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Card Image Placeholder */}
                  <div className="aspect-square bg-white/5 rounded-lg mb-2 flex items-center justify-center">
                    {card.collected ? (
                      <Star className="w-12 h-12 text-yellow-400" />
                    ) : (
                      <Circle className="w-12 h-12 text-white/20" />
                    )}
                  </div>

                  {/* Card Info */}
                  <div className={card.collected ? '' : 'opacity-30'}>
                    <p className="text-white font-bold text-sm mb-1 truncate">
                      {card.collected ? card.name : '???'}
                    </p>
                    <p className="text-white/60 text-xs mb-1">
                      {card.collected ? card.team : '???'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{card.position}</span>
                      {card.collected && (
                        <span className="text-yellow-400 font-bold text-sm">
                          {card.overall}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Collection Count */}
                  {card.collected && card.total_obtained && card.total_obtained > 1 && (
                    <div className="mt-2 text-center bg-white/10 rounded py-1">
                      <span className="text-xs text-white/60">
                        ×{card.total_obtained}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete Cards Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <h3 className="text-2xl font-bold text-white">카드 일괄 삭제</h3>
              </div>

              <p className="text-gray-400 mb-4">
                설정한 오버롤 미만의 카드를 모두 삭제합니다.
                <br />
                <span className="text-yellow-400">잠긴 카드와 덱에 있는 카드는 삭제되지 않습니다.</span>
              </p>

              <div className="mb-4">
                <label className="text-white font-bold mb-2 block">
                  오버롤 기준 (미만 삭제)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="120"
                    value={deleteThreshold}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setDeleteThreshold(value);
                      fetchDeletePreview(value);
                    }}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-white w-16 text-center">
                    {deleteThreshold}
                  </span>
                </div>
              </div>

              {deletePreview && (
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">삭제할 카드</span>
                    <span className="text-red-400 font-bold">{deletePreview.count}장</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="text-gray-400">획득 포인트</span>
                    <span className="text-green-400 font-bold">+{deletePreview.pointsToGain.toLocaleString()}P</span>
                  </div>

                  {deletePreview.cards.length > 0 && (
                    <div className="max-h-40 overflow-y-auto">
                      <p className="text-xs text-gray-500 mb-2">삭제될 카드 목록:</p>
                      <div className="space-y-1">
                        {deletePreview.cards.slice(0, 20).map((card: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-400">{card.name}</span>
                            <span className="text-white">{card.overall}</span>
                          </div>
                        ))}
                        {deletePreview.cards.length > 20 && (
                          <p className="text-xs text-gray-500">
                            ...외 {deletePreview.cards.length - 20}장
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteCards}
                  disabled={isDeleting || !deletePreview || deletePreview.count === 0}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  {isDeleting ? '삭제 중...' : `${deletePreview?.count || 0}장 삭제`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
