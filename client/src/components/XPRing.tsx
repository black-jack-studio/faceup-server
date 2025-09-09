import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/user-store';

type Props = { size?: number; stroke?: number; onClick?: () => void };

export default function XPRing({ size = 40, stroke = 4, onClick }: Props) {
  const user = useUserStore((state) => state.user);
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const level = user?.level ?? 1;
  const target = 500; // XP needed for next level
  const currentLevelXp = currentLevelXP; // XP within current level (0-499)

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, currentLevelXp / target));
  const dash = useMemo(() => `${circ * ratio} ${circ}`, [circ, ratio]);

  return (
    <motion.div 
      className={`relative ${onClick ? 'cursor-pointer' : ''}`} 
      style={{ width: size, height: size }} 
      data-testid="xp-ring"
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#B5F3C7"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash}
          fill="none"
          className="transition-[stroke-dasharray] duration-300 ease-out drop-shadow-[0_0_4px_rgba(181,243,199,0.35)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-sm font-semibold text-white" data-testid="current-level-xp">
            {currentLevelXP}
          </div>
        </div>
      </div>
    </motion.div>
  );
}