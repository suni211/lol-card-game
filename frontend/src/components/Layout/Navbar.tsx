import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Trophy, User, LogOut, Users, ChevronDown, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [clickedDropdown, setClickedDropdown] = useState<string | null>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setClickedDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

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
      ]
    },
    { path: '/deck', label: '덱 편성' },
    {
      label: '경기',
      items: [
        { path: '/match', label: '랭크전' },
        { path: '/practice', label: '일반전' },
        { path: '/ai-battle', label: 'AI 배틀' },
        { path: '/vsmode', label: 'VS 모드' },
      ]
    },
    { path: '/market', label: '이적시장' },
    { path: '/ranking', label: '랭킹' },
    { path: '/strategy-stats', label: '전략 통계' },
    { path: '/guild', label: '길드' },
    { path: '/missions', label: '미션' },
    { path: '/achievements', label: '업적' },
    {
      label: '이벤트',
      items: [
        { path: '/event', label: '퀘스트' },
        { path: '/event/milestones', label: '마일스톤' },
        { path: '/event/rewards', label: '보상 인벤토리' },
      ]
    },
    { path: '/clan-war', label: '길드전' },
    { path: '/infinite-challenge', label: '무한도전' },
    { path: '/trade', label: '트레이드' },
    { path: '/coupon', label: '쿠폰' },
    { path: '/notices', label: '공지사항' },
    { path: '/suggestions', label: '건의사항' },
  ];

  const isDropdownActive = (items: NavItem[]) => {
    return items.some(item => location.pathname === item.path);
  };

  const handleDropdownClick = (label: string) => {
    if (clickedDropdown === label) {
      setClickedDropdown(null);
    } else {
      setClickedDropdown(label);
    }
  };

  const shouldShowDropdown = (label: string) => {
    return clickedDropdown === label || activeDropdown === label;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                LCG
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 flex-1">
            {navStructure.map((item, index) => {
              if ('items' in item) {
                // Dropdown menu
                const isDropActive = isDropdownActive(item.items);
                return (
                  <div
                    key={index}
                    className="relative group dropdown-container"
                    onMouseEnter={() => {
                      if (!clickedDropdown) setActiveDropdown(item.label);
                    }}
                    onMouseLeave={() => {
                      if (!clickedDropdown) setActiveDropdown(null);
                    }}
                  >
                    <button
                      onClick={() => handleDropdownClick(item.label)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                        isDropActive || shouldShowDropdown(item.label)
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.label}
                      <ChevronDown className={`w-4 h-4 transition-transform ${shouldShowDropdown(item.label) ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {shouldShowDropdown(item.label) && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-2 w-auto min-w-[120px] border border-gray-200 dark:border-gray-700 z-50">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => setClickedDropdown(null)}
                            className={`block px-4 py-2 text-sm transition-colors whitespace-nowrap ${
                              isActive(subItem.path)
                                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Regular link
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(item.path)
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Online Users */}
            <div className="hidden lg:flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
              <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                {onlineUsers}
              </span>
            </div>

            {isAuthenticated && user ? (
              <>
                {/* Level Display */}
                <div className="hidden lg:flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg">
                  <span className="text-sm font-bold text-white">
                    LV {user.level || 1}
                  </span>
                </div>

                {/* Points Display */}
                <div className="hidden lg:flex items-center space-x-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900 rounded-lg">
                  <Trophy className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {user.points.toLocaleString()}
                  </span>
                </div>

                {/* Tier Badge */}
                <div className="hidden lg:flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <span className="text-sm font-bold text-white">
                    {user.tier}
                  </span>
                </div>

                {/* Referral */}
                <Link
                  to="/referral"
                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg relative"
                  title="친구 추천"
                >
                  <Gift className="w-5 h-5" />
                </Link>

                {/* Profile */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-1 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline text-sm font-medium">
                    {user.guild_tag && (
                      <span className="text-purple-600 dark:text-purple-400 font-bold mr-1">
                        [{user.guild_tag}]
                      </span>
                    )}
                    {user.username}
                  </span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                로그인
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="테마 변경"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-2">
            {navStructure.map((item) => {
              if ('items' in item) {
                return item.items.map((subItem) => (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive(subItem.path)
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label} - {subItem.label}
                  </Link>
                ));
              } else {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
