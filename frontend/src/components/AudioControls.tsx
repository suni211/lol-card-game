import React, { useEffect } from 'react';
import { useAudioStore } from '../store/audioStore';
import { Volume2, VolumeX } from 'lucide-react';

export const AudioControls: React.FC = () => {
  const { volume, isMuted, setVolume, toggleMute, initAudio } = useAudioStore();

  useEffect(() => {
    initAudio();
  }, [initAudio]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg p-3 shadow-lg flex items-center gap-3 z-50">
      <button
        onClick={toggleMute}
        className="text-white hover:text-yellow-400 transition-colors"
        title={isMuted ? '음소거 해제' : '음소거'}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          title="음량 조절"
        />
        <span className="text-white text-sm w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #facc15;
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #facc15;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .slider::-webkit-slider-runnable-track {
          background: linear-gradient(to right,
            #facc15 0%,
            #facc15 ${volume * 100}%,
            #4b5563 ${volume * 100}%,
            #4b5563 100%);
          height: 8px;
          border-radius: 4px;
        }

        .slider::-moz-range-track {
          background: #4b5563;
          height: 8px;
          border-radius: 4px;
        }

        .slider::-moz-range-progress {
          background: #facc15;
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
