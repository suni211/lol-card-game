// @ts-nocheck
import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * Get referral info for current user
 */
router.get('/info', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    // Get user's referral code and stats
    const [user]: any = await pool.query(
      `SELECT referral_code, total_referrals, total_referral_bonus FROM users WHERE id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get all referred users and their stats
    const [referrals]: any = await pool.query(
      `SELECT
        r.id,
        r.referred_id,
        u.username,
        u.tier,
        u.level,
        r.signup_bonus_points,
        r.total_match_bonus,
        r.referred_match_count,
        r.created_at
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get total bonus history
    const [bonuses]: any = await pool.query(
      `SELECT
        bonus_type,
        referrer_bonus,
        referred_bonus,
        match_count,
        created_at,
        (SELECT username FROM users WHERE id = rb.referred_id) as referred_username
      FROM referral_bonuses rb
      WHERE referrer_id = ?
      ORDER BY created_at DESC
      LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        referralCode: user[0].referral_code,
        totalReferrals: user[0].total_referrals,
        totalBonus: user[0].total_referral_bonus,
        referrals: referrals,
        recentBonuses: bonuses,
      },
    });
  } catch (error: any) {
    console.error('Get referral info error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Validate referral code
 */
router.post('/validate', async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ success: false, error: 'Referral code required' });
    }

    const [user]: any = await pool.query(
      'SELECT id, username FROM users WHERE referral_code = ?',
      [referralCode]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: '유효하지 않은 추천 코드입니다.',
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referrerUsername: user[0].username,
      },
    });
  } catch (error: any) {
    console.error('Validate referral code error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Get leaderboard of top referrers
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const [topReferrers]: any = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.tier,
        u.total_referrals,
        u.total_referral_bonus
      FROM users u
      WHERE u.total_referrals > 0
      ORDER BY u.total_referrals DESC, u.total_referral_bonus DESC
      LIMIT 100`
    );

    res.json({
      success: true,
      data: topReferrers,
    });
  } catch (error: any) {
    console.error('Get referral leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
