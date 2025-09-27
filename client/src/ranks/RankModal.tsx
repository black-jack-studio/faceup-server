import { useEffect, useState, useRef } from 'react';
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
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const selectedRank = RANKS[selectedIndex];
  const progress = getRankForChips(chips).key === selectedRank.key ? 
    getProgressInRank(chips, selectedRank) : 
    (chips >= selectedRank.min ? 1 : 0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset to current rank when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(currentIndex);
    }
  }, [open, currentIndex]);

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

  // Auto scroll to selected rank
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      const container = scrollRef.current;
      const selectedElement = container.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        const containerWidth = container.offsetWidth;
        const elementLeft = selectedElement.offsetLeft;
        const elementWidth = selectedElement.offsetWidth;
        const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

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
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* Selected Rank Display */}
        <div className="px-6 py-4 text-center">
          {/* Emoji Icon - Center Top */}
          <div className="flex justify-center mb-4">
            {selectedRank.imgSrc ? (
              <img 
                src={selectedRank.imgSrc} 
                alt={selectedRank.name} 
                className="h-16 w-16 object-contain drop-shadow-2xl" 
              />
            ) : (
              <span className="text-5xl drop-shadow-2xl">{selectedRank.emoji}</span>
            )}
          </div>

          {/* Rank Name */}
          <h2 className="text-xl font-bold text-white mb-4">
            {selectedRank.name}
          </h2>

          {/* Progress Section */}
          <div className="mb-4 max-w-xs mx-auto">
            <div className="bg-white/10 rounded-full h-2.5 overflow-hidden mb-2">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.round(progress * 100)}%`,
                  boxShadow: progress > 0.1 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none'
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">{selectedRank.min.toLocaleString()}</span>
              <span className="text-emerald-400 font-medium">
                {Math.round(progress * 100)}%
              </span>
              <span className="text-white/60">
                {Number.isFinite(selectedRank.max) ? selectedRank.max.toLocaleString() : '∞'}
              </span>
            </div>
          </div>

          {/* Current Status */}
          {selectedRank.key === current.key && (
            <div className="text-emerald-400 text-sm font-medium mb-2">Your current rank</div>
          )}
          {chips >= selectedRank.min && chips <= selectedRank.max && selectedRank.key !== current.key && (
            <div className="text-blue-400 text-sm font-medium mb-2">Achieved</div>
          )}
          {chips < selectedRank.min && (
            <div className="text-zinc-400 text-sm font-medium mb-2">Not yet achieved</div>
          )}
        </div>

        {/* Horizontal Rank Selector */}
        <div className="px-4 pb-6">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-600"
            style={{ scrollbarWidth: 'thin' }}
          >
            {RANKS.map((rank, index) => {
              const isSelected = index === selectedIndex;
              const isCurrent = rank.key === current.key;
              const isAchieved = chips >= rank.min;
              
              return (
                <button
                  key={rank.key}
                  onClick={() => setSelectedIndex(index)}
                  className={`flex-shrink-0 w-16 h-20 rounded-xl border-2 transition-all duration-200 p-2 ${
                    isSelected 
                      ? 'border-emerald-400 bg-emerald-400/20 scale-110' 
                      : isCurrent
                        ? 'border-blue-400 bg-blue-400/10'
                        : isAchieved
                          ? 'border-white/20 bg-white/5 hover:bg-white/10'
                          : 'border-zinc-600 bg-zinc-800/50 opacity-60'
                  }`}
                  data-testid={`rank-selector-${rank.key}`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    {rank.imgSrc ? (
                      <img 
                        src={rank.imgSrc} 
                        alt={rank.name} 
                        className="h-8 w-8 object-contain mb-1" 
                      />
                    ) : (
                      <span className="text-lg mb-1">{rank.emoji}</span>
                    )}
                    <span className="text-xs text-white/80 font-medium leading-tight text-center">
                      {rank.name.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}