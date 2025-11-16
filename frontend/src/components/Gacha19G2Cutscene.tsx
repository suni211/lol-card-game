import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Trophy, Zap } from 'lucide-react';

interface Gacha19G2CutsceneProps {
  onComplete: () => void;
  isGuaranteed?: boolean;
}

export default function Gacha19G2Cutscene({ onComplete, isGuaranteed }: Gacha19G2CutsceneProps) {
  const [stage, setStage] = useState<'intro' | 'reveal' | 'complete'>('intro');

  useEffect(() => {
    // Play sound effect
    const audio = new Audio('/sounds/19g2_reveal.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});

    // Intro stage
    const introTimer = setTimeout(() => {
      setStage('reveal');
    }, 2000);

    // Reveal stage
    const revealTimer = setTimeout(() => {
      setStage('complete');
    }, 4000);

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-blue-400 rounded-full"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: 0,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6" />
              <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-400 mb-4">
                2019 G2
              </h1>
              <p className="text-2xl text-blue-300 font-semibold">
                GOLDEN ROAD
              </p>
              {isGuaranteed && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-yellow-400 text-xl mt-4 font-bold"
                >
                  ★ 천장 달성! ★
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative"
          >
            {/* Lightning effects */}
            <div className="absolute inset-0">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2"
                  initial={{ opacity: 0, rotate: i * 45, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: [0, Math.cos((i * 45 * Math.PI) / 180) * 300],
                    y: [0, Math.sin((i * 45 * Math.PI) / 180) * 300],
                  }}
                  transition={{
                    duration: 1,
                    repeat: 2,
                    delay: i * 0.1,
                  }}
                >
                  <Zap className="w-12 h-12 text-blue-400" />
                </motion.div>
              ))}
            </div>

            {/* Center glow */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 3, 2] }}
              transition={{ duration: 1.5 }}
            >
              <div className="w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50" />
            </motion.div>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="relative z-10"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-8"
                >
                  {[...Array(12)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className="absolute w-8 h-8 text-yellow-400"
                      style={{
                        left: `${50 + 40 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                        top: `${50 + 40 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </motion.div>

                <div className="text-9xl mb-4">🏆</div>
                <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 mb-2">
                  G2
                </h2>
                <p className="text-3xl text-blue-300 font-bold">2019</p>
              </div>
            </motion.div>

            {/* Particle burst */}
            <div className="absolute inset-0">
              {[...Array(100)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 800,
                    y: (Math.random() - 0.5) * 800,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 2,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {stage === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <h3 className="text-5xl font-bold text-white mb-6">
                서양권 역대 최강의 팀
              </h3>
              <p className="text-2xl text-blue-300 font-semibold">
                골든로드에 가장 가까웠던 전설
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
