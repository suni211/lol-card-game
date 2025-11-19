-- Add salary system to players
-- Salary range: 5-26 based on overall rating
-- Salary cap: 100 per deck

-- Step 1: Add salary column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS salary INT NOT NULL DEFAULT 5;

-- Step 2: Calculate and set salary based on overall (5-26 range)
-- Formula: salary = 5 + ((overall - min_overall) / (max_overall - min_overall)) * 21
-- Assuming overall range is approximately 60-120

UPDATE players
SET salary = CASE
  -- ICON tier (overall > 110)
  WHEN overall >= 115 THEN 26
  WHEN overall >= 113 THEN 25
  WHEN overall >= 111 THEN 24

  -- LEGENDARY tier (overall 101-110)
  WHEN overall >= 109 THEN 23
  WHEN overall >= 107 THEN 22
  WHEN overall >= 105 THEN 21
  WHEN overall >= 103 THEN 20
  WHEN overall >= 101 THEN 19

  -- EPIC tier (overall 91-100)
  WHEN overall >= 99 THEN 18
  WHEN overall >= 97 THEN 17
  WHEN overall >= 95 THEN 16
  WHEN overall >= 93 THEN 15
  WHEN overall >= 91 THEN 14

  -- RARE tier (overall 81-90)
  WHEN overall >= 89 THEN 13
  WHEN overall >= 87 THEN 12
  WHEN overall >= 85 THEN 11
  WHEN overall >= 83 THEN 10
  WHEN overall >= 81 THEN 9

  -- COMMON tier (overall 61-80)
  WHEN overall >= 77 THEN 8
  WHEN overall >= 73 THEN 7
  WHEN overall >= 69 THEN 6

  -- Low tier (overall <= 68)
  ELSE 5
END;

-- Step 3: Verify salary distribution
SELECT
  'ICON (115+)' as tier,
  COUNT(*) as player_count,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary,
  AVG(salary) as avg_salary
FROM players WHERE overall >= 115
UNION ALL
SELECT
  'LEGENDARY (101-114)' as tier,
  COUNT(*) as player_count,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary,
  AVG(salary) as avg_salary
FROM players WHERE overall BETWEEN 101 AND 114
UNION ALL
SELECT
  'EPIC (91-100)' as tier,
  COUNT(*) as player_count,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary,
  AVG(salary) as avg_salary
FROM players WHERE overall BETWEEN 91 AND 100
UNION ALL
SELECT
  'RARE (81-90)' as tier,
  COUNT(*) as player_count,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary,
  AVG(salary) as avg_salary
FROM players WHERE overall BETWEEN 81 AND 90
UNION ALL
SELECT
  'COMMON (<=80)' as tier,
  COUNT(*) as player_count,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary,
  AVG(salary) as avg_salary
FROM players WHERE overall <= 80;

-- Step 4: Show sample players with their new salaries
SELECT name, team, overall, salary
FROM players
ORDER BY overall DESC
LIMIT 20;
