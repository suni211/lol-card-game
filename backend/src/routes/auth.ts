// @ts-nocheck
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import axios from 'axios';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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

// Google OAuth Register/Login
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, error: 'No credential provided' });
    }

    // Verify Google token
    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    const { email, name, picture } = googleResponse.data;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Failed to get email from Google' });
    }

    // Check if user exists
    const [existing]: any = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    let userId;
    let username;

    if (existing.length > 0) {
      // User exists - login
      const user = existing[0];
      userId = user.id;
      username = user.username;
    } else {
      // New user - register
      // Generate unique username from email
      const baseUsername = email.split('@')[0];
      let finalUsername = baseUsername;
      let counter = 1;

      // Check username uniqueness
      while (true) {
        const [usernameCheck]: any = await pool.query(
          'SELECT id FROM users WHERE username = ?',
          [finalUsername]
        );

        if (usernameCheck.length === 0) break;
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      username = finalUsername;

      // Create user with random password (not used for Google login)
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

      const [result]: any = await pool.query(
        `INSERT INTO users (username, email, password, points, tier, rating) VALUES (?, ?, ?, 1000, "IRON", 1000)`,
        [username, email, randomPassword]
      );

      userId = result.insertId;

      // Create user stats
      await pool.query(
        'INSERT INTO user_stats (user_id) VALUES (?)',
        [userId]
      );
    }

    // Generate JWT token
    const jwtSecret = (process.env.JWT_SECRET || 'your-secret-key') as string;
    const jwtExpire = (process.env.JWT_EXPIRE || '7d') as string;
    const token = jwt.sign(
      { id: userId, username, email, isAdmin: false },
      jwtSecret,
      { expiresIn: jwtExpire }
    );

    // Get full user data
    const [users]: any = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    // Get guild info if user is in a guild
    let guildInfo = null;
    if (user.guild_id) {
      const [guilds]: any = await pool.query(
        'SELECT id, name, tag FROM guilds WHERE id = ?',
        [user.guild_id]
      );
      if (guilds.length > 0) {
        guildInfo = guilds[0];
      }
    }

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
      guild_id: user.guild_id || null,
      guild_tag: guildInfo?.tag || null,
      guild_name: guildInfo?.name || null,
    };

    res.json({
      success: true,
      message: existing.length > 0 ? 'Login successful!' : 'Registration successful!',
      data: {
        user: userData,
        token
      }
    });
  } catch (error: any) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ success: false, error: 'Google authentication failed' });
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

    // Get user
    const [users]: any = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];

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
      'SELECT id, username, email, points, tier, rating, is_admin, last_check_in, consecutive_days, created_at, level, exp, total_exp FROM users WHERE id = ?',
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
      lastCheckIn: users[0].last_check_in,
      consecutiveDays: users[0].consecutive_days,
      createdAt: users[0].created_at,
      level: users[0].level || 1,
      exp: users[0].exp || 0,
      total_exp: users[0].total_exp || 0,
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

export default router;
