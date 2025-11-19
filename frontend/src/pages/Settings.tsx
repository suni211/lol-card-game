import { Settings as SettingsIcon, Bell, Lock, User, Palette, Save, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAudioStore } from '../store/audioStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, updateNotification } = useSettingsStore();
  const { isMuted, toggleMute, volume, setVolume } = useAudioStore();

  const handleSaveSettings = () => {
    toast.success('설정이 저장되었습니다!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">설정</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">계정 및 앱 설정을 관리하세요</p>
        </motion.div>

        <div className="space-y-6">
          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">계정 정보</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사용자명
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  티어
                </label>
                <input
                  type="text"
                  value={user?.tier || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Palette className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">외관</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">다크 모드</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  어두운 테마 사용
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </motion.div>

          {/* Sound Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              ) : (
                <Volume2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">사운드</h2>
            </div>

            <div className="space-y-6">
              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">모든 사운드</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    BGM 및 효과음 전체 끄기
                  </p>
                </div>
                <button
                  onClick={toggleMute}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !isMuted ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !isMuted ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Volume Slider */}
              {!isMuted && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    음량: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">알림</h2>
            </div>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {key === 'matchResults' && '경기 결과'}
                      {key === 'guildActivities' && '길드 활동'}
                      {key === 'missionCompleted' && '미션 완료'}
                      {key === 'tradeOffers' && '트레이드 제안'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {key === 'matchResults' && '경기 결과 알림 받기'}
                      {key === 'guildActivities' && '길드 활동 알림 받기'}
                      {key === 'missionCompleted' && '미션 완료 알림 받기'}
                      {key === 'tradeOffers' && '트레이드 제안 알림 받기'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateNotification(key as keyof typeof notifications, !value)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">개인정보</h2>
            </div>

            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-white">비밀번호 변경</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  계정 비밀번호를 변경합니다
                </p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-white">2단계 인증</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  계정 보안을 강화합니다
                </p>
              </button>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex justify-end"
          >
            <button
              onClick={handleSaveSettings}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>설정 저장</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
