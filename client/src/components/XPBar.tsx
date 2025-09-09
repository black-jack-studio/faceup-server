import React from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/user-store';

interface XPBarProps {
  showLevel?: boolean;
  className?: string;
}

export default function XPBar({ showLevel = true, className = "" }: XPBarProps) {
  const user = useUserStore((state) => state.user);
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const level = user?.level ?? 1;
  const xpToNextLevel = 500 - currentLevelXP;
  const progressPercentage = (currentLevelXP / 500) * 100;

  return (
    <div className={`bg-white/5 rounded-2xl p-4 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        {showLevel && (
          <div className="text-white font-bold">
            Niveau {level}
          </div>
        )}
        <div className="text-white/70 text-sm">
          {currentLevelXP} / 500 XP
        </div>
      </div>
      
      <div className="relative">
        <div className="w-full bg-white/10 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full shadow-lg"
            style={{ width: `${progressPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full opacity-50" />
      </div>
      
      <div className="text-white/60 text-xs mt-2 text-center">
        {xpToNextLevel} XP jusqu'au niveau suivant
      </div>
    </div>
  );
}