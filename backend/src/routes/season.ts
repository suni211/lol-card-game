import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Get current active season
router.get('/current', async (req, res) => {
  try {
    const [seasons]: any = await pool.query(
      'SELECT * FROM seasons WHERE is_active = TRUE ORDER BY start_date DESC LIMIT 1'
    );

    if (seasons.length === 0) {
      return res.json({
        success: true,
        data: {
          id: 1,
          name: 'Season 1',
          startDate: new Date().toISOString(),
          isActive: true,
        },
      });
    }

    const season = seasons[0];

    res.json({
      success: true,
      data: {
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        isActive: season.is_active,
      },
    });
  } catch (error: any) {
    console.error('Get current season error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
