import { useEffect, useRef } from 'react';
import { RANKS } from './data';
import { getRankForChips, getProgressInRank } from './useRank';

export function RankModal({ 
  open, 
  onClose, 
  chips 
}: {
  open: boolean; 
  onClose: () => void; 
  chips: number;
}) {
  const current = getRankForChips(chips);
  const currentIndex = RANKS.findIndex(rank => rank.key === current.key);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [open, onClose]);

  // Auto scroll to current rank when modal opens
  useEffect(() => {
    if (open && scrollRef.current && currentIndex >= 0) {
      const container = scrollRef.current;
      const cardWidth = 280; // Approximate width of each card
      const gap = 16; // Gap between cards
      const scrollPosition = currentIndex * (cardWidth + gap);
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [open, currentIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="rank-modal">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        data-testid="modal-overlay"
      />
      
      {/* Bottom Sheet */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-t-3xl bg-zinc-950/95 backdrop-blur border-t border-white/10 shadow-2xl transform transition-all duration-300 ease-out">
        
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-6">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* Horizontal Rank Cards */}
        <div className="h-full overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex gap-4 px-6 h-full overflow-x-auto overflow-y-hidden pb-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {RANKS.map((rank, index) => {
              const isCurrent = rank.key === current.key;
              const isAchieved = chips >= rank.min;
              const progress = rank.key === current.key ? 
                getProgressInRank(chips, rank) : 
                (chips >= rank.min ? 1 : 0);
              
              return (
                <div
                  key={rank.key}
                  className={`flex-shrink-0 w-70 bg-zinc-900/80 rounded-2xl p-6 border-2 transition-all duration-200 ${
                    isCurrent 
                      ? 'border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/20' 
                      : isAchieved
                        ? 'border-white/20 bg-white/5'
                        : 'border-zinc-600 bg-zinc-800/50 opacity-70'
                  }`}
                  style={{ minWidth: '280px' }}
                  data-testid={`rank-card-${rank.key}`}
                >
                  {/* Status Badge */}
                  {isCurrent && (
                    <div className="text-center mb-4">
                      <span className="bg-emerald-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                        Your Rank
                      </span>
                    </div>
                  )}
                  {!isCurrent && isAchieved && (
                    <div className="text-center mb-4">
                      <span className="bg-blue-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                        Achieved
                      </span>
                    </div>
                  )}
                  {!isAchieved && (
                    <div className="text-center mb-4">
                      <span className="bg-zinc-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Not Yet
                      </span>
                    </div>
                  )}

                  {/* Emoji Icon - Center */}
                  <div className="flex justify-center mb-4">
                    {rank.imgSrc ? (
                      <img 
                        src={rank.imgSrc} 
                        alt={rank.name} 
                        className="h-16 w-16 object-contain drop-shadow-2xl" 
                      />
                    ) : (
                      <span className="text-5xl drop-shadow-2xl">{rank.emoji}</span>
                    )}
                  </div>

                  {/* Rank Name */}
                  <h3 className="text-xl font-bold text-white text-center mb-4">
                    {rank.name}
                  </h3>

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${Math.round(progress * 100)}%`,
                          boxShadow: progress > 0.1 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">{rank.min.toLocaleString()}</span>
                      <span className="text-emerald-400 font-medium">
                        {Math.round(progress * 100)}%
                      </span>
                      <span className="text-white/70">
                        {Number.isFinite(rank.max) ? rank.max.toLocaleString() : '∞'}
                      </span>
                    </div>
                  </div>

                  {/* Range */}
                  <div className="text-center text-zinc-400 text-sm">
                    {Number.isFinite(rank.max) ? 
                      `${rank.min.toLocaleString()} - ${rank.max.toLocaleString()} chips` : 
                      `${rank.min.toLocaleString()}+ chips`
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .w-70 {
          width: 280px;
        }
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}