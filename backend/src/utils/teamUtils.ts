// SKT와 T1은 같은 팀으로 취급
export function normalizeTeamName(team: string | null | undefined): string {
  if (!team) return '';
  const upperTeam = team.toUpperCase();
  if (upperTeam === 'SKT' || upperTeam === 'T1') return 'T1';
  return team;
}

// 두 팀이 같은지 비교 (SKT와 T1은 같은 팀으로 취급)
export function isSameTeam(team1: string | null | undefined, team2: string | null | undefined): boolean {
  return normalizeTeamName(team1) === normalizeTeamName(team2);
}

// 오버롤 기반 등급 구분 (강화 0강 기준)
export function getTierByOverall(overall: number): string {
  if (overall >= 107) return 'LEGENDARY';
  if (overall >= 91) return 'EPIC';
  if (overall >= 80) return 'RARE';
  return 'COMMON';
}
