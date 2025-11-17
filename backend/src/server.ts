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
import shopRoutes, { setSocketIOForShop } from './routes/shop';
import gacha19g2Routes from './routes/gacha19g2';
import eventRoutes from './routes/event';
import strategyStatsRoutes from './routes/strategyStats';
import levelRoutes from './routes/level';
import eventsRoutes from './routes/events';

// Import matchmaking
import { setupMatchmaking } from './socket/matchmaking';
import { setupRealtimeMatch } from './socket/realtimeMatch';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const httpServer = createServer(app);
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
app.use('/api/shop', shopRoutes);
app.use('/api/gacha19g2', gacha19g2Routes);
app.use('/api/event', eventRoutes);
app.use('/api/strategy-stats', strategyStatsRoutes);
app.use('/api/level', levelRoutes);
app.use('/api/events', eventsRoutes);
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

// Chat message history (in-memory, limited to 100 messages)
const chatHistory: any[] = [];
const MAX_CHAT_HISTORY = 100;

// Helper function to get client IP
function getClientIP(socket: any): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }
  return socket.handshake.address || 'unknown';
}

io.on('connection', (socket) => {
  // Get client IP
  const clientIP = getClientIP(socket);

  // Add socket to IP's socket set
  if (!connectedIPs.has(clientIP)) {
    connectedIPs.set(clientIP, new Set());
  }
  connectedIPs.get(clientIP)!.add(socket.id);

  // Emit updated unique user count (number of unique IPs)
  io.emit('online_users', connectedIPs.size);

  console.log(`User connected: ${socket.id} (IP: ${clientIP}), Unique users: ${connectedIPs.size}`);

  // Verify user token and setup realtime match handlers
  socket.on('authenticate', (data: { token: string }) => {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded: any = jwt.verify(data.token, jwtSecret);

      // Setup realtime match event handlers for this authenticated user
      setupRealtimeMatch(io, socket, decoded);
    } catch (error) {
      console.error('Socket authentication error:', error);
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

  // Remove socket on disconnect
  socket.on('disconnect', () => {
    const clientIP = getClientIP(socket);

    // Remove socket from IP's socket set
    if (connectedIPs.has(clientIP)) {
      connectedIPs.get(clientIP)!.delete(socket.id);

      // If no more sockets from this IP, remove the IP entry
      if (connectedIPs.get(clientIP)!.size === 0) {
        connectedIPs.delete(clientIP);
      }
    }

    // Emit updated unique user count
    io.emit('online_users', connectedIPs.size);
    console.log(`User disconnected: ${socket.id} (IP: ${clientIP}), Unique users: ${connectedIPs.size}`);
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

export default app;
export { io };
