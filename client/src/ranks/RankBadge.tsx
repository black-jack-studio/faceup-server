import { useState, useEffect } from 'react';
import { getRankForWins, getProgressInRank } from './useRank';
import { RankModal } from './RankModal';
import { useQuery } from '@tanstack/react-query';
import { RANKS } from './data';

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
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-4 rounded-xl bg-black border border-white/10 hover:bg-white/5 px-5 py-4 transition-all duration-200 hover:scale-[1.02] w-full max-w-md relative"
        data-testid="rank-badge-button"
      >
        {/* Notification Badge */}
        {unclaimedCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse z-10">
            {unclaimedCount}
          </div>
        )}
        {/* Rank Icon */}
        <div className="flex-shrink-0">
          {rank.imgSrc ? (
            <img 
              src={rank.imgSrc} 
              alt={rank.name} 
              className="h-12 w-12 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-200" 
              onError={() => setImageError(true)}
              style={{ display: imageError ? 'none' : 'block' }}
            />
          ) : null}
          {(!rank.imgSrc || imageError) && rank.emoji ? (
            <span className="text-3xl drop-shadow-lg group-hover:scale-110 transition-transform duration-200">
              {rank.emoji}
            </span>
          ) : null}
          {(!rank.imgSrc || imageError) && !rank.emoji ? (
            <div className="h-12 w-12 bg-zinc-700 rounded-lg flex items-center justify-center">
              <span className="text-zinc-400 text-xs">?</span>
            </div>
          ) : null}
        </div>

        {/* Rank Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-left">
              <div className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">
                {rank.name}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full">
            <div className="h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{ 
                  width: `${progress * 100}%`,
                  background: rank.progressColor,
                  boxShadow: progress > 0.1 ? `0 0 10px ${rank.progressColor.includes('gradient') ? 'rgba(220, 38, 38, 0.5)' : rank.progressColor + '80'}` : 'none'
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-zinc-500">
              <span>{rank.min.toLocaleString()}</span>
              <span>
                {Number.isFinite(rank.max) ? rank.max.toLocaleString() : '∞'}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 text-zinc-400 group-hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <RankModal open={open} onClose={() => setOpen(false)} wins={wins} />
    </>
  );
}