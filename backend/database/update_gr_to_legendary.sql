-- GR 티어 선수들을 LEGENDARY 등급으로 변경

UPDATE players SET tier = 'LEGENDARY' WHERE tier = 'GR';
