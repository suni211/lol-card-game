import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

export default function PremiumButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
}: PremiumButtonProps) {
  const variants = {
    primary: 'from-primary-500 via-primary-600 to-purple-600 hover:from-primary-600 hover:via-primary-700 hover:to-purple-700 shadow-primary-500/50',
    secondary: 'from-gray-500 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 shadow-gray-500/50',
    success: 'from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 shadow-green-500/50',
    danger: 'from-red-500 via-rose-600 to-pink-600 hover:from-red-600 hover:via-rose-700 hover:to-pink-700 shadow-red-500/50',
    gold: 'from-yellow-400 via-amber-500 to-orange-500 hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 shadow-yellow-500/50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${variants[variant]}
        ${sizes[size]}
        text-white font-bold rounded-xl
        shadow-lg hover:shadow-2xl
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        transform-gpu
        ${className}
      `}
    >
      {/* Shine effect */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
      />

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl blur-xl opacity-50 bg-gradient-to-br from-white/20 to-transparent" />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        {icon && <span>{icon}</span>}
        <span className="drop-shadow-lg">{children}</span>
      </div>

      {/* Border glow */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
    </motion.button>
  );
}
