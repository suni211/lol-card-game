// MOBA Match Types for Frontend

export type Lane = 'TOP' | 'MID' | 'BOT';
export type Position = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export type PlayerAction =
  | 'FIGHT'
  | 'DEFEND'
  | 'ROAM_TOP'
  | 'ROAM_MID'
  | 'ROAM_BOT'
  | 'ROAM_JUNGLE'
  | 'RECALL'
  | 'FARM'
  | 'GANK_TOP'
  | 'GANK_MID'
  | 'GANK_BOT';

export interface PlayerState {
  oderId: number;
  playerId: number;
  name: string;
  position: Position;
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  lifeSteal: number;
  isDead: boolean;
  respawnTurn: number;
  gold: number;
  items: string[];
  level: number;
  kills: number;
  deaths: number;
}

export interface TowerState {
  lane: Lane;
  position: 1 | 2 | 3;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
}

export interface TeamState {
  oderId: number;
  players: PlayerState[];
  towers: TowerState[];
  nexusHealth: number;
  maxNexusHealth: number;
  grubBuff: boolean;
  dragonStacks: number;
  baronBuff: boolean;
  baronBuffTurn?: number;
  elderBuff: boolean;
  elderBuffTurn?: number;
}

export interface MatchState {
  matchId: string;
  matchType: 'RANKED' | 'NORMAL';
  team1: TeamState;
  team2: TeamState;
  currentTurn: number;
  maxTurnTime: number;
  turnStartTime: number;
  team1Ready: boolean;
  team2Ready: boolean;
  currentEvent?: string;
  status: string;
  logs: MatchLog[];
}

export interface MatchLog {
  turn: number;
  timestamp: number;
  type: string;
  message: string;
  data?: any;
}

export interface TurnAction {
  oderId: number;
  action: PlayerAction;
  targetItemId?: string;
  sellItemId?: string;
  useItemTarget?: Lane;
}

export interface CombatResult {
  attackerId: number;
  defenderId: number;
  damage: number;
  isCrit: boolean;
  isKill: boolean;
  healAmount?: number;
}

export interface TurnResult {
  turn: number;
  events: MatchLog[];
  team1State: TeamState;
  team2State: TeamState;
  combatResults: CombatResult[];
  objectiveResult?: {
    event: string;
    winner: 1 | 2;
    effect: string;
  };
  gameEnd?: {
    winner: 1 | 2;
    reason: string;
  };
}

export interface Item {
  id: string;
  name: string;
  cost: number;
  tier: string;
  restriction: string;
  effects: any;
  buildsFrom?: string[];
  description: string;
}

// Action options per position
export const POSITION_ACTIONS: Record<Position, { action: PlayerAction; label: string }[]> = {
  TOP: [
    { action: 'FIGHT', label: '탑 전투' },
    { action: 'DEFEND', label: '탑 수비' },
    { action: 'ROAM_MID', label: '미드 로밍' },
    { action: 'ROAM_JUNGLE', label: '정글 지원' },
    { action: 'RECALL', label: '귀환' },
  ],
  JUNGLE: [
    { action: 'FARM', label: '정글 파밍' },
    { action: 'GANK_TOP', label: '탑 갱' },
    { action: 'GANK_MID', label: '미드 갱' },
    { action: 'GANK_BOT', label: '바텀 갱' },
    { action: 'RECALL', label: '귀환' },
  ],
  MID: [
    { action: 'FIGHT', label: '미드 전투' },
    { action: 'DEFEND', label: '미드 수비' },
    { action: 'ROAM_TOP', label: '탑 로밍' },
    { action: 'ROAM_BOT', label: '바텀 로밍' },
    { action: 'ROAM_JUNGLE', label: '정글 지원' },
    { action: 'RECALL', label: '귀환' },
  ],
  ADC: [
    { action: 'FIGHT', label: '바텀 전투' },
    { action: 'DEFEND', label: '바텀 수비' },
    { action: 'ROAM_JUNGLE', label: '정글 지원' },
    { action: 'RECALL', label: '귀환' },
  ],
  SUPPORT: [
    { action: 'FIGHT', label: '바텀 전투' },
    { action: 'DEFEND', label: '바텀 수비' },
    { action: 'ROAM_MID', label: '미드 로밍' },
    { action: 'ROAM_JUNGLE', label: '정글 지원' },
    { action: 'RECALL', label: '귀환' },
  ],
};

// Event descriptions
export const EVENT_INFO: Record<string, { name: string; description: string }> = {
  GRUB: { name: '유충', description: '포탑/넥서스 데미지 증가' },
  DRAGON: { name: '용', description: '선수 공격력 증가' },
  HERALD: { name: '전령', description: '70% 확률 적 포탑 파괴' },
  BARON: { name: '바론', description: '50% 포탑 파괴 + 20% 데미지 증가' },
  ELDER: { name: '장로', description: '50% 확률 적 전멸' },
};
