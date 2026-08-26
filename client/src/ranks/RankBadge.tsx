import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRankForWins, getProgressInRank } from './useRank';
import { RankModal } from './RankModal';
import { useQuery } from '@tanstack/react-query';
import { RANKS } from './data';
import { triggerHapticTick } from '@/lib/haptics';

export function RankBadge({ wins }: { wins: number }) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const rank = getRankForWins(wins);
  const progress = getProgressInRank(wins, rank);

  // Fetch claimed rewards to show notification
  const { data: claimedRewards = [] } = useQuery<{ userId: string; rankKey: string; gemsAwarded: number; claimedAt: string }[]>({
    queryKey: ['/api/ranks/claimed-rewards'],
  });

  // Calculate how many unclaimed rewards are available
  const unclaimedCount = RANKS.filter(r => {
    const isAchieved = wins >= r.min;
    const hasReward = r.gemReward && r.gemReward > 0;
    const isClaimed = claimedRewards.some(claimed => claimed.rankKey === r.key);
    return isAchieved && hasReward && !isClaimed;
  }).length;

  // Reset image error when imgSrc changes
  useEffect(() => {
    setImageError(false);
  }, [rank.imgSrc]);

  return (
    <>
      {/* Compact single-row treatment (matches the Friends/Emotes/Card back rows on Profile,
          see profile.tsx) instead of the old filled-card-with-full-width-bar-below layout —
          icon, name + a fixed "Rank progress" caption, then a short bar and chevron inline.
          No hover: — same iOS WebView double-tap issue as those rows. */}
      <button
        onClick={() => { triggerHapticTick(); setOpen(true); }}
        className="group flex items-center gap-3 rounded-[28px] border-2 border-white/15 active:bg-white/5 transition-colors px-5 py-4 w-full relative"
        data-testid="rank-badge-button"
      >
        {/* Notification Badge */}
        {unclaimedCount > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 rounded-full h-3 w-3 shadow-lg z-10 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none">
              <rect x="5.55" y="2.8" width="0.9" height="4.3" rx="0.45" fill="white" fillOpacity="0.85" />
              <circle cx="6" cy="8.6" r="0.55" fill="white" fillOpacity="0.85" />
            </svg>
          </motion.div>
        )}
        {/* Rank Icon */}
        <div className="flex-shrink-0">
          {rank.imgSrc ? (
            <img
              src={rank.imgSrc}
              alt={rank.name}
              className="h-9 w-9 object-contain drop-shadow-lg"
              onError={() => setImageError(true)}
              style={{ display: imageError ? 'none' : 'block' }}
            />
          ) : null}
          {(!rank.imgSrc || imageError) && rank.emoji ? (
            <span className="text-2xl drop-shadow-lg">
              {rank.emoji}
            </span>
          ) : null}
          {(!rank.imgSrc || imageError) && !rank.emoji ? (
            <div className="h-9 w-9 bg-zinc-700 rounded-lg flex items-center justify-center">
              <span className="text-zinc-400 text-xs">?</span>
            </div>
          ) : null}
        </div>

        {/* Rank Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-extrabold text-white truncate leading-none">
            {rank.name}
          </div>
          <div className="text-[11px] font-semibold text-white/45 mt-1">Rank progress</div>
        </div>

        {/* Short inline progress bar */}
        <div className="flex-shrink-0 w-16 h-[5px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: rank.progressColor,
            }}
          />
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 text-white/35">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <RankModal open={open} onClose={() => setOpen(false)} wins={wins} />
    </>
  );
}