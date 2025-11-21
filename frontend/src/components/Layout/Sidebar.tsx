import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Trophy, User, LogOut, Users, ChevronDown, ChevronRight, Menu, X, Swords, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useOnlineStore } from '../../store/onlineStore';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface MatchNotification {
  userId: number;
  username: string;
  matchType: 'RANKED' | 'NORMAL';
  rating: number;
  queuePosition: number;
}

export default function Sidebar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const { onlineUsers } = useOnlineStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [matchNotification, setMatchNotification] = useState<MatchNotification | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(s => s !== label)
        : [...prev, label]
    );
  };

  // Listen for match notifications
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      socket.emit('authenticate', { token });
    });

    socket.on('auth_success', () => {
      // Listen for match notifications
      socket.on('moba_match_notification', (notification: MatchNotification) => {
        // Don't show notification for own user
        if (notification.userId === user?.id) return;
        
        setMatchNotification(notification);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setMatchNotification(null);
        }, 10000);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token, user?.id]);

  const handleJoinMatch = () => {
    if (!matchNotification) return;
    
    // Navigate to match select with the same match type
    navigate(`/match-select?type=${matchNotification.matchType}`);
    setMatchNotification(null);
  };

  const handleDismiss = () => {
    setMatchNotification(null);
  };

  type NavItem = {
    path: string;
    label: string;
  };

  type NavDropdown = {
    label: string;
    items: NavItem[];
  };

  type NavStructureItem = NavItem | NavDropdown;

  const navStructure: NavStructureItem[] = [
    { path: '/', label: '홈' },
    { path: '/how-to-play', label: '게임 가이드' },
    {
      label: '카드',
      items: [
        { path: '/gacha', label: '뽑기' },
        { path: '/fusion', label: '합성' },
        { path: '/enhancement', label: '강화' },
        { path: '/deck', label: '덱 편성' },
        { path: '/coach', label: '코치' },
        { path: '/card-collection', label: '도감' },
      ]
    },
    {
      label: '경기',
      items: [
        { path: '/match-select', label: 'MOBA 대전' },
        { path: '/spectator', label: '관전' },
        { path: '/friendly', label: '친선전' },
        { path: '/ai-battle', label: 'AI 배틀' },
        { path: '/campaign', label: '캠페인' },
        { path: '/infinite-challenge', label: '무한도전' },
      ]
    },
    { path: '/market', label: '이적시장' },
    { path: '/raid', label: '레이드' },
    { path: '/shop', label: '포인트 상점' },
    { path: '/titles', label: '칭호' },
    { path: '/ranking', label: '랭킹' },
    { path: '/strategy-stats', label: '전략 통계' },
    { path: '/champions', label: '챔피언 소개' },
    {
      label: '길드',
      items: [
        { path: '/guild', label: '길드' },
        { path: '/clan-war', label: '길드전' },
      ]
    },
    {
      label: '미션/업적',
      items: [
        { path: '/missions', label: '미션' },
        { path: '/achievements', label: '업적' },
        { path: '/agent', label: '에이전트' },
      ]
    },
    {
      label: '이벤트',
      items: [
        { path: '/lottery', label: '럭키 드로우' },
      ]
    },
    { path: '/trade', label: '트레이드' },
    { path: '/coupon', label: '쿠폰' },
    { path: '/packs', label: '팩 인벤토리' },
    { path: '/settings', label: '설정' },
    { path: '/notices', label: '공지사항' },
    { path: '/suggestions', label: '건의사항' },
  ];

  const isDropdownActive = (items: NavItem[]) => {
    return items.some(item => location.pathname === item.path);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-[60] p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-[55]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-[55] overflow-y-auto
          lg:static lg:block ${isMobileOpen ? 'block' : 'hidden lg:block'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">LOL</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Card Game</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{user.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.tier}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                <p className="text-gray-500 dark:text-gray-400">포인트</p>
                <p className="font-bold text-primary-600 dark:text-primary-400">{user.points?.toLocaleString()}P</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                <p className="text-gray-500 dark:text-gray-400">레벨</p>
                <p className="font-bold text-purple-600 dark:text-purple-400">Lv.{user.level || 1}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2">
          {navStructure.map((item, index) => {
            if ('items' in item) {
              const isExpanded = expandedSections.includes(item.label);
              const hasActiveChild = isDropdownActive(item.items);

              return (
                <div key={index} className="mb-1">
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      hasActiveChild
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-1 space-y-1">
                          {item.items.map((subItem, subIndex) => (
                            <Link
                              key={subIndex}
                              to={subItem.path}
                              onClick={() => setIsMobileOpen(false)}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive(subItem.path)
                                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            } else {
              return (
                <Link
                  key={index}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg mb-1 transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            }
          })}
        </nav>

        {/* Match Notification */}
        <AnimatePresence>
          {matchNotification && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-500/10 to-purple-500/10"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-primary-500 rounded-lg">
                  <Swords className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {matchNotification.username}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {matchNotification.matchType === 'RANKED' ? '랭크전' : '일반전'} 매칭 중
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    레이팅: {matchNotification.rating} | 큐 위치: {matchNotification.queuePosition}
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <XCircle className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleJoinMatch}
                  className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  같이하기
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  무시
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{onlineUsers} 접속중</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {isAuthenticated ? (
            <div className="space-y-2">
              <Link
                to="/profile"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">프로필</span>
              </Link>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">관리자</span>
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">로그아웃</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMobileOpen(false)}
                className="block w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-center font-medium transition-colors"
              >
                로그인
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileOpen(false)}
                className="block w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-center font-medium transition-colors"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
