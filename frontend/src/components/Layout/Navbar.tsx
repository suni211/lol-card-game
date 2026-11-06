import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Trophy, User as UserIcon, LogOut, Users, ChevronDown, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useOnlineStore } from '../../store/onlineStore';
import UserDisplay from '../UserDisplay';

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { onlineUsers } = useOnlineStore();
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [clickedDropdown, setClickedDropdown] = useState<string | null>(null);

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

  // Keep the primary navigation compact. All secondary destinations live in 5 groups.
  const navStructure: NavStructureItem[] = [
    { path: '/', label: '홈' },
    { label: '카드 관리', items: [
      { path: '/gacha', label: '선수 뽑기' },
      { path: '/card-collection', label: '카드 도감' },
      { path: '/deck', label: '덱 편성' },
      { path: '/enhancement', label: '강화' },
      { path: '/fusion', label: '합성' },
      { path: '/coach', label: '코치' },
      { path: '/packs', label: '팩 인벤토리' },
    ] },
    { label: '대전', items: [
      { path: '/match-select', label: 'MOBA AI 대전' },
      { path: '/campaign', label: '캠페인' },
      { path: '/infinite-challenge', label: '무한도전' },
      { path: '/raid', label: '레이드' },
      { path: '/spectator', label: '관전' },
      { path: '/ranking', label: '랭킹' },
      { path: '/strategy-stats', label: '전략 통계' },
    ] },
    { label: '거래·성장', items: [
      { path: '/market', label: '이적시장' },
      { path: '/trade', label: '유저 거래' },
      { path: '/shop', label: '포인트 상점' },
      { path: '/agent', label: '에이전트' },
      { path: '/missions', label: '미션' },
      { path: '/achievements', label: '업적' },
      { path: '/titles', label: '칭호' },
    ] },
    { label: '커뮤니티', items: [
      { path: '/guild', label: '길드' },
      { path: '/clan-war', label: '길드전' },
      { path: '/notices', label: '공지사항' },
      { path: '/suggestions', label: '건의사항' },
      { path: '/referral', label: '친구 추천' },
    ] },
    { label: '더보기', items: [
      { path: '/lottery', label: '럭키드로우' },
      { path: '/coupon', label: '쿠폰' },
      { path: '/champions', label: '챔피언 소개' },
      { path: '/how-to-play', label: '게임 가이드' },
      { path: '/settings', label: '설정' },
    ] },
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                LCG
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
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
                      <div className="absolute top-full left-0 mt-1 max-h-[65dvh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl rounded-lg py-2 w-auto min-w-[120px] border border-gray-200 dark:border-gray-700 z-50">
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

                {user.isAdmin && (
                  <Link to="/admin" className="rounded-lg px-2 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700">
                    관리자
                  </Link>
                )}
                {/* Profile */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-1 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden lg:inline text-sm font-medium">
                    {user.guild_tag && (
                      <span className="text-purple-600 dark:text-purple-400 font-bold mr-1">
                        [{user.guild_tag}]
                      </span>
                    )}
                    <UserDisplay user={user} className="text-sm font-medium" />
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

        {/* Mobile Navigation: only top-level groups, no dozens of scrolling tabs */}
        <div className="lg:hidden pb-3">
          <div className="flex gap-2 overflow-x-auto py-1">
            {navStructure.map(item => 'items' in item ? (
              <button
                key={item.label}
                type="button"
                aria-expanded={clickedDropdown===item.label}
                onClick={()=>setClickedDropdown(clickedDropdown===item.label?null:item.label)}
                className={`flex-shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${isDropdownActive(item.items)?'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300':'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                {item.label} <ChevronDown className="inline h-3 w-3" />
              </button>
            ) : (
              <Link key={item.path} to={item.path} onClick={()=>setClickedDropdown(null)}
                className="flex-shrink-0 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">{item.label}</Link>
            ))}
          </div>
          {navStructure.filter((item): item is NavDropdown => 'items' in item && item.label===clickedDropdown).map(group=>(
            <div key={group.label} className="mt-2 grid max-h-[45dvh] grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {group.items.map(sub=>(
                <Link key={sub.path} to={sub.path} onClick={()=>setClickedDropdown(null)}
                  className={`rounded-md px-3 py-2 text-sm ${isActive(sub.path)?'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300':'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'}`}>
                  {sub.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
