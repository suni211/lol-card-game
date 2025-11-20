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

// Constants
const TOWER_HEALTH = 1000;
const NEXUS_HEALTH = 3000;
const KILL_GOLD = 300;
const TURN_GOLD = 300;
const EVENT_WIN_GOLD = 1000;
const BASE_HEALTH_PER_OVERALL = 10; // Health = overall * 10
const BASE_ATTACK_MULTIPLIER = 1;
const ELDER_EXECUTE_THRESHOLD = 0.1; // Execute enemies below 10% HP

// Event schedule
const EVENT_SCHEDULE: Record<number, ObjectiveEvent> = {
  3: 'GRUB',
  5: 'DRAGON',
  7: 'HERALD',
  9: 'BARON',
  10: 'DRAGON',
  12: 'ELDER',
};

export class GameEngine {
  private state: MatchState;

  constructor(matchId: string, matchType: 'RANKED' | 'NORMAL', team1Data: any, team2Data: any) {
    this.state = this.initializeMatch(matchId, matchType, team1Data, team2Data);
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
      speed: Math.floor(playerData.overall / 5),
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
      buffs: [],
      debuffs: [],
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

    // 6. Resolve combat in each lane
    this.resolveLaneCombat('TOP', team1Actions, team2Actions, combatResults, events);
    this.resolveLaneCombat('MID', team1Actions, team2Actions, combatResults, events);
    this.resolveLaneCombat('BOT', team1Actions, team2Actions, combatResults, events);

    // 7. Process jungle actions
    this.processJungleActions(team1Actions, team2Actions, events);

    // 8. Apply tower damage for empty lanes
    this.applyTowerDamage(team1Actions, this.state.team2, events);
    this.applyTowerDamage(team2Actions, this.state.team1, events);

    // 9. Process recalls
    this.processRecalls(this.state.team1, team1Actions, events);
    this.processRecalls(this.state.team2, team2Actions, events);

    // 9.5. Level up players who didn't recall (max level 18)
    this.processLevelUp(this.state.team1, team1Actions, events);
    this.processLevelUp(this.state.team2, team2Actions, events);

    // 10. Apply support/item effects
    this.applyTurnEndEffects(this.state.team1, events);
    this.applyTurnEndEffects(this.state.team2, events);

    // 11. Check for objective event
    let objectiveResult = undefined;
    const event = this.getEventForTurn(turn);
    if (event) {
      objectiveResult = this.processObjectiveEvent(event, team1Actions, team2Actions, events);
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

          // Calculate final item count after purchase
          let finalItemCount = player.items.length + 1;
          if (item.buildsFrom) {
            for (const subItemId of item.buildsFrom) {
              if (player.items.includes(subItemId)) {
                finalItemCount--; // Sub-item will be removed
              }
            }
          }

          // Check 6 item limit
          if (player.gold >= cost && finalItemCount <= 6) {
            // Remove sub-items if upgrading
            if (item.buildsFrom) {
              for (const subItemId of item.buildsFrom) {
                const idx = player.items.indexOf(subItemId);
                if (idx !== -1) {
                  player.items.splice(idx, 1);
                }
              }
            }

            player.gold -= cost;
            player.items.push(action.targetItemId);
            this.recalculatePlayerStats(player);
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'ITEM',
              message: `${player.name}이(가) ${item.name}을(를) 구매했습니다. (-${cost}G)`,
            });
          } else if (finalItemCount > 6) {
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'ITEM',
              message: `${player.name}: 아이템이 가득 찼습니다! (최대 6개)`,
            });
          }
        }
      }

      // Use control ward
      if (action.useItemTarget && player.items.includes('control_ward')) {
        player.wardPlaced = action.useItemTarget;
        player.items = player.items.filter(id => id !== 'control_ward');
        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'ITEM',
          message: `${player.name}이(가) ${action.useItemTarget} 라인에 제어 와드를 설치했습니다.`,
        });
      }
    }
  }

  private recalculatePlayerStats(player: PlayerState) {
    // Reset to base stats
    player.attack = player.baseAttack;
    player.defense = player.baseDefense;
    player.speed = player.baseSpeed;
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
      player.speed += e.speed || 0;
      player.critChance += e.critChance || 0;
      player.lifeSteal += e.lifeSteal || 0;
      player.skillHaste += e.skillHaste || 0;
      player.evasion += e.evasion || 0;
      healthBonus += e.health || 0;
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
      if (player.isDead) continue;

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
      const aliveTargets = targets.filter(t => !t.isDead);
      if (aliveTargets.length === 0) continue;

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

        if (isExecute) {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${attacker.player.name}이(가) ${target.name}을(를) 장로 처형했습니다! (+${KILL_GOLD}G)`,
          });
        } else {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${attacker.player.name}이(가) ${target.name}을(를) 처치했습니다! (+${KILL_GOLD}G)`,
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
    let damage = attacker.attack * 2;

    // Apply defense reduction (less impactful formula)
    // Old: defense / (defense + 100) was too harsh
    // New: defense / (defense + 300) for lighter reduction
    const defenseReduction = defender.defense / (defender.defense + 300);
    damage *= 1 - defenseReduction;

    // Minimum damage is 10% of attack
    damage = Math.max(damage, attacker.attack * 0.1);

    // Check evasion
    if (Math.random() * 100 < defender.evasion) {
      return 0; // Evaded
    }

    return Math.floor(damage);
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
    actions: Map<number, PlayerAction>,
    enemyTeam: TeamState,
    events: MatchLog[]
  ) {
    // Check each lane for undefended attacks
    for (const lane of ['TOP', 'MID', 'BOT'] as Lane[]) {
      const defenders = this.getDefendersInLane(enemyTeam, actions, lane);
      if (defenders.length === 0) {
        // Lane is empty, damage tower
        const tower = enemyTeam.towers.find(
          t => t.lane === lane && !t.isDestroyed
        );
        if (tower) {
          const damage = 100; // Base tower damage
          tower.health -= damage;
          if (tower.health <= 0) {
            tower.isDestroyed = true;
            tower.health = 0;
            events.push({
              turn: this.state.currentTurn,
              timestamp: Date.now(),
              type: 'TOWER',
              message: `${lane} ${tower.position}차 포탑이 파괴되었습니다!`,
            });
          }
        } else {
          // All towers destroyed, damage nexus
          const damage = 150;
          enemyTeam.nexusHealth -= damage;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'TOWER',
            message: `${lane} 라인 넥서스에 ${damage} 피해!`,
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
        // Heal to full
        player.currentHealth = player.maxHealth;
        events.push({
          turn: this.state.currentTurn,
          timestamp: Date.now(),
          type: 'ACTION',
          message: `${player.name}이(가) 귀환하여 체력을 회복했습니다.`,
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

      // Knights Vow - 10% heal per turn
      if (player.items.includes('knights_vow')) {
        const heal = Math.floor(player.maxHealth * 0.1);
        player.currentHealth = Math.min(player.maxHealth, player.currentHealth + heal);
      }

      // Redemption - 10% team heal
      if (player.items.includes('redemption')) {
        for (const ally of team.players) {
          if (!ally.isDead) {
            const heal = Math.floor(ally.maxHealth * 0.1);
            ally.currentHealth = Math.min(ally.maxHealth, ally.currentHealth + heal);
          }
        }
      }

      // Locket of Solari - 5% shield to all
      if (player.items.includes('locket_of_solari')) {
        // Shield effect would be applied in combat
      }
    }
  }

  private getEventForTurn(turn: number): ObjectiveEvent | undefined {
    // Check scheduled events
    if (EVENT_SCHEDULE[turn]) {
      return EVENT_SCHEDULE[turn];
    }

    // Baron repeats every 3 turns after turn 9
    if (turn > 9 && (turn - 9) % 3 === 0) {
      return 'BARON';
    }

    // Elder repeats every 3 turns after turn 12
    if (turn > 12 && (turn - 12) % 3 === 0) {
      return 'ELDER';
    }

    return undefined;
  }

  private processObjectiveEvent(
    event: ObjectiveEvent,
    team1Actions: Map<number, PlayerAction>,
    team2Actions: Map<number, PlayerAction>,
    events: MatchLog[]
  ): { event: ObjectiveEvent; winner: 1 | 2; effect: string } {
    // TEAMFIGHT: All alive players from both teams fight together!
    const team1Fighters = this.state.team1.players.filter(p => !p.isDead);
    const team2Fighters = this.state.team2.players.filter(p => !p.isDead);

    // Calculate team power for objective fight (all players contribute)
    let team1Power = 0;
    for (const player of team1Fighters) {
      team1Power += player.attack + player.currentHealth / 10;
    }
    let team2Power = 0;
    for (const player of team2Fighters) {
      team2Power += player.attack + player.currentHealth / 10;
    }

    // Apply team buffs to power
    if (this.state.team1.dragonStacks > 0) {
      team1Power *= 1 + this.state.team1.dragonStacks * 0.05;
    }
    if (this.state.team1.baronBuff) {
      team1Power *= 1.2;
    }
    if (this.state.team2.dragonStacks > 0) {
      team2Power *= 1 + this.state.team2.dragonStacks * 0.05;
    }
    if (this.state.team2.baronBuff) {
      team2Power *= 1.2;
    }

    // Determine winner (with some randomness)
    const total = team1Power + team2Power;
    const team1Chance = total > 0 ? team1Power / total : 0.5;
    const winner = Math.random() < team1Chance ? 1 : 2;

    const winningTeam = winner === 1 ? this.state.team1 : this.state.team2;
    const losingTeam = winner === 1 ? this.state.team2 : this.state.team1;
    const winningFighters = winner === 1 ? team1Fighters : team2Fighters;
    const losingFighters = winner === 1 ? team2Fighters : team1Fighters;

    // TEAMFIGHT CASUALTIES: Both teams take heavy damage
    // Power difference determines how devastating the fight is
    const powerRatio = winner === 1
      ? (team2Power / (team1Power || 1))
      : (team1Power / (team2Power || 1));

    // Losing team: most/all players die or get heavily damaged
    for (const player of losingFighters) {
      // Higher chance to die if team was weaker
      const deathChance = 0.5 + (1 - powerRatio) * 0.3; // 50-80% base death chance
      if (Math.random() < deathChance) {
        player.isDead = true;
        player.currentHealth = 0;
        player.respawnTurn = this.state.currentTurn + 2;
        player.deaths++;

        // Random enemy gets the kill credit
        const aliveWinners = winningFighters.filter(p => !p.isDead);
        if (aliveWinners.length > 0) {
          const killer = aliveWinners[Math.floor(Math.random() * aliveWinners.length)];
          killer.kills++;
          killer.gold += KILL_GOLD;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${killer.name}이(가) ${player.name}을(를) 한타에서 처치했습니다! (+${KILL_GOLD}G)`,
          });
        } else {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${player.name}이(가) 한타에서 사망했습니다!`,
          });
        }
      } else {
        // Survived but heavily damaged (10-40% HP remaining)
        player.currentHealth = Math.floor(player.maxHealth * (0.1 + Math.random() * 0.3));
      }
    }

    // Winning team: some casualties too if it was close
    for (const player of winningFighters) {
      // Death chance based on how close the fight was
      const deathChance = powerRatio * 0.4; // 0-40% death chance based on enemy power
      if (Math.random() < deathChance) {
        player.isDead = true;
        player.currentHealth = 0;
        player.respawnTurn = this.state.currentTurn + 2;
        player.deaths++;

        // Random enemy gets the kill credit
        const aliveLosers = losingFighters.filter(p => !p.isDead);
        if (aliveLosers.length > 0) {
          const killer = aliveLosers[Math.floor(Math.random() * aliveLosers.length)];
          killer.kills++;
          killer.gold += KILL_GOLD;
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${killer.name}이(가) ${player.name}을(를) 한타에서 처치했습니다! (+${KILL_GOLD}G)`,
          });
        } else {
          events.push({
            turn: this.state.currentTurn,
            timestamp: Date.now(),
            type: 'KILL',
            message: `${player.name}이(가) 한타에서 사망했습니다!`,
          });
        }
      } else {
        // Survivors take some damage (30-80% HP remaining)
        const remainingHpPercent = 0.3 + Math.random() * 0.5;
        player.currentHealth = Math.min(
          player.currentHealth,
          Math.floor(player.maxHealth * remainingHpPercent)
        );
      }
    }

    // Give gold to winners
    this.giveTeamGold(winningTeam, EVENT_WIN_GOLD);

    let effect = '';

    switch (event) {
      case 'GRUB':
        winningTeam.grubBuff = true;
        effect = '포탑/넥서스 데미지 증가';
        break;
      case 'DRAGON':
        winningTeam.dragonStacks++;
        effect = `용 버프 ${winningTeam.dragonStacks}스택 (선수 공격력 증가)`;
        break;
      case 'HERALD':
        if (Math.random() < 0.7) {
          const tower = losingTeam.towers.find(t => !t.isDestroyed);
          if (tower) {
            tower.isDestroyed = true;
            tower.health = 0;
            effect = `${tower.lane} ${tower.position}차 포탑 파괴`;
          } else {
            effect = '전령 획득 (파괴할 포탑 없음)';
          }
        } else {
          effect = '전령 실패';
        }
        break;
      case 'BARON':
        winningTeam.baronBuff = true;
        winningTeam.baronBuffTurn = this.state.currentTurn; // Track when buff was obtained
        if (Math.random() < 0.5) {
          const tower = losingTeam.towers.find(t => !t.isDestroyed);
          if (tower) {
            tower.isDestroyed = true;
            tower.health = 0;
            effect = `바론 버프 (1턴) + ${tower.lane} ${tower.position}차 포탑 파괴`;
          } else {
            effect = '바론 버프 (1턴, 데미지 +20%)';
          }
        } else {
          effect = '바론 버프 (1턴, 데미지 +20%)';
        }
        break;
      case 'ELDER':
        winningTeam.elderBuff = true;
        winningTeam.elderBuffTurn = this.state.currentTurn; // Track when buff was obtained
        effect = '장로 버프 획득 (1턴, 10% 미만 체력 적 처형)';
        break;
    }

    events.push({
      turn: this.state.currentTurn,
      timestamp: Date.now(),
      type: 'OBJECTIVE',
      message: `Team ${winner}이(가) ${event} 획득! ${effect}`,
    });

    return { event, winner, effect };
  }

  private calculateObjectivePower(team: TeamState, actions: Map<number, PlayerAction>): number {
    let power = 0;

    for (const player of team.players) {
      if (player.isDead) continue;

      const action = actions.get(player.oderId);
      // Players not recalling contribute to objective
      if (action !== 'RECALL') {
        power += player.attack + player.currentHealth / 10;
      }
    }

    return power;
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
