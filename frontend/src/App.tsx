import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useAudioStore } from './store/audioStore';
import { useOnlineStore } from './store/onlineStore';

// Layout
import Layout from './components/Layout/Layout';
import { AudioControls } from './components/AudioControls';
import GlobalMessageBanner from './components/GlobalMessageBanner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Gacha from './pages/Gacha';
import Collection from './pages/Collection';
import Deck from './pages/Deck';
import Match from './pages/Match';
import AIBattle from './pages/AIBattle';
import Practice from './pages/Practice';
import Ranking from './pages/Ranking';
import Missions from './pages/Missions';
import Trade from './pages/Trade';
import Notices from './pages/Notices';
import Suggestions from './pages/Suggestions';
import Profile from './pages/Profile';
import Fusion from './pages/Fusion';
import Enhancement from './pages/Enhancement';
import Achievements from './pages/Achievements';
import Admin from './pages/Admin';
import Market from './pages/Market';
import VSMode from './pages/VSMode';
import VSBattle from './pages/VSBattle';
import Coupon from './pages/Coupon';
import AdminCoupon from './pages/AdminCoupon';
import Packs from './pages/Packs';
import Event from './pages/Event';
import EventMilestones from './pages/EventMilestones';
import EventRewards from './pages/EventRewards';
import StrategyStats from './pages/StrategyStats';
import Guild from './pages/Guild';
import Referral from './pages/Referral';
import ClanWar from './pages/ClanWar';
import InfiniteChallenge from './pages/InfiniteChallenge';
import InfiniteChallengeBattle from './pages/InfiniteChallengeBattle';
import Coach from './pages/Coach';
import CoachEnhancement from './pages/CoachEnhancement';
import CardCollection from './pages/CardCollection';
import Settings from './pages/Settings';
import Friendly from './pages/Friendly';
import Titles from './pages/Titles';
import Raid from './pages/Raid';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Only Route (redirect to home if already logged in)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function App() {
  const { theme } = useThemeStore();
  const { playRandomLobbyBGM, initAudio } = useAudioStore();
  const { token, isAuthenticated, updateUser, logout } = useAuthStore();
  const { setOnlineUsers } = useOnlineStore();

  // Setup axios interceptor for 401 errors (invalid token)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && isAuthenticated) {
          console.log('[Auth] Token invalid (401), logging out...');
          toast.error('로그인이 만료되었습니다. 다시 로그인해주세요.');
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    // Apply theme on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Real-time updates via Socket.IO (CENTRALIZED - only one connection per app)
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    console.log('[App] Initializing single socket connection...');

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    let heartbeatInterval: number | null = null;

    socket.on('connect', () => {
      console.log('[App] Socket connected:', socket.id);
      socket.emit('authenticate', { token });
    });

    // Authentication success - start heartbeat
    socket.on('auth_success', () => {
      console.log('[App] Authentication successful, starting heartbeat...');

      // Clear any existing heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      const user = useAuthStore.getState().user;
      const userId = user?.id;

      if (!userId) {
        console.error('[App] Cannot start heartbeat: user ID not found');
        return;
      }

      // Send initial heartbeat immediately
      console.log(`[App] Sending heartbeat for user ${userId}`);
      socket.emit('heartbeat', { userId });

      // Send heartbeat every 15 seconds
      heartbeatInterval = window.setInterval(() => {
        console.log(`[App] Sending heartbeat for user ${userId}`);
        socket.emit('heartbeat', { userId });
      }, 15000);
    });

    // Authentication failed - logout
    socket.on('auth_error', () => {
      console.error('[App] Authentication failed, logging out...');
      logout();
      window.location.href = '/login';
    });

    // Online users count updated
    socket.on('online_users', (count: number) => {
      console.log('[App] Online users:', count);
      setOnlineUsers(count);
    });

    // Points/level updates
    socket.on('pointsUpdate', (data: { points: number; level?: number; exp?: number }) => {
      console.log('[App] Points update:', data);
      updateUser({
        points: data.points,
        level: data.level,
        exp: data.exp,
      });
    });

    // User data updates
    socket.on('user_update', (updatedUser: any) => {
      if (updatedUser) {
        console.log('[App] User update:', updatedUser);
        updateUser(updatedUser);
      }
    });

    return () => {
      console.log('[App] Cleaning up socket connection...');
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      socket.disconnect();
    };
  }, [isAuthenticated, token, updateUser, logout, setOnlineUsers]);

  useEffect(() => {
    // Initialize audio
    initAudio();

    // Play BGM on first user interaction
    const playOnInteraction = () => {
      playRandomLobbyBGM();
    };

    // Try to play immediately (will fail on some browsers but worth trying)
    playRandomLobbyBGM();

    // Add event listeners with once option (auto-remove after first trigger)
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('keydown', playOnInteraction, { once: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true });

    // No cleanup needed - once: true handles it
  }, [initAudio, playRandomLobbyBGM]);

  // Global button click sound effect
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked element is a button or has button role
      if (
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.getAttribute('role') === 'button' ||
        target.closest('[role="button"]')
      ) {
        // Import soundEffects dynamically to avoid circular imports
        import('./utils/soundEffects').then(({ soundEffects }) => {
          soundEffects.playClick();
        });
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  return (
    <Router>
      <AudioControls />
      <GlobalMessageBanner />
      <Routes>
        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/ranking" element={<Ranking />} />

          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/gacha"
            element={
              <ProtectedRoute>
                <Gacha />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fusion"
            element={
              <ProtectedRoute>
                <Fusion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enhancement"
            element={
              <ProtectedRoute>
                <Enhancement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collection"
            element={
              <ProtectedRoute>
                <Collection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deck"
            element={
              <ProtectedRoute>
                <Deck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/match"
            element={
              <ProtectedRoute>
                <Match />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-battle"
            element={
              <ProtectedRoute>
                <AIBattle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <Practice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <Missions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <Achievements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade"
            element={
              <ProtectedRoute>
                <Trade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suggestions"
            element={
              <ProtectedRoute>
                <Suggestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vsmode"
            element={
              <ProtectedRoute>
                <VSMode />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vsmode/battle/:stageNumber"
            element={
              <ProtectedRoute>
                <VSBattle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <Market />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coupon"
            element={
              <ProtectedRoute>
                <Coupon />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coupon"
            element={
              <ProtectedRoute>
                <AdminCoupon />
              </ProtectedRoute>
            }
          />
          <Route
            path="/packs"
            element={
              <ProtectedRoute>
                <Packs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event"
            element={
              <ProtectedRoute>
                <Event />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event/milestones"
            element={
              <ProtectedRoute>
                <EventMilestones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event/rewards"
            element={
              <ProtectedRoute>
                <EventRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/strategy-stats"
            element={
              <ProtectedRoute>
                <StrategyStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guild"
            element={
              <ProtectedRoute>
                <Guild />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referral"
            element={
              <ProtectedRoute>
                <Referral />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clan-war"
            element={
              <ProtectedRoute>
                <ClanWar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/infinite-challenge"
            element={
              <ProtectedRoute>
                <InfiniteChallenge />
              </ProtectedRoute>
            }
          />
          <Route
            path="/infinite-challenge/battle"
            element={
              <ProtectedRoute>
                <InfiniteChallengeBattle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach"
            element={
              <ProtectedRoute>
                <Coach />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach-enhancement"
            element={
              <ProtectedRoute>
                <CoachEnhancement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/card-collection"
            element={
              <ProtectedRoute>
                <CardCollection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friendly"
            element={
              <ProtectedRoute>
                <Friendly />
              </ProtectedRoute>
            }
          />
          <Route
            path="/titles"
            element={
              <ProtectedRoute>
                <Titles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/raid"
            element={
              <ProtectedRoute>
                <Raid />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
