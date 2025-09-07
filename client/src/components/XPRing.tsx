import React, { useMemo } from 'react';
import { useUserStore } from '@/store/user-store';

type Props = { size?: number; stroke?: number };

export default function XPRing({ size = 40, stroke = 4 }: Props) {
  const user = useUserStore((state) => state.user);
  const xp = user?.xp ?? 0;
  // cible prochain niveau (ex: palier 1000 XP par niveau) -> adapter si vous avez une util
  const target = 1000; // Based on the level calculation in home.tsx: Math.floor(xp / 1000) + 1
  const currentLevelXp = xp % 1000; // XP within current level

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, currentLevelXp / target));
  const dash = useMemo(() => `${circ * ratio} ${circ}`, [circ, ratio]);

  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="xp-ring">
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
          <div className="text-sm font-semibold text-white" data-testid="total-xp">
            {xp.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}