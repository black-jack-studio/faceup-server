import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useUserStore } from '@/store/user-store';

type Props = { size?: number; stroke?: number; onClick?: () => void };

export default function XPRing({ size = 40, stroke = 4, onClick }: Props) {
  const user = useUserStore((state) => state.user);
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const level = user?.level ?? 1;
  const target = 100; // XP needed for next level
  const currentLevelXp = currentLevelXP; // XP within current level (0-499)

  const radius = (size - stroke) / 2;
  const ratio = Math.max(0, Math.min(1, currentLevelXp / target));

  // Replays the fill from empty every time Home *becomes* the active tab, same trick as
  // Shop's Lucky Reels preview spin (see shop.tsx) — Home/Shop/Profile are all always mounted
  // (App.tsx's TabCarousel), so a mount effect here would only ever fire once per app session.
  // Watching `location` for "just became /" instead fires on every arrival, tab switch or real
  // navigation back alike.
  const [location] = useLocation();
  const [replayId, setReplayId] = useState(0);
  useEffect(() => {
    if (location !== '/') return;
    setReplayId((id) => id + 1);
  }, [location]);

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
        <defs>
          <linearGradient id="xp-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          key={replayId}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#xp-ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          className="drop-shadow-[0_0_4px_rgba(56,189,248,0.35)]"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-bold text-white text-[18px]" data-testid="current-level">
            {level}
          </div>
        </div>
      </div>
    </motion.div>
  );
}