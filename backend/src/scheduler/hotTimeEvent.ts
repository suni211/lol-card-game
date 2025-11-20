import cron from 'node-cron';
import pool from '../config/database';
import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketIOForHotTime(socketIO: Server) {
  io = socketIO;
}

// 핫타임 이벤트 - 매일 오후 6시 실행 (KST)
export function startHotTimeScheduler() {
  // 매일 오후 6시 (KST = UTC+9, so 6 PM KST = 9 AM UTC)
  // Cron: 분 시 일 월 요일
  // 0 18 * * * = 매일 18:00
  cron.schedule('0 18 * * *', async () => {
    console.log('[HotTime] Starting hot time event at', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    try {
      await runHotTimeEvent();
    } catch (error) {
      console.error('[HotTime] Event error:', error);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('[HotTime] Scheduler started - will run daily at 6 PM KST');
}

async function runHotTimeEvent() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 모든 유저에게 500 포인트 지급
    const [allUsers]: any = await connection.query(
      'SELECT id, username FROM users'
    );

    if (allUsers.length === 0) {
      console.log('[HotTime] No users found');
      await connection.rollback();
      return;
    }

    // 모든 유저 포인트 추가
    await connection.query(
      'UPDATE users SET points = points + 500'
    );
    console.log(`[HotTime] Added 500 points to ${allUsers.length} users`);

    // 2. 모든 유저에게 EPIC 팩 지급 (user_packs 테이블에 추가)
    for (const user of allUsers) {
      // 기존 EPIC 팩이 있으면 수량 증가, 없으면 새로 추가
      await connection.query(`
        INSERT INTO user_packs (user_id, pack_type, quantity, received_at)
        VALUES (?, 'EPIC', 1, NOW())
        ON DUPLICATE KEY UPDATE quantity = quantity + 1, received_at = NOW()
      `, [user.id]);
    }
    console.log(`[HotTime] Added EPIC pack to ${allUsers.length} users`);

    // 3. 랜덤 1명에게 20,000 포인트 잭팟
    const randomIndex = Math.floor(Math.random() * allUsers.length);
    const jackpotWinner = allUsers[randomIndex];

    await connection.query(
      'UPDATE users SET points = points + 20000 WHERE id = ?',
      [jackpotWinner.id]
    );
    console.log(`[HotTime] Jackpot winner: ${jackpotWinner.username} (ID: ${jackpotWinner.id}) - 20,000 points!`);

    // 4. 핫타임 이벤트 로그 저장
    await connection.query(`
      INSERT INTO hot_time_logs (event_type, jackpot_user_id, participants_count, created_at)
      VALUES ('DAILY_6PM', ?, ?, NOW())
    `, [jackpotWinner.id, allUsers.length]);

    await connection.commit();

    // 5. 모든 접속자에게 브로드캐스트
    if (io) {
      // 핫타임 이벤트 알림
      io.emit('hot_time_event', {
        type: 'DAILY_REWARD',
        message: '핫타임 이벤트! 모든 유저에게 500 포인트와 EPIC 팩이 지급되었습니다!',
        timestamp: new Date().toISOString(),
      });

      // 잭팟 당첨자 확성기 알림
      io.emit('announcement', {
        type: 'JACKPOT',
        message: `축하합니다! ${jackpotWinner.username}님이 핫타임 잭팟에 당첨되어 20,000 포인트를 획득했습니다!`,
        username: jackpotWinner.username,
        amount: 20000,
        timestamp: new Date().toISOString(),
      });

      // 채팅에도 시스템 메시지로 전송
      io.emit('chat_message', {
        id: Date.now() + Math.random(),
        username: '[시스템]',
        message: `핫타임 이벤트! ${jackpotWinner.username}님이 잭팟 당첨! (20,000P)`,
        tier: 'SYSTEM',
        timestamp: new Date().toISOString(),
        isSystem: true,
      });

      console.log('[HotTime] Broadcasted event to all connected users');
    }

    console.log('[HotTime] Event completed successfully!');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 수동으로 핫타임 이벤트 실행 (테스트용)
export async function triggerHotTimeEvent() {
  console.log('[HotTime] Manual trigger requested');
  await runHotTimeEvent();
}

export default { startHotTimeScheduler, setSocketIOForHotTime, triggerHotTimeEvent };
