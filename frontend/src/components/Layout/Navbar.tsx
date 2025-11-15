import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Trophy, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: '홈' },
    { path: '/gacha', label: '카드 뽑기' },
    { path: '/fusion', label: '카드 합성' },
    { path: '/collection', label: '내 카드' },
    { path: '/deck', label: '덱 편성' },
    { path: '/match', label: '랭크전' },
    { path: '/practice', label: '일반전' },
    { path: '/ai-battle', label: 'AI 배틀' },
    { path: '/market', label: '이적시장' },
    { path: '/ranking', label: '랭킹' },
    { path: '/missions', label: '미션' },
    { path: '/achievements', label: '업적' },
    { path: '/trade', label: '트레이드' },
    { path: '/notices', label: '공지사항' },
    { path: '/suggestions', label: '건의사항' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              {/* Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="메뉴"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center">
                <div className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  LCG
                </div>
              </Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              {isAuthenticated && user ? (
                <>
                  {/* Points Display */}
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-100 dark:bg-primary-900 rounded-lg">
                    <Trophy className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      {user.points.toLocaleString()}
                    </span>
                  </div>

                  {/* Tier Badge */}
                  <div className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <span className="text-sm font-bold text-white">
                      {user.tier}
                    </span>
                  </div>

                  {/* Profile */}
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.username}
                    </span>
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={logout}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="로그아웃"
                  >
                    <LogOut className="w-5 h-5" />
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
        </div>
      </nav>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  League Card Game
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="p-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Sidebar Footer */}
              {isAuthenticated && user && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">포인트</span>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                        {user.points.toLocaleString()}P
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">티어</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {user.tier}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
