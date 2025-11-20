import pool from '../config/database';
import { normalizeTeamName } from './teamUtils';
import { calculateEnhancementBonus } from './enhancement';

interface CoachBuff {
  buff_type: 'OVERALL' | 'POSITION' | 'TEAM' | 'STRATEGY';
  buff_value: number;
  current_buff_value: number;
  buff_target: string | null;
  team_restriction: string | null; // New field for team-specific buffs
}

/**
 * Get active coach buffs for a user
 */
export async function getActiveCoachBuffs(userId: number): Promise<CoachBuff | null> {
  const connection = await pool.getConnection();

  try {
    const [activeCoach]: any = await connection.query(
      `SELECT
        c.buff_type,
        c.buff_value,
        COALESCE(uc.current_buff_value, c.buff_value) as current_buff_value,
        c.buff_target,
        c.team_restriction
      FROM user_coaches uc
      JOIN coaches c ON uc.coach_id = c.id
      WHERE uc.user_id = ? AND uc.is_active = TRUE
      LIMIT 1`,
      [userId]
    );

    if (activeCoach.length === 0) return null;

    return activeCoach[0];
  } finally {
    connection.release();
  }
}

/**
 * Apply coach buff to a card's power based on coach buff type
 */
export function applyCoachBuffToCard(
  basePower: number,
  card: { position: string; team: string; other_teams?: string | null },
  coachBuff: CoachBuff | null
): number {
  if (!coachBuff) return basePower;

  const buffValue = coachBuff.current_buff_value;

  switch (coachBuff.buff_type) {
    case 'OVERALL':
      // Applies to all cards
      return basePower + buffValue;

    case 'POSITION':
      // Applies only to specific position (e.g., 'TOP', 'MID', 'ADC', 'SUPPORT', 'JUNGLE')
      if (coachBuff.buff_target && card.position.toUpperCase() === coachBuff.buff_target.toUpperCase()) {
        return basePower + buffValue;
      }
      return basePower;

    case 'TEAM':
      // Applies only to specific team (e.g., 'T1', 'GEN', 'DK', 'HLE')
      // Normalize team names and check other_teams as well
      if (coachBuff.buff_target) {
        const normalizedCardTeam = normalizeTeamName(card.team);
        const normalizedTargetTeam = normalizeTeamName(coachBuff.buff_target);

        // If there's a team restriction, check if the card's team matches it
        if (coachBuff.team_restriction) {
          const normalizedRestriction = normalizeTeamName(coachBuff.team_restriction);
          if (normalizedCardTeam !== normalizedRestriction) {
            return basePower; // Card's team does not match the restriction
          }
        }

        // Check main team
        if (normalizedCardTeam === normalizedTargetTeam) {
          return basePower + buffValue;
        }

        // Check other_teams
        if (card.other_teams) {
          const otherTeamsArray = card.other_teams.split(',').map(t => normalizeTeamName(t.trim()));
          if (otherTeamsArray.includes(normalizedTargetTeam)) {
            return basePower + buffValue;
          }
        }
      }
      return basePower;

    case 'STRATEGY':
      // Strategy buff is percentage-based, applies to all cards
      return basePower * (1 + buffValue / 100);

    default:
      return basePower;
  }
}

/**
 * Calculate total deck power with coach buffs applied
 */
export async function calculateDeckPowerWithCoachBuffs(
  userId: number,
  cards: Array<{ level: number; overall: number; position: string; team: string; other_teams?: string | null }>
): Promise<{ totalPower: number; coachBonus: number }> {
  const coachBuff = await getActiveCoachBuffs(userId);

  let totalPower = 0;
  let coachBonus = 0;

  cards.forEach((card) => {
    const enhancementBonus = calculateEnhancementBonus(card.level || 0);
    const basePower = card.overall + enhancementBonus;
    const powerWithBuff = applyCoachBuffToCard(basePower, card, coachBuff);
    const bonus = powerWithBuff - basePower;

    totalPower += powerWithBuff;
    coachBonus += bonus;
  });

  return { totalPower, coachBonus };
}
