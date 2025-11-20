import { PlayerState, TeamState, MatchLog, Champion, SkillState } from './types';

// Champion data (should match database)
export const CHAMPIONS: Record<number, Champion> = {
  1: { id: 1, name: '몽크', skillName: '지혜', skillDescription: '전 인원에게 보호막', cooldown: 5, scalingType: 'AD', championClass: 'TANK', valueLevel1: 300, valueLevel2: 600, valueLevel3: 900, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  2: { id: 2, name: '데니스', skillName: '참수', skillDescription: 'N명에게 CC기', cooldown: 7, scalingType: 'AD', championClass: 'BRUISER', valueLevel1: 1, valueLevel2: 3, valueLevel3: 5, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  3: { id: 3, name: '리리스', skillName: '데롱데롱', skillDescription: '30% 확률로 수면, N% 추가 데미지', cooldown: 3, scalingType: 'AP', championClass: 'BRUISER', valueLevel1: 200, valueLevel2: 300, valueLevel3: 400, extraParam1: 30, extraParam2: 0, extraParam3: 0, isOneTime: false },
  4: { id: 4, name: '볼리베스', skillName: '아 볼리베스,,,', skillDescription: '잃은 체력 N% 회복', cooldown: 4, scalingType: 'AD', championClass: 'TANK', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  5: { id: 5, name: '징쉰차오', skillName: '짜장배달', skillDescription: '모든 라인에 영향', cooldown: 2, scalingType: 'AD', championClass: 'BRUISER', valueLevel1: 100, valueLevel2: 150, valueLevel3: 200, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  6: { id: 6, name: '뽀뽀', skillName: '괴롭히기', skillDescription: 'N% 확률로 N턴 이동 불가', cooldown: 3, scalingType: 'AD', championClass: 'TANK', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 1, extraParam2: 2, extraParam3: 3, isOneTime: false },
  7: { id: 7, name: '바미르', skillName: '시야잠수', skillDescription: '랜덤 1명 행동 불가', cooldown: 4, scalingType: 'AD', championClass: 'ASSASSIN', valueLevel1: 1, valueLevel2: 1, valueLevel3: 1, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  8: { id: 8, name: '엘리제', skillName: '띠리리', skillDescription: '1명 확정 CC, 강제 귀환', cooldown: 5, scalingType: 'AD', championClass: 'ASSASSIN', valueLevel1: 1, valueLevel2: 1, valueLevel3: 1, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  9: { id: 9, name: '베르베르', skillName: '다른 세계관', skillDescription: '체력 N% 비례 공격력 증가', cooldown: 2, scalingType: 'AD', championClass: 'DEALER', valueLevel1: 5, valueLevel2: 10, valueLevel3: 15, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  10: { id: 10, name: '추엉구엥', skillName: '오리덥석', skillDescription: '우리팀 보호막, 상대 스킬 불가', cooldown: 3, scalingType: 'AP', championClass: 'DEALER', valueLevel1: 5, valueLevel2: 5, valueLevel3: 5, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  11: { id: 11, name: '리딩스쿼시', skillName: '멍청이', skillDescription: '공격력 N% 증가', cooldown: 2, scalingType: 'AD', championClass: 'DEALER', valueLevel1: 30, valueLevel2: 40, valueLevel3: 50, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  12: { id: 12, name: '주', skillName: '부활', skillDescription: '즉시 부활', cooldown: 5, scalingType: 'AP', championClass: 'DEALER', valueLevel1: 100, valueLevel2: 100, valueLevel3: 100, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  13: { id: 13, name: '비르레인', skillName: '니 스킬 내꺼다', skillDescription: '상대 스킬 탈취', cooldown: 3, scalingType: 'AP', championClass: 'BRUISER', valueLevel1: 1, valueLevel2: 1, valueLevel3: 1, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  14: { id: 14, name: '재헌', skillName: '아 시발, 난 싫어.', skillDescription: '상대 AD 있으면 AP 딜 N% 증가', cooldown: 2, scalingType: 'AP', championClass: 'DEALER', valueLevel1: 3, valueLevel2: 5, valueLevel3: 10, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  15: { id: 15, name: '쟌슨', skillName: '어어, 가기싫어요.', skillDescription: '상대 전원 귀환', cooldown: 15, scalingType: 'AP', championClass: 'DEALER', valueLevel1: 1, valueLevel2: 1, valueLevel3: 1, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  16: { id: 16, name: '코멜', skillName: '땅땅땅빵', skillDescription: '모두에게 고정 데미지', cooldown: 4, scalingType: 'AD', championClass: 'RANGED_DEALER', valueLevel1: 4, valueLevel2: 44, valueLevel3: 444, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  17: { id: 17, name: '하균', skillName: '쓰로잉', skillDescription: '50% 적딜/팀딜', cooldown: 3, scalingType: 'AD', championClass: 'RANGED_DEALER', valueLevel1: 300, valueLevel2: 500, valueLevel3: 1000, extraParam1: 200, extraParam2: 400, extraParam3: 800, isOneTime: false },
  18: { id: 18, name: '다르미난', skillName: '피 존나맛있노', skillDescription: '공격력 비례 확률 피흡', cooldown: 4, scalingType: 'AD', championClass: 'RANGED_DEALER', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 300, extraParam2: 400, extraParam3: 500, isOneTime: false },
  19: { id: 19, name: '쨔스', skillName: '아 이거 터집니다~', skillDescription: '3~5명에게 AP% 마법 딜', cooldown: 3, scalingType: 'AP', championClass: 'RANGED_AP', valueLevel1: 100, valueLevel2: 200, valueLevel3: 300, extraParam1: 3, extraParam2: 5, extraParam3: 0, isOneTime: false },
  20: { id: 20, name: '체스터', skillName: '떙큐', skillDescription: 'N% 확률 골드 강탈', cooldown: 1, scalingType: 'AD', championClass: 'RANGED_DEALER', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 300, extraParam2: 600, extraParam3: 900, isOneTime: false },
  21: { id: 21, name: '토마', skillName: '세르피셀의 지팡이', skillDescription: 'AP% 원딜 보호막', cooldown: 3, scalingType: 'AP', championClass: 'SUPPORT', valueLevel1: 100, valueLevel2: 300, valueLevel3: 500, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  22: { id: 22, name: '참치', skillName: '싱싱불어라', skillDescription: '적 CC, 아군 공격력 버프', cooldown: 3, scalingType: 'AP', championClass: 'SUPPORT', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 1, extraParam2: 5, extraParam3: 0, isOneTime: false },
  23: { id: 23, name: '미지온', skillName: 'THINK', skillDescription: '다음 턴 공격력 영구 증가', cooldown: 2, scalingType: 'AD', championClass: 'SUPPORT', valueLevel1: 10, valueLevel2: 20, valueLevel3: 30, extraParam1: 0, extraParam2: 0, extraParam3: 0, isOneTime: false },
  24: { id: 24, name: '김승진', skillName: '아, 하고싶다.', skillDescription: '원딜 전담마크, 딜 영구 감소', cooldown: 99, scalingType: 'AD', championClass: 'TANK', valueLevel1: 1, valueLevel2: 2, valueLevel3: 3, extraParam1: 5, extraParam2: 10, extraParam3: 13, isOneTime: true },
};

// Get skill value based on skill level
export function getSkillValue(champion: Champion, skillLevel: number): number {
  switch (skillLevel) {
    case 1: return champion.valueLevel1;
    case 2: return champion.valueLevel2;
    case 3: return champion.valueLevel3;
    default: return 0;
  }
}

export function getExtraParam(champion: Champion, skillLevel: number): number {
  switch (skillLevel) {
    case 1: return champion.extraParam1;
    case 2: return champion.extraParam2;
    case 3: return champion.extraParam3;
    default: return 0;
  }
}

// Calculate skill level based on player level
export function calculateSkillLevel(playerLevel: number): 0 | 1 | 2 | 3 {
  if (playerLevel >= 18) return 3;
  if (playerLevel >= 12) return 2;
  if (playerLevel >= 6) return 1;
  return 0;
}

// Process skill for a player
export function processSkill(
  player: PlayerState,
  allyTeam: TeamState,
  enemyTeam: TeamState,
  events: MatchLog[],
  turn: number,
  targetId?: number
): void {
  if (!player.skill || !player.championId) return;

  const champion = CHAMPIONS[player.championId];
  if (!champion) return;

  // Check if skill is ready
  if (player.skill.currentCooldown > 0) return;
  if (champion.isOneTime && player.skill.hasBeenUsed) return;
  if (player.skill.skillLevel === 0) return;

  const skillValue = getSkillValue(champion, player.skill.skillLevel);
  const extraParam = getExtraParam(champion, player.skill.skillLevel);

  // Process skill based on champion ID
  switch (player.championId) {
    case 1: // 몽크 - 지혜: 전 인원 보호막
      processMonkSkill(player, allyTeam, skillValue, events, turn);
      break;
    case 2: // 데니스 - 참수: N명 CC
      processDennisSkill(player, enemyTeam, skillValue, events, turn);
      break;
    case 3: // 리리스 - 데롱데롱: 수면 + 추가 데미지
      processLilithSkill(player, enemyTeam, skillValue, extraParam, events, turn);
      break;
    case 4: // 볼리베스 - 잃은 체력 회복
      processVolibesSkill(player, skillValue, events, turn);
      break;
    case 5: // 징쉰차오 - 짜장배달: 모든 라인 데미지
      processJingxinchaoSkill(player, enemyTeam, skillValue, events, turn);
      break;
    case 6: // 뽀뽀 - 괴롭히기: 이동 불가
      processPpoSkill(player, enemyTeam, skillValue, extraParam, targetId, events, turn);
      break;
    case 7: // 바미르 - 시야잠수: 랜덤 1명 행동 불가
      processBamirSkill(player, enemyTeam, events, turn);
      break;
    case 8: // 엘리제 - 띠리리: 강제 귀환
      processEliseSkill(player, enemyTeam, targetId, events, turn);
      break;
    case 9: // 베르베르 - 다른 세계관: 체력 비례 공격력
      processBerberSkill(player, skillValue, events, turn);
      break;
    case 10: // 추엉구엥 - 오리덥석: 팀 보호막, 적 스킬 불가
      processChueongSkill(player, allyTeam, enemyTeam, skillValue, events, turn);
      break;
    case 11: // 리딩스쿼시 - 멍청이: 공격력 증가
      processReadingSquashSkill(player, skillValue, events, turn);
      break;
    case 12: // 주 - 부활: 즉시 부활
      processJuSkill(player, events, turn);
      break;
    case 13: // 비르레인 - 니 스킬 내꺼다: 스킬 탈취
      processBirleinSkill(player, enemyTeam, events, turn);
      break;
    case 14: // 재헌 - AP 딜 증가
      processJaeheonSkill(player, enemyTeam, skillValue, events, turn);
      break;
    case 15: // 쟌슨 - 상대 전원 귀환
      processJansonSkill(player, enemyTeam, events, turn);
      break;
    case 16: // 코멜 - 고정 데미지
      processKomelSkill(player, enemyTeam, skillValue, events, turn);
      break;
    case 17: // 하균 - 쓰로잉
      processHagyunSkill(player, allyTeam, enemyTeam, skillValue, extraParam, events, turn);
      break;
    case 18: // 다르미난 - 피흡
      processDarminanSkill(player, enemyTeam, skillValue, extraParam, events, turn);
      break;
    case 19: // 쨔스 - AP 마법 딜
      processJjasSkill(player, enemyTeam, skillValue, events, turn);
      break;
    case 20: // 체스터 - 골드 강탈
      processChesterSkill(player, enemyTeam, skillValue, extraParam, events, turn);
      break;
    case 21: // 토마 - 원딜 보호막
      processTomaSkill(player, allyTeam, skillValue, events, turn);
      break;
    case 22: // 참치 - CC + 버프
      processTunaSkill(player, allyTeam, enemyTeam, skillValue, events, turn);
      break;
    case 23: // 미지온 - 공격력 영구 증가
      processMizionSkill(player, skillValue, events, turn);
      break;
    case 24: // 김승진 - 원딜 딜 감소
      processKimSeungjinSkill(player, enemyTeam, skillValue, extraParam, events, turn);
      break;
  }

  // Set cooldown and mark as used
  player.skill.currentCooldown = champion.cooldown;
  if (champion.isOneTime) {
    player.skill.hasBeenUsed = true;
  }
}

// Individual skill implementations
function processMonkSkill(player: PlayerState, team: TeamState, value: number, events: MatchLog[], turn: number) {
  for (const ally of team.players) {
    if (!ally.isDead) {
      ally.buffs.push({ type: 'SHIELD', value, duration: 1 });
    }
  }
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 지혜를 사용! 전 인원에게 ${value} 보호막!` });
}

function processDennisSkill(player: PlayerState, enemyTeam: TeamState, ccCount: number, events: MatchLog[], turn: number) {
  const targets = enemyTeam.players.filter(p => !p.isDead).slice(0, ccCount);
  for (const target of targets) {
    target.debuffs.push({ type: 'STUN', value: 1, duration: 1 });
  }
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 참수를 사용! ${targets.length}명에게 CC!` });
}

function processLilithSkill(player: PlayerState, enemyTeam: TeamState, damagePercent: number, sleepChance: number, events: MatchLog[], turn: number) {
  for (const enemy of enemyTeam.players) {
    if (!enemy.isDead && Math.random() * 100 < sleepChance) {
      const damage = Math.floor(player.abilityPower * (damagePercent / 100));
      enemy.currentHealth = Math.max(0, enemy.currentHealth - damage);
      enemy.debuffs.push({ type: 'SLEEP', value: 1, duration: 1 });
      events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${enemy.name}이(가) 수면에 걸려 ${damage} 데미지!` });
    }
  }
}

function processVolibesSkill(player: PlayerState, healPercent: number, events: MatchLog[], turn: number) {
  const lostHealth = player.maxHealth - player.currentHealth;
  const heal = Math.floor(lostHealth * (healPercent / 100));
  player.currentHealth = Math.min(player.maxHealth, player.currentHealth + heal);
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 잃은 체력의 ${healPercent}% (${heal}) 회복!` });
}

function processJingxinchaoSkill(player: PlayerState, enemyTeam: TeamState, damage: number, events: MatchLog[], turn: number) {
  for (const enemy of enemyTeam.players) {
    if (!enemy.isDead) {
      enemy.currentHealth = Math.max(0, enemy.currentHealth - damage);
    }
  }
  events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) 짜장배달! 모든 라인에 ${damage} 데미지!` });
}

function processPpoSkill(player: PlayerState, enemyTeam: TeamState, chance: number, duration: number, targetId: number | undefined, events: MatchLog[], turn: number) {
  const target = targetId ? enemyTeam.players.find(p => p.oderId === targetId) : enemyTeam.players.find(p => !p.isDead);
  if (target && Math.random() * 100 < chance) {
    target.debuffs.push({ type: 'ROOT', value: 1, duration });
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${target.name}이(가) ${duration}턴 동안 이동 불가!` });
  }
}

function processBamirSkill(player: PlayerState, enemyTeam: TeamState, events: MatchLog[], turn: number) {
  const aliveEnemies = enemyTeam.players.filter(p => !p.isDead);
  if (aliveEnemies.length > 0) {
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    target.debuffs.push({ type: 'SILENCE', value: 1, duration: 1 });
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 시야잠수! ${target.name} 행동 불가!` });
  }
}

function processEliseSkill(player: PlayerState, enemyTeam: TeamState, targetId: number | undefined, events: MatchLog[], turn: number) {
  const target = targetId ? enemyTeam.players.find(p => p.oderId === targetId) : enemyTeam.players.find(p => !p.isDead);
  if (target) {
    target.isRecalling = true;
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 띠리리! ${target.name} 강제 귀환!` });
  }
}

function processBerberSkill(player: PlayerState, healthPercent: number, events: MatchLog[], turn: number) {
  const attackBonus = Math.floor(player.maxHealth * (healthPercent / 100));
  player.attack += attackBonus;
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 체력 비례 공격력 +${attackBonus}!` });
}

function processChueongSkill(player: PlayerState, allyTeam: TeamState, enemyTeam: TeamState, shieldPercent: number, events: MatchLog[], turn: number) {
  for (const ally of allyTeam.players) {
    if (!ally.isDead) {
      const shield = Math.floor(ally.maxHealth * (shieldPercent / 100));
      ally.buffs.push({ type: 'SHIELD', value: shield, duration: 1 });
    }
  }
  for (const enemy of enemyTeam.players) {
    enemy.debuffs.push({ type: 'SILENCE', value: 1, duration: 1 });
  }
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 오리덥석! 아군 보호막, 적 스킬 불가!` });
}

function processReadingSquashSkill(player: PlayerState, attackPercent: number, events: MatchLog[], turn: number) {
  const attackBonus = Math.floor(player.attack * (attackPercent / 100));
  player.attack += attackBonus;
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 공격력 ${attackPercent}% 증가! (+${attackBonus})` });
}

function processJuSkill(player: PlayerState, events: MatchLog[], turn: number) {
  if (player.isDead) {
    player.isDead = false;
    player.currentHealth = player.maxHealth;
    player.respawnTurn = 0;
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 부활!` });
  }
}

function processBirleinSkill(player: PlayerState, enemyTeam: TeamState, events: MatchLog[], turn: number) {
  // Find enemy who used skill this turn and copy it
  const enemyWithSkill = enemyTeam.players.find(p => p.skill && p.skill.currentCooldown === CHAMPIONS[p.championId!]?.cooldown);
  if (enemyWithSkill && enemyWithSkill.championId) {
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) ${enemyWithSkill.name}의 스킬을 탈취!` });
    // Copy the skill effect would be complex - simplified version
  }
}

function processJaeheonSkill(player: PlayerState, enemyTeam: TeamState, apBonus: number, events: MatchLog[], turn: number) {
  const hasAD = enemyTeam.players.some(p => p.attack > p.abilityPower);
  if (hasAD) {
    player.abilityPower = Math.floor(player.abilityPower * (1 + apBonus / 100));
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) AP ${apBonus}% 증가!` });
  }
}

function processJansonSkill(player: PlayerState, enemyTeam: TeamState, events: MatchLog[], turn: number) {
  for (const enemy of enemyTeam.players) {
    if (!enemy.isDead) {
      enemy.isRecalling = true;
    }
  }
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 상대 전원 강제 귀환!` });
}

function processKomelSkill(player: PlayerState, enemyTeam: TeamState, fixedDamage: number, events: MatchLog[], turn: number) {
  for (const enemy of enemyTeam.players) {
    if (!enemy.isDead) {
      enemy.currentHealth = Math.max(0, enemy.currentHealth - fixedDamage);
    }
  }
  events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) 땅땅땅빵! 전원에게 ${fixedDamage} 고정 데미지!` });
}

function processHagyunSkill(player: PlayerState, allyTeam: TeamState, enemyTeam: TeamState, enemyDamage: number, allyDamage: number, events: MatchLog[], turn: number) {
  if (Math.random() < 0.5) {
    for (const enemy of enemyTeam.players) {
      if (!enemy.isDead) {
        enemy.currentHealth = Math.max(0, enemy.currentHealth - enemyDamage);
      }
    }
    events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) 쓰로잉 성공! 적 전원에게 ${enemyDamage} 데미지!` });
  } else {
    for (const ally of allyTeam.players) {
      if (!ally.isDead && ally.oderId !== player.oderId) {
        ally.currentHealth = Math.max(0, ally.currentHealth - allyDamage);
      }
    }
    events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) 쓰로잉 실패! 아군에게 ${allyDamage} 데미지!` });
  }
}

function processDarminanSkill(player: PlayerState, enemyTeam: TeamState, chance: number, fixedDamage: number, events: MatchLog[], turn: number) {
  if (Math.random() * 100 < chance) {
    let totalHealed = 0;
    for (const enemy of enemyTeam.players) {
      if (!enemy.isDead) {
        enemy.currentHealth = Math.max(0, enemy.currentHealth - fixedDamage);
        totalHealed += fixedDamage;
      }
    }
    player.currentHealth = Math.min(player.maxHealth, player.currentHealth + totalHealed);
    events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) 피흡! 전원에게 ${fixedDamage} 데미지, ${totalHealed} 회복!` });
  }
}

function processJjasSkill(player: PlayerState, enemyTeam: TeamState, apPercent: number, events: MatchLog[], turn: number) {
  const targetCount = 3 + Math.floor(Math.random() * 3); // 3-5
  const targets = enemyTeam.players.filter(p => !p.isDead).slice(0, targetCount);
  const damage = Math.floor(player.abilityPower * (apPercent / 100));
  for (const target of targets) {
    target.currentHealth = Math.max(0, target.currentHealth - damage);
  }
  events.push({ turn, timestamp: Date.now(), type: 'COMBAT', message: `${player.name}이(가) ${targets.length}명에게 ${damage} 마법 데미지!` });
}

function processChesterSkill(player: PlayerState, enemyTeam: TeamState, chance: number, goldAmount: number, events: MatchLog[], turn: number) {
  if (Math.random() * 100 < chance) {
    const target = enemyTeam.players.find(p => !p.isDead && p.gold >= goldAmount);
    if (target) {
      target.gold -= goldAmount;
      player.gold += goldAmount;
      events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) ${target.name}에게서 ${goldAmount} 골드 강탈!` });
    }
  }
}

function processTomaSkill(player: PlayerState, allyTeam: TeamState, apPercent: number, events: MatchLog[], turn: number) {
  const adc = allyTeam.players.find(p => p.position === 'ADC' && !p.isDead);
  if (adc) {
    const shield = Math.floor(player.abilityPower * (apPercent / 100));
    adc.buffs.push({ type: 'SHIELD', value: shield, duration: 1 });
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) ${adc.name}에게 ${shield} 보호막!` });
  }
}

function processTunaSkill(player: PlayerState, allyTeam: TeamState, enemyTeam: TeamState, buffPercent: number, events: MatchLog[], turn: number) {
  const ccCount = 1 + Math.floor(Math.random() * 5);
  const buffCount = 1 + Math.floor(Math.random() * 5);

  const enemies = enemyTeam.players.filter(p => !p.isDead).slice(0, ccCount);
  for (const enemy of enemies) {
    enemy.debuffs.push({ type: 'SLOW', value: 50, duration: 1 });
  }

  const allies = allyTeam.players.filter(p => !p.isDead).slice(0, buffCount);
  for (const ally of allies) {
    const attackBuff = Math.floor(player.abilityPower * (buffPercent / 100));
    ally.attack += attackBuff;
  }

  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) 싱싱불어라! ${enemies.length}명 CC, ${allies.length}명 버프!` });
}

function processMizionSkill(player: PlayerState, attackBonus: number, events: MatchLog[], turn: number) {
  player.buffs.push({ type: 'THINK', value: attackBonus, duration: 999 }); // Permanent
  player.baseAttack += attackBonus;
  events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) THINK! 다음 턴부터 공격력 +${attackBonus} 영구 증가!` });
}

function processKimSeungjinSkill(player: PlayerState, enemyTeam: TeamState, duration: number, attackReduction: number, events: MatchLog[], turn: number) {
  const adc = enemyTeam.players.find(p => p.position === 'ADC');
  if (adc) {
    adc.debuffs.push({ type: 'MARK', value: attackReduction, duration });
    adc.baseAttack = Math.max(0, adc.baseAttack - attackReduction);
    events.push({ turn, timestamp: Date.now(), type: 'ACTION', message: `${player.name}이(가) ${adc.name} 전담마크! 공격력 -${attackReduction} 영구 감소!` });
  }
}

// Update skill cooldowns at end of turn
export function updateSkillCooldowns(team: TeamState) {
  for (const player of team.players) {
    if (player.skill && player.skill.currentCooldown > 0) {
      player.skill.currentCooldown--;
    }
    // Update skill level based on player level
    if (player.skill) {
      player.skill.skillLevel = calculateSkillLevel(player.level);
    }
  }
}

// Check if skill is ready
export function isSkillReady(player: PlayerState): boolean {
  if (!player.skill || !player.championId) return false;
  if (player.skill.currentCooldown > 0) return false;
  if (player.skill.skillLevel === 0) return false;

  const champion = CHAMPIONS[player.championId];
  if (champion?.isOneTime && player.skill.hasBeenUsed) return false;

  return true;
}
