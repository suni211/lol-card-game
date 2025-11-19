import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CoachBuff {
  buff_type: 'OVERALL' | 'POSITION' | 'TEAM' | 'STRATEGY';
  buff_value: number;
  current_buff_value: number;
  buff_target: string | null;
  enhancement_level: number;
}

interface Card {
  position: string;
  team: string;
  overall: number;
  level?: number;
  other_teams?: string | null;
}

/**
 * Normalize team names (SKT=T1, ROX=ROX Tigers=HLE)
 */
function normalizeTeamName(team: string | null | undefined): string {
  if (!team) return '';
  const upperTeam = team.toUpperCase();

  if (upperTeam === 'SKT' || upperTeam === 'T1') return 'T1';
  if (upperTeam === 'ROX' || upperTeam === 'ROX TIGERS' || upperTeam === 'HLE') return 'HLE';

  return team;
}

/**
 * Fetch active coach buffs from API
 */
export async function getActiveCoachBuff(token: string): Promise<CoachBuff | null> {
  try {
    const response = await axios.get(`${API_URL}/coach/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch active coach:', error);
    return null;
  }
}

/**
 * Apply coach buff to a card's overall (without enhancement bonus)
 */
export function applyCoachBuffToCard(
  baseOverall: number,
  card: Card,
  coachBuff: CoachBuff | null
): number {
  if (!coachBuff) return baseOverall;

  const buffValue = coachBuff.current_buff_value;

  switch (coachBuff.buff_type) {
    case 'OVERALL':
      // Applies to all cards
      return baseOverall + buffValue;

    case 'POSITION':
      // Applies only to specific position
      if (coachBuff.buff_target && card.position.toUpperCase() === coachBuff.buff_target.toUpperCase()) {
        return baseOverall + buffValue;
      }
      return baseOverall;

    case 'TEAM':
      // Applies only to specific team (with normalization and other_teams support)
      if (coachBuff.buff_target) {
        const normalizedCardTeam = normalizeTeamName(card.team);
        const normalizedTargetTeam = normalizeTeamName(coachBuff.buff_target);

        // Check main team
        if (normalizedCardTeam === normalizedTargetTeam) {
          return baseOverall + buffValue;
        }

        // Check other_teams
        if (card.other_teams) {
          const otherTeamsArray = card.other_teams.split(',').map(t => normalizeTeamName(t.trim()));
          if (otherTeamsArray.includes(normalizedTargetTeam)) {
            return baseOverall + buffValue;
          }
        }
      }
      return baseOverall;

    case 'STRATEGY':
      // Strategy buff is percentage-based, applies to all cards
      return Math.floor(baseOverall * (1 + buffValue / 100));

    default:
      return baseOverall;
  }
}

/**
 * Calculate total overall with enhancement and coach buff
 */
export function calculateTotalOverall(
  baseOverall: number,
  enhancementBonus: number,
  card: Card,
  coachBuff: CoachBuff | null
): number {
  // First add enhancement bonus
  const overallWithEnhancement = baseOverall + enhancementBonus;

  // Then apply coach buff
  return applyCoachBuffToCard(overallWithEnhancement, card, coachBuff);
}
