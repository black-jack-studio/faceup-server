import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, HelpCircle } from 'lucide-react';
import { ArrowLeft } from '@/icons';
import { SpinningClock } from '@/components/SpinningClock';
import { BiSolidZap } from 'react-icons/bi';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import Coin from '@/icons/Coin';
import Gem from '@/icons/Gem';
import SwapIcon from '@/components/icons/SwapIcon';
import { Check } from 'lucide-react';
import chestWood from '@assets/battlepass_chests/chest_wood_1787823960.png';
import chestSilver from '@assets/battlepass_chests/chest_silver_1787823960.png';
import chestGold from '@assets/battlepass_chests/chest_gold_1787823960.png';
import chestPurple from '@assets/battlepass_chests/chest_purple_1787823960.png';
import chestCrown from '@assets/battlepass_chests/chest_crown_1787823960.png';
import {
  getChestTierForPassTier,
  isBattlePassMilestoneTier,
  type BattlePassChestTier,
} from '@shared/battlePassChests';
import { API_BASE_URL } from "../lib/apiBase";

const CHEST_IMAGES: Record<BattlePassChestTier, string> = {
  wood: chestWood,
  silver: chestSilver,
  gold: chestGold,
  purple: chestPurple,
  crown: chestCrown,
};

interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward: boolean;
  premiumReward: boolean;
}

// 50 Battle Pass tiers: free rewards run 1-30, premium rewards run the full 1-50. Which chest
// tier (wood/silver/gold/purple/crown) each one hands out is computed on the fly by
// getChestTierForPassTier() from @shared/battlePassChests -- see that file for the full
// free-vs-premium reward curve.
const BATTLE_PASS_TIERS: PassTier[] = Array.from({ length: 50 }, (_, i) => {
  const tier = i + 1;
  return { tier, xpRequired: tier * 10, freeReward: tier <= 30, premiumReward: true };
});

const SEASON_MAX_XP = 100; // Same rule as in profile: 100 XP per level

interface RewardBoxProps {
  tier: PassTier;
  isPremium?: boolean;
  isUnlocked?: boolean;
  isDataLoading: boolean;
  claimedTiers: { freeTiers: number[]; premiumTiers: number[] } | null;
  claimingTier: { tier: number; isPremium: boolean } | null;
  isUserPremium: boolean;
  handleClaimTier: (tier: number, isPremium: boolean) => void;
}

// Was previously defined *inside* BattlePassPage via useCallback and rendered as JSX
// (<RewardBox ... />). Because that useCallback's dependency array included claimedTiers and
// claimingTier — both of which change on every single claim — React saw a brand-new component
// *type* on every claim (start, success, and finish all produced a new function identity), and
// force-unmounted + remounted the entire ~100-box grid each time instead of just re-rendering
// it. If a tap landed mid-gesture during one of those remounts, the DOM node it started on was
// gone by the time it would have fired, so the click silently never registered — hence needing
// to tap a chest again. Hoisting it to a real, stable top-level component (props instead of
// closures) fixes that; React.memo skips re-rendering tiers unrelated to whichever one changed.
const RewardBox = React.memo(function RewardBox({
  tier,
  isPremium = false,
  isUnlocked = false,
  isDataLoading,
  claimedTiers,
  claimingTier,
  isUserPremium,
  handleClaimTier,
}: RewardBoxProps) {
  const hasReward = isPremium ? tier.premiumReward : tier.freeReward;
  if (!hasReward) {
    // Show empty progression slots for non-reward tiers
    return (
      <div className="relative w-32 h-32 rounded-3xl border-2 border-gray-800 bg-gray-900/30 flex items-center justify-center opacity-40">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-500">{tier.tier}</span>
        </div>
      </div>
    );
  }

  // Which of the 5 chests (wood/silver/gold/purple/crown) this box hands out -- purely a
  // function of the tier number + free-vs-premium, see @shared/battlePassChests.
  const chestTier = getChestTierForPassTier(tier.tier, isPremium);
  const chestImage = CHEST_IMAGES[chestTier];
  // Milestone tiers (10/20/30/40/50) render in the bigger box, same as before.
  const isSpecialTier = isBattlePassMilestoneTier(tier.tier);
  // Chest images are now square-cropped tight to the chest itself (see attached_assets/
  // battlepass_chests) -- sized close to the tile so the chest reads clearly instead of
  // floating as a small icon in a lot of empty space, but still leaves room for the border/
  // glow and the claimed checkmark badge.
  const chestImgSize = isSpecialTier ? 'w-32 h-32' : 'w-28 h-28';

  // Check if this specific tier/type is claimed
  // Handle loading state - don't show as claimed/unclaimed while loading
  if (isDataLoading || claimedTiers === null) {
    return (
      <div className={`relative ${isSpecialTier ? 'w-36 h-36' : 'w-32 h-32'} rounded-3xl border-2 border-gray-700 bg-gray-800 flex items-center justify-center`}>
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-600 rounded-lg"></div>
        </div>
        {hasReward && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-1 py-0.5 rounded-full font-bold">
            {tier.tier}
          </div>
        )}
      </div>
    );
  }

  const relevantTiers = isPremium ? (claimedTiers?.premiumTiers || []) : (claimedTiers?.freeTiers || []);
  const isClaimed = relevantTiers.includes(tier.tier);

  // Check if this specific tier is currently being claimed
  const isCurrentlyClaiming = claimingTier?.tier === tier.tier && claimingTier?.isPremium === isPremium;

  const canClaim = isPremium ?
    (isUnlocked && isUserPremium && !isClaimed && !isCurrentlyClaiming && !claimingTier) :
    (isUnlocked && !isClaimed && !isCurrentlyClaiming && !claimingTier);

  return (
    <motion.div
      // No hover:/whileHover when claimable — same iOS double-tap issue as the header/
      // premium buttons: a tap triggering the hover state first meant the real claim click
      // needed a second tap. whileTap (press-only) still gives tactile feedback safely.
      // Also no entrance animation (initial/animate) here on purpose: this used to animate
      // its own opacity/scale in (delayed up to 5s for tier 50) on the *same* motion.div that
      // also has whileTap — two animations competing for the same `scale` property meant a tap
      // landing while the entrance animation was still running could fail to register at all.
      // The parent row below already fades/slides each tier in, so this doesn't need its own.
      // No border/background here on purpose -- just the chest art itself, sized by the tile.
      className={`relative ${isSpecialTier ? 'w-36 h-36' : 'w-32 h-32'} flex items-center justify-center ${canClaim ? 'cursor-pointer' : ''
        }`}
      style={{ touchAction: 'manipulation' }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (canClaim) {
          handleClaimTier(tier.tier, isPremium);
        }
      }}
      whileTap={canClaim ? { scale: 0.95 } : {}}
    >
      {/* Reward Content */}
      <div className="text-center">
        {isClaimed ? (
          <div className="relative flex flex-col items-center opacity-50">
            <img src={chestImage} alt={`${chestTier} chest, claimed`} className={`${chestImgSize} object-contain filter drop-shadow-lg mb-1`} />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-black">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
          </div>
        ) : isCurrentlyClaiming ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-16 h-16 border-4 border-gray-300 border-t-yellow-500 rounded-full"></div>
            <div className="text-xs mt-2 text-yellow-400 font-semibold">Claiming...</div>
          </div>
        ) : canClaim ? (
          <div className="flex flex-col items-center animate-pulse">
            <img src={chestImage} alt={`${chestTier} chest`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} />
          </div>
        ) : (
          <div className="flex flex-col items-center opacity-70">
            <img src={chestImage} alt={`${chestTier} chest, locked`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} />
          </div>
        )}
      </div>


      {/* Tier badge for all tiers */}
      {hasReward && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-white text-xs font-bold flex items-center justify-center">
          <div className="bg-white text-black px-2 py-1 rounded-full flex items-center justify-center">
            {tier.tier}
          </div>
        </div>
      )}
    </motion.div>
  );
});

interface BattlePassPageProps {
  // Passed when rendered as Home's slide-up overlay (see home.tsx) so the back button closes
  // the overlay in place instead of routing to "/", which would be a no-op there anyway.
  onClose?: () => void;
}

export default function BattlePassPage({ onClose }: BattlePassPageProps = {}) {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const handleBack = onClose ?? (() => navigate('/'));
  const [hasPremiumPass, setHasPremiumPass] = useState(false);
  const [claimedTiers, setClaimedTiers] = useState<{ freeTiers: number[], premiumTiers: number[] } | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastReward, setLastReward] = useState<{
    chestTier: BattlePassChestTier;
    coins: number;
    gems: number;
    swapTokens: number;
    cardBacks: { id: string; name: string; rarity: string }[];
  } | null>(null);
  const [claimingTier, setClaimingTier] = useState<{ tier: number; isPremium: boolean } | null>(null);

  // Fetch season info with auto-reset check
  const { data: seasonInfo } = useQuery({
    queryKey: ['/api/seasons/info'],
    refetchInterval: 300000, // Update every 5 minutes
  });

  // Fetch real-time season countdown
  const { data: timeRemaining } = useQuery({
    queryKey: ['/api/seasons/time-remaining'],
    refetchInterval: 60000, // Update every minute
  });

  // Fetch claimed tiers - always refetch on mount to prevent duplicate claims
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers, isFetching: isFetchingClaimedTiers } = useQuery({
    queryKey: ['/api/battlepass/claimed-tiers', user?.id],
    enabled: !!user?.id,
    refetchOnMount: 'always', // Always refetch when component mounts
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/status'],
    refetchInterval: 300000, // Update every 5 minutes (reduced from 1 minute)
    refetchOnMount: 'always', // Always refetch on mount — otherwise landing back here right
    // after buying premium (or having it granted) could still read a stale "not premium"
    // result for up to staleTime, silently blocking premium chest claims for no visible reason
    staleTime: 240000, // Consider data fresh for 4 minutes (still used for the 5-min poll)
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  React.useEffect(() => {
    if (claimedTiersData) {
      const data = claimedTiersData as any;
      if (data.freeTiers && data.premiumTiers) {
        setClaimedTiers({
          freeTiers: data.freeTiers || [],
          premiumTiers: data.premiumTiers || []
        });
      } else if (Array.isArray(data.claimedTiers)) {
        // Fallback for old API format
        setClaimedTiers({ freeTiers: data.claimedTiers, premiumTiers: [] });
      } else {
        // Initialize with empty arrays if no data
        setClaimedTiers({ freeTiers: [], premiumTiers: [] });
      }
    }
  }, [claimedTiersData]);

  // Show loading skeleton while claimed tiers data is loading on first load
  const isDataLoading = isLoadingClaimedTiers || (claimedTiers === null && isFetchingClaimedTiers);

  if (!user) return null;

  // Memoized calculations to avoid unnecessary re-renders
  const userLevel = useMemo(() => user.level || 1, [user.level]);
  const currentXP = useMemo(() => user.currentLevelXP || 0, [user.currentLevelXP]);
  const progressPercentage = useMemo(() => Math.min((currentXP / SEASON_MAX_XP) * 100, 100), [currentXP]);

  // Use real time remaining from API, fallback to default values
  const { daysRemaining, hoursRemaining } = useMemo(() => {
    const seasonTime = timeRemaining as { days: number; hours: number; minutes: number } | undefined;
    return {
      daysRemaining: seasonTime?.days ?? 30,
      hoursRemaining: seasonTime?.hours ?? 0
    };
  }, [timeRemaining]);

  const handleUnlockPremium = useCallback(() => {
    navigate('/premium');
  }, [navigate]);

  // Check if user has premium subscription - memoized
  const isUserPremium = useMemo(() =>
    (subscriptionData as any)?.isActive || user?.membershipType === 'premium' || false,
    [subscriptionData, user?.membershipType]
  );

  const handleClaimTier = useCallback(async (tier: number, isPremium = false) => {
    const isUnlocked = userLevel >= tier;
    if (!isUnlocked) return;

    // Check if already claimed - don't proceed if data is still loading
    if (!claimedTiers) return;

    const relevantTiers = isPremium ? (claimedTiers?.premiumTiers || []) : (claimedTiers?.freeTiers || []);
    if (relevantTiers.includes(tier)) return;

    // Prevent multiple simultaneous claims
    if (claimingTier) return;

    // OPTIMISTIC UPDATE: Immediately update claimed tiers for better UX
    setClaimedTiers(prev => {
      if (!prev) return prev;
      return {
        freeTiers: isPremium ? (prev.freeTiers || []) : [...(prev.freeTiers || []), tier],
        premiumTiers: isPremium ? [...(prev.premiumTiers || []), tier] : (prev.premiumTiers || [])
      };
    });

    // Set claiming state to prevent multiple clicks
    setClaimingTier({ tier, isPremium });

    try {
      const response = await apiRequest('POST', '/api/battlepass/claim-tier', { tier, isPremium });

      if (response.ok) {
        const data = await response.json();

        // Server response shape: { chestTier, coins, gems, swapTokens, cardBacks }
        const reward = data.reward;
        setLastReward({
          chestTier: reward.chestTier,
          coins: reward.coins || 0,
          gems: reward.gems || 0,
          swapTokens: reward.swapTokens || 0,
          cardBacks: reward.cardBacks || [],
        });
        setShowRewardAnimation(true);

        // Invalidate and refetch to ensure claimed tiers are persisted
        await queryClient.invalidateQueries({
          queryKey: ['/api/battlepass/claimed-tiers']
        });

        // Invalidate user data for balance display (coins, gems, swap tokens, card backs)
        await queryClient.invalidateQueries({
          queryKey: ['/api/user/profile']
        });
        await queryClient.invalidateQueries({
          queryKey: ['/api/user/coins']
        });

      } else {
        // ROLLBACK optimistic update on error
        setClaimedTiers(prev => {
          if (!prev) return prev;
          return {
            freeTiers: isPremium ? (prev.freeTiers || []) : (prev.freeTiers || []).filter(t => t !== tier),
            premiumTiers: isPremium ? (prev.premiumTiers || []).filter(t => t !== tier) : (prev.premiumTiers || [])
          };
        });

        const errorData = await response.json();
        if (errorData.message === "Premium subscription required to claim premium rewards") {
          handleUnlockPremium();
        }
      }
    } catch (error) {
      console.error('Failed to claim tier:', error);

      // ROLLBACK optimistic update on error
      setClaimedTiers(prev => {
        if (!prev) return prev;
        return {
          freeTiers: isPremium ? (prev.freeTiers || []) : (prev.freeTiers || []).filter(t => t !== tier),
          premiumTiers: isPremium ? (prev.premiumTiers || []).filter(t => t !== tier) : (prev.premiumTiers || [])
        };
      });
    } finally {
      // Always reset claiming state when done
      setClaimingTier(null);
    }
  }, [userLevel, claimedTiers, claimingTier, handleUnlockPremium]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800 pt-safe">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={handleBack}
            // No `hover:` classes here on purpose: on iOS Safari/WKWebView, a tap can trigger
            // an element's :hover state (rendered as the "gray circle" the padding/rounded-full
            // below would otherwise produce), and the actual click then needs a second tap to
            // fire — exactly the "stuck, need to press twice" symptom this button had.
            // -m-4 p-4: a real ~56x56 tappable box around the 24x24 icon (well past Apple's
            // 44pt minimum), not just a visually-larger-looking one — the negative margin only
            // repositions that bigger box so the header's layout/centering doesn't shift.
            className="-m-4 p-4 rounded-full text-white/80 transition-colors"
            style={{ touchAction: "manipulation" }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">{(seasonInfo as any)?.seasonName || 'Battle Pass'}</h1>
          <div className="w-6 h-6"></div>
        </div>
      </div>

      {/* Main content with top padding to account for sticky header (base height + safe area) */}
      <div className="flex-1 p-6" style={{ paddingTop: "calc(7rem + env(safe-area-inset-top))" }}>
        {/* XP Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-bold text-lg">XP {currentXP} / {SEASON_MAX_XP}</span>
            <div className="flex items-center text-white/60">
              <SpinningClock className="w-5 h-5 mr-2" />
              <span className="text-lg">{daysRemaining}d {hoursRemaining}h</span>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] rounded-full"
              style={{ width: `${progressPercentage}%` }}
              data-testid="xp-progress-bar"
            />
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl p-4 text-center border border-gray-700" style={{ backgroundColor: '#000000' }}>
            <span className="text-white/80 font-bold text-lg">Free</span>
          </div>
          <div className="rounded-3xl p-4 text-center border border-white/20" style={{ backgroundColor: '#000000' }}>
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-5 h-5 text-white fill-white" />
              <span className="text-white font-bold text-lg">Premium</span>
            </div>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="space-y-4 mb-8">
          {BATTLE_PASS_TIERS.map((tier) => {
            const isUnlocked = userLevel >= tier.tier;
            const hasRewards = tier.freeReward || tier.premiumReward;

            return (
              <motion.div
                key={tier.tier}
                className={`grid grid-cols-2 gap-6 ${!isUnlocked ? 'opacity-50' : ''} py-2`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                // Capped instead of tier.tier * 0.02 unbounded — with 50 tiers that stretched
                // the whole grid's entrance out to a full second, during which every chest was
                // still settling into place; capping it keeps the same cascade feel without
                // dragging out the window where a tap can land mid-animation.
                transition={{ delay: Math.min(tier.tier * 0.02, 0.4) }}
              >
                {/* Free Reward */}
                <div className="relative flex justify-center">
                  <RewardBox
                    tier={tier}
                    isPremium={false}
                    isUnlocked={isUnlocked}
                    isDataLoading={isDataLoading}
                    claimedTiers={claimedTiers}
                    claimingTier={claimingTier}
                    isUserPremium={isUserPremium}
                    handleClaimTier={handleClaimTier}
                  />
                </div>

                {/* Premium Reward */}
                <div className="relative flex justify-center">
                  <RewardBox
                    tier={tier}
                    isPremium={true}
                    isUnlocked={isUnlocked}
                    isDataLoading={isDataLoading}
                    claimedTiers={claimedTiers}
                    claimingTier={claimingTier}
                    isUserPremium={isUserPremium}
                    handleClaimTier={handleClaimTier}
                  />
                </div>

              </motion.div>);
          })}
        </div>

        {/* Padding bottom for sticky button */}
        <div className="pb-16"></div>
      </div>

      {/* Sticky Bottom Button - Only show for non-premium users */}
      {!isUserPremium && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-black/90 backdrop-blur-md border-t border-gray-800">
          <motion.button
            onClick={handleUnlockPremium}
            // No hover:/whileHover here — same reason as the back button above: a tap can
            // trigger the hover state on iOS, and the real click then needs a second tap to
            // land. whileTap alone (active only while actually pressed) gives feedback safely.
            className="w-full font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2"
            style={{
              touchAction: "manipulation",
              background: '#FFFFFF',
              color: '#15161A',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-unlock-premium-rewards"
          >
            Unlock premium rewards
            <BiSolidZap className="w-5 h-5" />
          </motion.button>
        </div>
      )}

      {/* Reward Animation Modal - Optimized for performance */}
      {showRewardAnimation && lastReward && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          style={{ willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={() => setShowRewardAnimation(false)}
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            style={{ willChange: 'transform' }}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              duration: 0.4
            }}
          >
            <img
              src={CHEST_IMAGES[lastReward.chestTier]}
              alt={`${lastReward.chestTier} chest opened`}
              className="w-24 h-24 object-contain filter drop-shadow-lg"
            />
            <motion.div
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
            >
              {lastReward.coins > 0 && (
                <div className="flex items-center gap-2">
                  <Coin size={40} glow />
                  <span className="text-3xl font-light tracking-tight text-white">+{lastReward.coins}</span>
                </div>
              )}
              {lastReward.gems > 0 && (
                <div className="flex items-center gap-2">
                  <Gem className="w-9 h-9" />
                  <span className="text-3xl font-light tracking-tight text-white">+{lastReward.gems}</span>
                </div>
              )}
              {lastReward.swapTokens > 0 && (
                <div className="flex items-center gap-2">
                  <SwapIcon className="w-8 h-8 text-white" />
                  <span className="text-3xl font-light tracking-tight text-white">+{lastReward.swapTokens}</span>
                </div>
              )}
            </motion.div>
            {lastReward.cardBacks.length > 0 && (
              <div className="text-center text-white/80 text-sm">
                {lastReward.cardBacks.map(cb => cb.name).join(', ')}
                <span className="block text-xs text-white/50 mt-0.5">
                  {lastReward.cardBacks.length > 1 ? 'New card backs!' : 'New card back!'}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
