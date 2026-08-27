import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, HelpCircle } from 'lucide-react';
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
import { API_BASE_URL } from "../lib/apiBase";
import { triggerHapticTick } from "@/lib/haptics";
import Premium from "@/pages/premium";

const CHEST_IMAGES: Record<BattlePassChestTier, string> = {
  wood: chestWood,
  silver: chestSilver,
  gold: chestGold,
  purple: chestPurple,
  crown: chestCrown,
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

interface BurstParticle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
}

function makeBurstParticles(colors: string[], count: number): BurstParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * 360 + (Math.random() * 20 - 10),
    distance: 85 + Math.random() * 100,
    size: 5 + Math.random() * 4,
    color: colors[i % colors.length],
    delay: Math.random() * 0.08,
    duration: 1.0 + Math.random() * 0.6,
    rotate: Math.random() * 360,
  }));
}

// Confetti burst, colored by the chest's own rarity (see CHEST_BURST_COLORS). An initial big
// wave fires immediately, then smaller waves keep firing every ~550ms for as long as this
// component stays mounted -- i.e. for as long as the reward modal is open, not just a single
// burst -- so it reads as a continuous celebration you dismiss by tapping, not a one-shot
// animation that leaves the modal sitting there static. Each particle removes itself from
// state via onAnimationComplete once it's done, so the DOM node count stays bounded no matter
// how long the modal stays open; the slice(-60) in the interval is just a defensive backstop
// in case cleanup timing slips (e.g. a backgrounded tab).
function RewardBurst({ colors }: { colors: string[] }) {
  const nextId = React.useRef(0);
  const makeBatch = React.useCallback(
    (count: number) => {
      const batch = makeBurstParticles(colors, count).map((p) => ({ ...p, id: nextId.current++ }));
      return batch;
    },
    [colors]
  );
  const [particles, setParticles] = useState<(BurstParticle & { id: number })[]>(() => makeBatch(18));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => [...prev.slice(-60), ...makeBatch(5)]);
    }, 550);
    return () => clearInterval(interval);
  }, [makeBatch]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.distance;
        const y = Math.sin(rad) * p.distance + 30; // slight downward drift, like gravity
        return (
          <motion.span
            key={p.id}
            className="absolute top-1/2 left-1/2 rounded-sm"
            style={{ width: p.size, height: p.size * 1.6, backgroundColor: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x, y, opacity: 0, rotate: p.rotate, scale: 1 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setParticles((prev) => prev.filter((q) => q.id !== p.id));
            }}
          />
        );
      })}
    </div>
  );
}

// Confetti matches the chest itself, not the reward -- opening a purple chest bursts purple
// regardless of what came out of it. Crown is the one exception: it's the top rarity, so its
// burst mixes every color for a "jackpot" feel instead of picking just one.
const CHEST_BURST_COLORS: Record<BattlePassChestTier, string[]> = {
  wood: ['#d9a441', '#b97f34', '#8a5a2b'],
  silver: ['#bfdbfe', '#93c5fd', '#e2e8f0'],
  gold: ['#fbbf24', '#f59e0b', '#fde68a'],
  purple: ['#c084fc', '#a855f7', '#e9d5ff'],
  crown: ['#fbbf24', '#38bdf8', '#c084fc', '#f87171', '#ffffff'],
};

function burstColorsFor(chestTier: BattlePassChestTier): string[] {
  return CHEST_BURST_COLORS[chestTier];
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
    // Show empty progression slots for non-reward tiers
    return (
      <div className={`relative ${tileSize} rounded-3xl border-2 border-gray-800 bg-gray-900/30 flex items-center justify-center opacity-40`}>
        <div className="w-8 h-8 rounded-full bg-gray-700" />
      </div>
    );
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
      {/* Claimable affordance: a breathing golden glow that spills out past the chest's own
          silhouette (inset is *negative* -- at inset-[8%] like the chest art itself, the glow
          rendered almost entirely hidden behind the opaque chest image, which is why it barely
          read) plus a gentle bounce on the chest itself. Capped at -16% (not -30%) so it
          doesn't reach across the column gap into the tier-number divider next to it -- it
          was bleeding around the number's black cutout patch there, looking like a display
          glitch rather than a glow. */}
      {canClaim && (
        <div
          className="absolute inset-[-16%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,196,84,0.65) 0%, rgba(255,196,84,0.25) 45%, rgba(255,196,84,0) 72%)',
            animation: 'bpClaimGlow 1.8s ease-in-out infinite',
          }}
        />
      )}

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
          <motion.div
            className="relative flex flex-col items-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={chestImage} alt={`${chestTier} chest`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} />
          </motion.div>
        ) : (
          <div className="flex flex-col items-center opacity-70">
            <img src={chestImage} alt={`${chestTier} chest, locked`} className={`${chestImgSize} object-contain filter drop-shadow-lg`} />
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

        {/* Column Headers -- 2fr/3fr so Premium reads as the bigger 60% half, matching the
            reward tiles below */}
        <div className="grid grid-cols-[2fr_3fr] gap-6 mb-8">
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
            // The row's height is whichever column is tallest -- always premium (its tiles are
            // sized bigger than free's at every tier, see RewardBox's tileSize). Computed here
            // and applied as an explicit pixel height to *all three* columns below, instead of
            // trusting the grid to auto-size the row and then trying to center each column
            // within that (items-center, then self-stretch + flex items-center both looked
            // right most rows but landed visibly off at milestone tiers, where the free/premium
            // size gap is biggest: 128px vs 192px vs the usual 112 vs 160). An explicit shared
            // height removes that guesswork -- three columns each centering within the exact
            // same known number can't disagree with each other.
            const rowHeight = isBattlePassMilestoneTier(tier.tier) ? 192 : 160;

            return (
              <motion.div
                key={tier.tier}
                // grid-cols-[minmax(0,2fr)_0px_minmax(0,3fr)]: the free/premium chests split
                // 40/60 exactly (the middle track is 0-width, so its center sits precisely on
                // that boundary -- no percentage guessing). The minmax(0, ...) matters, not
                // just bare 2fr/3fr: grid tracks default to min-width:auto, i.e. never smaller
                // than their content's own intrinsic width. At milestone tiers the free chest's
                // tile (128px, isSpecialTier) is wider than its 2fr share of the row -- without
                // minmax(0, ...) that forced the *track* to blow out wider to fit it, which
                // pushed the 0px divider column (and the premium column after it) sideways by
                // however many px the blowout was. Confirmed by pixel-scanning real screenshots:
                // the divider sat at a consistent x on every normal row and jumped exactly 31px
                // right on every milestone row. minmax(0, ...) lets a track shrink below its
                // content's natural size instead, so oversized content overflows locally rather
                // than dragging the whole row's layout sideways.
                className={`relative grid grid-cols-[minmax(0,2fr)_0px_minmax(0,3fr)] gap-6 ${!isUnlocked ? 'opacity-50' : ''} py-2`}
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

                {/* Divider: sits on the 40/60 boundary, spans the same explicit rowHeight as
                    the free/premium columns. The rule is two real segments with an actual gap
                    between them (not one continuous line hidden behind an opaque bg-black
                    patch -- that patch showed as a visible black rectangle against the
                    claimable chests' glow).
                    Each segment overshoots exactly -4 (16px) past the row's own top/bottom
                    edge so consecutive rows' segments meet precisely at the midpoint of the
                    32px gap between them (the list's space-y-4 = 16px, plus each row's own
                    py-2 = 8px top + 8px bottom *outside* this box: 8+16+8 = 32, half is 16).
                    Meeting exactly matters, not just "close enough": an overlap (tried -5/20px
                    first) double-stacks the two lines' opacity right at the seam, which reads
                    as a visible extra segment instead of one continuous line -- and a gap (the
                    original -3/12px) is just a visible break. The gap around the number itself
                    is a fixed 16px on each side of center regardless of tile size, so it never
                    moves. */}
                <div className="relative overflow-visible" style={{ height: rowHeight }}>
                  <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-px bg-white/15" style={{ bottom: 'calc(50% + 16px)' }} />
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-px bg-white/15" style={{ top: 'calc(50% + 16px)' }} />
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

        {/* Padding bottom for sticky button */}
        <div className="pb-16"></div>
      </div>

      {/* Sticky Bottom Button - Only show for non-premium users */}
      {!isUserPremium && (
        // z-[65], not z-40: when this page is Home's slide-up overlay (see the onClose prop
        // above), BottomNav (App.tsx's ConditionalBottomNav, z-50) only unmounts on a real
        // route change -- opening this as an in-place overlay is just local state, so the nav
        // bar stays mounted and painted over this button, its semi-transparent bg-ink/95 +
        // backdrop-blur turning this button's white background into a hazy white glow bleeding
        // through instead of a clean button. Same fix App.tsx's Settings overlay already uses
        // for the same reason (see its z-[55] comment) -- go above BottomNav's z-50 directly
        // rather than relying on stacking-context containment from an ancestor.
        <div className="fixed bottom-0 left-0 right-0 z-[65] p-4 bg-black/90 backdrop-blur-md border-t border-gray-800">
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

      {/* Reward Animation Modal: chest pops in with a little wobble, a white flash + a
          confetti burst (colored by what was actually won) fire behind it, then each reward
          chip pops in staggered with its own spring and counts up from 0. */}
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
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="relative w-44 h-44 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
              />
              <RewardBurst colors={burstColorsFor(lastReward.chestTier)} />
              <motion.img
                src={CHEST_IMAGES[lastReward.chestTier]}
                alt={`${lastReward.chestTier} chest opened`}
                className="relative w-40 h-40 object-contain filter drop-shadow-lg"
                initial={{ rotate: -6, scale: 0.9 }}
                animate={{ rotate: [-6, 4, 0], scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
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
