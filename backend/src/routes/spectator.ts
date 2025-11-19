import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { activeMatches } from '../socket/realtimeMatch';

const router = express.Router();

// Get all live ranked matches
router.get('/live-matches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const liveMatches: any[] = [];

    // Convert activeMatches Map to array and filter for ranked matches only
    for (const [matchId, match] of activeMatches.entries()) {
      // Only show ranked matches (isPractice = false)
      if (!match.isPractice) {
        liveMatches.push({
          matchId,
          player1: {
            userId: match.player1.userId,
            username: match.player1.username,
            score: match.player1.score,
          },
          player2: {
            userId: match.player2.userId,
            username: match.player2.username,
            score: match.player2.score,
          },
          currentRound: match.currentRound,
          player1Deck: match.player1Deck,
          player2Deck: match.player2Deck,
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
    const match = activeMatches.get(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: '경기를 찾을 수 없습니다.',
      });
    }

    // Only allow spectating ranked matches
    if (match.isPractice) {
      return res.status(403).json({
        success: false,
        error: '일반전은 관전할 수 없습니다.',
      });
    }

    res.json({
      success: true,
      data: {
        matchId,
        player1: {
          userId: match.player1.userId,
          username: match.player1.username,
          score: match.player1.score,
        },
        player2: {
          userId: match.player2.userId,
          username: match.player2.username,
          score: match.player2.score,
        },
        currentRound: match.currentRound,
        player1Deck: match.player1Deck,
        player2Deck: match.player2Deck,
      },
    });
  } catch (error: any) {
    console.error('Get match details error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
