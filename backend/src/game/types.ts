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
  | 'RECALL' // Go back to base (heal but can't participate in teamfight)
  | 'FARM' // Jungle only - gain 1% attack
  | 'GANK_TOP' // Jungle only
  | 'GANK_MID' // Jungle only
  | 'GANK_BOT' // Jungle only
  | 'CONTEST_DRAGON' // Contest Dragon objective
  | 'CONTEST_VOIDGRUB' // Contest Voidgrub objective
  | 'CONTEST_BARON' // Contest Baron objective
  | 'CONTEST_ELDER' // Contest Elder Dragon objective
  | 'USE_SKILL'; // Use champion skill

export type ChampionClass = 'TANK' | 'BRUISER' | 'ASSASSIN' | 'DEALER' | 'RANGED_DEALER' | 'RANGED_AP' | 'SUPPORT';
export type ScalingType = 'AD' | 'AP';

export interface Champion {
  id: number;
  name: string;
  skillName: string;
  skillDescription: string;
  cooldown: number;
  scalingType: ScalingType;
  championClass: ChampionClass;
  valueLevel1: number;
  valueLevel2: number;
  valueLevel3: number;
  extraParam1: number;
  extraParam2: number;
  extraParam3: number;
  isOneTime: boolean;
}

export interface SkillState {
  championId: number;
  currentCooldown: number; // 0 = ready to use
  hasBeenUsed: boolean; // For one-time skills
  skillLevel: 0 | 1 | 2 | 3; // 0 = not unlocked, 1 = level 6, 2 = level 12, 3 = level 18
}

export type ObjectiveEvent =
  | 'VOIDGRUB' // Turn 4 - Voidgrub objective
  | 'DRAGON' // Dragon objective
  | 'BARON' // Baron objective
  | 'ELDER'; // Elder Dragon objective

export type ItemTier = 'CONSUMABLE' | 'BASIC' | 'INTERMEDIATE' | 'LEGENDARY';
export type ItemRestriction = 'NONE' | 'ADC_ONLY' | 'SUPPORT_ONLY' | 'MID_ONLY' | 'MID_SUPPORT';

export interface ItemEffect {
  attack?: number;
  health?: number;
  defense?: number;
  magicResist?: number; // Magic resistance - reduces AP damage
  speed?: number; // Movement speed (attack priority)
  abilityPower?: number; // AP - Magic damage for MID, heal/shield for SUPPORT
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
  magicResist: number; // Magic resistance
  speed: number;
  abilityPower: number; // AP - for MID and SUPPORT
  critChance: number;
  lifeSteal: number;
  skillHaste: number;
  evasion: number;

  // Status
  isDead: boolean;
  respawnTurn: number; // Turn when player respawns
  gold: number;
  items: string[]; // Item IDs
  level: number; // 1-18, increases when not recalling
  kills: number; // Number of kills
  deaths: number; // Number of deaths
  assists: number; // Number of assists
  lastDamagedBy: number[]; // Track who damaged this player (for assists)

  // Buffs/Debuffs
  buffs: Buff[];
  debuffs: Debuff[];

  // Ward
  wardPlaced?: Lane; // Which lane is being watched

  // Champion skill
  championId?: number;
  skill?: SkillState;
  isRecalling?: boolean; // Can't participate in teamfight when recalling
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
  baronBuffTurn?: number; // Turn when baron buff was obtained (expires after 1 turn)
  elderBuff: boolean; // Execute enemies below 10% HP
  elderBuffTurn?: number; // Turn when elder buff was obtained (expires after 1 turn)
}

export interface TurnAction {
  oderId: number; // User card ID
  action: PlayerAction;
  targetItemId?: string; // For buying items
  sellItemId?: string; // For selling items
  useItemTarget?: Lane; // For control ward
  useSkill?: boolean; // Whether to use skill this turn
  skillTargetId?: number; // Target player ID for skill (if applicable)
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
  status: 'BAN_PICK' | 'WAITING' | 'IN_PROGRESS' | 'TEAM1_WINS' | 'TEAM2_WINS' | 'SURRENDERED';
  surrenderedBy?: 1 | 2;

  // Ban/Pick phase
  bannedChampions: number[]; // Champion IDs that are banned
  team1Picks: number[];
  team2Picks: number[];
  banPickPhase?: number; // Current phase (1-7)
  // Phase order: 1팀1개 -> 2팀2개 -> 1팀2개 -> 2팀1개 -> 1팀1개 -> 2팀2개 -> 1팀1개

  // Match log
  logs: MatchLog[];
}

export interface MatchLog {
  turn: number;
  timestamp: number;
  type: 'ACTION' | 'COMBAT' | 'EVENT' | 'TOWER' | 'KILL' | 'ITEM' | 'OBJECTIVE' | 'GAME_END' | 'LEVEL_UP';
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
