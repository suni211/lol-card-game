import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  currentTrack: string | null;
  audio: HTMLAudioElement | null;
  lobbyTracks: string[];

  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playBGM: (trackPath: string) => void;
  playRandomLobbyBGM: () => void;
  stopBGM: () => void;
  initAudio: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      volume: 0.5,
      isMuted: true, // 기본값을 음소거로 변경 (사용자가 직접 켜도록)
      isPlaying: false,
      currentTrack: null,
      audio: null,
      lobbyTracks: ['/bgm/lobby1.ogg', '/bgm/lobby2.ogg', '/bgm/lobby3.ogg'],

      initAudio: () => {
        const audio = new Audio();
        audio.loop = true;
        // localStorage에서 설정 불러오기
        const savedSettings = localStorage.getItem('audio-settings');
        if (savedSettings) {
          try {
            const { isMuted, volume } = JSON.parse(savedSettings);
            audio.volume = isMuted ? 0 : volume;
            set({ isMuted, volume });
          } catch (e) {
            audio.volume = 0; // 파싱 실패시 음소거
          }
        } else {
          audio.volume = 0; // 저장된 설정이 없으면 음소거
        }
        set({ audio });
      },

      setVolume: (volume: number) => {
        const { audio, isMuted } = get();
        set({ volume });
        if (audio && !isMuted) {
          audio.volume = volume;
        }
      },

      toggleMute: () => {
        const { audio, isMuted, volume } = get();
        const newMuted = !isMuted;
        set({ isMuted: newMuted });
        if (audio) {
          audio.volume = newMuted ? 0 : volume;
        }
      },

      playBGM: (trackPath: string) => {
        const { audio, volume, isMuted, currentTrack } = get();

        if (!audio) {
          get().initAudio();
        }

        const audioElement = get().audio;
        if (!audioElement) return;

        // 같은 트랙이면 재생만
        if (currentTrack === trackPath && audioElement.paused) {
          audioElement.play().catch((err) => {
            console.log('BGM play failed (same track):', err.name);
            set({ isPlaying: false });
          });
          return;
        }

        // 다른 트랙이면 변경
        if (currentTrack !== trackPath) {
          console.log('Loading BGM:', trackPath);

          // 에러 핸들러
          audioElement.onerror = (e) => {
            console.error('BGM load error:', trackPath, e);
            set({ isPlaying: false, currentTrack: null });
          };

          // 로드 성공 핸들러
          audioElement.onloadeddata = () => {
            console.log('BGM loaded successfully:', trackPath);
          };

          audioElement.src = trackPath;
          audioElement.volume = isMuted ? 0 : volume;
          audioElement.load(); // 명시적으로 로드

          audioElement.play().then(() => {
            console.log('BGM playing:', trackPath);
            set({ currentTrack: trackPath, isPlaying: true });
          }).catch((err) => {
            console.log('BGM play failed:', err.name, trackPath);
            set({ isPlaying: false });
          });
        }
      },

      stopBGM: () => {
        const { audio } = get();
        if (audio) {
          audio.pause();
          set({ isPlaying: false });
        }
      },

      playRandomLobbyBGM: () => {
        const { lobbyTracks } = get();
        const randomIndex = Math.floor(Math.random() * lobbyTracks.length);
        const randomTrack = lobbyTracks[randomIndex];
        get().playBGM(randomTrack);
      },
    }),
    {
      name: 'audio-settings',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
      }),
    }
  )
);
