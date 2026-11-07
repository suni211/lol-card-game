// @ts-nocheck
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import axios from 'axios';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

// VPN/프록시 감지 함수
async function isVpnOrProxy(ip: string): Promise<boolean> {
  try {
    // IPv6 로컬호스트는 허용
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('::ffff:127.')) {
      return false;
    }

    // IPv4 로컬호스트는 허용
    if (ip === '127.0.0.1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return false;
    }

    // ipapi.co를 사용한 VPN 감지 (무료, 요청 제한 있음)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000,
      headers: {
        'User-Agent': 'LOL-Card-Game/1.0'
      }
    });

    const data = response.data;

    // VPN/프록시/호스팅 여부 체크
    if (data.org) {
      const org = data.org.toLowerCase();
      const vpnKeywords = [
        'vpn', 'proxy', 'hosting', 'datacenter', 'cloud',
        'amazon', 'google cloud', 'microsoft', 'digitalocean',
        'ovh', 'linode', 'vultr', 'aws', 'azure'
      ];

      for (const keyword of vpnKeywords) {
        if (org.includes(keyword)) {
          console.log(`🚫 VPN/Proxy detected! IP: ${ip}, Org: ${data.org}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    // API 에러 시 일단 허용 (false positive 방지)
    console.error('VPN check error:', error.message);
    return false;
  }
}

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Google Identity Services: verify ID token against this application's OAuth client.
// Keep the stable Google subject bound to a user; do not trust a posted email alone.
router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  const referralCode = typeof req.body?.referralCode === 'string'
    ? req.body.referralCode.trim().toUpperCase() : '';
  if (referralCode && !/^LCG[0-9]{8,}$/.test(referralCode)) {
    return res.status(400).json({ success: false, error: '추천 코드 형식이 올바르지 않습니다.' });
  }
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 10000) {
    return res.status(400).json({ success: false, error: 'Google 로그인 인증 정보가 없습니다.' });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.JWT_SECRET;
  if (!clientId || !secret) {
    return res.status(503).json({ success: false, error: 'Google 로그인 환경변수가 설정되지 않았습니다.' });
  }
  try {
    const { data: profile } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: credential },
      timeout: 8000,
    });
    const issuer = profile.iss;
    const verified = profile.email_verified === true || profile.email_verified === 'true';
    if (profile.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(issuer)
      || !verified || !profile.sub || !profile.email || Number(profile.exp) * 1000 <= Date.now()) {
      return res.status(401).json({ success: false, error: '유효하지 않은 Google 인증입니다.' });
    }
    const email = String(profile.email).toLowerCase().trim();
    const googleSub = String(profile.sub);
    if (email.length > 100 || googleSub.length > 255) {
      return res.status(401).json({ success: false, error: 'Google 계정 정보를 확인할 수 없습니다.' });
    }
    const connection = await pool.getConnection();
    let userId: number;
    let isNewUser = false;
    try {
      await connection.beginTransaction();
      // Validate a provided code inside the transaction. Existing accounts do not receive signup rewards.
      const [referrers]: any = referralCode ? await connection.query(
        'SELECT id FROM users WHERE referral_code=? FOR UPDATE', [referralCode]
      ) : [[]];
      if (referralCode && !referrers.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '존재하지 않는 친구 초대 코드입니다.' });
      }
      const [bySub]: any = await connection.query('SELECT id FROM users WHERE google_sub=? FOR UPDATE', [googleSub]);
      if (bySub.length) {
        userId = bySub[0].id;
      } else {
        const [byEmail]: any = await connection.query('SELECT id, google_sub FROM users WHERE email=? FOR UPDATE', [email]);
        if (byEmail.length) {
          if (byEmail[0].google_sub && byEmail[0].google_sub !== googleSub) {
            await connection.rollback();
            return res.status(409).json({ success: false, error: '다른 Google 계정에 연결된 이메일입니다.' });
          }
          userId = byEmail[0].id;
          await connection.query('UPDATE users SET google_sub=? WHERE id=?', [googleSub, userId]);
        } else {
          isNewUser = true;
          const username = ('google_' + googleSub.replace(/[^a-zA-Z0-9]/g, '').slice(-22)).slice(0, 50);
          const randomPassword = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10);
          const [inserted]: any = await connection.query(
            'INSERT INTO users (username,email,password,points,tier,rating,google_sub,welcome_packs_remaining) VALUES (?,?,?,10000,\'IRON\',1000,?,0)',
            [username, email, randomPassword, googleSub]
          );
          userId = inserted.insertId;
          await connection.query(
            "UPDATE users SET referral_code=CONCAT('LCG', LPAD(id, 8, '0')) WHERE id=?", [userId]
          );
          if (referrers.length) {
            const referrerId = Number(referrers[0].id);
            if (referrerId === Number(userId)) throw new Error('Self-referral blocked');
            // UNIQUE(referred_id) guarantees a signup can only be rewarded once.
            await connection.query(
              'INSERT INTO referrals (referrer_id,referred_id,signup_bonus_points) VALUES (?,?,1000)',
              [referrerId,userId]
            );
            await connection.query(
              "INSERT INTO referral_bonuses (referrer_id,referred_id,bonus_type,referrer_bonus,referred_bonus,match_count) VALUES (?,?,'SIGNUP',1000,1000,0)",
              [referrerId,userId]
            );
            await connection.query(
              'UPDATE users SET points=points+1000, total_referrals=total_referrals+1, total_referral_bonus=total_referral_bonus+1000 WHERE id=?',
              [referrerId]
            );
            await connection.query('UPDATE users SET points=points+1000 WHERE id=?', [userId]);
          }
          await connection.query(
            `INSERT INTO user_packs (user_id, pack_type, quantity) VALUES (?, 'STANDARD', 1)
             ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
            [userId]
          );
          await connection.query('INSERT INTO user_stats (user_id) VALUES (?)', [userId]);
        }
      }
      await connection.commit();
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
    const [users]: any = await pool.query(
      'SELECT id,username,email,points,tier,rating,is_admin,created_at,level,exp,total_exp FROM users WHERE id=? LIMIT 1',
      [userId]
    );
    if (!users.length) return res.status(500).json({ success: false, error: '사용자 계정을 찾지 못했습니다.' });
    const user = users[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, isAdmin: Boolean(user.is_admin) },
      secret, { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    return res.json({
      success: true,
      message: isNewUser ? (referralCode ? '친구 초대 보너스 1,000P가 지급되었습니다!' : 'Google 회원가입 성공!') : 'Google 로그인 성공!',
      data: { token, user: {
        id: user.id, username: user.username, email: user.email,
        points: user.points, tier: user.tier, rating: user.rating,
        isAdmin: Boolean(user.is_admin), createdAt: user.created_at,
        level: user.level || 1, exp: user.exp || 0, total_exp: user.total_exp || 0
      } }
    });
  } catch (error: any) {
    console.error('Google login failed:', error?.response?.status || error?.code || error?.message);
    if (error?.response?.status === 400) {
      return res.status(401).json({ success: false, error: 'Google 인증이 만료되었거나 유효하지 않습니다.' });
    }
    return res.status(500).json({ success: false, error: 'Google 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// Register (DISABLED - Use Google OAuth instead)
router.post('/register', async (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Direct registration is disabled. Please use Google Sign-In.'
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { email, password } = value;

    // Get user with equipped title
    const [users]: any = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is banned
    if (user.is_banned) {
      let banMessage = '계정이 정지되었습니다.';
      if (user.ban_until) {
        const banDate = new Date(user.ban_until);
        if (banDate > new Date()) {
          banMessage = `계정이 ${banDate.toLocaleDateString('ko-KR')}까지 정지되었습니다.`;
          if (user.ban_reason) {
            banMessage += ` 사유: ${user.ban_reason}`;
          }
        } else {
          // Ban expired, unban the user
          await pool.query('UPDATE users SET is_banned = FALSE, ban_until = NULL, ban_reason = NULL WHERE id = ?', [user.id]);
        }
      } else if (user.ban_reason) {
        banMessage += ` 사유: ${user.ban_reason}`;
      }

      if (user.is_banned && (!user.ban_until || new Date(user.ban_until) > new Date())) {
        return res.status(403).json({ success: false, error: banMessage });
      }
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate token
    const jwtSecret = (process.env.JWT_SECRET || 'your-secret-key') as string;
    const jwtExpire = (process.env.JWT_EXPIRE || '7d') as string;
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin === 1 },
      jwtSecret,
      { expiresIn: jwtExpire }
    );

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      points: user.points,
      tier: user.tier,
      rating: user.rating,
      isAdmin: user.is_admin === 1,
      createdAt: user.created_at,
      level: user.level || 1,
      exp: user.exp || 0,
      total_exp: user.total_exp || 0,
      equipped_title_id: user.title_id || null,
      title_name: user.title_name || null,
      title_color: user.title_color || null,
      title_icon: user.title_icon || null,
      title_rarity: user.title_rarity || null,
    };

    res.json({ success: true, data: { user: userData, token } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const [users]: any = await pool.query(
      `SELECT id,username,email,points,tier,rating,is_admin,created_at,level,exp,total_exp
       FROM users WHERE id=?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = {
      id: users[0].id,
      username: users[0].username,
      email: users[0].email,
      points: users[0].points,
      tier: users[0].tier,
      rating: users[0].rating,
      isAdmin: users[0].is_admin === 1,

      createdAt: users[0].created_at,
      level: users[0].level || 1,
      exp: users[0].exp || 0,
      total_exp: users[0].total_exp || 0,
      equipped_title_id: users[0].title_id || null,
      title_name: users[0].title_name || null,
      title_color: users[0].title_color || null,
      title_icon: users[0].title_icon || null,
      title_rarity: users[0].title_rarity || null,
    };

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Change username
router.post('/change-username', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { newUsername } = req.body;

    // Validate username
    if (!newUsername || newUsername.length < 3 || newUsername.length > 50) {
      return res.status(400).json({
        success: false,
        error: '닉네임은 3자 이상 50자 이하여야 합니다.',
      });
    }

    // Get current user data
    const [currentUser]: any = await pool.query(
      'SELECT last_username_change FROM users WHERE id = ?',
      [userId]
    );

    if (currentUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.',
      });
    }

    // Check if 30 days have passed since last change
    const lastChange = currentUser[0].last_username_change;
    if (lastChange) {
      const daysSinceChange = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceChange < 30) {
        const daysRemaining = 30 - daysSinceChange;
        return res.status(400).json({
          success: false,
          error: `닉네임 변경은 30일마다 한 번만 가능합니다. ${daysRemaining}일 후에 다시 시도해주세요.`,
        });
      }
    }

    // Check if username is already taken
    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [newUsername, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 닉네임입니다.',
      });
    }

    // Update username and last_username_change timestamp
    await pool.query(
      'UPDATE users SET username = ?, last_username_change = NOW() WHERE id = ?',
      [newUsername, userId]
    );

    // Get updated user data
    const [users]: any = await pool.query(
      'SELECT id, username, email, points, tier, rating, is_admin FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.json({
      success: true,
      message: '닉네임이 성공적으로 변경되었습니다.',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        points: user.points,
        tier: user.tier,
        rating: user.rating,
        isAdmin: user.is_admin === 1,
      },
    });
  } catch (error: any) {
    console.error('Change username error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Search users (for admin features like granting titles)
router.get('/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string' || username.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const [users]: any = await pool.query(
      `SELECT id, username, level, tier, points
       FROM users
       WHERE username LIKE ?
       LIMIT 10`,
      [`%${username}%`]
    );

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
