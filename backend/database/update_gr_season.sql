-- GR 선수들을 season='GR'로 변경 (LEGENDARY 등급 유지)

UPDATE players SET season = 'GR' WHERE name LIKE 'GR %';
