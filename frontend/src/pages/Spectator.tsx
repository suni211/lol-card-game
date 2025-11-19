import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Users, Trophy, Zap, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Phase = 'LANING' | 'TEAMFIGHT' | 'MACRO';

interface LiveMatch {
  id: number;
  current_phase: Phase;
  phase_score_p1: number;
  phase_score_p2: number;
  started_at: string;
  player1_id: number;
  player1_name: string;
  player1_rating: number;
  player2_id: number;
  player2_name: string;
  player2_rating: number;
  spectator_count: number;
}

interface PhaseResult {
  id: number;
  phase: Phase;
  player1_power: number;
  player2_power: number;
  player1_strategy: string;
  player2_strategy: string;
  winner_id: number;
}

const PHASE_LABELS: { [key in Phase]: string } = {
  LANING: '라이닝',
  TEAMFIGHT: '팀파이트',
  MACRO: '매크로',
};

export default function Spectator() {
  const { matchId } = useParams<{ matchId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [spectatingMatch, setSpectatingMatch] = useState<LiveMatch | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<PhaseResult[]>([]);

  useEffect(() => {
    if (matchId) {
      joinSpectate(parseInt(matchId));
    } else {
      loadLiveMatches();
    }
  }, [matchId]);

  const loadLiveMatches = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/match3phase/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLiveMatches(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('라이브 경기 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const joinSpectate = async (id: number) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/match3phase/spectate/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        const { match, phases } = res.data.data;
        setSpectatingMatch(match);
        setPhaseHistory(phases || []);
        toast.success('관전 시작');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || '관전 실패');
      navigate('/spectator');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  // Spectating a specific match
  if (spectatingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              setSpectatingMatch(null);
              setPhaseHistory([]);
              navigate('/spectator');
            }}
            className="mb-6 text-white hover:text-gray-300 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            라이브 경기 목록으로
          </button>

          {/* Match Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">
                  {PHASE_LABELS[spectatingMatch.current_phase]} 페이즈
                </h2>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5" />
                <span>{spectatingMatch.spectator_count || 0} 관전 중</span>
              </div>
            </div>

            {/* Player Info */}
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 text-left">
                <div className="text-xl font-bold">{spectatingMatch.player1_name}</div>
                <div className="text-sm text-gray-300">
                  Rating: {spectatingMatch.player1_rating}
                </div>
              </div>

              <div className="px-6">
                <div className="text-3xl font-bold">
                  {spectatingMatch.phase_score_p1} - {spectatingMatch.phase_score_p2}
                </div>
              </div>

              <div className="flex-1 text-right">
                <div className="text-xl font-bold">{spectatingMatch.player2_name}</div>
                <div className="text-sm text-gray-300">
                  Rating: {spectatingMatch.player2_rating}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Phase History */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-bold text-white mb-4">페이즈 기록</h3>

            {phaseHistory.length === 0 ? (
              <p className="text-gray-300 text-center py-8">
                아직 완료된 페이즈가 없습니다
              </p>
            ) : (
              <div className="space-y-4">
                {phaseHistory.map((phase, idx) => (
                  <div
                    key={phase.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-white">
                        {PHASE_LABELS[phase.phase]} #{idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-white">
                          {phase.player1_power} vs {phase.player2_power}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-300">
                        전략: {phase.player1_strategy}
                      </div>
                      <div
                        className={`font-semibold ${
                          phase.winner_id === spectatingMatch.player1_id
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {phase.winner_id === spectatingMatch.player1_id
                          ? spectatingMatch.player1_name
                          : spectatingMatch.player2_name}{' '}
                        승리
                      </div>
                      <div className="text-gray-300">
                        전략: {phase.player2_strategy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Live matches list
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4">
            <Eye className="inline w-12 h-12 mb-2" /> 라이브 경기 관전
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            진행 중인 3단계 전투를 실시간으로 관전하세요
          </p>
        </motion.div>

        {/* Live Matches */}
        {liveMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700"
          >
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              현재 진행 중인 라이브 경기가 없습니다
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((match) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all cursor-pointer"
                onClick={() => navigate(`/spectator/${match.id}`)}
              >
                {/* Phase Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {PHASE_LABELS[match.current_phase]}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{match.spectator_count} 관전</span>
                  </div>
                </div>

                {/* Players */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.player1_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Rating: {match.player1_rating}
                      </div>
                    </div>
                    <div className="px-4 text-2xl font-bold text-gray-800 dark:text-white">
                      {match.phase_score_p1} - {match.phase_score_p2}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.player2_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Rating: {match.player2_rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watch Button */}
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2">
                  <Eye className="w-5 h-5" />
                  관전하기
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Back to Match */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/match3phase')}
            className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            3단계 전투 참가하기
          </button>
        </div>
      </div>
    </div>
  );
}
