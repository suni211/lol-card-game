import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  gradient?: 'blue' | 'purple' | 'gold' | 'rainbow' | 'dark';
  glow?: boolean;
  hover3D?: boolean;
  onClick?: () => void;
}

export default function PremiumCard({
  children,
  className = '',
  gradient = 'blue',
  glow = true,
  hover3D = true,
  onClick,
}: PremiumCardProps) {
  const gradients = {
    blue: 'from-blue-500/10 via-cyan-500/10 to-blue-500/10',
    purple: 'from-purple-500/10 via-pink-500/10 to-purple-500/10',
    gold: 'from-yellow-500/10 via-amber-500/10 to-yellow-500/10',
    rainbow: 'from-red-500/10 via-yellow-500/10 via-green-500/10 via-blue-500/10 to-purple-500/10',
    dark: 'from-gray-800/50 via-gray-700/50 to-gray-800/50',
  };

  const glowColors = {
    blue: 'shadow-blue-500/20',
    purple: 'shadow-purple-500/20',
    gold: 'shadow-yellow-500/30',
    rainbow: 'shadow-purple-500/20',
    dark: 'shadow-gray-900/30',
  };

  return (
    <motion.div
      whileHover={
        hover3D
          ? {
              scale: 1.03,
              rotateX: 5,
              rotateY: 5,
              z: 50,
            }
          : { scale: 1.02 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`
        relative
        bg-white dark:bg-gray-800
        rounded-2xl
        border border-gray-200 dark:border-gray-700
        ${glow ? `shadow-2xl ${glowColors[gradient]}` : 'shadow-lg'}
        overflow-hidden
        transform-gpu perspective-1000
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Gradient overlay */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${gradients[gradient]}
          opacity-0 hover:opacity-100
          transition-opacity duration-500
        `}
      />

      {/* Shimmer effect */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 5,
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Border highlight */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none" />
    </motion.div>
  );
}
