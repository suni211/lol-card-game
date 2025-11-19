// SKT와 T1은 같은 팀으로 취급, ROX와 ROX Tigers와 HLE도 같은 팀으로 취급
export function normalizeTeamName(team: string | null | undefined): string {
  if (!team) return '';
  const upperTeam = team.toUpperCase();

  // SKT, T1 통합
  if (upperTeam === 'SKT' || upperTeam === 'T1') return 'T1';

  // ROX, ROX Tigers, HLE 통합
  if (upperTeam === 'ROX' || upperTeam === 'ROX TIGERS' || upperTeam === 'HLE') return 'HLE';

  return team;
}

// 두 팀이 같은지 비교 (SKT와 T1은 같은 팀으로 취급, other_teams도 고려)
export function isSameTeam(
  team1: string | null | undefined,
  team2: string | null | undefined,
  otherTeams1?: string | null,
  otherTeams2?: string | null
): boolean {
  const normalizedTeam1 = normalizeTeamName(team1);
  const normalizedTeam2 = normalizeTeamName(team2);

  // 기본 팀이 같으면 true
  if (normalizedTeam1 === normalizedTeam2) return true;

  // team1의 other_teams에 team2가 포함되어 있는지 확인
  if (otherTeams1) {
    const otherTeamsArray1 = otherTeams1.split(',').map(t => normalizeTeamName(t.trim()));
    if (otherTeamsArray1.includes(normalizedTeam2)) return true;
  }

  // team2의 other_teams에 team1이 포함되어 있는지 확인
  if (otherTeams2) {
    const otherTeamsArray2 = otherTeams2.split(',').map(t => normalizeTeamName(t.trim()));
    if (otherTeamsArray2.includes(normalizedTeam1)) return true;
  }

  // team1의 other_teams와 team2의 other_teams가 겹치는지 확인
  if (otherTeams1 && otherTeams2) {
    const otherTeamsArray1 = otherTeams1.split(',').map(t => normalizeTeamName(t.trim()));
    const otherTeamsArray2 = otherTeams2.split(',').map(t => normalizeTeamName(t.trim()));
    return otherTeamsArray1.some(t => otherTeamsArray2.includes(t));
  }

  return false;
}

// 오버롤 기반 등급 구분 (강화 0강 기준)
export function getTierByOverall(overall: number): string {
  if (overall >= 107) return 'LEGENDARY';
  if (overall >= 91) return 'EPIC';
  if (overall >= 80) return 'RARE';
  return 'COMMON';
}
