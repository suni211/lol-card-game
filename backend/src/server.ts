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

// Import matchmaking
import { setupMatchmaking } from './socket/matchmaking';

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
app.use('/api/fusion', fusionRoutes);
app.use('/api/achievements', achievementsRoutes);
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
