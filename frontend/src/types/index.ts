// Player Card Types
export interface Player {
  id: number;
  name: string;
  team: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  overall: number;
  region: 'LCK' | 'LPL' | 'LEC' | 'LCS' | 'PCS' | 'VCS' | 'CBLOL' | 'LJL' | 'LLA';
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  season?: string; // 25WW, 25WUD, 25, etc.
  traits: PlayerTrait[];
  imageUrl?: string;
}

export interface PlayerTrait {
  id: number;
  name: string;
  description: string;
  effect: string; // e.g., "+5% synergy", "Clutch: +10% in important moments"
}

export interface UserCard {
  id: number;
  userId: number;
  playerId: number;
  player: Player;
  level: number; // 강화 레벨
  createdAt: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  tier: UserTier;
  rating: number;
  isAdmin: boolean;
  createdAt: string;
  lastCheckIn?: string;
  consecutiveDays?: number;
}

export type UserTier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'CHALLENGER';

// Deck Types
export interface Deck {
  id: number;
  userId: number;
  name: string;
  top: UserCard | null;
  jungle: UserCard | null;
  mid: UserCard | null;
  adc: UserCard | null;
  support: UserCard | null;
  isActive: boolean;
  teamSynergy: number;
}

// Match Types
export interface Match {
  id: number;
  player1Id: number;
  player2Id: number;
  player1: User;
  player2: User;
  player1DeckId: number;
  player2DeckId: number;
  winnerId: number | null;
  player1Score: number;
  player2Score: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  completedAt?: string;
}

export interface MatchHistory {
  id: number;
  userId: number;
  opponent: User;
  result: 'WIN' | 'LOSE';
  pointsChange: number;
  ratingChange: number;
  createdAt: string;
}

// Gacha Types
export interface GachaOption {
  cost: number;
  label: string;
  probabilities: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  special?: boolean;
}

export interface GachaResult {
  card: Player;
  isDuplicate: boolean;
  pointsRefund?: number;
}

// Collection Types
export interface Collection {
  userId: number;
  teams: TeamCollection[];
  totalCards: number;
  uniqueCards: number;
}

export interface TeamCollection {
  team: string;
  players: Player[];
  completionRate: number;
  synergyBonus: number;
}

// Mission Types
export interface Mission {
  id: number;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY';
  requirement: number;
  progress: number;
  reward: number;
  isCompleted: boolean;
  expiresAt: string;
}

// Attendance Types
export interface Attendance {
  userId: number;
  lastCheckIn: string;
  consecutiveDays: number;
  totalDays: number;
  canCheckIn: boolean;
}

// Trade Types
export interface Trade {
  id: number;
  senderId: number;
  receiverId: number;
  sender: User;
  receiver: User;
  senderCardId: number;
  receiverCardId: number;
  senderCard: UserCard;
  receiverCard: UserCard;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  tier: UserTier;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
}

// Stats Types
export interface UserStats {
  userId: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  longestWinStreak: number;
  mostUsedCards: {
    card: Player;
    gamesPlayed: number;
  }[];
  tierHistory: {
    tier: UserTier;
    achievedAt: string;
  }[];
}

// Notice Types
export interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'NOTICE' | 'PATCH' | 'EVENT' | 'MAINTENANCE';
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
