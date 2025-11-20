import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { activeMatches } from '../socket/mobaMatch';

const router = express.Router();

// Get all live ranked matches
router.get('/live-matches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const liveMatches: any[] = [];

    // Convert activeMatches Map to array and filter for ranked matches only
    for (const [matchId, engine] of activeMatches.entries()) {
      const state = engine.getState();
      // Only show ranked matches
      if (state.matchType === 'RANKED') {
        liveMatches.push({
          matchId: state.matchId,
          matchType: state.matchType,
          currentTurn: state.currentTurn,
          team1NexusHealth: state.team1.nexusHealth,
          team2NexusHealth: state.team2.nexusHealth,
          status: state.status,
        });
      }
    }

    res.json({
      success: true,
      data: liveMatches,
    });
  } catch (error: any) {
    console.error('Get live matches error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get specific match details
router.get('/match/:matchId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { matchId } = req.params;
    const engine = activeMatches.get(matchId);

    if (!engine) {
      return res.status(404).json({
        success: false,
        error: '경기를 찾을 수 없습니다.',
      });
    }

    const state = engine.getState();

    // Only allow spectating ranked matches
    if (state.matchType === 'NORMAL') {
      return res.status(403).json({
        success: false,
        error: '일반전은 관전할 수 없습니다.',
      });
    }

    res.json({
      success: true,
      data: {
        matchId: state.matchId,
        matchType: state.matchType,
        currentTurn: state.currentTurn,
        team1: state.team1,
        team2: state.team2,
        status: state.status,
        logs: state.logs,
      },
    });
  } catch (error: any) {
    console.error('Get match details error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
