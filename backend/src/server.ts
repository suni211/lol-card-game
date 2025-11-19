import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import gachaRoutes from './routes/gacha';
import mileageRoutes from './routes/mileage';
import deckRoutes from './routes/deck';
import matchRoutes from './routes/match';
import rankingRoutes from './routes/ranking';
import missionsRoutes from './routes/missions';
import tradeRoutes from './routes/trade';
import noticesRoutes, { setSocketIO } from './routes/notices';
import profileRoutes from './routes/profile';
import aiRoutes from './routes/ai';
import suggestionsRoutes from './routes/suggestions';
import fusionRoutes from './routes/fusion';
import achievementsRoutes from './routes/achievements';
import adminRoutes from './routes/admin';
import marketRoutes from './routes/market';
import vsmodeRoutes from './routes/vsmode';
import couponRoutes, { setSocketIOForCoupon } from './routes/coupon';
import packsRoutes from './routes/packs';
import shopRoutes, { setSocketIOForShop } from './routes/shop';
import eventRoutes from './routes/event';
import strategyStatsRoutes from './routes/strategyStats';
import levelRoutes from './routes/level';
import eventsRoutes from './routes/events';
import guildRoutes from './routes/guild';
import referralRoutes from './routes/referral';
import clanWarRoutes from './routes/clanWar';
import infiniteChallengeRoutes from './routes/infiniteChallenge';
import collectionRoutes from './routes/collection';
import coachRoutes from './routes/coach';
import friendlyRoutes from './routes/friendly';
import titlesRoutes from './routes/titles';
import raidRoutes from './routes/raid';
import match3phaseRoutes, { setSocketIOForMatch3Phase } from './routes/match3phase';

// Import matchmaking
import { setupMatchmaking } from './socket/matchmaking';
import { setupRealtimeMatch } from './socket/realtimeMatch';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Trust proxy - required for Nginx reverse proxy
app.set('trust proxy', true);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting (increased limits for better UX)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // limit each IP to 500 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Disable validation for trust proxy (we're behind Nginx)
  validate: { trustProxy: false },
  skip: (req) => {
    // Skip rate limiting for socket.io connections
    return req.url.includes('/socket.io/');
  },
});

app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/deck', deckRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/fusion', fusionRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vsmode', vsmodeRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/strategy-stats', strategyStatsRoutes);
app.use('/api/level', levelRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/guild', guildRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/clan-war', clanWarRoutes);
app.use('/api/infinite-challenge', infiniteChallengeRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/friendly', friendlyRoutes);
app.use('/api/titles', titlesRoutes);
app.use('/api/raid', raidRoutes);
app.use('/api/match3phase', match3phaseRoutes);
// Practice matchmaking now uses Socket.io only (no REST API)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Setup matchmaking
setupMatchmaking(io);

// Setup socket.io for notices
setSocketIO(io);

// Setup socket.io for shop
setSocketIOForShop(io);

// Setup socket.io for coupon
setSocketIOForCoupon(io);

// Setup socket.io for match3phase
setSocketIOForMatch3Phase(io);

// NEW ONLINE USERS SYSTEM - Disconnect based only (no cleanup)
interface OnlineUser {
  userId: number;
  socketId: string;
  username: string;
}

const onlineUsers = new Map<number, OnlineUser>(); // userId -> OnlineUser

// Chat message history (in-memory, limited to 100 messages)
const chatHistory: any[] = [];
const MAX_CHAT_HISTORY = 100;

// Guild chat history (per guild, limited to 50 messages each)
const guildChatHistory = new Map<number, any[]>(); // guildId -> messages[]
const MAX_GUILD_CHAT_HISTORY = 50;

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Authenticate user with JWT token
  socket.on('authenticate', (data: { token: string }) => {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded: any = jwt.verify(data.token, jwtSecret);

      // Add or update user in online users map
      onlineUsers.set(decoded.id, {
        userId: decoded.id,
        socketId: socket.id,
        username: decoded.username || `User${decoded.id}`,
      });

      console.log(`[Auth] User ${decoded.id} (${decoded.username}) authenticated. Online: ${onlineUsers.size}`);

      // Emit updated online user count to ALL clients
      io.emit('online_users', onlineUsers.size);

      // Send confirmation to this client
      socket.emit('auth_success', { userId: decoded.id });

      // Setup realtime match event handlers
      setupRealtimeMatch(io, socket, decoded);
    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });

  // Heartbeat - no longer used for timeout, just for logging
  socket.on('heartbeat', (data: { userId: number }) => {
    // Just log for debugging purposes, don't update anything
    console.log(`[Heartbeat] User ${data.userId} heartbeat received`);
  });

  // Chat events
  socket.on('chat_join', () => {
    // Send chat history to newly joined user
    socket.emit('chat_history', chatHistory);
  });

  socket.on('chat_message', (data: { username: string; message: string; tier?: string }) => {
    const chatMessage = {
      id: Date.now() + Math.random(),
      username: data.username,
      message: data.message,
      tier: data.tier || 'IRON',
      timestamp: new Date().toISOString(),
    };

    // Add to history
    chatHistory.push(chatMessage);

    // Limit history size
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }

    // Broadcast to all connected clients
    io.emit('chat_message', chatMessage);
  });

  // Guild chat events
  socket.on('guild_chat_join', (data: { guildId: number }) => {
    const guildId = data.guildId;
    const roomName = `guild_${guildId}`;

    // Join guild room
    socket.join(roomName);

    // Initialize guild chat history if not exists
    if (!guildChatHistory.has(guildId)) {
      guildChatHistory.set(guildId, []);
    }

    // Send chat history to newly joined user
    socket.emit('guild_chat_history', guildChatHistory.get(guildId));
    console.log(`Socket ${socket.id} joined guild chat room: ${roomName}`);
  });

  socket.on('guild_chat_leave', (data: { guildId: number }) => {
    const roomName = `guild_${data.guildId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left guild chat room: ${roomName}`);
  });

  socket.on('guild_chat_message', (data: { guildId: number; username: string; message: string; tier?: string; guildTag?: string }) => {
    const guildId = data.guildId;
    const roomName = `guild_${guildId}`;

    const chatMessage = {
      id: Date.now() + Math.random(),
      username: data.username,
      message: data.message,
      tier: data.tier || 'IRON',
      guildTag: data.guildTag,
      timestamp: new Date().toISOString(),
    };

    // Initialize guild chat history if not exists
    if (!guildChatHistory.has(guildId)) {
      guildChatHistory.set(guildId, []);
    }

    const history = guildChatHistory.get(guildId)!;

    // Add to guild history
    history.push(chatMessage);

    // Limit history size
    if (history.length > MAX_GUILD_CHAT_HISTORY) {
      history.shift();
    }

    // Broadcast to all members in the guild room
    io.to(roomName).emit('guild_chat_message', chatMessage);
    console.log(`Guild chat message in ${roomName}: ${data.username}: ${data.message}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove user by socket ID
    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[Disconnect] User ${userId} (${user.username}) disconnected. Online: ${onlineUsers.size}`);
        io.emit('online_users', onlineUsers.size);
        break;
      }
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   LOL Card Game Backend Server        ║
╠═══════════════════════════════════════╣
║   Port: ${PORT}
║   Environment: ${process.env.NODE_ENV || 'development'}
║   CORS: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}
║   Socket.IO: Enabled
╚═══════════════════════════════════════╝
  `);
});

// Helper function to emit point updates to a specific user
function emitPointUpdate(userId: number, newPoints: number, newLevel?: number, newExp?: number) {
  const user = onlineUsers.get(userId);
  if (user) {
    io.to(user.socketId).emit('pointsUpdate', {
      points: newPoints,
      level: newLevel,
      exp: newExp,
    });
    console.log(`[Points] Sent update to user ${userId} (${user.username}): ${newPoints}P`);
  }
}

export default app;
export { io, emitPointUpdate };
