import { Item } from './types';

export const ITEMS: Record<string, Item> = {
  // ========== CONSUMABLES (50 Gold) ==========
  health_potion: {
    id: 'health_potion',
    name: '체력 물약',
    cost: 50,
    tier: 'CONSUMABLE',
    restriction: 'NONE',
    effects: {
      health: 10, // 10% heal on use
    },
    description: '체력을 10% 회복합니다.',
    icon: '/items/health_potion.png',
  },
  control_ward: {
    id: 'control_ward',
    name: '제어 와드',
    cost: 50,
    tier: 'CONSUMABLE',
    restriction: 'NONE',
    effects: {},
    description: '상대방의 라인 한 곳을 1턴 동안 감시합니다.',
    icon: '/items/control_ward.png',
  },

  // ========== BASIC ITEMS (300 Gold) ==========
  amplifying_tome: {
    id: 'amplifying_tome',
    name: '증폭의 서',
    cost: 300,
    tier: 'BASIC',
    restriction: 'MID_SUPPORT',
    effects: {
      abilityPower: 20,
    },
    description: '마법력 +20 (미드: 대미지, 서폿: 힐/보호막)',
    icon: '/items/amplifying_tome.png',
  },
  dorans_ring: {
    id: 'dorans_ring',
    name: '도란의 반지',
    cost: 300,
    tier: 'BASIC',
    restriction: 'MID_SUPPORT',
    effects: {
      abilityPower: 15,
      skillHaste: 0.2,
    },
    description: '마법력 +15, 스킬 턴 0.2 단축',
    icon: '/items/dorans_ring.png',
  },
  dorans_blade: {
    id: 'dorans_blade',
    name: '도란의 검',
    cost: 300,
    tier: 'BASIC',
    restriction: 'NONE',
    effects: {
      attack: 2,
      lifeSteal: 1,
    },
    description: '공격력 +2, 공격 피해 비례 피 회복 1%',
    icon: '/items/dorans_blade.png',
  },
  cloth_armor: {
    id: 'cloth_armor',
    name: '천 갑옷',
    cost: 300,
    tier: 'BASIC',
    restriction: 'NONE',
    effects: {
      defense: 3,
    },
    description: '방어력 +3',
    icon: '/items/cloth_armor.png',
  },
  broken_stopwatch: {
    id: 'broken_stopwatch',
    name: '부서진 시계',
    cost: 300,
    tier: 'BASIC',
    restriction: 'NONE',
    effects: {
      evasion: 2,
    },
    description: '회피력 +2',
    icon: '/items/broken_stopwatch.png',
  },

  // ========== INTERMEDIATE ITEMS (1000 Gold) ==========
  blasting_wand: {
    id: 'blasting_wand',
    name: '폭발 마법봉',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'MID_SUPPORT',
    effects: {
      abilityPower: 40,
    },
    description: '마법력 +40',
    icon: '/items/blasting_wand.png',
  },
  lost_chapter: {
    id: 'lost_chapter',
    name: '잃어버린 챕터',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'MID_SUPPORT',
    buildsFrom: ['amplifying_tome'],
    effects: {
      abilityPower: 35,
      skillHaste: 0.5,
    },
    description: '마법력 +35, 스킬 가속 0.5',
    icon: '/items/lost_chapter.png',
  },
  fiendish_codex: {
    id: 'fiendish_codex',
    name: '사악한 고서',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'MID_SUPPORT',
    effects: {
      abilityPower: 30,
      skillHaste: 1,
    },
    description: '마법력 +30, 스킬 가속 1',
    icon: '/items/fiendish_codex.png',
  },
  boots: {
    id: 'boots',
    name: '장화',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      speed: 3,
    },
    description: '이속 +3 (먼저 공격할 가능성 증가)',
    icon: '/items/boots.png',
  },
  executioners_calling: {
    id: 'executioners_calling',
    name: '처형인의 대검',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 5,
      healReduction: 20,
    },
    description: '공격력 +5, 상대방 피 회복 20% 감소',
    icon: '/items/executioners_calling.png',
  },
  vampiric_scepter: {
    id: 'vampiric_scepter',
    name: '흡혈의 낫',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 3,
      lifeSteal: 10,
    },
    description: '공격력 +3, 피해의 10% 회복',
    icon: '/items/vampiric_scepter.png',
  },
  glowing_sword: {
    id: 'glowing_sword',
    name: '광휘의 검',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 5,
      skillHaste: 1,
    },
    description: '공격력 +5, 스킬 1턴 단축',
    icon: '/items/glowing_sword.png',
  },
  caulfields_warhammer: {
    id: 'caulfields_warhammer',
    name: '콜필드의 전투 망치',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 3,
      skillHaste: 1.5,
    },
    description: '공격력 +3, 스킬 1.5턴 단축',
    icon: '/items/caulfields_warhammer.png',
  },
  tunneler: {
    id: 'tunneler',
    name: '땅굴 채굴기',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 3,
      health: 50,
    },
    description: '공격력 +3, 체력 +50',
    icon: '/items/tunneler.png',
  },
  tiamat: {
    id: 'tiamat',
    name: '티아멧',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 5,
      aoePercent: 10,
    },
    description: '공격력 +5, 한타 시 여러 선수에게 10% 딜',
    icon: '/items/tiamat.png',
  },
  hexdrinker: {
    id: 'hexdrinker',
    name: '주문포식자',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'NONE',
    effects: {
      attack: 6,
      shieldPercent: 5,
    },
    description: '공격력 +6, 체력의 5% 보호막 생성',
    icon: '/items/hexdrinker.png',
  },

  // ADC INTERMEDIATE (1000 Gold)
  hearthbound_axe: {
    id: 'hearthbound_axe',
    name: '온기가 필요한 자의 도끼',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 5,
      speed: 2,
    },
    description: '공격력 +5, 이속 +2',
    icon: '/items/hearthbound_axe.png',
  },
  zeal: {
    id: 'zeal',
    name: '열정의 검',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 3,
      speed: 3,
      critChance: 1,
    },
    description: '공격력 +3, 이속 +3, 치명타 1%',
    icon: '/items/zeal.png',
  },
  recurve_bow: {
    id: 'recurve_bow',
    name: '곡궁',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 1,
      speed: 5,
      evasion: 1,
    },
    description: '공격력 +1, 이속 +5, 회피력 +1',
    icon: '/items/recurve_bow.png',
  },
  noonquiver: {
    id: 'noonquiver',
    name: '절정의 화살',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 2,
      speed: 3,
      critChance: 5,
    },
    description: '공격력 +2, 이속 +3, 치명타 5%',
    icon: '/items/noonquiver.png',
  },
  kircheis_shard: {
    id: 'kircheis_shard',
    name: '마법공학 교류 발전기',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 3,
      onHitDamage: 5,
    },
    description: '공격력 +3, 1턴마다 추가 피해 5%',
    icon: '/items/kircheis_shard.png',
  },
  pickaxe: {
    id: 'pickaxe',
    name: '곡괭이',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 7,
    },
    description: '공격력 +7',
    icon: '/items/pickaxe.png',
  },

  // SUPPORT INTERMEDIATE (1000 Gold)
  minjun_necklace: {
    id: 'minjun_necklace',
    name: '박민준이 쓰던 목걸이',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'SUPPORT_ONLY',
    effects: {
      teamSpeedBuff: 1,
      skillHaste: 0.25,
    },
    description: '모든 팀원 이속 +1, 자신의 스킬 0.25턴 단축',
    icon: '/items/minjun_necklace.png',
  },
  dorans_diamond: {
    id: 'dorans_diamond',
    name: '도란의 반지 다이아몬드',
    cost: 1000,
    tier: 'INTERMEDIATE',
    restriction: 'SUPPORT_ONLY',
    buildsFrom: ['dorans_ring'],
    effects: {
      adcShieldPercent: 30,
    },
    description: 'ADC 피해 시 자신의 체력 비례 30% 보호막 부여',
    icon: '/items/dorans_diamond.png',
  },

  // ========== LEGENDARY ITEMS (3000 Gold) ==========
  // AP LEGENDARY (MID/SUPPORT)
  rabadons_deathcap: {
    id: 'rabadons_deathcap',
    name: '라바돈의 죽음모자',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'MID_SUPPORT',
    buildsFrom: ['blasting_wand', 'blasting_wand'],
    effects: {
      abilityPower: 120,
      // Special: +30% total AP
    },
    description: '마법력 +120, 총 마법력 30% 증가',
    icon: '/items/rabadons_deathcap.png',
  },
  ludens_tempest: {
    id: 'ludens_tempest',
    name: '루덴의 폭풍',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'MID_ONLY',
    buildsFrom: ['lost_chapter'],
    effects: {
      abilityPower: 80,
      skillHaste: 1,
      aoePercent: 15,
    },
    description: '마법력 +80, 스킬 가속 1, AOE 15%',
    icon: '/items/ludens_tempest.png',
  },
  shadowflame: {
    id: 'shadowflame',
    name: '암흑불꽃',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'MID_ONLY',
    buildsFrom: ['blasting_wand', 'amplifying_tome'],
    effects: {
      abilityPower: 100,
      armorPen: 10,
    },
    description: '마법력 +100, 마법 관통력 +10',
    icon: '/items/shadowflame.png',
  },
  horizon_focus: {
    id: 'horizon_focus',
    name: '지평선의 초점',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'MID_ONLY',
    buildsFrom: ['fiendish_codex', 'blasting_wand'],
    effects: {
      abilityPower: 85,
      health: 100,
      skillHaste: 1.5,
    },
    description: '마법력 +85, 체력 +100, 스킬 가속 1.5',
    icon: '/items/horizon_focus.png',
  },
  moonstone_renewer: {
    id: 'moonstone_renewer',
    name: '달빛 재생',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    buildsFrom: ['fiendish_codex'],
    effects: {
      abilityPower: 60,
      health: 150,
      healAllyPercent: 8,
    },
    description: '마법력 +60, 체력 +150, 팀원 회복 8%',
    icon: '/items/moonstone_renewer.png',
  },

  trinity_force: {
    id: 'trinity_force',
    name: '삼위일체',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['hearthbound_axe'],
    effects: {
      attack: 13,
      health: 33,
      speed: 3,
      skillHaste: 0.3,
      weakenOnHit: true,
    },
    description: '공격력 +13, 체력 +33, 이속 +3, 스킬 가속 0.3, 공격 시 나약함 부여 (방어력 -10%)',
    icon: '/items/trinity_force.png',
  },
  blade_of_ruined_king: {
    id: 'blade_of_ruined_king',
    name: '몰락한 왕의 검',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['vampiric_scepter'],
    effects: {
      attack: 15,
      lifeSteal: 15,
      weakenOnHit: true,
    },
    description: '공격력 +15, 피해의 15% 회복, 나약함 부여',
    icon: '/items/blade_of_ruined_king.png',
  },
  minjun_boots: {
    id: 'minjun_boots',
    name: '박민준이 만든 장화',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['boots'],
    effects: {
      speed: 10,
      attack: 5,
      ignoreWeaken: true,
    },
    description: '이속 +10, 공격력 +5, 나약함 무시',
    icon: '/items/minjun_boots.png',
  },
  sorcerers_final: {
    id: 'sorcerers_final',
    name: '마법사의 최후',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['recurve_bow', 'recurve_bow'],
    effects: {
      speed: 15,
      ignoreWeaken: true,
    },
    description: '이속 +15, 나약함 무시',
    icon: '/items/sorcerers_final.png',
  },
  eclipse: {
    id: 'eclipse',
    name: '월식',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['caulfields_warhammer', 'pickaxe'],
    effects: {
      attack: 25,
      skillHaste: 0.2,
      shieldPercent: 10,
    },
    description: '공격력 +25, 스킬 가속 0.2, 1턴마다 공격력 비례 보호막',
    icon: '/items/eclipse.png',
  },
  muramana: {
    id: 'muramana',
    name: '무라마나',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    effects: {
      attack: 3,
      skillHaste: 0.5,
      stackingAttack: 3,
      maxStacks: 17, // Max +51 attack
    },
    description: '공격력 +3, 스킬 가속 0.5, 1턴마다 공격력 +3 (최대 +51)',
    icon: '/items/muramana.png',
  },
  chempunk_chainsword: {
    id: 'chempunk_chainsword',
    name: '화공 펑크 사슬검',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    effects: {
      attack: 10,
      skillHaste: 0.3,
      health: 100,
      healReduction: 30,
    },
    description: '공격력 +10, 스킬 가속 0.3, 체력 +100, 상대 회복 30% 방해',
    icon: '/items/chempunk_chainsword.png',
  },
  spear_of_shojin: {
    id: 'spear_of_shojin',
    name: '쇼진의 창',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['pickaxe', 'tunneler'],
    effects: {
      attack: 20,
      skillHaste: 0.5,
      onHitDamage: 10, // Stacks 3 times
      maxStacks: 3,
    },
    description: '공격력 +20, 공격 시 스킬 가속 0.5턴, 공격당 +10% 딜 (최대 3중첩)',
    icon: '/items/spear_of_shojin.png',
  },
  shattered_sky: {
    id: 'shattered_sky',
    name: '갈라진 하늘',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['caulfields_warhammer', 'tunneler'],
    effects: {
      attack: 25,
      health: 100,
      critChance: 100, // Always crit
      stackingAttack: 5, // +5% per turn
      lifeSteal: 6, // Based on lost health
    },
    description: '공격력 +25, 체력 +100, 항상 치명타, 턴당 +5% 딜, 잃은 체력 6% 회복',
    icon: '/items/shattered_sky.png',
  },
  ravenous_hydra: {
    id: 'ravenous_hydra',
    name: '굶주린 히드라',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['tiamat', 'vampiric_scepter'],
    effects: {
      attack: 20,
      lifeSteal: 10,
      aoePercent: 10,
    },
    description: '공격력 +20, 생명력 흡수 10%, 여러명에게 10% 딜',
    icon: '/items/ravenous_hydra.png',
  },
  titanic_hydra: {
    id: 'titanic_hydra',
    name: '거대한 히드라',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    buildsFrom: ['tiamat', 'tunneler'],
    effects: {
      attack: 20,
      health: 300,
      aoePercent: 10,
    },
    description: '공격력 +20, 체력 +300, 여러명에게 10% 딜',
    icon: '/items/titanic_hydra.png',
  },
  warmogs_armor: {
    id: 'warmogs_armor',
    name: '워모그 갑옷',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'NONE',
    effects: {
      health: 500,
      // Special: 30% heal on defend
    },
    description: '체력 +500, 방어 시 체력 30% 회복',
    icon: '/items/warmogs_armor.png',
  },

  // ADC LEGENDARY (3000 Gold)
  essence_reaver: {
    id: 'essence_reaver',
    name: '정수 약탈자',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'ADC_ONLY',
    buildsFrom: ['pickaxe', 'caulfields_warhammer'],
    effects: {
      attack: 30,
      critChance: 20,
    },
    description: '공격력 +30, 치명타 확률 20%',
    icon: '/items/essence_reaver.png',
  },
  the_collector: {
    id: 'the_collector',
    name: '처형의 총',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 50,
      critChance: 25,
      armorPen: 5,
      executeThreshold: 5, // Execute below 5% HP, gives 100 gold
    },
    description: '공격력 +50, 치명타 25%, 방관 5, 5% 미만 적 처형 (100골드)',
    icon: '/items/the_collector.png',
  },
  yun_tal_wildarrows: {
    id: 'yun_tal_wildarrows',
    name: '윤탈 야생화살',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'ADC_ONLY',
    buildsFrom: ['recurve_bow', 'noonquiver'],
    effects: {
      attack: 55,
      speed: 10,
    },
    description: '공격력 +55, 이속 +10',
    icon: '/items/yun_tal_wildarrows.png',
  },
  kraken_slayer: {
    id: 'kraken_slayer',
    name: '크라켄 학살자',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'ADC_ONLY',
    effects: {
      attack: 30,
      onHitDamage: 10, // Every 2 turns
    },
    description: '공격력 +30, 2턴마다 공격력 비례 10% 고정피해',
    icon: '/items/kraken_slayer.png',
  },
  phantom_dancer: {
    id: 'phantom_dancer',
    name: '유령 무희',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'ADC_ONLY',
    buildsFrom: ['recurve_bow', 'recurve_bow'],
    effects: {
      attack: 55,
      speed: 20,
    },
    description: '공격력 +55, 공격 시 이속 +20',
    icon: '/items/phantom_dancer.png',
  },

  // SUPPORT LEGENDARY (3000 Gold)
  knights_vow: {
    id: 'knights_vow',
    name: '기사의 맹세',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    effects: {
      health: 200,
      defense: 20,
      speed: 10,
      // Special: 10% heal per turn
    },
    description: '체력 +200, 방어력 20, 이속 10, 턴마다 체력 회복 10%',
    icon: '/items/knights_vow.png',
  },
  locket_of_solari: {
    id: 'locket_of_solari',
    name: '강철의 솔라리 펜던트',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    effects: {
      health: 200,
      defense: 20,
      speed: 3,
      teamShieldPercent: 5,
    },
    description: '체력 +200, 방어력 20, 이속 3, 턴마다 팀원에게 5% 보호막',
    icon: '/items/locket_of_solari.png',
  },
  ardent_censer: {
    id: 'ardent_censer',
    name: '불타는 향로',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    effects: {
      health: 100,
      attack: 10,
      // Special: Shield amount +10%
    },
    description: '체력 +100, 공격력 +10, 보호막 양 10% 증가',
    icon: '/items/ardent_censer.png',
  },
  staff_of_flowing_water: {
    id: 'staff_of_flowing_water',
    name: '흐르는 물의 지팡이',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    effects: {
      attack: 5,
      healAllyPercent: 3,
      // Special: +10 attack when healing ally
    },
    description: '공격력 +5, ADC 회복 3%, 회복 시 공격력 +10',
    icon: '/items/staff_of_flowing_water.png',
  },
  redemption: {
    id: 'redemption',
    name: '구원',
    cost: 3000,
    tier: 'LEGENDARY',
    restriction: 'SUPPORT_ONLY',
    effects: {
      // Special: 10% team heal per turn
    },
    description: '1턴마다 모든 팀원 체력 10% 회복',
    icon: '/items/redemption.png',
  },
};

// Helper function to calculate item cost with sub-items
export function calculateItemCost(itemId: string, ownedItems: string[]): number {
  const item = ITEMS[itemId];
  if (!item) return 0;

  let cost = item.cost;

  if (item.buildsFrom) {
    for (const subItemId of item.buildsFrom) {
      if (ownedItems.includes(subItemId)) {
        cost -= ITEMS[subItemId]?.cost || 0;
      }
    }
  }

  return Math.max(0, cost);
}

// Get all items for a position
export function getAvailableItems(position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'): Item[] {
  return Object.values(ITEMS).filter(item => {
    if (item.restriction === 'NONE') return true;
    if (item.restriction === 'ADC_ONLY' && position === 'ADC') return true;
    if (item.restriction === 'SUPPORT_ONLY' && position === 'SUPPORT') return true;
    if (item.restriction === 'MID_ONLY' && position === 'MID') return true;
    if (item.restriction === 'MID_SUPPORT' && (position === 'MID' || position === 'SUPPORT')) return true;
    return false;
  });
}
