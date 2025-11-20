import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, Filter, X,
  Megaphone, Search, Bell, BellOff, Eye, ChevronDown, ChevronUp,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { calculateEnhancementBonus, getTierColor, getTeamColor, getPositionColor } from '../utils/cardHelpers';
import MegaphoneShop from '../components/MegaphoneShop';

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

interface SearchPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
  overall: number;
  tier: string;
  region: string;
  season: string;
  salary?: number;
  current_price: number;
  price_floor: number;
  price_ceiling: number;
  total_volume: number;
  last_traded_price: number;
  last_traded_at: string;
  lowest_price: number;
  listing_count: number;
}

interface PriceAlert {
  id: number;
  player_id: number;
  max_price: number;
  is_active: boolean;
  created_at: string;
  name: string;
  team: string;
  position: string;
  overall: number;
  tier: string;
  season: string;
  current_price: number;
  lowest_price: number;
}

interface PlayerStats {
  laning: number;
  mechanics: number;
  teamfight: number;
  vision: number;
  macro: number;
  mental: number;
}

export default function Market() {
  const { user, token, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'search' | 'buy' | 'sell' | 'my-listings' | 'price-alerts' | 'megaphone'>('search');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('ALL');
  const [filterSeason, setFilterSeason] = useState<string>('ALL');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [minOverall, setMinOverall] = useState<number>(0);
  const [maxOverall, setMaxOverall] = useState<number>(150);
  const [searchSortBy, setSearchSortBy] = useState<string>('overall_desc');

  // Buy filters
  const [sortBy, setSortBy] = useState<string>('price_asc');

  // Modals
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchPlayer | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<{ floor: number; ceiling: number }>({ floor: 0, ceiling: 0 });
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (activeTab === 'search') {
      fetchSearchResults();
    } else if (activeTab === 'buy') {
      fetchListings();
    } else if (activeTab === 'sell') {
      fetchMyCards();
    } else if (activeTab === 'my-listings') {
      fetchMyListings();
    } else if (activeTab === 'price-alerts') {
      fetchPriceAlerts();
    }
  }, [activeTab, filterTier, filterPosition, sortBy, searchSortBy]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('name', searchQuery);
      if (filterTeam !== 'ALL') params.append('team', filterTeam);
      if (filterSeason !== 'ALL') params.append('season', filterSeason);
      if (filterTier !== 'ALL') params.append('tier', filterTier);
      if (filterPosition !== 'ALL') params.append('position', filterPosition);
      if (minOverall > 0) params.append('minOverall', minOverall.toString());
      if (maxOverall < 150) params.append('maxOverall', maxOverall.toString());
      if (searchSortBy) params.append('sortBy', searchSortBy);

      const response = await axios.get(`${API_URL}/market/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch search results:', error);
      toast.error('검색 결과를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchPriceAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/market/price-alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setPriceAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch price alerts:', error);
      toast.error('상한가 예약 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSearchResults();
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
        toast.success(response.data.message);
        setShowSellModal(false);
        setSelectedCard(null);
        setSellPrice(0);
        fetchMyCards();
        if (response.data.autoSold) {
          const userResponse = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userResponse.data.success) {
            updateUser(userResponse.data.data);
          }
        }
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

  const handlePlayerClick = async (player: SearchPlayer) => {
    try {
      // Fetch player stats
      const response = await axios.get(`${API_URL}/players/${player.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setPlayerStats(response.data.data);
      }

      setSelectedPlayer(player);
      setShowPlayerModal(true);
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
      setSelectedPlayer(player);
      setShowPlayerModal(true);
    }
  };

  const handleSetPriceAlert = (player: SearchPlayer) => {
    setSelectedPlayer(player);
    setAlertPrice(player.current_price || 0);
    setShowAlertModal(true);
  };

  const handleRegisterPriceAlert = async () => {
    if (!selectedPlayer || alertPrice <= 0) {
      toast.error('유효한 가격을 입력해주세요');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/market/price-alert`,
        {
          playerId: selectedPlayer.id,
          maxPrice: alertPrice,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowAlertModal(false);
        setSelectedPlayer(null);
        setAlertPrice(0);
        if (activeTab === 'price-alerts') {
          fetchPriceAlerts();
        }
      }
    } catch (error: any) {
      console.error('Failed to register price alert:', error);
      toast.error(error.response?.data?.error || '등록에 실패했습니다');
    }
  };

  const handleTogglePriceAlert = async (id: number) => {
    try {
      const response = await axios.patch(
        `${API_URL}/market/price-alert/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchPriceAlerts();
      }
    } catch (error: any) {
      console.error('Failed to toggle price alert:', error);
      toast.error(error.response?.data?.error || '변경에 실패했습니다');
    }
  };

  const handleDeletePriceAlert = async (id: number) => {
    if (!window.confirm('상한가 예약을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/market/price-alert/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchPriceAlerts();
      }
    } catch (error: any) {
      console.error('Failed to delete price alert:', error);
      toast.error(error.response?.data?.error || '삭제에 실패했습니다');
    }
  };

  const teams = ['ALL', 'T1', 'GENG', 'HLE', 'KT', 'DK', 'DRX', 'BRO', 'NS', 'FOX', 'KDF'];
  const seasons = ['ALL', '25', 'RE', '25HW', '25MSI', 'GR', 'T1', '22WC', '19WC', '18WC', '17WC', '16WC', 'ICON', '19G2', 'WCP', 'MSI'];

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
            선수를 검색하고 카드를 거래하세요
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'search'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            검색
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'buy'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            구매
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'sell'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            판매
          </button>
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'my-listings'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            내 매물
          </button>
          <button
            onClick={() => setActiveTab('price-alerts')}
            className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'price-alerts'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5 inline mr-2" />
            상한가 예약
          </button>
          <button
            onClick={() => setActiveTab('megaphone')}
            className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'megaphone'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Megaphone size={20} />
            확성기 상점
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="선수 이름 검색..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="w-5 h-5" />
                  <span>검색</span>
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Filter className="w-5 h-5" />
                  <span>필터</span>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">팀</label>
                    <select
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      {teams.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">시즌</label>
                    <select
                      value={filterSeason}
                      onChange={(e) => setFilterSeason(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      {seasons.map((season) => (
                        <option key={season} value={season}>{season}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">포지션</label>
                    <select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="ALL">모든 포지션</option>
                      <option value="TOP">탑</option>
                      <option value="JUNGLE">정글</option>
                      <option value="MID">미드</option>
                      <option value="ADC">원딜</option>
                      <option value="SUPPORT">서포터</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">티어</label>
                    <select
                      value={filterTier}
                      onChange={(e) => setFilterTier(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="ALL">모든 등급</option>
                      <option value="ICON">아이콘</option>
                      <option value="LEGENDARY">레전드</option>
                      <option value="EPIC">에픽</option>
                      <option value="RARE">레어</option>
                      <option value="COMMON">일반</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">정렬</label>
                    <select
                      value={searchSortBy}
                      onChange={(e) => setSearchSortBy(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="overall_desc">오버롤 높은순</option>
                      <option value="overall_asc">오버롤 낮은순</option>
                      <option value="price_desc">가격 높은순</option>
                      <option value="price_asc">가격 낮은순</option>
                      <option value="listing_count">매물 많은순</option>
                      <option value="latest">최신순</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      오버롤 범위: {minOverall} - {maxOverall}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="range"
                        min="0"
                        max="150"
                        value={minOverall}
                        onChange={(e) => setMinOverall(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="range"
                        min="0"
                        max="150"
                        value={maxOverall}
                        onChange={(e) => setMaxOverall(parseInt(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Search Results */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  다른 검색어나 필터를 시도해보세요
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className={`h-2 bg-gradient-to-r ${getTierColor(player.tier)}`} />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {player.name}
                          </h3>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`${getTeamColor(player.team)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {player.team}
                            </span>
                            <span className={`${getPositionColor(player.position)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {player.position}
                            </span>
                            {player.season && (
                              <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                {player.season}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {player.overall}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">OVR</div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {player.current_price && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">시세</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {player.current_price.toLocaleString()}P
                            </span>
                          </div>
                        )}
                        {player.lowest_price && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">최저가</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {player.lowest_price.toLocaleString()}P
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">매물 수</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {player.listing_count || 0}개
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePlayerClick(player)}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>상세</span>
                        </button>
                        <button
                          onClick={() => handleSetPriceAlert(player)}
                          className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <Bell className="w-4 h-4" />
                          <span>예약</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4 flex-wrap">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="ALL">모든 등급</option>
                  <option value="ICON">아이콘</option>
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

        {/* Price Alerts Tab */}
        {activeTab === 'price-alerts' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                    상한가 예약 시스템
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    원하는 선수의 최대 구매 가격을 설정하면, 해당 가격 이하로 매물이 등록될 때 자동으로 구매됩니다.
                    선착순으로 처리되며, 포인트가 부족하면 구매되지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
              </div>
            ) : priceAlerts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                <div className="text-6xl mb-4">🔔</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  등록된 예약이 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  검색 탭에서 원하는 선수를 찾아 예약을 등록하세요
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {priceAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 ${
                      alert.is_active
                        ? 'border-yellow-400 dark:border-yellow-600'
                        : 'border-gray-300 dark:border-gray-600'
                    } p-6`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${alert.is_active ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          {alert.is_active ? (
                            <Bell className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <BellOff className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {alert.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`${getTierColor(alert.tier)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {alert.tier}
                            </span>
                            <span className={`${getPositionColor(alert.position)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                              {alert.position}
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {alert.overall} OVR
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm text-gray-600 dark:text-gray-400">설정 가격</div>
                          <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                            {alert.max_price.toLocaleString()}P
                          </div>
                        </div>
                        {alert.lowest_price && (
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400">현재 최저가</div>
                            <div className={`text-lg font-bold ${
                              alert.lowest_price <= alert.max_price
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {alert.lowest_price.toLocaleString()}P
                            </div>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTogglePriceAlert(alert.id)}
                            className={`px-4 py-2 font-bold rounded-lg transition-colors ${
                              alert.is_active
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {alert.is_active ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDeletePriceAlert(alert.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Megaphone Tab */}
        {activeTab === 'megaphone' && <MegaphoneShop />}

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

        {/* Price Alert Modal */}
        <AnimatePresence>
          {showAlertModal && selectedPlayer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAlertModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Bell className="w-6 h-6 mr-2 text-yellow-600" />
                    상한가 예약
                  </h3>
                  <button
                    onClick={() => setShowAlertModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {selectedPlayer.name}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedPlayer.tier} · {selectedPlayer.position} · OVR {selectedPlayer.overall}
                  </p>
                  {selectedPlayer.current_price && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      현재 시세: {selectedPlayer.current_price.toLocaleString()}P
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                    최대 구매 가격
                  </label>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    min={0}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    이 가격 이하로 매물이 등록되면 자동으로 구매합니다
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAlertModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleRegisterPriceAlert}
                    className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors"
                  >
                    예약 등록
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Detail Modal */}
        <AnimatePresence>
          {showPlayerModal && selectedPlayer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowPlayerModal(false);
                setPlayerStats(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPlayer.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowPlayerModal(false);
                      setPlayerStats(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`${getTierColor(selectedPlayer.tier)} text-white px-3 py-1 rounded font-bold`}>
                      {selectedPlayer.tier}
                    </span>
                    <span className={`${getTeamColor(selectedPlayer.team)} text-white px-3 py-1 rounded font-bold`}>
                      {selectedPlayer.team}
                    </span>
                    <span className={`${getPositionColor(selectedPlayer.position)} text-white px-3 py-1 rounded font-bold`}>
                      {selectedPlayer.position}
                    </span>
                    {selectedPlayer.season && (
                      <span className="bg-purple-600 text-white px-3 py-1 rounded font-bold">
                        {selectedPlayer.season}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    OVR {selectedPlayer.overall}
                  </div>
                </div>

                {/* Player Stats */}
                {playerStats && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">세부 능력치</h4>
                    <div className="space-y-3">
                      {Object.entries(playerStats).map(([key, value]) => {
                        const statNames: { [key: string]: string } = {
                          laning: '라인전',
                          mechanics: '피지컬',
                          teamfight: '한타',
                          vision: '시야',
                          macro: '운영',
                          mental: '멘탈'
                        };
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 dark:text-gray-300">{statNames[key]}</span>
                              <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Player Info */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">선수 정보</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-400 mb-1">급여</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {selectedPlayer.salary || 5}
                      </div>
                    </div>
                    {selectedPlayer.lowest_price && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">최저가</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {selectedPlayer.lowest_price.toLocaleString()}P
                        </div>
                      </div>
                    )}
                    {selectedPlayer.current_price && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">현재 시세</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {selectedPlayer.current_price.toLocaleString()}P
                        </div>
                      </div>
                    )}
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">매물 수</div>
                      <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {selectedPlayer.listing_count || 0}개
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPlayerModal(false);
                      setShowAlertModal(true);
                    }}
                    className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Bell className="w-5 h-5" />
                    <span>상한가 예약</span>
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
