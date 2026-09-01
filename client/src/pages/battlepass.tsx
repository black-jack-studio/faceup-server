import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { ArrowLeft } from '@/icons';
import { SpinningClock } from '@/components/SpinningClock';
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
import { triggerHapticTick } from "@/lib/haptics";
import Premium from "@/pages/premium";

const CHEST_IMAGES: Record<BattlePassChestTier, string> = {
  wood: chestWood,
  silver: chestSilver,
  gold: chestGold,
  purple: chestPurple,
  crown: chestCrown,
};

// The 5 chest PNGs aren't cropped to the same padding around the chest itself -- measured
// content-vs-canvas fill: wood 79%, silver 79% (re-cropped 2026-09-01 to match wood's own
// padding when the silver PNG was swapped for a new model), gold 67%, purple 70%, crown 63%
// (all ~94% wide, so height fill is what actually varies). Rendered at the same fixed box
// size, that made wood/silver (free track) visibly bigger than gold/purple/crown (premium
// track), which is what looked like "Free chests are bigger than Premium". Scaling each down
// to crown's fill (the tightest-padded, so nothing needs to be scaled *up* and blurred) makes
// every chest read as the same size regardless of which PNG it happens to be.
const CHEST_VISUAL_SCALE: Record<BattlePassChestTier, number> = {
  wood: 0.795,
  silver: 0.795,
  gold: 0.94,
  purple: 0.9,
  crown: 1,
};

// Animates 0 -> value once on mount (easeOutCubic), then holds. Each reward chip in the claim
// modal gets its own instance, so re-mounting a chip (new tier claimed) always restarts its count.
function CountUpNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

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
  // All chests render at the same fixed size, regardless of free/premium or milestone tier.
  const tileSize = 'w-36 h-36';

  if (!hasReward) {
    return null;
  }

  // Which of the 5 chests (wood/silver/gold/purple/crown) this box hands out -- purely a
  // function of the tier number + free-vs-premium, see @shared/battlePassChests.
  const chestTier = getChestTierForPassTier(tier.tier, isPremium);
  const chestImage = CHEST_IMAGES[chestTier];
  // Chest images are square-cropped tight to the chest itself (see attached_assets/
  // battlepass_chests) -- kept a fixed ~16px margin under the tile size at every scale so the
  // chest reads clearly instead of floating in empty space, but still leaves room for the
  // claimed checkmark badge.
  const chestImgSize = 'w-32 h-32';
  const chestImgStyle = { transform: `scale(${CHEST_VISUAL_SCALE[chestTier]})` };

  // Check if this specific tier/type is claimed
  // Handle loading state - don't show as claimed/unclaimed while loading
  if (isDataLoading || claimedTiers === null) {
    return (
      <div className={`relative ${tileSize} rounded-3xl border-2 border-gray-700 bg-gray-800 flex items-center justify-center`}>
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-600 rounded-lg"></div>
        </div>
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
      className={`relative ${tileSize} flex items-center justify-center ${canClaim ? 'cursor-pointer' : ''
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
      {/* Claimable affordance: a crisp outline hugging the chest that pulses in brightness
          (rim, not a diffuse blob behind it -- reads cleaner against the app's flat UI style
          and stays legible even with several claimable chests visible in the grid at once),
          plus the gentle bounce already on the chest itself below. */}
      {canClaim && (
        <div
          className="absolute inset-[4%] rounded-3xl pointer-events-none"
          style={{
            border: '2.5px solid #FFC454',
            animation: 'bpClaimRingPulse 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Reward Content */}
      <div className="text-center">
        {isClaimed ? (
          <div className="relative flex flex-col items-center opacity-50">
            <img src={chestImage} alt={`${chestTier} chest, claimed`} className={`${chestImgSize} object-contain filter drop-shadow-lg mb-1`} style={chestImgStyle} />
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
          <motion.div
            className="relative flex flex-col items-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={chestImage} alt={`${chestTier} chest`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} style={chestImgStyle} />
          </motion.div>
        ) : (
          <div className="flex flex-col items-center opacity-70">
            <img src={chestImage} alt={`${chestTier} chest, locked`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} style={chestImgStyle} />
          </div>
        )}
      </div>
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
  const [claimedTiers, setClaimedTiers] = useState<{ freeTiers: number[], premiumTiers: number[] } | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastReward, setLastReward] = useState<{
    coins: number;
    gems: number;
    swapTokens: number;
    cardBacks: { id: string; name: string; rarity: string }[];
  } | null>(null);
  const [claimingTier, setClaimingTier] = useState<{ tier: number; isPremium: boolean } | null>(null);
  const [showPremium, setShowPremium] = useState(false);

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
  const userLevel = useMemo(() => user.level ?? 0, [user.level]);
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
    triggerHapticTick();
    setShowPremium(true);
  }, []);

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
    // fixed inset-0 (not h-full/h-screen): this page is used both as a real route (/battlepass,
    // no ancestor sets a height, so h-full would resolve to nothing) and nested inside Home's
    // own fixed-inset-0 overlay wrapper -- inset-0 sizes correctly to the true viewport either
    // way, matching the same technique `.fixed-safe-screen` already uses elsewhere. overflow
    // hidden here keeps this root itself unscrollable; only the flex-1 section below scrolls.
    <div className="fixed inset-0 overflow-hidden bg-black text-white flex flex-col">
      {/* Header — a normal (non-scrolling) flex item, not position:fixed. This page is either
          a real route (/battlepass, real document scroll, position:fixed would've been relative
          to the true viewport and worked fine) or nested as Home's slide-up overlay inside a
          motion.div that's both the scroll container *and* the transformed element sliding it
          open/closed. Once a position:fixed element's containing block is a transformed
          ancestor, browsers position it relative to that ancestor's *scrolled* content instead
          of staying glued to its visible box — so scrolled down, this header (and the footer
          below) would land outside the currently-visible area and appear to vanish partway
          through the close animation, even though the rest of the page slid down fine. Making
          both real flex siblings around an inner scroll container (below) sidesteps that
          entirely: nothing here is ever position:fixed, so there's no containing-block quirk to
          trigger regardless of scroll position. */}
      <div className="flex-shrink-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 pt-safe">
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

      {/* Scrollable middle section — the only thing that scrolls now, instead of the header/
          footer's old fixed-relative-to-page approach. min-h-0 lets this flex child actually
          shrink to the space left by the header/footer instead of overflowing past them. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
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

        {/* Column Headers -- same size for Free and Premium */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bp-pill bp-pill--free rounded-3xl p-4 text-center">
            <span className="text-white/80 font-bold text-lg">Free</span>
          </div>
          <div className="bp-pill bp-pill--premium rounded-3xl p-4 text-center">
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
            // The row's height covers the tallest tile at this tier (all tiles are the same
            // fixed size now, see RewardBox's tileSize, but milestone rows still render bigger).
            // Applied as an explicit pixel height to *all three* columns below, instead of
            // trusting the grid to auto-size the row and then trying to center each column
            // within that -- an explicit shared height removes that guesswork.
            const rowHeight = isBattlePassMilestoneTier(tier.tier) ? 192 : 160;

            return (
              <motion.div
                key={tier.tier}
                // grid-cols-[minmax(0,1fr)_0px_minmax(0,1fr)]: free/premium split evenly (the
                // middle track is 0-width, so its center sits exactly on the boundary between
                // them -- no percentage guessing). minmax(0, ...) keeps an oversized tile from
                // blowing out its own track width and dragging the 0px divider column sideways.
                className={`relative grid grid-cols-[minmax(0,1fr)_0px_minmax(0,1fr)] gap-6 ${!isUnlocked ? 'opacity-50' : ''} py-2`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                // Capped instead of tier.tier * 0.02 unbounded — with 50 tiers that stretched
                // the whole grid's entrance out to a full second, during which every chest was
                // still settling into place; capping it keeps the same cascade feel without
                // dragging out the window where a tap can land mid-animation.
                transition={{ delay: Math.min(tier.tier * 0.02, 0.4) }}
              >
                {/* Free Reward */}
                <div className="relative flex items-center justify-center" style={{ height: rowHeight }}>
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

                {/* Tier number column, centered on the 40/60 boundary between free/premium. */}
                <div className="relative overflow-visible" style={{ height: rowHeight }}>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg font-bold">
                    {tier.tier}
                  </span>
                </div>

                {/* Premium Reward */}
                <div className="relative flex items-center justify-center" style={{ height: rowHeight }}>
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
      </div>

      {/* Bottom Button - Only shown for non-premium users. A normal (non-scrolling) flex item
          now, same reasoning as the header above -- see that comment for why this used to
          vanish mid-close when scrolled down. */}
      {!isUserPremium && (
        // z-[65], not z-40: when this page is Home's slide-up overlay (see the onClose prop
        // above), BottomNav (App.tsx's ConditionalBottomNav, z-50) only unmounts on a real
        // route change -- opening this as an in-place overlay is just local state, so the nav
        // bar stays mounted and painted over this button, its semi-transparent bg-ink/95 +
        // backdrop-blur turning this button's white background into a hazy white glow bleeding
        // through instead of a clean button. Same fix App.tsx's Settings overlay already uses
        // for the same reason (see its z-[55] comment) -- go above BottomNav's z-50 directly
        // rather than relying on stacking-context containment from an ancestor.
        <div
          className="flex-shrink-0 z-[65] px-4 pt-4 bg-black/90 backdrop-blur-md border-t border-white/10"
          style={{ paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
        >
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
            <Star className="w-5 h-5 text-black fill-black" />
            Unlock premium rewards
          </motion.button>
        </div>
      )}

      {/* Reward Animation Modal: each reward chip pops in staggered with its own spring and
          counts up from 0. No chest here, no flash either -- the rewards themselves are the
          whole reveal, with a slow ambient float once they've landed so the screen doesn't
          sit still while it's up. Wrapped in AnimatePresence so the exit (scale + fade) below
          actually plays instead of the modal just vanishing when dismissed. */}
      <AnimatePresence>
        {showRewardAnimation && lastReward && (
          <motion.div
            // z-[70]: above both BottomNav (z-50, same reason as the sticky button above) and
            // this page's own bottom button (z-[65]), so it fully covers both instead of the
            // button's white bg peeking through underneath.
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80"
            style={{ willChange: 'opacity' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={() => setShowRewardAnimation(false)}
          >
            <motion.div
              className="flex flex-col items-center gap-5"
              style={{ willChange: 'transform' }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.25, ease: "easeOut" } }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <motion.div
                className="relative flex items-center justify-center py-6 px-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
              >
                <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                  {lastReward.coins > 0 && (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.35 }}
                    >
                      <Coin size={40} glow />
                      <span className="text-3xl font-light tracking-tight text-white tabular-nums">
                        +<CountUpNumber value={lastReward.coins} />
                      </span>
                    </motion.div>
                  )}
                  {lastReward.gems > 0 && (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.48 }}
                    >
                      <Gem className="w-9 h-9" />
                      <span className="text-3xl font-light tracking-tight text-white tabular-nums">
                        +<CountUpNumber value={lastReward.gems} />
                      </span>
                    </motion.div>
                  )}
                  {lastReward.swapTokens > 0 && (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.61 }}
                    >
                      <SwapIcon className="w-8 h-8 text-white" />
                      <span className="text-3xl font-light tracking-tight text-white tabular-nums">
                        +<CountUpNumber value={lastReward.swapTokens} />
                      </span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {lastReward.cardBacks.length > 0 && (
                <motion.div
                  className="text-center text-white/80 text-sm"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.74 }}
                >
                  {lastReward.cardBacks.map(cb => cb.name).join(', ')}
                  <span className="block text-xs text-white/50 mt-0.5">
                    {lastReward.cardBacks.length > 1 ? 'New card backs!' : 'New card back!'}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same slide-up/down sheet transition Home uses for Classic 21/this very page (see
          home.tsx) — a real route change to /premium had no transition of its own at all, just
          an abrupt swap. skipEntranceAnimation drops Premium's own per-element fade/slide-ins
          since this wrapper already animates the whole page in as one block; stacking both read
          as two competing motions instead of one clean sheet presentation. */}
      <AnimatePresence>
        {showPremium && (
          <motion.div
            className="fixed-safe-screen z-[80]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <Premium onClose={() => setShowPremium(false)} skipEntranceAnimation />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
