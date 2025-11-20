// Game Types for MOBA-style Match System

export type Lane = 'TOP' | 'MID' | 'BOT';
export type Position = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export type PlayerAction =
  | 'FIGHT' // Fight in own lane
  | 'DEFEND' // Defend own lane (reduced damage taken)
  | 'ROAM_TOP' // Roam to top
  | 'ROAM_MID' // Roam to mid
  | 'ROAM_BOT' // Roam to bot
  | 'ROAM_JUNGLE' // Help jungle
  | 'RECALL' // Go back to base (heal but tower takes damage)
  | 'FARM' // Jungle only - gain 1% attack
  | 'GANK_TOP' // Jungle only
  | 'GANK_MID' // Jungle only
  | 'GANK_BOT'; // Jungle only

export type ObjectiveEvent =
  | 'GRUB' // Turn 3 - Tower/Nexus damage buff
  | 'DRAGON' // Turn 5, 10 - Player damage buff
  | 'HERALD' // Turn 7 - 70% chance destroy enemy tower
  | 'BARON' // Turn 9, 12, 15... - 50% tower + 20% damage buff
  | 'ELDER'; // Turn 12, 15, 18... - 50% team wipe

export type ItemTier = 'CONSUMABLE' | 'BASIC' | 'INTERMEDIATE' | 'LEGENDARY';
export type ItemRestriction = 'NONE' | 'ADC_ONLY' | 'SUPPORT_ONLY';

export interface ItemEffect {
  attack?: number;
  health?: number;
  defense?: number;
  speed?: number; // Movement speed (attack priority)
  critChance?: number;
  skillHaste?: number; // Skill cooldown reduction in turns
  lifeSteal?: number; // % of damage healed
  healReduction?: number; // Reduce enemy healing
  armorPen?: number; // Armor penetration
  evasion?: number;
  shieldPercent?: number; // Shield as % of health
  aoePercent?: number; // AOE damage %
  executeThreshold?: number; // Execute enemies below this % HP

  // Special effects
  weakenOnHit?: boolean; // Apply weaken debuff
  ignoreWeaken?: boolean; // Ignore weaken debuff
  stackingAttack?: number; // Attack gained per turn
  maxStacks?: number; // Max stacks for stacking effects
  onHitDamage?: number; // Extra damage on hit %
  teamSpeedBuff?: number; // Speed buff for all teammates
  teamShieldPercent?: number; // Shield for teammates
  healAllyPercent?: number; // Heal ally %
  adcShieldPercent?: number; // Shield for ADC
}

export interface Item {
  id: string;
  name: string;
  cost: number;
  tier: ItemTier;
  restriction: ItemRestriction;
  effects: ItemEffect;
  buildsFrom?: string[]; // Item IDs this builds from
  description: string;
  icon?: string;
}

export interface PlayerState {
  oderId: number; // User card ID
  playerId: number;
  name: string;
  position: Position;

  // Base stats (from card)
  baseOverall: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;

  // Current stats (with items/buffs)
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  lifeSteal: number;
  skillHaste: number;
  evasion: number;

  // Status
  isDead: boolean;
  respawnTurn: number; // Turn when player respawns
  gold: number;
  items: string[]; // Item IDs

  // Buffs/Debuffs
  buffs: Buff[];
  debuffs: Debuff[];

  // Ward
  wardPlaced?: Lane; // Which lane is being watched
}

export interface Buff {
  type: string;
  value: number;
  duration: number; // Turns remaining
}

export interface Debuff {
  type: string;
  value: number;
  duration: number;
}

export interface TowerState {
  lane: Lane;
  position: 1 | 2 | 3; // 1 = outer, 2 = inner, 3 = inhibitor
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
}

export interface TeamState {
  oderId: number; // User ID
  players: PlayerState[];
  towers: TowerState[];
  nexusHealth: number;
  maxNexusHealth: number;

  // Team buffs
  grubBuff: boolean; // Tower/Nexus damage increase
  dragonStacks: number; // Each stack = player damage increase
  baronBuff: boolean; // Tower damage + stat buff
  elderBuff: boolean; // Chance to wipe enemy team
}

export interface TurnAction {
  oderId: number; // User card ID
  action: PlayerAction;
  targetItemId?: string; // For buying items
  sellItemId?: string; // For selling items
  useItemTarget?: Lane; // For control ward
}

export interface MatchState {
  matchId: string;
  matchType: 'RANKED' | 'NORMAL';

  team1: TeamState;
  team2: TeamState;

  currentTurn: number;
  maxTurnTime: number; // 60 seconds
  turnStartTime: number;

  // Turn submissions
  team1Actions: TurnAction[];
  team2Actions: TurnAction[];
  team1Ready: boolean;
  team2Ready: boolean;

  // Current event
  currentEvent?: ObjectiveEvent;
  eventWinner?: 1 | 2;

  // Game status
  status: 'WAITING' | 'IN_PROGRESS' | 'TEAM1_WINS' | 'TEAM2_WINS' | 'SURRENDERED';
  surrenderedBy?: 1 | 2;

  // Match log
  logs: MatchLog[];
}

export interface MatchLog {
  turn: number;
  timestamp: number;
  type: 'ACTION' | 'COMBAT' | 'EVENT' | 'TOWER' | 'KILL' | 'ITEM' | 'OBJECTIVE' | 'GAME_END';
  message: string;
  data?: any;
}

export interface CombatResult {
  attackerId: number;
  defenderId: number;
  damage: number;
  isCrit: boolean;
  isKill: boolean;
  healAmount?: number;
  shieldAmount?: number;
}

export interface TurnResult {
  turn: number;
  events: MatchLog[];
  team1State: TeamState;
  team2State: TeamState;
  combatResults: CombatResult[];
  objectiveResult?: {
    event: ObjectiveEvent;
    winner: 1 | 2;
    effect: string;
  };
  gameEnd?: {
    winner: 1 | 2;
    reason: string;
  };
}
