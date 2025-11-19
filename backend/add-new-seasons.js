/**
 * Add PC, JM, DAE, 23AG seasons
 * Run with: node add-new-seasons.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lol_card_game'
};

async function addNewSeasons() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // PC Season players
    console.log('\n=== Adding PC Season (프랜차이즈 기념) ===');

    const pcPlayers = [
      ['PC Faker', 'T1', 'MID', 106, 'LCK', 'LEGENDARY', 'PC', 26, 100000, null, '원클럽맨'],
      ['PC Ruler', 'GEN', 'ADC', 103, 'LCK', 'LEGENDARY', 'PC', 22, 80000, 'JDG', null],
      ['PC ShowMaker', 'DK', 'MID', 105, 'LCK', 'LEGENDARY', 'PC', 25, 95000, null, '원클럽맨'],
      ['PC BDD', 'KT', 'MID', 102, 'LCK', 'LEGENDARY', 'PC', 23, 75000, 'CJ', null],
      ['PC Chovy', 'GEN', 'MID', 103, 'LCK', 'LEGENDARY', 'PC', 23, 78000, 'HLE', null],
      ['PC MadLife', 'CJ', 'SUPPORT', 103, 'LCK', 'LEGENDARY', 'PC', 22, 77000, null, '떙겨!'],
      ['PC Score', 'KT', 'JUNGLE', 103, 'LCK', 'LEGENDARY', 'PC', 21, 76000, null, null],
      ['PC Ssumday', '100T', 'TOP', 102, 'LCS', 'LEGENDARY', 'PC', 21, 74000, 'KT', null],
      ['PC TrAce', 'JAG', 'TOP', 99, 'LCK', 'LEGENDARY', 'PC', 19, 65000, null, null],
      ['PC Bang', 'T1', 'ADC', 102, 'LCK', 'LEGENDARY', 'PC', 20, 73000, 'AF', '뱅과 울프'],
      ['PC Wolf', 'T1', 'SUPPORT', 102, 'LCK', 'LEGENDARY', 'PC', 20, 73000, null, '뱅과 울프'],
      ['PC CuVee', 'GEN', 'TOP', 101, 'LCK', 'LEGENDARY', 'PC', 20, 70000, null, null],
      ['PC Smeb', 'KT', 'TOP', 103, 'LCK', 'LEGENDARY', 'PC', 21, 78000, 'HLE', '그는, 탑솔러야.'],
      ['PC Spirit', 'AF', 'JUNGLE', 95, 'LCK', 'EPIC', 'PC', 18, 55000, null, '가성비잔아...'],
      ['PC Morgan', 'BRO', 'TOP', 96, 'LCK', 'EPIC', 'PC', 19, 58000, null, null],
      ['PC Hena', 'BRO', 'ADC', 95, 'LCK', 'EPIC', 'PC', 18, 55000, null, null],
      ['PC Viper', 'HLE', 'ADC', 107, 'LCK', 'LEGENDARY', 'PC', 26, 105000, 'EDG', '원딜의 신 바이퍼'],
      ['PC Rookie', 'IG', 'MID', 105, 'LPL', 'LEGENDARY', 'PC', 25, 95000, null, null],
      ['PC TheShy', 'IG', 'TOP', 106, 'LPL', 'LEGENDARY', 'PC', 26, 100000, 'WBG', null],
      ['PC JackeyLove', 'TOP', 'ADC', 103, 'LPL', 'LEGENDARY', 'PC', 23, 80000, 'IG', '쓰로잉의 신'],
      ['PC xiye', 'WE', 'MID', 103, 'LPL', 'LEGENDARY', 'PC', 23, 78000, null, null],
      ['PC Clearlove', 'EDG', 'JUNGLE', 102, 'LPL', 'LEGENDARY', 'PC', 22, 75000, null, null],
      ['PC Xiaohu', 'RNG', 'MID', 100, 'LPL', 'LEGENDARY', 'PC', 21, 68000, 'WBG', null],
      ['PC Uzi', 'RNG', 'ADC', 103, 'LPL', 'LEGENDARY', 'PC', 22, 78000, 'EDG', null],
      ['PC JieJie', 'EDG', 'JUNGLE', 101, 'LPL', 'LEGENDARY', 'PC', 20, 70000, null, null],
      ['PC MISSING', 'JDG', 'JUNGLE', 100, 'LPL', 'LEGENDARY', 'PC', 19, 67000, null, null],
      ['PC Lwx', 'FPX', 'ADC', 103, 'LPL', 'LEGENDARY', 'PC', 21, 76000, null, null],
      ['PC Yutapon', 'DFM', 'ADC', 100, 'LJL', 'LEGENDARY', 'PC', 22, 70000, null, '일본을 살려줬어'],
      ['PC Blaber', 'C9', 'JUNGLE', 102, 'LCS', 'LEGENDARY', 'PC', 22, 74000, null, null],
      ['PC Kiaya', 'GAM', 'TOP', 105, 'VCS', 'LEGENDARY', 'PC', 25, 93000, null, null],
      ['PC Caps', 'G2', 'MID', 106, 'LEC', 'LEGENDARY', 'PC', 26, 100000, null, '유럽의 제왕'],
      ['PC BrokenBlade', 'G2', 'TOP', 101, 'LEC', 'LEGENDARY', 'PC', 20, 70000, null, null],
      ['PC xPeke', 'FNC', 'MID', 100, 'LEC', 'LEGENDARY', 'PC', 22, 70000, null, '시초'],
      ['PC Diamondprox', 'GMB', 'JUNGLE', 99, 'LCL', 'LEGENDARY', 'PC', 19, 65000, null, '러시아의 희망이였던 자'],
      ['PC sOAZ', 'FNC', 'TOP', 102, 'LEC', 'LEGENDARY', 'PC', 22, 74000, null, null],
      ['PC Rekkles', 'FNC', 'ADC', 105, 'LEC', 'LEGENDARY', 'PC', 24, 92000, 'T1', '서폿도 잘해'],
      ['PC Maple', 'FW', 'MID', 101, 'PCS', 'LEGENDARY', 'PC', 23, 72000, null, null],
      ['PC Evi', 'DFM', 'TOP', 99, 'LJL', 'LEGENDARY', 'PC', 20, 66000, 'SHG', null],
      ['PC Jankos', 'G2', 'JUNGLE', 100, 'LEC', 'LEGENDARY', 'PC', 21, 69000, null, null],
      ['PC Mystic', 'WE', 'ADC', 102, 'LPL', 'LEGENDARY', 'PC', 20, 73000, null, null],
      ['PC Kanavi', 'JDG', 'JUNGLE', 107, 'LPL', 'LEGENDARY', 'PC', 25, 103000, null, null],
      ['PC Yagao', 'JDG', 'MID', 103, 'LPL', 'LEGENDARY', 'PC', 23, 79000, null, '카나비 XX'],
      ['PC Joker', 'BFX', 'JUNGLE', 102, 'LPL', 'LEGENDARY', 'PC', 23, 75000, null, null],
      ['PC BeryL', 'DK', 'SUPPORT', 106, 'LCK', 'LEGENDARY', 'PC', 22, 98000, 'DRX', null],
    ];

    for (const player of pcPlayers) {
      await connection.query(`
        INSERT INTO players (name, team, position, overall, region, tier, season, salary, market_value, other_teams, trait1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, player);
      console.log(`✓ Added ${player[0]}`);
    }

    // JM Season players
    console.log('\n=== Adding JM Season (저니맨) ===');

    const jmPlayers = [
      ['JM SuNo', 'T1', 'MID', 93, 'LCK', 'EPIC', 'JM', 18, 50000, 'SK,SSG', '저니맨'],
      ['JM Peanut', 'HLE', 'JUNGLE', 107, 'LCK', 'LEGENDARY', 'JM', 24, 102000, 'T1,BRO,DRX,GEN,LGD,NS', '저니맨'],
      ['JM Deft', 'DRX', 'ADC', 110, 'LCK', 'LEGENDARY', 'JM', 27, 120000, 'SSG,EDG,KT,HLE,DK', '롤드컵 우승자'],
      ['JM Khan', 'T1', 'TOP', 111, 'LCK', 'LEGENDARY', 'JM', 26, 125000, 'DK,FPX,DRX,WE', '비운의 주인공'],
      ['JM Fly', 'KT', 'MID', 105, 'LCK', 'LEGENDARY', 'JM', 21, 93000, 'JAG,DNF,GEN,DRX', '저니맨'],
      ['JM Huni', 'T1', 'TOP', 106, 'LCK', 'LEGENDARY', 'JM', 22, 98000, 'FNC,IMT,TSM', 'MSI 우승자'],
      ['JM Doran', 'T1', 'TOP', 109, 'LCK', 'LEGENDARY', 'JM', 25, 115000, 'GRF,DRX,KT,GEN,HLE', '롤드컵 우승자'],
      ['JM PowerOfEvil', 'UOL', 'MID', 105, 'LEC', 'LEGENDARY', 'JM', 24, 92000, 'MSF,CLG,FLY,TSM', null],
    ];

    for (const player of jmPlayers) {
      await connection.query(`
        INSERT INTO players (name, team, position, overall, region, tier, season, salary, market_value, other_teams, trait1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, player);
      console.log(`✓ Added ${player[0]}`);
    }

    // DAE Season players (대퍼팀)
    console.log('\n=== Adding DAE Season (대퍼팀 - KT) ===');

    const daePlayers = [
      ['DAE Smeb', 'KT', 'TOP', 104, 'LCK', 'LEGENDARY', 'DAE', 19, 88000, null, null],
      ['DAE Score', 'KT', 'JUNGLE', 103, 'LCK', 'LEGENDARY', 'DAE', 20, 85000, null, null],
      ['DAE PawN', 'KT', 'MID', 103, 'LCK', 'LEGENDARY', 'DAE', 21, 86000, null, '강박증'],
      ['DAE Ucal', 'KT', 'MID', 106, 'LCK', 'LEGENDARY', 'DAE', 23, 95000, null, '나 월클이야'],
      ['DAE Deft', 'KT', 'ADC', 107, 'LCK', 'LEGENDARY', 'DAE', 24, 100000, null, null],
      ['DAE Mata', 'KT', 'SUPPORT', 105, 'LCK', 'LEGENDARY', 'DAE', 22, 92000, null, null],
      ['DAE Rush', 'KT', 'JUNGLE', 99, 'LCK', 'LEGENDARY', 'DAE', 18, 65000, null, null],
    ];

    for (const player of daePlayers) {
      await connection.query(`
        INSERT INTO players (name, team, position, overall, region, tier, season, salary, market_value, other_teams, trait1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, player);
      console.log(`✓ Added ${player[0]}`);
    }

    // 23AG Season players (아시안게임)
    console.log('\n=== Adding 23AG Season (아시안게임) ===');

    const agPlayers = [
      // 한국 국가대표
      ['23AG Zeus', 'KOR', 'TOP', 108, 'KOR', 'LEGENDARY', '23AG', 24, 105000, null, null],
      ['23AG Kanavi', 'KOR', 'JUNGLE', 110, 'LCK', 'LEGENDARY', '23AG', 25, 115000, null, null],
      ['23AG Faker', 'KOR', 'MID', 93, 'LCK', 'LEGENDARY', '23AG', 18, 52000, null, null],
      ['23AG Chovy', 'KOR', 'MID', 109, 'LCK', 'LEGENDARY', '23AG', 24, 110000, null, null],
      ['23AG Ruler', 'KOR', 'ADC', 110, 'LCK', 'LEGENDARY', '23AG', 25, 115000, null, null],
      ['23AG Keria', 'KOR', 'SUPPORT', 109, 'LCK', 'LEGENDARY', '23AG', 25, 112000, null, null],
      // 대만 국가대표
      ['23AG Rest', 'TW', 'TOP', 106, 'PCS', 'LEGENDARY', '23AG', 25, 98000, null, null],
      ['23AG Karsa', 'TW', 'JUNGLE', 100, 'PCS', 'LEGENDARY', '23AG', 20, 70000, null, null],
      ['23AG FoFo', 'TW', 'MID', 101, 'PCS', 'LEGENDARY', '23AG', 21, 72000, null, null],
      ['23AG Doggo', 'TW', 'ADC', 111, 'PCS', 'LEGENDARY', '23AG', 24, 118000, null, null],
      ['23AG SwordArt', 'TW', 'SUPPORT', 105, 'PCS', 'LEGENDARY', '23AG', 23, 92000, null, null],
    ];

    for (const player of agPlayers) {
      await connection.query(`
        INSERT INTO players (name, team, position, overall, region, tier, season, salary, market_value, other_teams, trait1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, player);
      console.log(`✓ Added ${player[0]}`);
    }

    console.log('\n✅ All new seasons added successfully!');
    console.log(`Total: ${pcPlayers.length + jmPlayers.length + daePlayers.length + agPlayers.length} players`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addNewSeasons();
