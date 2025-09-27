import { useState } from 'react';
import { getRankForChips, getProgressInRank } from './useRank';
import { RankModal } from './RankModal';

export function RankBadge({ chips }: { chips: number }) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const rank = getRankForChips(chips);
  const progress = getProgressInRank(chips, rank);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-4 rounded-xl bg-black border border-white/10 hover:bg-white/5 px-5 py-4 transition-all duration-200 hover:scale-[1.02] w-full max-w-md"
        data-testid="rank-badge-button"
      >
        {/* Rank Icon */}
        <div className="flex-shrink-0">
          {rank.imgSrc && !imageError ? (
            <img 
              src={rank.imgSrc} 
              alt={rank.name} 
              className="h-12 w-12 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-200" 
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-3xl drop-shadow-lg group-hover:scale-110 transition-transform duration-200">
              {rank.emoji}
            </span>
          )}
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
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all duration-500 ease-out shadow-lg"
                style={{ 
                  width: `${progress * 100}%`,
                  boxShadow: progress > 0.1 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
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

      <RankModal open={open} onClose={() => setOpen(false)} chips={chips} />
    </>
  );
}