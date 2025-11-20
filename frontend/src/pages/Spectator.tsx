import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, Trophy, ArrowLeft, Users, Zap, Shield } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { MatchState, PlayerState, TurnResult, Lane } from '../types/moba';
import { EVENT_INFO } from '../types/moba';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface LiveMatch {
  matchId: string;
  matchType: string;
  currentTurn: number;
  team1: {
    oderId: number;
    username: string;
    nexusHealth: number;
    maxNexusHealth: number;
    kills: number;
    towersDestroyed: number;
  };
  team2: {
    oderId: number;
    username: string;
    nexusHealth: number;
    maxNexusHealth: number;
    kills: number;
    towersDestroyed: number;
  };
  spectatorCount: number;
  status: string;
}

interface SpectateMatchState extends MatchState {
  team1: MatchState['team1'] & { username: string };
  team2: MatchState['team2'] & { username: string };
}

export default function Spectator() {
  const { matchId } = useParams<{ matchId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [spectatingMatch, setSpectatingMatch] = useState<SpectateMatchState | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);

  // Load live matches list
  useEffect(() => {
    if (!matchId) {
      loadLiveMatches();
      // Refresh every 5 seconds
      const interval = setInterval(loadLiveMatches, 5000);
      return () => clearInterval(interval);
    }
  }, [matchId]);

  // Spectate specific match
  useEffect(() => {
    if (matchId) {
      spectateMatch(matchId);
    }

    return () => {
      if (socketRef.current) {
        if (matchId) {
          socketRef.current.emit('moba_spectate_leave', { matchId });
        }

        socketRef.current.off('connect');
        socketRef.current.off('moba_spectate_joined');
        socketRef.current.off('moba_error');
        socketRef.current.off('moba_turn_result');
        socketRef.current.off('moba_turn_start');
        socketRef.current.off('moba_game_end');
        socketRef.current.off('moba_spectator_count');

        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [matchId]);

  const loadLiveMatches = async () => {
    try {
      const res = await axios.get(`${API_URL}/spectator/live-matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLiveMatches(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const spectateMatch = async (id: string) => {
    try {
      setLoading(true);

      // Connect to Socket.IO
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Spectator] Socket connected');
        socket.emit('authenticate', { token });
      });

      socket.on('auth_success', () => {
        console.log('[Spectator] Authenticated, joining spectate...');
        socket.emit('moba_spectate', { matchId: id });
      });

      socket.on('moba_spectate_joined', (data: { state: SpectateMatchState; spectatorCount: number }) => {
        console.log('[Spectator] Spectate joined:', data);
        setSpectatingMatch(data.state);
        setSpectatorCount(data.spectatorCount);
        setLoading(false);
      });

      socket.on('moba_error', (data: { message: string }) => {
        console.error('[Spectator] Error:', data);
        toast.error(data.message || '관전 실패');
        navigate('/spectator');
        setLoading(false);
      });

      socket.on('moba_turn_start', (data: { turn: number; timeLimit: number }) => {
        console.log('[Spectator] Turn start:', data);
        setTurnResult(null);
        setSpectatingMatch(prev => {
          if (!prev) return prev;
          return { ...prev, currentTurn: data.turn };
        });
      });

      socket.on('moba_turn_result', (result: TurnResult) => {
        console.log('[Spectator] Turn result:', result);
        setTurnResult(result);
        setSpectatingMatch(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            team1: { ...result.team1State, username: prev.team1.username },
            team2: { ...result.team2State, username: prev.team2.username },
            currentTurn: result.turn + 1,
            logs: [...prev.logs, ...result.events],
          };
        });
      });

      socket.on('moba_game_end', (data: { winner: number; reason: string; finalState: MatchState }) => {
        console.log('[Spectator] Game ended:', data);
        const winnerName = data.winner === 1
          ? spectatingMatch?.team1.username
          : spectatingMatch?.team2.username;
        toast.success(`경기 종료! ${winnerName || `팀 ${data.winner}`} 승리!`);
        setTimeout(() => {
          navigate('/spectator');
        }, 5000);
      });

      socket.on('moba_spectator_count', (data: { count: number }) => {
        setSpectatorCount(data.count);
      });

    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || '관전 실패');
      navigate('/spectator');
      setLoading(false);
    }
  };

  if (loading && !spectatingMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  // Spectating a specific match
  if (spectatingMatch) {
    const team1Kills = spectatingMatch.team1.players.reduce((sum, p) => sum + p.kills, 0);
    const team2Kills = spectatingMatch.team2.players.reduce((sum, p) => sum + p.kills, 0);

    return (
      <div className="min-h-screen bg-gray-900 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/spectator')}
            className="mb-4 text-white hover:text-gray-300 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            라이브 경기 목록으로
          </button>

          {/* Match Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">
                  턴 {spectatingMatch.currentTurn}
                </h2>
                <span className="px-2 py-1 bg-yellow-600 text-white text-sm rounded">
                  랭크전
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span>{spectatorCount} 관전 중</span>
              </div>
            </div>

            {/* Score Board */}
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 text-left">
                <div className="text-lg font-bold text-blue-400">{spectatingMatch.team1.username}</div>
                <div className="text-3xl font-bold">{team1Kills}</div>
                <div className="text-sm text-gray-400">
                  넥서스: {spectatingMatch.team1.nexusHealth}/{spectatingMatch.team1.maxNexusHealth}
                </div>
              </div>

              <div className="px-6 text-center">
                <div className="text-2xl font-bold text-gray-500">VS</div>
                {spectatingMatch.currentEvent && (
                  <div className="text-sm text-yellow-400 mt-1">
                    {EVENT_INFO[spectatingMatch.currentEvent]?.name}
                  </div>
                )}
              </div>

              <div className="flex-1 text-right">
                <div className="text-lg font-bold text-red-400">{spectatingMatch.team2.username}</div>
                <div className="text-3xl font-bold">{team2Kills}</div>
                <div className="text-sm text-gray-400">
                  넥서스: {spectatingMatch.team2.nexusHealth}/{spectatingMatch.team2.maxNexusHealth}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Event Banner */}
          {spectatingMatch.currentEvent && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-4 p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-center"
            >
              <h3 className="text-lg font-bold text-white">
                {EVENT_INFO[spectatingMatch.currentEvent]?.name || spectatingMatch.currentEvent} 이벤트!
              </h3>
              <p className="text-white/80 text-sm">
                {EVENT_INFO[spectatingMatch.currentEvent]?.description}
              </p>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Team 1 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-blue-400 mb-4">{spectatingMatch.team1.username}</h3>

              {/* Team 1 Towers */}
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">포탑 상태</div>
                {(['TOP', 'MID', 'BOT'] as Lane[]).map(lane => {
                  const laneTowers = spectatingMatch.team1.towers
                    .filter(t => t.lane === lane)
                    .sort((a, b) => a.position - b.position);
                  return (
                    <div key={lane} className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-xs w-8">{lane}</span>
                      <div className="flex gap-1 flex-1">
                        {laneTowers.map(tower => (
                          <div key={`${tower.lane}-${tower.position}`} className="flex-1">
                            <div className={`h-2 rounded ${tower.isDestroyed ? 'bg-gray-600' : 'bg-gray-500'}`}>
                              {!tower.isDestroyed && (
                                <div
                                  className="h-2 rounded bg-blue-500 transition-all"
                                  style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Team 1 Buffs */}
              {(spectatingMatch.team1.grubBuff || spectatingMatch.team1.dragonStacks > 0 ||
                spectatingMatch.team1.baronBuff || spectatingMatch.team1.elderBuff) && (
                <div className="mb-4 flex gap-2 flex-wrap">
                  {spectatingMatch.team1.grubBuff && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">유충</span>
                  )}
                  {spectatingMatch.team1.dragonStacks > 0 && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                      용 x{spectatingMatch.team1.dragonStacks}
                    </span>
                  )}
                  {spectatingMatch.team1.baronBuff && (
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">바론</span>
                  )}
                  {spectatingMatch.team1.elderBuff && (
                    <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">장로</span>
                  )}
                </div>
              )}

              {/* Team 1 Players */}
              <div className="space-y-2">
                {spectatingMatch.team1.players.map(player => (
                  <SpectatorPlayerCard key={player.oderId} player={player} teamColor="blue" />
                ))}
              </div>
            </div>

            {/* Center - Battle Log */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4">전투 로그</h3>

              <div className="h-[500px] overflow-y-auto space-y-2 flex flex-col-reverse">
                {/* Show all logs in reverse order (newest first) */}
                {[...spectatingMatch.logs].reverse().slice(0, 50).map((log, idx) => (
                  <motion.div
                    key={`log-${spectatingMatch.logs.length - idx}`}
                    initial={idx < 10 ? { x: -20, opacity: 0 } : false}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx < 10 ? idx * 0.03 : 0 }}
                    className={`p-2 rounded text-sm ${
                      log.type === 'KILL'
                        ? 'bg-red-900/50 text-red-300'
                        : log.type === 'TOWER'
                        ? 'bg-orange-900/50 text-orange-300'
                        : log.type === 'OBJECTIVE'
                        ? 'bg-purple-900/50 text-purple-300'
                        : log.type === 'LEVEL_UP'
                        ? 'bg-green-900/50 text-green-300'
                        : log.type === 'ITEM'
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : log.type === 'GAME_END'
                        ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500 text-xs mr-1">[{log.turn}턴]</span>
                    {log.message}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Team 2 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-red-400 mb-4">{spectatingMatch.team2.username}</h3>

              {/* Team 2 Towers */}
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">포탑 상태</div>
                {(['TOP', 'MID', 'BOT'] as Lane[]).map(lane => {
                  const laneTowers = spectatingMatch.team2.towers
                    .filter(t => t.lane === lane)
                    .sort((a, b) => a.position - b.position);
                  return (
                    <div key={lane} className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-xs w-8">{lane}</span>
                      <div className="flex gap-1 flex-1">
                        {laneTowers.map(tower => (
                          <div key={`${tower.lane}-${tower.position}`} className="flex-1">
                            <div className={`h-2 rounded ${tower.isDestroyed ? 'bg-gray-600' : 'bg-gray-500'}`}>
                              {!tower.isDestroyed && (
                                <div
                                  className="h-2 rounded bg-red-500 transition-all"
                                  style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Team 2 Buffs */}
              {(spectatingMatch.team2.grubBuff || spectatingMatch.team2.dragonStacks > 0 ||
                spectatingMatch.team2.baronBuff || spectatingMatch.team2.elderBuff) && (
                <div className="mb-4 flex gap-2 flex-wrap">
                  {spectatingMatch.team2.grubBuff && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">유충</span>
                  )}
                  {spectatingMatch.team2.dragonStacks > 0 && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                      용 x{spectatingMatch.team2.dragonStacks}
                    </span>
                  )}
                  {spectatingMatch.team2.baronBuff && (
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">바론</span>
                  )}
                  {spectatingMatch.team2.elderBuff && (
                    <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">장로</span>
                  )}
                </div>
              )}

              {/* Team 2 Players */}
              <div className="space-y-2">
                {spectatingMatch.team2.players.map(player => (
                  <SpectatorPlayerCard key={player.oderId} player={player} teamColor="red" />
                ))}
              </div>
            </div>
          </div>
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
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4 flex items-center justify-center gap-3">
            <Eye className="w-12 h-12" /> 라이브 경기 관전
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            진행 중인 랭크전을 실시간으로 관전하세요
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
              현재 진행 중인 라이브 랭크전이 없습니다
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((match) => (
              <motion.div
                key={match.matchId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all cursor-pointer"
                onClick={() => navigate(`/spectator/${match.matchId}`)}
              >
                {/* Match Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      턴 {match.currentTurn}
                    </span>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                      <Users className="w-4 h-4" />
                      {match.spectatorCount}
                    </div>
                  </div>
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>

                {/* Teams */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.team1.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {match.team1.kills} 킬 · 포탑 {match.team1.towersDestroyed}개 파괴
                      </div>
                    </div>
                    <div className="px-4 text-2xl font-bold text-gray-800 dark:text-white">
                      {match.team1.kills} - {match.team2.kills}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-bold text-gray-800 dark:text-white">
                        {match.team2.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {match.team2.kills} 킬 · 포탑 {match.team2.towersDestroyed}개 파괴
                      </div>
                    </div>
                  </div>

                  {/* Nexus Health Bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{match.team1.username} 넥서스</span>
                        <span>{Math.ceil((match.team1.nexusHealth / match.team1.maxNexusHealth) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(match.team1.nexusHealth / match.team1.maxNexusHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{match.team2.username} 넥서스</span>
                        <span>{Math.ceil((match.team2.nexusHealth / match.team2.maxNexusHealth) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${(match.team2.nexusHealth / match.team2.maxNexusHealth) * 100}%` }}
                        />
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
      </div>
    </div>
  );
}

// Spectator Player Card Component
function SpectatorPlayerCard({ player, teamColor }: { player: PlayerState; teamColor: 'blue' | 'red' }) {
  const healthPercent = (player.currentHealth / player.maxHealth) * 100;

  return (
    <div
      className={`p-2 rounded-lg ${
        player.isDead
          ? 'bg-gray-700/50 opacity-50'
          : teamColor === 'blue'
          ? 'bg-blue-900/30 border border-blue-700/50'
          : 'bg-red-900/30 border border-red-700/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            player.level >= 18 ? 'bg-yellow-500 text-black' :
            player.level >= 11 ? 'bg-purple-600 text-white' :
            'bg-gray-600 text-white'
          }`}>
            {player.level}
          </div>
          <div>
            <span className="text-xs text-gray-400">{player.position}</span>
            <div className="flex items-center gap-1">
              <span className="text-white text-sm font-semibold">{player.name}</span>
              <span className="text-xs text-green-400">{player.kills}/{player.deaths}/{player.assists}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-1">
        <div className="w-full bg-gray-600 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-red-400" />
          <span>{Math.floor(player.attack)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-400" />
          <span>{player.defense}</span>
        </div>
        <span className="text-yellow-400">{player.gold}G</span>
      </div>

      {/* Items */}
      {player.items && player.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.items.map((itemId, idx) => (
            <img
              key={idx}
              src={`/items/${itemId}.png`}
              alt={itemId}
              className="w-5 h-5 rounded border border-gray-600"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              title={itemId}
            />
          ))}
        </div>
      )}

      {/* Dead indicator */}
      {player.isDead && (
        <div className="text-center text-red-400 text-xs mt-1">
          사망 ({player.respawnTurn}턴 부활)
        </div>
      )}
    </div>
  );
}
