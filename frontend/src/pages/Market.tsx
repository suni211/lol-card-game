import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Filter, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { calculateEnhancementBonus, getTierColor, getTeamColor, getPositionColor } from '../utils/cardHelpers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface MarketListing {
  listing_id: number;
  player_id: number;
  seller_id: number;
  card_id: number;
  listing_price: number;
  listed_at: string;
  name: string;
  team: string;
  position: string;
  overall: number;
  tier: string;
  region: string;
  season: string;
  level: number;
  seller_username: string;
  market_price: number;
}

interface MyListing {
  listing_id: number;
  player_id: number;
  card_id: number;
  listing_price: number;
  status: string;
  listed_at: string;
  sold_at?: string;
  name: string;
  team: string;
  position: string;
  overall: number;
  tier: string;
  level: number;
  buyer_username?: string;
}

interface UserCard {
  id: number;
  player: {
    id: number;
    name: string;
    team: string;
    position: string;
    overall: number;
    tier: string;
  };
  level: number;
}

export default function Market() {
  const { user, token, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-listings'>('buy');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [showSellModal, setShowSellModal] = useState(false);
  const [priceRange, setPriceRange] = useState<{ floor: number; ceiling: number }>({ floor: 0, ceiling: 0 });

  useEffect(() => {
    if (activeTab === 'buy') {
      fetchListings();
    } else if (activeTab === 'sell') {
      fetchMyCards();
    } else if (activeTab === 'my-listings') {
      fetchMyListings();
    }
  }, [activeTab, filterTier, filterPosition, sortBy]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTier !== 'ALL') params.append('tier', filterTier);
      if (filterPosition !== 'ALL') params.append('position', filterPosition);
      if (sortBy) params.append('sort', sortBy);

      const response = await axios.get(`${API_URL}/market/listings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setListings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('매물을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/gacha/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMyCards(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch my cards:', error);
      toast.error('카드 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/market/my-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMyListings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch my listings:', error);
      toast.error('내 매물을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listingId: number, price: number) => {
    if (user && user.points < price) {
      toast.error('포인트가 부족합니다');
      return;
    }

    if (!window.confirm('이 카드를 구매하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/market/buy/${listingId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchListings();
        // Refresh user data
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.data.success) {
          updateUser(userResponse.data.data);
        }
      }
    } catch (error: any) {
      console.error('Failed to buy card:', error);
      toast.error(error.response?.data?.error || '구매에 실패했습니다');
    }
  };

  const handleSellClick = async (card: UserCard) => {
    try {
      const response = await axios.get(`${API_URL}/market/player/${card.player.id}?level=${card.level}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const { priceInfo } = response.data.data;
        setPriceRange({
          floor: priceInfo.price_floor,
          ceiling: priceInfo.price_ceiling,
        });
        setSellPrice(priceInfo.current_price);
        setSelectedCard(card);
        setShowSellModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch player price:', error);
      toast.error('가격 정보를 불러오는데 실패했습니다');
    }
  };

  const handleListForSale = async () => {
    if (!selectedCard) return;

    if (sellPrice < priceRange.floor || sellPrice > priceRange.ceiling) {
      toast.error(`가격은 ${priceRange.floor}P ~ ${priceRange.ceiling}P 사이여야 합니다`);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/market/list`,
        {
          cardId: selectedCard.id,
          price: sellPrice,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('카드가 등록되었습니다!');
        setShowSellModal(false);
        setSelectedCard(null);
        setSellPrice(0);
        fetchMyCards();
      }
    } catch (error: any) {
      console.error('Failed to list card:', error);
      toast.error(error.response?.data?.error || '등록에 실패했습니다');
    }
  };

  const handleCancelListing = async (listingId: number) => {
    if (!window.confirm('매물을 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/market/listing/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('매물이 취소되었습니다');
        fetchMyListings();
      }
    } catch (error: any) {
      console.error('Failed to cancel listing:', error);
      toast.error(error.response?.data?.error || '취소에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <ShoppingCart className="w-10 h-10 mr-3 text-primary-600" />
            이적시장
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            다른 플레이어들과 카드를 거래하세요
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'buy'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            구매
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'sell'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            판매
          </button>
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'my-listings'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            내 매물
          </button>
        </div>

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="ALL">모든 등급</option>
                  <option value="LEGENDARY">레전드</option>
                  <option value="EPIC">에픽</option>
                  <option value="RARE">레어</option>
                  <option value="COMMON">일반</option>
                </select>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="ALL">모든 포지션</option>
                  <option value="TOP">탑</option>
                  <option value="JUNGLE">정글</option>
                  <option value="MID">미드</option>
                  <option value="ADC">원딜</option>
                  <option value="SUPPORT">서포터</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="price_asc">가격 낮은순</option>
                  <option value="price_desc">가격 높은순</option>
                  <option value="date_desc">최신순</option>
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  매물이 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  다른 필터를 선택해보세요
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <motion.div
                    key={listing.listing_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className={`h-2 bg-gradient-to-r ${getTierColor(listing.tier)}`} />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {listing.name}
                          </h3>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`${getTeamColor(listing.team)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {listing.team}
                            </span>
                            <span className={`${getPositionColor(listing.position)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {listing.position}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {listing.overall + calculateEnhancementBonus(listing.level)}
                          </div>
                          {listing.level > 0 && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              +{listing.level}강
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          판매자: {listing.seller_username}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">판매가</div>
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {listing.listing_price.toLocaleString()}P
                          </div>
                        </div>
                        {listing.market_price && (
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">시세</div>
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                              {listing.market_price.toLocaleString()}P
                            </div>
                            {listing.listing_price < listing.market_price && (
                              <div className="text-xs text-green-600 dark:text-green-400 flex items-center">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                저렴함
                              </div>
                            )}
                            {listing.listing_price > listing.market_price && (
                              <div className="text-xs text-red-600 dark:text-red-400 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                비쌈
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleBuy(listing.listing_id, listing.listing_price)}
                        className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <DollarSign className="w-5 h-5" />
                        <span>구매하기</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sell Tab */}
        {activeTab === 'sell' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className={`h-2 bg-gradient-to-r ${getTierColor(card.player.tier)}`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {card.player.name}
                    </h3>
                    {card.level > 0 && (
                      <div className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded text-white text-xs font-bold">
                        +{card.level}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`${getTeamColor(card.player.team)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                        {card.player.team}
                      </span>
                      <span className={`${getPositionColor(card.player.position)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                        {card.player.position}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {card.player.overall + calculateEnhancementBonus(card.level)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSellClick(card)}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                  >
                    판매 등록
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* My Listings Tab */}
        {activeTab === 'my-listings' && (
          <div className="space-y-4">
            {myListings.map((listing) => (
              <div
                key={listing.listing_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {listing.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`${getTierColor(listing.tier)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                          {listing.tier}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {listing.position}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {listing.overall + calculateEnhancementBonus(listing.level)} OVR
                        </span>
                        {listing.level > 0 && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">
                            +{listing.level}강
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">가격</div>
                      <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {listing.listing_price.toLocaleString()}P
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">상태</div>
                      <div className={`text-sm font-bold ${
                        listing.status === 'LISTED' ? 'text-blue-600 dark:text-blue-400' :
                        listing.status === 'SOLD' ? 'text-green-600 dark:text-green-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {listing.status === 'LISTED' ? '판매중' : listing.status === 'SOLD' ? '판매완료' : '취소됨'}
                      </div>
                    </div>
                    {listing.status === 'LISTED' && (
                      <button
                        onClick={() => handleCancelListing(listing.listing_id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sell Modal */}
        <AnimatePresence>
          {showSellModal && selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowSellModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    판매 등록
                  </h3>
                  <button
                    onClick={() => setShowSellModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {selectedCard.player.name}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedCard.player.tier} · {selectedCard.player.position} · OVR {selectedCard.player.overall + calculateEnhancementBonus(selectedCard.level)}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                    판매 가격
                  </label>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    min={priceRange.floor}
                    max={priceRange.ceiling}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    가격 범위: {priceRange.floor.toLocaleString()}P ~ {priceRange.ceiling.toLocaleString()}P
                  </p>
                  {sellPrice > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">판매 가격:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{sellPrice.toLocaleString()}P</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-700 dark:text-gray-300">수수료 (30%):</span>
                        <span className="font-bold text-red-600 dark:text-red-400">-{Math.floor(sellPrice * 0.3).toLocaleString()}P</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-700">
                        <span className="font-bold text-gray-900 dark:text-white">실제 수령액:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{(sellPrice - Math.floor(sellPrice * 0.3)).toLocaleString()}P</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSellModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleListForSale}
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors"
                  >
                    등록하기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
