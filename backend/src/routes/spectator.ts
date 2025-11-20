import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { activeMatches } from '../socket/mobaMatch';
import pool from '../config/database';

const router = express.Router();

// Track spectator counts per match
export const spectatorCounts = new Map<string, number>();

// Get all live ranked matches
router.get('/live-matches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const liveMatches: any[] = [];

    // Convert activeMatches Map to array and filter for ranked matches only
    for (const [matchId, engine] of activeMatches.entries()) {
      const state = engine.getState();
      // Only show ranked matches that are in progress
      if (state.matchType === 'RANKED' && state.status === 'IN_PROGRESS') {
        // Get usernames for both players
        const [users]: any = await pool.query(
          'SELECT id, username FROM users WHERE id IN (?, ?)',
          [state.team1.oderId, state.team2.oderId]
        );

        const user1 = users.find((u: any) => u.id === state.team1.oderId);
        const user2 = users.find((u: any) => u.id === state.team2.oderId);

        // Calculate team stats for display
        const team1Kills = state.team1.players.reduce((sum, p) => sum + p.kills, 0);
        const team2Kills = state.team2.players.reduce((sum, p) => sum + p.kills, 0);

        liveMatches.push({
          matchId: state.matchId,
          matchType: state.matchType,
          currentTurn: state.currentTurn,
          team1: {
            oderId: state.team1.oderId,
            username: user1?.username || `Player ${state.team1.oderId}`,
            nexusHealth: state.team1.nexusHealth,
            maxNexusHealth: state.team1.maxNexusHealth,
            kills: team1Kills,
            towersDestroyed: state.team2.towers.filter(t => t.isDestroyed).length,
          },
          team2: {
            oderId: state.team2.oderId,
            username: user2?.username || `Player ${state.team2.oderId}`,
            nexusHealth: state.team2.nexusHealth,
            maxNexusHealth: state.team2.maxNexusHealth,
            kills: team2Kills,
            towersDestroyed: state.team1.towers.filter(t => t.isDestroyed).length,
          },
          spectatorCount: spectatorCounts.get(matchId) || 0,
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

    // Get usernames for both players
    const [users]: any = await pool.query(
      'SELECT id, username FROM users WHERE id IN (?, ?)',
      [state.team1.oderId, state.team2.oderId]
    );

    const user1 = users.find((u: any) => u.id === state.team1.oderId);
    const user2 = users.find((u: any) => u.id === state.team2.oderId);

    res.json({
      success: true,
      data: {
        matchId: state.matchId,
        matchType: state.matchType,
        currentTurn: state.currentTurn,
        team1: {
          ...state.team1,
          username: user1?.username || `Player ${state.team1.oderId}`,
        },
        team2: {
          ...state.team2,
          username: user2?.username || `Player ${state.team2.oderId}`,
        },
        status: state.status,
        logs: state.logs.slice(-50), // Last 50 logs
        spectatorCount: spectatorCounts.get(matchId) || 0,
      },
    });
  } catch (error: any) {
    console.error('Get match details error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
