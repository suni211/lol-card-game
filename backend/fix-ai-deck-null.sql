-- AI 매칭을 위해 player2_deck_id를 NULL 허용으로 변경
ALTER TABLE matches MODIFY COLUMN player2_deck_id INT NULL;
