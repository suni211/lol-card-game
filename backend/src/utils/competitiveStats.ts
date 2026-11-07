// LoL card competition: six stats, no rock-paper-scissors dominance.
export const STRATEGY_KEYS = ['MACRO','TEAMFIGHT','OBJECTIVE'] as const;
export type Strategy = typeof STRATEGY_KEYS[number];
export type Stats6 = {
  cs: number;
  teamfight: number;
  laning: number;
  shotcalling: number;
  mental: number;
  clutch: number;
};
export type MatchCard = {
  cardId: number; playerId: number; name: string; team: string;
  position: string; season: string; overall: number; level: number;
  stats: Stats6;
};

const sixKeys: (keyof Stats6)[] =
  ['cs','teamfight','laning','shotcalling','mental','clutch'];

const WEIGHTS: Record<Strategy, Stats6> = {
  MACRO: { cs: .22, teamfight: .10, laning: .13, shotcalling: .32, mental: .16, clutch: .07 },
  TEAMFIGHT: { cs: .08, teamfight: .38, laning: .09, shotcalling: .15, mental: .13, clutch: .17 },
  OBJECTIVE: { cs: .11, teamfight: .20, laning: .15, shotcalling: .28, mental: .14, clutch: .12 },
};

export function isStrategy(value: unknown): value is Strategy {
  return typeof value === 'string' && STRATEGY_KEYS.includes(value as Strategy);
}
export function teamScore(cards: MatchCard[], strategy: Strategy): number {
  if (cards.length !== 5) throw new Error('출전 카드가 정확히 5장이어야 합니다.');
  return cards.reduce((sum, card) => {
    const attributes = sixKeys.reduce(
      (subtotal, stat) => subtotal + (Number(card.stats[stat]) || 50) * WEIGHTS[strategy][stat], 0
    );
    return sum + attributes * .75 + (Number(card.overall) + Number(card.level) * 2) * .25;
  }, 0);
}
export function getMatchRoster(records: any[]): MatchCard[] {
  return records.map(row => ({
    cardId: Number(row.card_id), playerId: Number(row.player_id), name: String(row.name),
    team: String(row.team), position: String(row.position), season: String(row.season || ''),
    overall: Number(row.overall), level: Number(row.level) || 0,
    stats: {
      cs: Number(row.cs ?? row.overall),
      teamfight: Number(row.teamfight ?? row.overall),
      laning: Number(row.laning ?? row.overall),
      shotcalling: Number(row.shotcalling ?? row.overall),
      mental: Number(row.mental ?? row.overall),
      clutch: Number(row.clutch ?? row.overall),
    },
  }));
}
export function parseRoster(value: unknown): MatchCard[] {
  if (Array.isArray(value)) return value as MatchCard[];
  try { return JSON.parse(String(value)) as MatchCard[]; } catch { return []; }
}
export async function ownedTeam(connection: any, userId: number, deckSlot = 1): Promise<MatchCard[]> {
  const [decks]: any = await connection.query(
    'SELECT * FROM decks WHERE user_id=? AND deck_slot=? ORDER BY id LIMIT 1',
    [userId,deckSlot]
  );
  const [rows]: any = await connection.query(
    `SELECT uc.id AS card_id,uc.player_id,uc.level,p.name,p.team,p.position,p.season,p.overall,
            ps.cs,ps.teamfight,ps.laning,ps.shotcalling,ps.mental,ps.clutch
     FROM user_cards uc JOIN players p ON p.id=uc.player_id
     LEFT JOIN player_stats ps ON ps.player_id=p.id WHERE uc.user_id=?
     ORDER BY p.overall DESC, uc.level DESC,uc.id ASC`,[userId]
  );
  const byId = new Map<number,any>(rows.map((r:any)=>[Number(r.card_id),r]));
  const cardIds = decks.length ? ['top_card_id','jungle_card_id','mid_card_id','adc_card_id','support_card_id']
    .map(k => Number(decks[0][k]) || 0) : [];
  const used = new Set<number>();
  const chosen:any[]=[];
  const add=(r:any)=>{
    const id = Number(r?.card_id);
    if(!id || used.has(id) || chosen.length>=5)return;
    used.add(id); chosen.push(r);
  };
  cardIds.forEach(id=>add(byId.get(id)));
  rows.forEach(add);
  if (chosen.length!==5) throw new Error('선수 카드 5장이 필요합니다.');
  return getMatchRoster(chosen);
}
