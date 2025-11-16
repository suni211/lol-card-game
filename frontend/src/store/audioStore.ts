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
      isMuted: false,
      isPlaying: false,
      currentTrack: null,
      audio: null,
      lobbyTracks: Array.from({ length: 99 }, (_, i) => `/bgm/lobby${i + 1}.ogg`),

      initAudio: () => {
        const audio = new Audio();
        audio.loop = true;
        audio.volume = get().isMuted ? 0 : get().volume;
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
          audioElement.play().catch(err => console.error('Audio play error:', err));
          set({ isPlaying: true });
          return;
        }

        // 다른 트랙이면 변경
        if (currentTrack !== trackPath) {
          audioElement.src = trackPath;
          audioElement.volume = isMuted ? 0 : volume;
          audioElement.play().catch(err => console.error('Audio play error:', err));
          set({ currentTrack: trackPath, isPlaying: true });
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
