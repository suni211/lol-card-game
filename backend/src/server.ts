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
import couponRoutes from './routes/coupon';
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

// Track unique online users by IP address instead of socket ID
const connectedIPs = new Map<string, Set<string>>(); // IP -> Set of socket IDs

// Track authenticated users by userId -> socketId
const authenticatedUsers = new Map<number, string>(); // userId -> socketId

// Chat message history (in-memory, limited to 100 messages)
const chatHistory: any[] = [];
const MAX_CHAT_HISTORY = 100;

// Guild chat history (per guild, limited to 50 messages each)
const guildChatHistory = new Map<number, any[]>(); // guildId -> messages[]
const MAX_GUILD_CHAT_HISTORY = 50;

// Helper function to get client IP (works with Nginx reverse proxy)
function getClientIP(socket: any): string {
  // Try x-forwarded-for header first (Nginx sets this)
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      return ip;
    }
  }

  // Try x-real-ip header (Nginx also sets this)
  const realIP = socket.handshake.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string' && realIP !== '127.0.0.1' && realIP !== '::1') {
    return realIP;
  }

  // Fallback to socket address
  const address = socket.handshake.address;
  if (address && address !== '127.0.0.1' && address !== '::1') {
    return address;
  }

  return 'unknown';
}

io.on('connection', (socket) => {
  // Get client IP
  const clientIP = getClientIP(socket);

  // Add socket to IP's socket set (for tracking, but don't count yet)
  if (!connectedIPs.has(clientIP)) {
    connectedIPs.set(clientIP, new Set());
  }
  connectedIPs.get(clientIP)!.add(socket.id);

  console.log(`Client connected: ${socket.id}`);

  // Verify user token and setup realtime match handlers
  socket.on('authenticate', (data: { token: string }) => {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded: any = jwt.verify(data.token, jwtSecret);

      // Track authenticated user
      authenticatedUsers.set(decoded.id, socket.id);
      console.log(`User ${decoded.id} authenticated on socket ${socket.id}`);

      // Emit updated authenticated user count
      io.emit('online_users', authenticatedUsers.size);
      console.log(`Authenticated users: ${authenticatedUsers.size}`);

      // Setup realtime match event handlers for this authenticated user
      setupRealtimeMatch(io, socket, decoded);
    } catch (error) {
      console.error('Socket authentication error:', error);
      // Notify client of authentication failure
      socket.emit('auth_error', { message: 'Invalid token' });
    }
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

  // Remove socket on disconnect
  socket.on('disconnect', () => {
    const clientIP = getClientIP(socket);

    // Remove from authenticated users
    for (const [userId, socketId] of authenticatedUsers.entries()) {
      if (socketId === socket.id) {
        authenticatedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }

    // Remove socket from IP's socket set
    if (connectedIPs.has(clientIP)) {
      connectedIPs.get(clientIP)!.delete(socket.id);

      // If no more sockets from this IP, remove the IP entry
      if (connectedIPs.get(clientIP)!.size === 0) {
        connectedIPs.delete(clientIP);
      }
    }

    // Emit updated authenticated user count
    io.emit('online_users', authenticatedUsers.size);
    console.log(`Client disconnected: ${socket.id}, Authenticated users: ${authenticatedUsers.size}`);
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
  const socketId = authenticatedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('pointsUpdate', {
      points: newPoints,
      level: newLevel,
      exp: newExp,
    });
    console.log(`Sent points update to user ${userId}: ${newPoints}P`);
  }
}

export default app;
export { io, emitPointUpdate };
