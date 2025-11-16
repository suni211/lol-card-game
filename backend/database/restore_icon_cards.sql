-- ICON 카드 복구 및 덱 수정

-- 1. 먼저 모든 ICON 선수 확인
SELECT id, name, team, position, overall FROM players WHERE tier = 'ICON' ORDER BY name;

-- 2. 사라진 Marin, Madlife 추가 (없는 경우에만)
INSERT IGNORE INTO players (name, team, position, overall, region, tier, season, trait1, trait2,
    laning, teamfight, macro, mental, cs_ability, lane_pressure, damage_dealing, survivability,
    objective_control, vision_control, decision_making, consistency)
VALUES
('Marin', 'T1', 'TOP', 105, 'ICON', 'ICON', 'ICON', '캐리력', '라인전',
    85, 80, 82, 90, 82, 88, 85, 78, 80, 75, 88, 92),
('Madlife', 'CJ', 'SUPPORT', 102, 'ICON', 'ICON', 'ICON', '시야장악', '후킹',
    75, 78, 80, 88, 70, 72, 68, 75, 78, 95, 82, 85);

-- 3. 덱에서 유효하지 않은 player_id를 가진 카드 찾기
SELECT d.id as deck_id, d.user_id, u.username,
       d.top_card_id, d.jungle_card_id, d.mid_card_id, d.adc_card_id, d.support_card_id
FROM decks d
JOIN users u ON d.user_id = u.id
WHERE d.top_card_id NOT IN (SELECT id FROM user_cards)
   OR d.jungle_card_id NOT IN (SELECT id FROM user_cards)
   OR d.mid_card_id NOT IN (SELECT id FROM user_cards)
   OR d.adc_card_id NOT IN (SELECT id FROM user_cards)
   OR d.support_card_id NOT IN (SELECT id FROM user_cards);

-- 4. 유효하지 않은 카드 ID를 NULL로 설정
UPDATE decks d
SET
    d.top_card_id = IF(d.top_card_id IN (SELECT id FROM user_cards), d.top_card_id, NULL),
    d.jungle_card_id = IF(d.jungle_card_id IN (SELECT id FROM user_cards), d.jungle_card_id, NULL),
    d.mid_card_id = IF(d.mid_card_id IN (SELECT id FROM user_cards), d.mid_card_id, NULL),
    d.adc_card_id = IF(d.adc_card_id IN (SELECT id FROM user_cards), d.adc_card_id, NULL),
    d.support_card_id = IF(d.support_card_id IN (SELECT id FROM user_cards), d.support_card_id, NULL);

-- 5. user_cards에서 존재하지 않는 player_id를 가진 카드 찾기
SELECT uc.id, uc.user_id, u.username, uc.player_id, uc.level
FROM user_cards uc
JOIN users u ON uc.user_id = u.id
WHERE uc.player_id NOT IN (SELECT id FROM players);

-- 6. 존재하지 않는 player_id를 가진 user_cards 삭제
DELETE FROM user_cards
WHERE player_id NOT IN (SELECT id FROM players);

-- 7. 최종 확인 - 모든 ICON 선수
SELECT name, team, position, overall, region, season, trait1, trait2
FROM players
WHERE tier = 'ICON'
ORDER BY position, name;

-- 8. 최종 확인 - 유저별 ICON 카드
SELECT u.username, p.name, p.team, p.position, p.overall, uc.level
FROM user_cards uc
JOIN players p ON uc.player_id = p.id
JOIN users u ON uc.user_id = u.id
WHERE p.tier = 'ICON'
ORDER BY u.username, p.name;
