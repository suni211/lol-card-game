import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useAudioStore } from './store/audioStore';

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
import Event from './pages/Event';
import EventMilestones from './pages/EventMilestones';
import EventRewards from './pages/EventRewards';
import StrategyStats from './pages/StrategyStats';
import Guild from './pages/Guild';
import Referral from './pages/Referral';
import ClanWar from './pages/ClanWar';
import InfiniteChallenge from './pages/InfiniteChallenge';
import InfiniteChallengeBattle from './pages/InfiniteChallengeBattle';

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
  const { token, isAuthenticated, updateUser } = useAuthStore();

  useEffect(() => {
    // Apply theme on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Real-time point updates via Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Connected to socket for point updates');
      socket.emit('authenticate', { token });
    });

    socket.on('pointsUpdate', (data: { points: number; level?: number; exp?: number }) => {
      console.log('Received points update:', data);
      updateUser({
        points: data.points,
        level: data.level,
        exp: data.exp,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token, updateUser]);

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

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
