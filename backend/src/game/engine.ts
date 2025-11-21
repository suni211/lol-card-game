import {
  MatchState,
  TeamState,
  PlayerState,
  TowerState,
  TurnAction,
  TurnResult,
  MatchLog,
  CombatResult,
  ObjectiveEvent,
  Lane,
  Position,
  PlayerAction,
} from './types';
import { ITEMS, calculateItemCost } from './items';
import { processSkill, updateSkillCooldowns, isSkillReady, CHAMPIONS } from './skills';

// Constants
const TOWER_HEALTH = 500; // Reduced from 1000 for faster games
const NEXUS_HEALTH = 3000; // Fixed nexus health
const KILL_GOLD = 300;
const ASSIST_GOLD = 150;
const TURN_GOLD = 300;
const EVENT_WIN_GOLD = 1000;
const BASE_HEALTH_PER_OVERALL = 10; // Health = overall * 10
const BASE_ATTACK_MULTIPLIER = 1;
const ELDER_EXECUTE_THRESHOLD = 0.1; // Execute enemies below 10% HP
const TOWER_DAMAGE_MULTIPLIER = 2.5; // Increased tower damage multiplier

// Event tracking
interface EventTracker {
  lastDragonKillTurn: number; // Track when dragon was last killed
  team1DragonCount: number;
  team2DragonCount: number;
  team1Has4Dragons: boolean;
  team2Has4Dragons: boolean;
  lastBaronSpawnTurn: number; // Track when baron last appeared
  elderSpawnTurn: number; // Turn when Elder Dragon should spawn
}

export class GameEngine {
  private state: MatchState;
  private eventTracker: EventTracker;

  constructor(matchId: string, matchType: 'RANKED' | 'NORMAL', team1Data: any, team2Data: any) {
    this.state = this.initializeMatch(matchId, matchType, team1Data, team2Data);
    this.eventTracker = {
      lastDragonKillTurn: 0,
      team1DragonCount: 0,
      team2DragonCount: 0,
      team1Has4Dragons: false,
      team2Has4Dragons: false,
      lastBaronSpawnTurn: 0,
      elderSpawnTurn: 0,
    };
  }

  private initializeMatch(
    matchId: string,
    matchType: 'RANKED' | 'NORMAL',
    team1Data: any,
    team2Data: any
  ): MatchState {
    return {
      matchId,
      matchType,
      team1: this.initializeTeam(team1Data),
      team2: this.initializeTeam(team2Data),
      currentTurn: 1,
      maxTurnTime: 60,
      turnStartTime: Date.now(),
      team1Actions: [],
      team2Actions: [],
      team1Ready: false,
      team2Ready: false,
      status: 'IN_PROGRESS',
      bannedChampions: [],
      team1Picks: [],
      team2Picks: [],
      logs: [],
    };
  }

  private initializeTeam(teamData: any): TeamState {
    const players: PlayerState[] = teamData.players.map((p: any) => this.initializePlayer(p));

    const towers: TowerState[] = [];
    for (const lane of ['TOP', 'MID', 'BOT'] as Lane[]) {
      for (let pos = 1; pos <= 3; pos++) {
        towers.push({
          lane,
          position: pos as 1 | 2 | 3,
          health: TOWER_HEALTH,
          maxHealth: TOWER_HEALTH,
          isDestroyed: false,
        });
      }
    }

    return {
      oderId: teamData.oderId,
      players,
      towers,
      nexusHealth: NEXUS_HEALTH,
      maxNexusHealth: NEXUS_HEALTH,
      grubBuff: false,
      dragonStacks: 0,
      baronBuff: false,
      elderBuff: false,
    };
  }

  private initializePlayer(playerData: any): PlayerState {
    const baseAttack = this.calculateBaseAttack(playerData);
    const maxHealth = playerData.overall * BASE_HEALTH_PER_OVERALL;

    return {
      oderId: playerData.userCardId,
      playerId: playerData.playerId,
      name: playerData.name,
      position: playerData.position,
      baseOverall: playerData.overall,
      baseAttack,
      baseDefense: Math.floor(playerData.overall / 10),
      baseSpeed: Math.floor(playerData.overall / 5),
      maxHealth,
      currentHealth: maxHealth,
      attack: baseAttack,
      defense: Math.floor(playerData.overall / 10),
      magicResist: 0,
      speed: Math.floor(playerData.overall / 5),
      abilityPower: 0,
      critChance: 0,
      lifeSteal: 0,
      skillHaste: 0,
      evasion: 0,
      isDead: false,
      respawnTurn: 0,
      gold: 500, // Starting gold
      items: [],
      level: 1, // Starting level
      kills: 0, // Starting kills
      deaths: 0, // Starting deaths
      assists: 0, // Starting assists
      lastDamagedBy: [], // Track damage sources for assists
      buffs: [],
      debuffs: [],
      championId: playerData.championId,
      skill: playerData.championId ? {
        championId: playerData.championId,
        currentCooldown: 0,
        hasBeenUsed: false,
        skillLevel: 0, // Will be updated based on level
      } : undefined,
      isRecalling: false,
    };
  }

  private calculateBaseAttack(playerData: any): number {
    // Calculate attack from stats
    const stats = playerData.stats || {};
    const totalStats =
      (stats.laning || 0) +
      (stats.teamfight || 0) +
      (stats.mechanics || 0) +
      (stats.game_sense || 0) +
      (stats.consistency || 0) +
      (stats.aggression || 0) +
      (stats.champion_pool || 0) +
      (stats.communication || 0);

    return Math.floor(totalStats / 8) * BASE_ATTACK_MULTIPLIER + Math.floor(playerData.overall / 2);
  }

  getState(): MatchState {
    return this.state;
  }

  initializePlayersWithChampions() {
    const allPlayers = [...this.state.team1.players, ...this.state.team2.players];
    for (const player of allPlayers) {
      if (player.championId) {
        const champion = CHAMPIONS[player.championId];
        if (champion) {
          player.skill = {
            championId: player.championId,
            currentCooldown: 0,
            hasBeenUsed: false,
            skillLevel: 0, // Will be updated based on level
          };
          // Reset current health if champion changes and health type is different, etc.
          // For simplicity, just re-evaluate base stats based on new champion if needed
          // For now, just ensure skill is correctly set.
        }
      }
    }
  }

  swapChampions(teamNumber: 1 | 2, player1OderId: number, player2OderId: number, champion1Id: number, champion2Id: number): boolean {
    const team = teamNumber === 1 ? this.state.team1 : this.state.team2;
    const player1 = team.players.find(p => p.oderId === player1OderId);
    const player2 = team.players.find(p => p.oderId === player2OderId);

    if (!player1 || !player2) {
      console.warn(`[GameEngine] Swap failed: Player not found. p1: ${player1OderId}, p2: ${player2OderId}`);
      return false;
    }

    // Ensure the current champions match what the frontend expects to swap
    if (player1.championId !== champion1Id || player2.championId !== champion2Id) {
        console.warn(`[GameEngine] Swap failed: Champion mismatch. p1 current: ${player1.championId}, expected: ${champion1Id}. p2 current: ${player2.championId}, expected: ${champion2Id}`);
        return false;
    }

    // Perform the swap
    const tempChampionId = player1.championId;
    player1.championId = player2.championId;
    player2.championId = tempChampionId;

    // Re-initialize players to update skills and possibly stats based on new champion
    this.initializePlayersWithChampions();
    return true;
  }

  // Get upcoming event for the next turn (for notification)
  getUpcomingEvent(): ObjectiveEvent | undefined {
    return this.determineObjectiveSpawn(this.state.currentTurn);
  }

  // Submit actions for a team
  submitActions(teamNumber: 1 | 2, actions: TurnAction[]): boolean {
    if (this.state.status !== 'IN_PROGRESS') return false;

    if (teamNumber === 1) {
      this.state.team1Actions = actions;
      this.state.team1Ready = true;
    } else {
      this.state.team2Actions = actions;
      this.state.team2Ready = true;
    }

    return true;
  }

  // Check and auto-ready teams with all dead players (called before checking both ready)
  checkAutoReady(): void {
    const team1AllDead = this.state.team1.players.every(p => p.isDead);
    const team2AllDead = this.state.team2.players.every(p => p.isDead);

    if (team1AllDead && !this.state.team1Ready) {
      this.state.team1Actions = [];
      this.state.team1Ready = true;
    }
    if (team2AllDead && !this.state.team2Ready) {
      this.state.team2Actions = [];
      this.state.team2Ready = true;
    }
  }

  // Check if both teams are ready
  areBothTeamsReady(): boolean {
    return this.state.team1Ready && this.state.team2Ready;
  }

  // Process the turn
  processTurn(): TurnResult {
    const turn = this.state.currentTurn;
    const events: MatchLog[] = [];
    const combatResults: CombatResult[] = [];

    // 0. Expire buffs from previous turns
    this.expireBuffs(this.state.team1, turn, events);
    this.expireBuffs(this.state.team2, turn, events);

    // 1. Give gold for new turn
    this.giveTeamGold(this.state.team1, TURN_GOLD);
    this.giveTeamGold(this.state.team2, TURN_GOLD);

    // 2. Process item purchases/sales
    this.processItemActions(this.state.team1, this.state.team1Actions, events);
    this.processItemActions(this.state.team2, this.state.team2Actions, events);

    // 3. Respawn dead players
    this.respawnPlayers(this.state.team1, turn);
    this.respawnPlayers(this.state.team2, turn);

    // 4. Apply item stacking effects (Muramana, etc.)
    this.applyStackingEffects(this.state.team1, turn);
    this.applyStackingEffects(this.state.team2, turn);

    // 5. Process player actions
    const team1Actions = this.mapActionsToPlayers(this.state.team1, this.state.team1Actions);
    const team2Actions = this.mapActionsToPlayers(this.state.team2, this.state.team2Actions);

    console.log(`[GameEngine.processTurn] Turn ${turn}: Team 1 Actions: ${JSON.stringify(Array.from(team1Actions.entries()))}`);
    console.log(`[GameEngine.processTurn] Turn ${turn}: Team 2 Actions: ${JSON.stringify(Array.from(team2Actions.entries()))}`);

    // 6. Resolve combat in each lane
    this.resolveLaneCombat('TOP', team1Actions, team2Actions, combatResults, events);
    this.resolveLaneCombat('MID', team1Actions, team2Actions, combatResults, events);
    this.resolveLaneCombat('BOT', team1Actions, team2Actions, combatResults, events);

    // 7. Process jungle actions
    this.processJungleActions(team1Actions, team2Actions, events);

    // 8. Apply tower damage - only if attackers present and no defenders
    this.applyTowerDamage(team1Actions, this.state.team1, this.state.team2, team2Actions, events);
    this.applyTowerDamage(team2Actions, this.state.team2, this.state.team1, team1Actions, events);

    // 9. Process recalls
    this.processRecalls(this.state.team1, team1Actions, events);
    this.processRecalls(this.state.team2, team2Actions, events);

    // 9.5. Level up players who didn't recall (max level 18)
    this.processLevelUp(this.state.team1, team1Actions, events);
    this.processLevelUp(this.state.team2, team2Actions, events);

    // 9.6. Process skill usage
    this.processSkillUsage(this.state.team1, this.state.team2, this.state.team1Actions, events, turn);
    this.processSkillUsage(this.state.team2, this.state.team1, this.state.team2Actions, events, turn);

    // 9.7. Update skill cooldowns
    updateSkillCooldowns(this.state.team1);
    updateSkillCooldowns(this.state.team2);

    // 9.8. Reset recall status for next turn
    this.resetRecallStatus(this.state.team1);
    this.resetRecallStatus(this.state.team2);

    // 10. Apply support/item effects
    this.applyTurnEndEffects(this.state.team1, events);
    this.applyTurnEndEffects(this.state.team2, events);

    // 11. Check for objective event
    let objectiveResult = undefined;
    const event = this.determineObjectiveSpawn(turn); // Use the new function

    if (event) {
      if (event === 'DRAGON_AND_VOIDGRUB') {
        // Process Dragon first
        objectiveResult = this.processObjectiveEvent('DRAGON', team1Actions, team2Actions, events);
        // Then process Voidgrub
        const voidgrubResult = this.processObjectiveEvent('VOIDGRUB', team1Actions, team2Actions, events);
        // Combine results or prioritize one for the main objectiveResult
        if (voidgrubResult) {
          events.push({
            turn,
            timestamp: Date.now(),
            type: 'OBJECTIVE',
            message: `Team ${voidgrubResult.winner}이(가) 공허 유충 획득! ${voidgrubResult.effect}`,
          });
        }
      } else {
        objectiveResult = this.processObjectiveEvent(event, team1Actions, team2Actions, events);
      }
    }

    // 12. Check win condition
    let gameEnd = undefined;
    if (this.state.team1.nexusHealth <= 0) {
      this.state.status = 'TEAM2_WINS';
      gameEnd = { winner: 2 as const, reason: '넥서스 파괴' };
      events.push({
        turn,
        timestamp: Date.now(),
        type: 'GAME_END',
        message: 'Team 2 승리! 넥서스를 파괴했습니다.',
      });
    } else if (this.state.team2.nexusHealth <= 0) {
      this.state.status = 'TEAM1_WINS';
      gameEnd = { winner: 1 as const, reason: '넥서스 파괴' };
      events.push({
        turn,
        timestamp: Date.now(),
        type: 'GAME_END',
        message: 'Team 1 승리! 넥서스를 파괴했습니다.',
      });
    }

    // Add events to main log
    this.state.logs.push(...events);

    // Prepare for next turn
    if (!gameEnd) {
      this.state.currentTurn++;
      this.state.team1Actions = [];
      this.state.team2Actions = [];
      this.state.team1Ready = false;
      this.state.team2Ready = false;
      this.state.turnStartTime = Date.now();
    }

    return {
      turn,
      events,
      team1State: this.state.team1,
      team2State: this.state.team2,
      combatResults,
      objectiveResult,
      gameEnd,
    };
  }

  private giveTeamGold(team: TeamState, amount: number) {
    for (const player of team.players) {
      player.gold += amount;
    }
  }

  private expireBuffs(team: TeamState, currentTurn: number, events: MatchLog[]) {
    // Baron buff expires after 1 turn
    if (team.baronBuff && team.baronBuffTurn !== undefined && currentTurn > team.baronBuffTurn) {
      team.baronBuff = false;
      team.baronBuffTurn = undefined;
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `팀의 바론 버프가 만료되었습니다.`,
      });
    }

    // Elder buff expires after 1 turn
    if (team.elderBuff && team.elderBuffTurn !== undefined && currentTurn > team.elderBuffTurn) {
      team.elderBuff = false;
      team.elderBuffTurn = undefined;
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `팀의 장로 버프가 만료되었습니다.`,
      });
    }
  }

  private processItemActions(team: TeamState, actions: TurnAction[], events: MatchLog[]) {
    for (const action of actions) {
      const player = team.players.find(p => p.oderId === action.oderId);
      if (!player) continue;

      // Sell item
      if (action.sellItemId && player.items.includes(action.sellItemId)) {
        const item = ITEMS[action.sellItemId];
        if (item) {
          player.gold += item.cost; // Full refund
          player.items = player.items.filter(id => id !== action.sellItemId);
          this.recalculatePlayerStats(player);
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'ITEM',
            message: `${player.name}이(가) ${item.name}을(를) 판매했습니다. (+${item.cost}G)`,
          });
        }
      }

      // Buy item
      if (action.targetItemId) {
        const item = ITEMS[action.targetItemId];
        if (item) {
          const cost = calculateItemCost(action.targetItemId, player.items);
          const isConsumable = item.tier === 'CONSUMABLE';

          // Calculate final item count after purchase (excluding consumables from limit)
          let finalItemCount = player.items.filter(id => ITEMS[id]?.tier !== 'CONSUMABLE').length;
          if (!isConsumable) {
            finalItemCount += 1; // Only add if not consumable
          }

          if (item.buildsFrom) {
            for (const subItemId of item.buildsFrom) {
              if (player.items.includes(subItemId)) {
                finalItemCount--; // Sub-item will be removed
              }
            }
          }

          // Check 6 item limit (consumables bypass this limit)
          const canBuy = player.gold >= cost && (isConsumable || finalItemCount <= 6);

          if (canBuy) {
            player.gold -= cost;

            if (isConsumable) {
              // Apply consumable effects immediately
              if (item.id === 'health_potion') {
                const healAmount = Math.floor(player.maxHealth * (item.effects.health || 0) / 100);
                player.currentHealth = Math.min(player.maxHealth, player.currentHealth + healAmount);
                events.push({
                  turn: this.state.currentTurn,
                  timestamp: Date.now(),
                  type: 'ITEM',
                  message: `${player.name}이(가) ${item.name}을(를) 사용했습니다. (+${healAmount} 체력)`,
                });
              } else if (item.id === 'control_ward') {
                // Control ward needs a target lane, which should be provided in action.useItemTarget
                if (action.useItemTarget) {
                  player.wardPlaced = action.useItemTarget;
                  events.push({
                    turn: this.state.currentTurn,
                    timestamp: Date.now(),
                    type: 'ITEM',
                    message: `${player.name}이(가) ${action.useItemTarget} 라인에 제어 와드를 설치했습니다.`,
                  });
                } else {
                  events.push({
                    turn: this.state.currentTurn,
                    timestamp: Date.now(),
                    type: 'ITEM',
                    message: `${player.name}이(가) 제어 와드를 구매했지만, 사용할 라인을 지정하지 않았습니다.`,
                  });
                }
              }
              // Consumables are used immediately and do not go into inventory
            } else {
              // Remove sub-items if upgrading
              if (item.buildsFrom) {
                for (const subItemId of item.buildsFrom) {
                  const idx = player.items.indexOf(subItemId);
                  if (idx !== -1) {
                    player.items.splice(idx, 1);
                  }
                }
              }
              player.items.push(action.targetItemId);
              this.recalculatePlayerStats(player);
              events.push({
                turn: this.state.currentTurn,
                timestamp: Date.now(),
                type: 'ITEM',
                message: `${player.name}이(가) ${item.name}을(를) 구매했습니다. (-${cost}G)`,
              });
            }
          } else if (!isConsumable && finalItemCount > 6) {
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'ITEM',
              message: `${player.name}: 아이템이 가득 찼습니다! (최대 6개)`,
            });
          } else if (player.gold < cost) {
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'ITEM',
              message: `${player.name}: 골드가 부족하여 ${item.name}을(를) 구매할 수 없습니다. (필요: ${cost}G)`,
            });
          }
        }
      }

      // The separate control ward usage logic is now redundant as it's handled on purchase
      // if (action.useItemTarget && player.items.includes('control_ward')) {
      //   player.wardPlaced = action.useItemTarget;
      //   player.items = player.items.filter(id => id !== 'control_ward');
      //   events.push({
      //     turn: this.state.currentTurn,
      //     timestamp: Date.now(),
      //     type: 'ITEM',
      //     message: `${player.name}이(가) ${action.useItemTarget} 라인에 제어 와드를 설치했습니다.`,
      //   });
      // }
    }
  }

  private recalculatePlayerStats(player: PlayerState) {
    // Reset to base stats
    player.attack = player.baseAttack;
    player.defense = player.baseDefense;
    player.magicResist = 0;
    player.speed = player.baseSpeed;
    player.abilityPower = 0;
    player.critChance = 0;
    player.lifeSteal = 0;
    player.skillHaste = 0;
    player.evasion = 0;

    let healthBonus = 0;

    // Apply item effects
    for (const itemId of player.items) {
      const item = ITEMS[itemId];
      if (!item) continue;

      const e = item.effects;
      player.attack += e.attack || 0;
      player.defense += e.defense || 0;
      player.magicResist += e.magicResist || 0;
      player.speed += e.speed || 0;
      player.abilityPower += e.abilityPower || 0;
      player.critChance += e.critChance || 0;
      player.lifeSteal += e.lifeSteal || 0;
      player.skillHaste += e.skillHaste || 0;
      player.evasion += e.evasion || 0;
      healthBonus += e.health || 0;
    }

    // Apply Rabadon's Deathcap bonus (+30% total AP)
    if (player.items.includes('rabadons_deathcap')) {
      player.abilityPower = Math.floor(player.abilityPower * 1.3);
    }

    // Update max health
    const newMaxHealth = player.baseOverall * BASE_HEALTH_PER_OVERALL + healthBonus;
    const healthRatio = player.currentHealth / player.maxHealth;
    player.maxHealth = newMaxHealth;
    player.currentHealth = Math.floor(newMaxHealth * healthRatio);
  }

  private respawnPlayers(team: TeamState, turn: number) {
    for (const player of team.players) {
      if (player.isDead && player.respawnTurn <= turn) {
        player.isDead = false;
        player.currentHealth = player.maxHealth;
      }
    }
  }

  private applyStackingEffects(team: TeamState, turn: number) {
    for (const player of team.players) {
      // Muramana stacking
      if (player.items.includes('muramana')) {
        const item = ITEMS['muramana'];
        const stacks = Math.min(turn - 1, item.effects.maxStacks || 17);
        player.attack = player.baseAttack + stacks * (item.effects.stackingAttack || 3);
        this.recalculatePlayerStats(player);
      }
    }
  }

  private mapActionsToPlayers(
    team: TeamState,
    actions: TurnAction[]
  ): Map<number, PlayerAction> {
    const map = new Map<number, PlayerAction>();
    for (const action of actions) {
      map.set(action.oderId, action.action);
    }
    return map;
  }

  private resolveLaneCombat(
    lane: Lane,
    team1Actions: Map<number, PlayerAction>,
    team2Actions: Map<number, PlayerAction>,
    combatResults: CombatResult[],
    events: MatchLog[]
  ) {
    // Get players in lane for each team
    const team1InLane = this.getPlayersInLane(this.state.team1, team1Actions, lane);
    const team2InLane = this.getPlayersInLane(this.state.team2, team2Actions, lane);

    if (team1InLane.length === 0 && team2InLane.length === 0) return;

    // Calculate team power
    const team1Power = this.calculateTeamPower(team1InLane, this.state.team1);
    const team2Power = this.calculateTeamPower(team2InLane, this.state.team2);

    // Resolve combat
    if (team1InLane.length > 0 && team2InLane.length > 0) {
      this.resolveCombat(
        team1InLane,
        team2InLane,
        team1Power,
        team2Power,
        this.state.team1,
        this.state.team2,
        combatResults,
        events,
        lane
      );
    }
  }

  private getPlayersInLane(
    team: TeamState,
    actions: Map<number, PlayerAction>,
    lane: Lane
  ): PlayerState[] {
    const result: PlayerState[] = [];

    for (const player of team.players) {
      if (player.isDead || player.isRecalling) continue;

      const action = actions.get(player.oderId);
      if (!action) continue;

      // Check if player is in this lane
      const playerLane = this.getPlayerLane(player.position);
      const isInOwnLane = playerLane === lane && (action === 'FIGHT' || action === 'DEFEND');
      const isRoaming = this.isRoamingToLane(action, lane);

      if (isInOwnLane || isRoaming) {
        result.push(player);
      }
    }

    return result;
  }

  private getPlayerLane(position: Position): Lane | null {
    switch (position) {
      case 'TOP':
        return 'TOP';
      case 'MID':
        return 'MID';
      case 'ADC':
      case 'SUPPORT':
        return 'BOT';
      default:
        return null;
    }
  }

  private isRoamingToLane(action: PlayerAction, lane: Lane): boolean {
    if (action === 'ROAM_TOP' && lane === 'TOP') return true;
    if (action === 'ROAM_MID' && lane === 'MID') return true;
    if (action === 'ROAM_BOT' && lane === 'BOT') return true;
    if (action === 'GANK_TOP' && lane === 'TOP') return true;
    if (action === 'GANK_MID' && lane === 'MID') return true;
    if (action === 'GANK_BOT' && lane === 'BOT') return true;
    return false;
  }

  private calculateTeamPower(players: PlayerState[], team: TeamState): number {
    let power = 0;

    for (const player of players) {
      power += player.attack;

      // Apply buffs
      if (team.dragonStacks > 0) {
        power *= 1 + team.dragonStacks * 0.05; // 5% per dragon
      }
      if (team.baronBuff) {
        power *= 1.2; // 20% baron buff
      }
    }

    return power;
  }

  private resolveCombat(
    team1Players: PlayerState[],
    team2Players: PlayerState[],
    team1Power: number,
    team2Power: number,
    team1: TeamState,
    team2: TeamState,
    combatResults: CombatResult[],
    events: MatchLog[],
    lane: Lane
  ) {
    // Sort by speed for attack order
    const allPlayers = [
      ...team1Players.map(p => ({ player: p, team: 1 as const })),
      ...team2Players.map(p => ({ player: p, team: 2 as const })),
    ].sort((a, b) => b.player.speed - a.player.speed);

    for (const attacker of allPlayers) {
      if (attacker.player.isDead) continue;

      // Find targets
      const targets = attacker.team === 1 ? team2Players : team1Players;
      const attackerTeam = attacker.team === 1 ? team1 : team2;
      const enemyTeam = attacker.team === 1 ? team2 : team1;
      const aliveTargets = targets.filter(t => !t.isDead);

      // If no alive targets, attack tower/nexus instead
      if (aliveTargets.length === 0) {
        const tower = enemyTeam.towers.find(t => t.lane === lane && !t.isDestroyed);
        if (tower) {
          const towerDamage = Math.floor(attacker.player.attack * TOWER_DAMAGE_MULTIPLIER);
          tower.health -= towerDamage;
          if (tower.health <= 0) {
            tower.isDestroyed = true;
            tower.health = 0;
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'TOWER',
              message: `${attacker.player.name}이(가) ${lane} ${tower.position}차 포탑을 파괴했습니다!`,
            });
          }
        } else {
          // All towers destroyed, attack nexus
          const nexusDamage = Math.floor(attacker.player.attack * TOWER_DAMAGE_MULTIPLIER);
          enemyTeam.nexusHealth -= nexusDamage;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'TOWER',
            message: `${attacker.player.name}이(가) 넥서스에 ${nexusDamage} 피해를 입혔습니다!`,
          });
        }
        continue;
      }

      // Pick random target
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];

      // Calculate damage
      let damage = this.calculateDamage(attacker.player, target, attackerTeam);

      // Check crit
      const isCrit = Math.random() * 100 < attacker.player.critChance;
      if (isCrit) {
        damage *= 1.5;
      }

      // Apply damage
      target.currentHealth -= damage;

      // Track damage source for assists (keep last 3 attackers)
      if (damage > 0) {
        if (!target.lastDamagedBy.includes(attacker.player.oderId)) {
          target.lastDamagedBy.push(attacker.player.oderId);
          if (target.lastDamagedBy.length > 3) {
            target.lastDamagedBy.shift();
          }
        }
      }

      // Life steal
      let healAmount = 0;
      if (attacker.player.lifeSteal > 0) {
        healAmount = Math.floor(damage * attacker.player.lifeSteal / 100);
        attacker.player.currentHealth = Math.min(
          attacker.player.maxHealth,
          attacker.player.currentHealth + healAmount
        );
      }

      // Check elder execute (10% HP threshold)
      let isExecute = false;
      if (target.currentHealth > 0 && this.checkElderExecute(target, attackerTeam)) {
        target.currentHealth = 0;
        isExecute = true;
      }

      // Check kill
      const isKill = target.currentHealth <= 0;
      if (isKill) {
        target.isDead = true;
        target.respawnTurn = this.state.currentTurn + 2; // Respawn in 2 turns
        target.currentHealth = 0;

        // Update kill/death stats
        attacker.player.kills++;
        target.deaths++;

        // Give gold for kill
        attacker.player.gold += KILL_GOLD;

        // Process assists
        const assisters: string[] = [];
        for (const oderId of target.lastDamagedBy) {
          if (oderId !== attacker.player.oderId) {
            // Find the assister in the attacking team
            const assister = attackerTeam.players.find(p => p.oderId === oderId);
            if (assister) {
              assister.assists++;
              assister.gold += ASSIST_GOLD;
              assisters.push(assister.name);
            }
          }
        }

        // Clear damage tracking
        target.lastDamagedBy = [];

        if (isExecute) {
          const assistText = assisters.length > 0 ? ` (어시스트: ${assisters.join(', ')})` : '';
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${attacker.player.name}이(가) ${target.name}을(를) 장로 처형했습니다! (+${KILL_GOLD}G)${assistText}`,
          });
        } else {
          const assistText = assisters.length > 0 ? ` (어시스트: ${assisters.join(', ')})` : '';
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${attacker.player.name}이(가) ${target.name}을(를) 처치했습니다! (+${KILL_GOLD}G)${assistText}`,
          });
        }
      }

      combatResults.push({
        attackerId: attacker.player.oderId,
        defenderId: target.oderId,
        damage,
        isCrit,
        isKill,
        healAmount,
      });
    }

    events.push({
      turn: this.state.currentTurn,
      timestamp: Date.now(),
      type: 'COMBAT',
      message: `${lane} 라인 전투 완료`,
    });
  }

  private calculateDamage(attacker: PlayerState, defender: PlayerState, attackerTeam?: TeamState): number {
    // Base damage is attack * 2 for more impactful combat
    let physicalDamage = attacker.attack * 2;
    let magicDamage = 0;

    // MID position gets AP as direct damage (300 AP = ~300-350 damage)
    if (attacker.position === 'MID' && attacker.abilityPower > 0) {
      // AP adds damage with slight variance (1.0 ~ 1.17x)
      magicDamage = attacker.abilityPower * (1 + Math.random() * 0.17);
    }

    // Apply defense reduction to physical damage
    const defenseReduction = defender.defense / (defender.defense + 300);
    physicalDamage *= 1 - defenseReduction;

    // Apply magic resistance reduction to magic damage
    if (magicDamage > 0 && defender.magicResist > 0) {
      const magicReduction = defender.magicResist / (defender.magicResist + 300);
      magicDamage *= 1 - magicReduction;
    }

    let totalDamage = physicalDamage + magicDamage;

    // Minimum damage is 10% of attack
    totalDamage = Math.max(totalDamage, attacker.attack * 0.1);

    // Check evasion
    if (Math.random() * 100 < defender.evasion) {
      return 0; // Evaded
    }

    return Math.floor(totalDamage);
  }

  // Check if target should be executed by elder buff
  private checkElderExecute(target: PlayerState, attackerTeam: TeamState): boolean {
    if (!attackerTeam.elderBuff) return false;

    const healthPercent = target.currentHealth / target.maxHealth;
    return healthPercent < ELDER_EXECUTE_THRESHOLD;
  }

  private processJungleActions(
    team1Actions: Map<number, PlayerAction>,
    team2Actions: Map<number, PlayerAction>,
    events: MatchLog[]
  ) {
    // Team 1 jungle
    const team1Jungle = this.state.team1.players.find(p => p.position === 'JUNGLE');
    if (team1Jungle && !team1Jungle.isDead) {
      const action = team1Actions.get(team1Jungle.oderId);
      if (action === 'FARM') {
        team1Jungle.attack *= 1.01; // 1% attack increase
        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'ACTION',
          message: `${team1Jungle.name}이(가) 정글 파밍 중... (공격력 +1%)`,
        });
      }
    }

    // Team 2 jungle
    const team2Jungle = this.state.team2.players.find(p => p.position === 'JUNGLE');
    if (team2Jungle && !team2Jungle.isDead) {
      const action = team2Actions.get(team2Jungle.oderId);
      if (action === 'FARM') {
        team2Jungle.attack *= 1.01;
        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'ACTION',
          message: `${team2Jungle.name}이(가) 정글 파밍 중... (공격력 +1%)`,
        });
      }
    }
  }

  private applyTowerDamage(
    attackerActions: Map<number, PlayerAction>,
    attackerTeam: TeamState,
    enemyTeam: TeamState,
    enemyActions: Map<number, PlayerAction>,
    events: MatchLog[]
  ) {
    // Check each lane - only attack tower if we have attackers and enemy has no defenders
    for (const lane of ['TOP', 'MID', 'BOT'] as Lane[]) {
      // Get our attackers in this lane
      const attackers = this.getPlayersInLane(attackerTeam, attackerActions, lane);
      // Get enemy defenders in this lane
      const defenders = this.getDefendersInLane(enemyTeam, enemyActions, lane);

      // Only attack tower if we have attackers and enemy has no defenders
      if (attackers.length > 0 && defenders.length === 0) {
        // Calculate total attack power
        let totalDamage = 0;
        for (const attacker of attackers) {
          totalDamage += Math.floor(attacker.attack * TOWER_DAMAGE_MULTIPLIER);
        }

        // Apply grub buff
        if (attackerTeam.grubBuff) {
          totalDamage = Math.floor(totalDamage * 1.3);
        }
        // Apply baron buff
        if (attackerTeam.baronBuff) {
          totalDamage = Math.floor(totalDamage * 1.2);
        }

        // Damage tower
        const tower = enemyTeam.towers.find(
          t => t.lane === lane && !t.isDestroyed
        );
        if (tower) {
          tower.health -= totalDamage;
          if (tower.health <= 0) {
            tower.isDestroyed = true;
            tower.health = 0;
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'TOWER',
              message: `${lane} ${tower.position}차 포탑이 파괴되었습니다! (-${totalDamage})`,
            });
          } else {
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'TOWER',
              message: `${lane} ${tower.position}차 포탑에 ${totalDamage} 피해!`,
            });
          }
        } else {
          // All towers destroyed, damage nexus
          enemyTeam.nexusHealth -= totalDamage;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'TOWER',
            message: `${lane} 라인 넥서스에 ${totalDamage} 피해!`,
          });
        }
      }
    }
  }

  private getDefendersInLane(
    team: TeamState,
    actions: Map<number, PlayerAction>,
    lane: Lane
  ): PlayerState[] {
    return team.players.filter(player => {
      if (player.isDead) return false;
      const action = actions.get(player.oderId);
      const playerLane = this.getPlayerLane(player.position);
      return playerLane === lane && (action === 'FIGHT' || action === 'DEFEND');
    });
  }

  private processRecalls(team: TeamState, actions: Map<number, PlayerAction>, events: MatchLog[]) {
    for (const player of team.players) {
      if (player.isDead) continue;

      const action = actions.get(player.oderId);
      if (action === 'RECALL') {
        // Heal to full and mark as recalling (can't participate in teamfight)
        player.currentHealth = player.maxHealth;
        player.isRecalling = true;
        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'ACTION',
          message: `${player.name}이(가) 귀환하여 체력을 회복했습니다. (한타 참여 불가)`,
        });
      }
    }
  }

  private processLevelUp(team: TeamState, actions: Map<number, PlayerAction>, events: MatchLog[]) {
    const MAX_LEVEL = 18;
    const LEVEL_ATTACK_BONUS = 2; // Attack bonus per level
    const LEVEL_HEALTH_BONUS = 20; // Health bonus per level

    for (const player of team.players) {
      if (player.isDead) continue;

      const action = actions.get(player.oderId);
      // Level up if not recalling and not at max level
      if (action !== 'RECALL' && player.level < MAX_LEVEL) {
        player.level++;

        // Apply level bonuses
        player.attack += LEVEL_ATTACK_BONUS;
        player.maxHealth += LEVEL_HEALTH_BONUS;
        player.currentHealth = Math.min(player.currentHealth + LEVEL_HEALTH_BONUS, player.maxHealth);

        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'LEVEL_UP',
          message: `${player.name}이(가) 레벨 ${player.level}로 상승했습니다!`,
        });
      }
    }
  }

  private applyTurnEndEffects(team: TeamState, events: MatchLog[]) {
    // Support item effects
    for (const player of team.players) {
      if (player.isDead) continue;

      // Calculate AP bonus for SUPPORT (AP increases heal/shield effectiveness)
      // 100 AP = +100% heal/shield, 300 AP = +300%
      const apBonus = player.position === 'SUPPORT' ? (player.abilityPower / 100) : 0;

      // Knights Vow - 10% heal per turn (boosted by AP)
      if (player.items.includes('knights_vow')) {
        const baseHeal = player.maxHealth * 0.1;
        const heal = Math.floor(baseHeal * (1 + apBonus));
        player.currentHealth = Math.min(player.maxHealth, player.currentHealth + heal);
      }

      // Redemption - 10% team heal (boosted by AP)
      if (player.items.includes('redemption')) {
        for (const ally of team.players) {
          if (!ally.isDead) {
            const baseHeal = ally.maxHealth * 0.1;
            const heal = Math.floor(baseHeal * (1 + apBonus));
            ally.currentHealth = Math.min(ally.maxHealth, ally.currentHealth + heal);
          }
        }
      }

      // Moonstone Renewer - AP boosted heal
      if (player.items.includes('moonstone_renewer')) {
        const item = ITEMS['moonstone_renewer'];
        const healPercent = (item.effects.healAllyPercent || 8) / 100;
        for (const ally of team.players) {
          if (!ally.isDead && ally.oderId !== player.oderId) {
            const baseHeal = ally.maxHealth * healPercent;
            const heal = Math.floor(baseHeal * (1 + apBonus));
            ally.currentHealth = Math.min(ally.maxHealth, ally.currentHealth + heal);
          }
        }
      }

      // Staff of Flowing Water - AP boosted ADC heal
      if (player.items.includes('staff_of_flowing_water')) {
        const adc = team.players.find(p => p.position === 'ADC' && !p.isDead);
        if (adc) {
          const baseHeal = adc.maxHealth * 0.03;
          const heal = Math.floor(baseHeal * (1 + apBonus));
          adc.currentHealth = Math.min(adc.maxHealth, adc.currentHealth + heal);
        }
      }

      // Locket of Solari - 5% shield to all (boosted by AP)
      if (player.items.includes('locket_of_solari')) {
        // Shield effect would be applied in combat (apBonus can be used)
      }
    }
  }

  // Determine which objective, if any, spawns on a given turn
  private determineObjectiveSpawn(turn: number): ObjectiveEvent | undefined {
    // Turn 4: Dragon and Voidgrubs always spawn simultaneously
    if (turn === 4) {
      return 'DRAGON_AND_VOIDGRUB'; // Special combined event
    }

    // Dragon respawn logic
    if (!this.eventTracker.team1Has4Dragons && !this.eventTracker.team2Has4Dragons) {
      if (this.eventTracker.lastDragonKillTurn > 0 && (turn - this.eventTracker.lastDragonKillTurn) === 2) {
        return 'DRAGON';
      }
    }

    // Baron spawn logic (from Turn 12)
    if (turn >= 12 && (turn - this.eventTracker.lastBaronSpawnTurn) >= 5) { // Baron respawns every 5 turns after being killed
      // 50% chance for Baron to spawn if eligible
      if (Math.random() < 0.5) {
        return 'BARON';
      }
    }

    // Elder Dragon spawn logic (2 turns after a team secures 4 dragons)
    if (this.eventTracker.elderSpawnTurn > 0 && turn === this.eventTracker.elderSpawnTurn) {
      return 'ELDER';
    }

    return undefined;
  }

  private processObjectiveEvent(
    event: ObjectiveEvent,
    team1Actions: Map<number, PlayerAction>,
    team2Actions: Map<number, PlayerAction>,
    events: MatchLog[]
  ): { event: ObjectiveEvent; winner: 1 | 2; effect: string } | undefined {
    const currentTurn = this.state.currentTurn;
    let winner: 1 | 2 | undefined;
    let effect = '';

    // --- NEW VALIDATION ---
    const actualUpcomingEvent = this.determineObjectiveSpawn(currentTurn);
    if (actualUpcomingEvent !== event && !(actualUpcomingEvent === 'DRAGON_AND_VOIDGRUB' && (event === 'DRAGON' || event === 'VOIDGRUB'))) {
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `${event} 목표는 현재 활성화되어 있지 않습니다.`,
      });
      return undefined;
    }
    // --- END NEW VALIDATION ---

    // Determine which players are contesting this specific objective
    const team1Contesters = this.state.team1.players.filter(p => !p.isDead && !p.isRecalling && this.isContestingObjective(p.oderId, team1Actions, event));
    const team2Contesters = this.state.team2.players.filter(p => !p.isDead && !p.isRecalling && this.isContestingObjective(p.oderId, team2Actions, event));

    // If no one contests, no event happens for this objective
    if (team1Contesters.length === 0 && team2Contesters.length === 0) {
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `${event} 목표에 아무도 참여하지 않았습니다.`,
      });
      return undefined;
    }

    // If only one team contests, they secure it without a fight
    if (team1Contesters.length > 0 && team2Contesters.length === 0) {
      winner = 1;
    } else if (team1Contesters.length === 0 && team2Contesters.length > 0) {
      winner = 2;
    } else {
      // Both teams contest, resolve a teamfight at the objective
      const team1Power = this.calculateTeamPower(team1Contesters, this.state.team1);
      const team2Power = this.calculateTeamPower(team2Contesters, this.state.team2);

      const total = team1Power + team2Power;
      const team1Chance = total > 0 ? team1Power / total : 0.5;
      winner = Math.random() < team1Chance ? 1 : 2;

      // Resolve casualties from the objective teamfight
      this.resolveObjectiveTeamfight(
        winner,
        team1Contesters,
        team2Contesters,
        team1Power,
        team2Power,
        this.state.team1,
        this.state.team2,
        events
      );
    }

    if (!winner) return undefined; // Should not happen if any team contested

    const winningTeamState = winner === 1 ? this.state.team1 : this.state.team2;
    const losingTeamState = winner === 1 ? this.state.team2 : this.state.team1;

    // Apply objective effects
    switch (event) {
      case 'VOIDGRUB':
        winningTeamState.grubBuff = true; // Assuming grubBuff is for Voidgrubs
        effect = '포탑/넥서스 데미지 증가';
        break;
      case 'DRAGON':
        winningTeamState.dragonStacks++;
        this.eventTracker.lastDragonKillTurn = currentTurn; // Update last kill turn
        if (winner === 1) {
          this.eventTracker.team1DragonCount++;
          if (this.eventTracker.team1DragonCount >= 4) this.eventTracker.team1Has4Dragons = true;
        } else {
          this.eventTracker.team2DragonCount++;
          if (this.eventTracker.team2DragonCount >= 4) this.eventTracker.team2Has4Dragons = true;
        }
        effect = `용 버프 ${winningTeamState.dragonStacks}스택 (선수 공격력 증가)`;
        break;
      case 'BARON':
        winningTeamState.baronBuff = true;
        winningTeamState.baronBuffTurn = currentTurn;
        this.eventTracker.lastBaronSpawnTurn = currentTurn; // Update last spawn turn
        effect = '바론 버프 획득 (1턴, 데미지 +20%, 포탑 데미지 +50%)';
        break;
      case 'ELDER':
        winningTeamState.elderBuff = true;
        winningTeamState.elderBuffTurn = currentTurn;
        effect = '장로 버프 획득 (1턴, 10% 미만 체력 적 처형)';
        break;
      case 'DRAGON_AND_VOIDGRUB': // This case should be handled in processTurn
        break;
    }

    events.push({
      turn: currentTurn,
      timestamp: Date.now(),
      type: 'OBJECTIVE',
      message: `Team ${winner}이(가) ${event} 획득! ${effect}`,
    });

    // Check for Elder Dragon spawn condition
    if (this.eventTracker.team1Has4Dragons && this.eventTracker.elderSpawnTurn === 0) {
      this.eventTracker.elderSpawnTurn = currentTurn + 2;
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `Team 1이 4용을 획득하여 ${this.eventTracker.elderSpawnTurn}턴에 장로 드래곤이 등장합니다!`,
      });
    }
    if (this.eventTracker.team2Has4Dragons && this.eventTracker.elderSpawnTurn === 0) {
      this.eventTracker.elderSpawnTurn = currentTurn + 2;
      events.push({
        turn: currentTurn,
        timestamp: Date.now(),
        type: 'OBJECTIVE',
        message: `Team 2가 4용을 획득하여 ${this.eventTracker.elderSpawnTurn}턴에 장로 드래곤이 등장합니다!`,
      });
    }

    return { event, winner, effect };
  }

  private isContestingObjective(playerId: number, actions: Map<number, PlayerAction>, objective: ObjectiveEvent): boolean {
    const action = actions.get(playerId);
    if (!action) return false;

    switch (objective) {
      case 'DRAGON':
        return action === 'CONTEST_DRAGON';
      case 'VOIDGRUB':
        return action === 'CONTEST_VOIDGRUB';
      case 'BARON':
        return action === 'CONTEST_BARON';
      case 'ELDER':
        return action === 'CONTEST_ELDER';
      case 'DRAGON_AND_VOIDGRUB': // If it's a combined event, check both
        return action === 'CONTEST_DRAGON' || action === 'CONTEST_VOIDGRUB';
      default:
        return false;
    }
  }

  private resolveObjectiveTeamfight(
    winner: 1 | 2,
    team1Contesters: PlayerState[],
    team2Contesters: PlayerState[],
    team1Power: number,
    team2Power: number,
    team1State: TeamState,
    team2State: TeamState,
    events: MatchLog[]
  ) {
    const winningFighters = winner === 1 ? team1Contesters : team2Contesters;
    const losingFighters = winner === 1 ? team2Contesters : team1Contesters;
    const winningTeam = winner === 1 ? team1State : team2State;
    const losingTeam = winner === 1 ? team2State : team1State;

    // Power difference determines how devastating the fight is
    const powerRatio = winner === 1
      ? (team2Power / (team1Power || 1))
      : (team1Power / (team2Power || 1));

    // Losing team: most/all players die or get heavily damaged
    for (const player of losingFighters) {
      const deathChance = 0.5 + (1 - powerRatio) * 0.3; // 50-80% base death chance
      if (Math.random() < deathChance) {
        player.isDead = true;
        player.currentHealth = 0;
        player.respawnTurn = this.state.currentTurn + 2;
        player.deaths++;

        const aliveWinners = winningFighters.filter(p => !p.isDead);
        if (aliveWinners.length > 0) {
          const killer = aliveWinners[Math.floor(Math.random() * aliveWinners.length)];
          killer.kills++;
          killer.gold += KILL_GOLD;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${killer.name}이(가) ${player.name}을(를) 목표 한타에서 처치했습니다! (+${KILL_GOLD}G)`,
          });
        } else {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${player.name}이(가) 목표 한타에서 사망했습니다!`,
          });
        }
      } else {
        player.currentHealth = Math.floor(player.maxHealth * (0.1 + Math.random() * 0.3));
      }
    }

    // Winning team: some casualties too if it was close
    for (const player of winningFighters) {
      const deathChance = powerRatio * 0.4; // 0-40% death chance based on enemy power
      if (Math.random() < deathChance) {
        player.isDead = true;
        player.currentHealth = 0;
        player.respawnTurn = this.state.currentTurn + 2;
        player.deaths++;

        const aliveLosers = losingFighters.filter(p => !p.isDead);
        if (aliveLosers.length > 0) {
          const killer = aliveLosers[Math.floor(Math.random() * aliveLosers.length)];
          killer.kills++;
          killer.gold += KILL_GOLD;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${killer.name}이(가) ${player.name}을(를) 목표 한타에서 처치했습니다! (+${KILL_GOLD}G)`,
          });
        } else {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${player.name}이(가) 목표 한타에서 사망했습니다!`,
          });
        }
      } else {
        const remainingHpPercent = 0.3 + Math.random() * 0.5;
        player.currentHealth = Math.min(
          player.currentHealth,
          Math.floor(player.maxHealth * remainingHpPercent)
        );
      }
    }

    // Give gold to winners
    this.giveTeamGold(winningTeam, EVENT_WIN_GOLD);
  }

  // Process skill usage for a team
  private processSkillUsage(
    allyTeam: TeamState,
    enemyTeam: TeamState,
    actions: TurnAction[],
    events: MatchLog[],
    turn: number
  ) {
    for (const action of actions) {
      if (action.useSkill) {
        const player = allyTeam.players.find(p => p.oderId === action.oderId);
        if (player && !player.isDead && isSkillReady(player)) {
          processSkill(player, allyTeam, enemyTeam, events, turn, action.skillTargetId);
        }
      }
    }
  }

  // Reset recall status at end of turn
  private resetRecallStatus(team: TeamState) {
    for (const player of team.players) {
      player.isRecalling = false;
    }
  }

  // Surrender
  surrender(teamNumber: 1 | 2): boolean {
    if (this.state.status !== 'IN_PROGRESS') return false;
    if (this.state.currentTurn < 15) return false; // Can't surrender before turn 15

    this.state.status = 'SURRENDERED';
    this.state.surrenderedBy = teamNumber;

    if (teamNumber === 1) {
      this.state.status = 'TEAM2_WINS';
    } else {
      this.state.status = 'TEAM1_WINS';
    }

    this.state.logs.push({
      turn: this.state.currentTurn,
      timestamp: Date.now(),
      type: 'GAME_END',
      message: `Team ${teamNumber}이(가) 항복했습니다.`,
    });

    return true;
  }
}
