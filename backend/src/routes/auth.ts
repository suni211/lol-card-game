// @ts-nocheck
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
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

// Register
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { username, email, password } = value;

    // Check if user with this email already exists
    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result]: any = await pool.query(
      `INSERT INTO users (username, email, password, points, tier, rating) VALUES (?, ?, ?, 1000, "IRON", 1000)`,
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    // Create user stats
    await pool.query(
      'INSERT INTO user_stats (user_id) VALUES (?)',
      [userId]
    );

    // Generate JWT token for immediate login
    const jwtSecret = (process.env.JWT_SECRET || 'your-secret-key') as string;
    const jwtExpire = (process.env.JWT_EXPIRE || '7d') as string;
    const token = jwt.sign(
      { id: userId, username, email, isAdmin: false },
      jwtSecret,
      { expiresIn: jwtExpire }
    );

    const userData = {
      id: userId,
      username,
      email,
      points: 1000,
      tier: 'IRON',
      rating: 1000,
      isAdmin: false,
      createdAt: new Date(),
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: userData,
        token
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
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
      'SELECT id, username, email, points, tier, rating, is_admin, last_check_in, consecutive_days, created_at FROM users WHERE id = ?',
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
    };

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
