import { useEffect, useRef, useState, useMemo } from 'react';
import { RANKS } from './data';
import { getRankForWins, getProgressInRank } from './useRank';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import gemImage from '@assets/image_1757366539717.png';

export function RankModal({ 
  open, 
  onClose, 
  wins 
}: {
  open: boolean; 
  onClose: () => void; 
  wins: number;
}) {
  const current = getRankForWins(wins);
  const currentIndex = RANKS.findIndex(rank => rank.key === current.key);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState(0);
  const { toast } = useToast();

  // Fetch claimed rewards
  const { data: claimedRewards = [] } = useQuery<{ userId: string; rankKey: string; gemsAwarded: number; claimedAt: string }[]>({
    queryKey: ['/api/ranks/claimed-rewards'],
    enabled: open,
  });

  // Fetch season countdown
  const { data: timeRemaining } = useQuery({
    queryKey: ['/api/seasons/time-remaining'],
    refetchInterval: 60000, // Update every minute
    enabled: open,
  });

  // Calculate time remaining for display
  const { daysRemaining, hoursRemaining } = useMemo(() => {
    const seasonTime = timeRemaining as { days: number; hours: number; minutes: number } | undefined;
    return {
      daysRemaining: seasonTime?.days ?? 30,
      hoursRemaining: seasonTime?.hours ?? 0
    };
  }, [timeRemaining]);

  // Claim reward mutation
  const claimMutation = useMutation({
    mutationFn: async ({ rankKey, gemsAwarded }: { rankKey: string; gemsAwarded: number }) => {
      const response = await apiRequest('POST', '/api/ranks/claim-reward', { rankKey, gemsAwarded });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ranks/claimed-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim reward',
        variant: 'destructive',
      });
    },
  });

  // Reset image errors when modal opens to allow retry
  useEffect(() => {
    if (open) {
      setImageErrors(new Set());
    }
  }, [open]);

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

  // Handle touch events for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart;
    
    // If swipe down is more than 50px, close the modal
    if (diff > 50) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(0);
  };

  // Auto scroll to current rank when modal opens
  useEffect(() => {
    if (open && scrollRef.current && currentIndex >= 0) {
      const container = scrollRef.current;
      const cardWidth = 280; // Width of each card
      const gap = 16; // Gap between cards
      const containerWidth = container.offsetWidth;
      
      // Center the current card in the viewport
      const scrollPosition = (currentIndex * (cardWidth + gap)) - (containerWidth / 2) + (cardWidth / 2);
      
      setTimeout(() => {
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
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
      <div 
        className="absolute inset-x-0 bottom-0 h-[58%] rounded-t-3xl bg-zinc-950/95 backdrop-blur border-t border-white/10 shadow-2xl transform transition-all duration-300 ease-out"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* Horizontal Rank Cards */}
        <div className="flex-1 overflow-hidden pb-4">
          <div 
            ref={scrollRef}
            className="flex gap-4 px-6 h-full overflow-x-auto overflow-y-hidden"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none'
            }}
          >
            {RANKS.map((rank, index) => {
              const isCurrent = rank.key === current.key;
              const isAchieved = wins >= rank.min;
              const progress = rank.key === current.key ? 
                getProgressInRank(wins, rank) : 
                (wins > rank.max ? 1 : 0);
              
              return (
                <div
                  key={rank.key}
                  className={`flex-shrink-0 rounded-2xl p-6 border-2 transition-all duration-200 ${
                    isCurrent 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'border-gray-500 shadow-lg shadow-gray-500/20'
                  } bg-[#3b82f600]`}
                  style={{ minWidth: '280px', maxHeight: 'calc(100% - 1rem)' }}
                  data-testid={`rank-card-${rank.key}`}
                >
                  {/* Emoji Icon - Center */}
                  <div className="flex justify-center mb-3">
                    {rank.imgSrc ? (
                      <img 
                        src={rank.imgSrc} 
                        alt={rank.name} 
                        className="h-14 w-14 object-contain drop-shadow-2xl" 
                        onError={() => setImageErrors(prev => new Set(prev).add(rank.key))}
                        style={{ display: imageErrors.has(rank.key) ? 'none' : 'block' }}
                      />
                    ) : null}
                    {(!rank.imgSrc || imageErrors.has(rank.key)) && rank.emoji ? (
                      <span className="text-4xl drop-shadow-2xl">{rank.emoji}</span>
                    ) : null}
                    {(!rank.imgSrc || imageErrors.has(rank.key)) && !rank.emoji ? (
                      <div className="h-14 w-14 bg-zinc-700 rounded-lg flex items-center justify-center">
                        <span className="text-zinc-400 text-xs">?</span>
                      </div>
                    ) : null}
                  </div>
                  {/* Rank Name */}
                  <h3 className="text-lg font-bold text-white text-center mb-3">
                    {rank.name}
                  </h3>
                  {/* Progress Section */}
                  <div className="mb-3">
                    <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-2">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${progress * 100}%`,
                          background: rank.progressColor,
                          boxShadow: progress > 0.1 ? `0 0 8px ${rank.progressColor.includes('gradient') ? 'rgba(220, 38, 38, 0.4)' : rank.progressColor + '66'}` : 'none'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{rank.min.toLocaleString()}</span>
                      <span className="text-white/70">
                        {Number.isFinite(rank.max) ? rank.max.toLocaleString() : '∞'}
                      </span>
                    </div>
                    <div className="text-center text-white/60 text-[17px] mt-[0px] mb-[0px]">
                      Hands won
                    </div>
                  </div>
                  
                  {/* Reward Button */}
                  {rank.gemReward && (() => {
                    const isClaimed = claimedRewards.some(r => r.rankKey === rank.key);
                    const canClaim = isAchieved && !isClaimed;
                    
                    if (isClaimed) {
                      return null;
                    }
                    
                    return (
                      <button
                        onClick={() => {
                          if (canClaim) {
                            claimMutation.mutate({ rankKey: rank.key, gemsAwarded: rank.gemReward! });
                          }
                        }}
                        disabled={!canClaim || claimMutation.isPending}
                        className={`w-full py-2 px-4 rounded-full font-semibold transition-all duration-200 ${
                          canClaim
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        }`}
                        data-testid={`reward-button-${rank.key}`}
                      >
                        {claimMutation.isPending && claimMutation.variables?.rankKey === rank.key ? (
                          'Claiming...'
                        ) : canClaim ? (
                          <span className="flex items-center justify-center gap-1">
                            Claim {rank.gemReward}
                            <img src={gemImage} alt="Gem" className="w-4 h-4 inline-block" />
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            Get {rank.gemReward}
                            <img src={gemImage} alt="Gem" className="w-4 h-4 inline-block" />
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Season Countdown - Fixed at bottom */}
        <div className="px-6 py-4 border-t border-white/10 bg-zinc-950/95">
          <div className="flex items-center justify-center gap-2 text-white/80">
            <Clock className="w-5 h-5" />
            <span className="text-base font-medium">
              Next season in <span className="text-white font-bold">{daysRemaining}d {hoursRemaining}h</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}