import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Trophy, User as UserIcon, LogOut, Users, ChevronDown, Gift, House, Layers, Swords, Store, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    // On phones, dismiss expanded navigation after moving to another page.
    setClickedDropdown(null);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
      { path: '/competitive', label: '경쟁전' },
      { path: '/ai-match', label: 'AI 매치' },
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
        <div className="flex min-h-14 items-center justify-between gap-2 py-2 sm:min-h-16 sm:gap-3">
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
                  className="hidden p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg relative lg:inline-flex"
                  title="친구 추천"
                >
                  <Gift className="w-5 h-5" />
                </Link>

                {user.isAdmin && (
                  <div className="hidden flex-wrap gap-1 lg:flex">
                    <Link to="/admin" className="rounded-lg px-2 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700">
                      관리자
                    </Link>
                    <Link to="/admin/players" className="rounded-lg px-2 py-1.5 text-sm font-bold text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-700">
                      선수 관리
                    </Link>
                  </div>
                )}
                {/* Profile */}
                <Link
                  to="/profile"
                  className="hidden items-center space-x-1 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:flex"
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
                  className="hidden p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg lg:inline-flex"
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

        {/* Thumb-friendly navigation stays visible at the bottom, independent of page scrolling. */}
        {isAuthenticated && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-xl backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95 lg:hidden"
          style={{paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
          <div className="grid grid-cols-5">
            {[
              {path:'/',label:'홈',Icon:House},
              {path:'/deck',label:'내 덱',Icon:Layers},
              {path:'/ai-match',label:'AI 대전',Icon:Swords},
              {path:'/market',label:'이적시장',Icon:Store}
            ].map(({path,label,Icon})=><Link key={path} to={path} onClick={()=>setMobileMenuOpen(false)}
              aria-current={isActive(path)?'page':undefined}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[11px] font-semibold ${isActive(path)?'text-primary-700 dark:text-primary-300':'text-gray-600 dark:text-gray-300'}`}>
              <Icon aria-hidden="true" className="h-5 w-5"/>{label}
            </Link>)}
            <button type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen}
              onClick={()=>setMobileMenuOpen(open=>!open)}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[11px] font-semibold text-gray-700 dark:text-gray-200">
              <Menu aria-hidden="true" className="h-5 w-5"/>전체 메뉴
            </button>
          </div>
        </div>}
        {isAuthenticated && mobileMenuOpen && <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" aria-label="전체 메뉴 닫기" className="absolute inset-0 w-full bg-black/60"
            onClick={()=>setMobileMenuOpen(false)}/>
          <section role="dialog" aria-modal="true" aria-label="전체 게임 메뉴"
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pt-4 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-white"
            style={{paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom, 0px))'}}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">전체 메뉴</h2>
              <button type="button" onClick={()=>setMobileMenuOpen(false)} aria-label="닫기"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"><X size={23}/></button>
            </div>
            {navStructure.map((group,index)=>'items' in group?(
              <div key={group.label} className="mb-4">
                <h3 className="mb-2 text-sm font-black text-primary-700 dark:text-primary-300">{group.label}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map(item=><Link key={item.path} to={item.path} onClick={()=>setMobileMenuOpen(false)}
                    className={`flex min-h-12 items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold ${isActive(item.path)?'border-primary-500 bg-primary-50 dark:bg-primary-900':'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}>{item.label}</Link>)}
                </div>
              </div>
            ):index===0?null:<Link key={group.path} to={group.path} onClick={()=>setMobileMenuOpen(false)}>{group.label}</Link>)}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <Link to="/profile" onClick={()=>setMobileMenuOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl bg-gray-100 text-sm dark:bg-gray-800">내 프로필</Link>
              {user?.isAdmin?<Link to="/admin/players" onClick={()=>setMobileMenuOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl bg-gray-100 text-sm dark:bg-gray-800">관리자 선수 관리</Link>:<Link to="/settings" onClick={()=>setMobileMenuOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl bg-gray-100 text-sm dark:bg-gray-800">설정</Link>}
              <button type="button" onClick={()=>{setMobileMenuOpen(false);logout();}} className="col-span-2 min-h-12 rounded-xl border border-red-400 text-sm text-red-500">로그아웃</button>
            </div>
          </section>
        </div>}
      </div>
    </nav>
  );
}
