import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Trophy, User, LogOut, Users, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function Sidebar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('online_users', (count: number) => {
      console.log('Online users updated:', count);
      setOnlineUsers(count);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(s => s !== label)
        : [...prev, label]
    );
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
        { path: '/match', label: '랭크전' },
        { path: '/practice', label: '일반전' },
        { path: '/ai-battle', label: 'AI 배틀' },
        { path: '/vsmode', label: 'VS 모드' },
        { path: '/infinite-challenge', label: '무한도전' },
      ]
    },
    { path: '/market', label: '이적시장' },
    { path: '/ranking', label: '랭킹' },
    { path: '/strategy-stats', label: '전략 통계' },
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
      ]
    },
    {
      label: '이벤트',
      items: [
        { path: '/event', label: '퀘스트' },
        { path: '/event/milestones', label: '마일스톤' },
        { path: '/event/rewards', label: '보상 인벤토리' },
      ]
    },
    { path: '/trade', label: '트레이드' },
    { path: '/coupon', label: '쿠폰' },
    { path: '/packs', label: '팩 인벤토리' },
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
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
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
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 overflow-y-auto
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
