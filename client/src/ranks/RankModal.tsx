import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { RANKS } from './data';
import { getRankForWins, getProgressInRank } from './useRank';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/store/user-store';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import gemImage from '@assets/gem_diamond_blue_2026-08-25.png';
import { formatFullNumber } from '@/lib/formatUtils';

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
  const { toast } = useToast();
  const dragControls = useDragControls();

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

  // Claim reward mutation — only rankKey is sent; the server looks up the reward
  // amount itself from the user's real hands-won total, it never trusts a
  // client-supplied gem amount.
  const claimMutation = useMutation({
    mutationFn: async ({ rankKey }: { rankKey: string }) => {
      const response = await apiRequest('POST', '/api/ranks/claim-reward', { rankKey });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ranks/claimed-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      // Invalidating the React Query cache above doesn't touch the Zustand user store — the
      // gem count shown everywhere (header, shop, ...) reads user.gems from there, so it
      // stayed stuck at its pre-claim value until a full app relaunch. The server already
      // returns the confirmed new total, so just apply it directly.
      const currentUser = useUserStore.getState().user;
      if (currentUser && typeof data?.totalGems === 'number') {
        useUserStore.setState({ user: { ...currentUser, gems: data.totalGems } });
      }
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

  // Dragging the sheet down past a distance or with enough flick velocity closes it;
  // otherwise framer-motion springs it back to rest on its own (no manual snap-back logic
  // needed — that's what `dragConstraints` + the animate-on-release behavior gives for free).
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
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

  // z-[999] (not z-50): the app's bottom nav bar is also z-50 and fixed — with a tied
  // z-index the later-mounted nav bar wins the stack and painted over this modal's
  // bottom edge, hiding the season countdown behind it even though it was correctly
  // laid out. Matches the z-[999] already used elsewhere (profile.tsx, shop.tsx) for
  // anything that must sit above the nav bar.
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999]" data-testid="rank-modal">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            data-testid="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          {/* Bottom Sheet */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[62%] rounded-t-3xl bg-zinc-950/95 backdrop-blur border-t border-white/10 shadow-2xl flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >

            {/* Handle bar — the only part of the sheet that starts a drag, so dragging
                through the horizontally-scrolling rank cards below isn't affected. */}
            <div
              className="flex justify-center pt-4 pb-4 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
            </div>

        {/* Horizontal Rank Cards. min-h-0 is required here: without it, a flex child that
            also has overflow content refuses to shrink below its content's intrinsic
            height, so flex-1 doesn't actually cap it — the season countdown row below
            would then get pushed past the sheet's fixed h-[58%] and go invisible on
            shorter screens instead of staying pinned at the bottom. */}
        <div className="flex-1 min-h-0 overflow-hidden pb-2">
          <div 
            ref={scrollRef}
            className="flex items-start gap-4 px-6 h-full overflow-x-auto overflow-y-hidden"
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
                      ? 'border-white shadow-lg shadow-white/30'
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
                      <span className="text-white/70">{formatFullNumber(rank.min)}</span>
                      <span className="text-white/70">
                        {Number.isFinite(rank.max) ? formatFullNumber(rank.max) : '∞'}
                      </span>
                    </div>
                    <div className="text-center text-white/60 text-[17px] mt-[0px] mb-[0px]">
                      Hands won
                    </div>
                  </div>
                  
                  {/* Reward Button */}
                  {(() => {
                    if (!rank.gemReward) {
                      return (
                        <div
                          className="w-full py-2 px-4 rounded-full font-semibold border-2 border-transparent invisible"
                          aria-hidden="true"
                        >
                          spacer
                        </div>
                      );
                    }

                    const isClaimed = claimedRewards.some(r => r.rankKey === rank.key);
                    const canClaim = isAchieved && !isClaimed;

                    if (isClaimed) {
                      return (
                        <div
                          className="w-full py-2 px-4 rounded-full font-semibold border-2 border-white/10 bg-white/5 text-white/50 flex items-center justify-center gap-1"
                          data-testid={`reward-claimed-${rank.key}`}
                        >
                          Claimed
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={() => {
                          if (canClaim) {
                            claimMutation.mutate({ rankKey: rank.key });
                          }
                        }}
                        disabled={!canClaim || claimMutation.isPending}
                        className={`w-full py-2 px-4 rounded-full font-semibold transition-all duration-200 ${
                          canClaim
                            ? ''
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        }`}
                        style={
                          canClaim
                            ? {
                              background: '#FFFFFF',
                              color: '#15161A',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                            }
                            : undefined
                        }
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
                            Locked
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

        {/* Season Countdown - pinned at the bottom of the flex column. Extra bottom
            padding (+ safe-area inset for notched devices) so it doesn't sit flush
            against the app's own bottom nav bar. */}
        <div
          className="flex-shrink-0 px-6 pt-6 border-t border-white/10 bg-zinc-950/95"
          style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        >
          <div className="flex items-center justify-center gap-2 text-white/80">
            <Clock className="w-5 h-5" />
            <span className="text-base font-medium">
              Next season in <span className="text-white font-bold">{daysRemaining}d {hoursRemaining}h</span>
            </span>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}