import { useEffect } from 'react';
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
  const progress = getProgressInRank(chips, current);

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
      
      {/* Modal Center */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-zinc-950/95 backdrop-blur border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all duration-300 ease-out">
          
          {/* Emoji Icon - Center Top */}
          <div className="flex justify-center mb-6">
            {current.imgSrc ? (
              <img 
                src={current.imgSrc} 
                alt={current.name} 
                className="h-20 w-20 object-contain drop-shadow-2xl" 
              />
            ) : (
              <span className="text-6xl drop-shadow-2xl">{current.emoji}</span>
            )}
          </div>

          {/* Rank Name */}
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            {current.name}
          </h2>

          {/* Progress Section - Same as Profile */}
          <div className="mb-6">
            <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.round(progress * 100)}%`,
                  boxShadow: progress > 0.1 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{current.min.toLocaleString()} chips</span>
              <span className="text-emerald-400 font-medium">
                {Math.round(progress * 100)}%
              </span>
              <span className="text-white/70">
                {Number.isFinite(current.max) ? current.max.toLocaleString() : '∞'} chips
              </span>
            </div>
          </div>

          {/* Current Chips */}
          <div className="text-center">
            <p className="text-zinc-400 text-sm mb-1">Your chips</p>
            <p className="text-white font-bold text-lg">{chips.toLocaleString()}</p>
          </div>

        </div>
      </div>
    </div>
  );
}