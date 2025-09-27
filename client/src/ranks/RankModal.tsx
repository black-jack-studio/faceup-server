import { useEffect } from 'react';
import { RANKS, Rank } from './data';
import { getRankForChips } from './useRank';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="rank-modal">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        data-testid="modal-overlay"
      />
      
      {/* Bottom sheet */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/2 rounded-t-2xl bg-zinc-950/95 backdrop-blur border-t border-white/10 shadow-2xl transform transition-transform duration-300 ease-out"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 h-full overflow-hidden">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">Ranks</h2>
          
          <div className="h-[calc(100%-4rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
            <ul className="space-y-3">
              {RANKS.map(rank => {
                const isCurrent = rank.key === current.key;
                const range = Number.isFinite(rank.max) ? 
                  `${rank.min.toLocaleString()}–${rank.max.toLocaleString()}` : 
                  `${rank.min.toLocaleString()}+`;
                
                return (
                  <li 
                    key={rank.key}
                    className={`flex items-center justify-between rounded-xl px-4 py-4 transition-all ${
                      isCurrent 
                        ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 ring-2 ring-emerald-400/50 shadow-lg' 
                        : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
                    }`}
                    data-testid={`rank-item-${rank.key}`}
                  >
                    <div className="flex items-center gap-4">
                      {rank.imgSrc ? (
                        <img 
                          src={rank.imgSrc} 
                          alt={rank.name} 
                          className="h-10 w-10 object-contain drop-shadow-lg" 
                        />
                      ) : (
                        <span className="text-3xl drop-shadow-lg">{rank.emoji}</span>
                      )}
                      <div>
                        <span className={`font-semibold ${isCurrent ? 'text-emerald-300' : 'text-white'}`}>
                          {rank.name}
                        </span>
                        {isCurrent && (
                          <div className="text-sm text-emerald-400 font-medium">Your current rank</div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-zinc-400 font-mono">{range} chips</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}