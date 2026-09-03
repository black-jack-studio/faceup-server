import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { Gem, Coin, SwapCoin } from "@/icons";
import { showRewardedAd } from "@/lib/admob";
import { BiSolidZap } from "react-icons/bi";
import WatchAdIcon from "@/components/icons/WatchAdIcon";
import LuckyReelsMachine, {
  type SlotSymbol,
  SLOT_SYMBOLS,
  buildReelStripsForTarget,
  buildIdleTriplets,
  randomSlotSymbol,
} from "@/components/LuckyReelsMachine";

interface WheelReward {
  type: 'coins' | 'gems' | 'swapTokens' | 'xp';
  amount: number;
}

export default function WheelOfFortunePage() {
  const [, navigate] = useLocation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<WheelReward | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const { user, updateUser } = useUserStore();
  // Runs once the slowest (last) reel's animation actually settles, instead of a hardcoded
  // setTimeout that has to guess the animation's duration.
  const onSpinSettledRef = useRef<(() => void) | null>(null);
  const [secondsUntilReset, setSecondsUntilReset] = useState(0);

  // spinId 0 = idle (never spun yet this session); every spin increments it, which remounts
  // each SlotReel fresh (see SlotReel's own comment for why that matters).
  const [spinId, setSpinId] = useState(0);
  const [reelStrips, setReelStrips] = useState<[SlotSymbol[], SlotSymbol[], SlotSymbol[]]>([[], [], []]);
  // Real gameplay spins (free/ad/premium) use LuckyReelsMachine's own default pacing; the
  // purely decorative one this page plays on mount (see below) is deliberately quicker -- the
  // default pacing read as dragging on for something with no result to wait for.
  const [reelTiming, setReelTiming] = useState({ firstReelDuration: 1.8, reelStagger: 0.45 });
  const DECORATIVE_REEL_TIMING = { firstReelDuration: 0.8, reelStagger: 0.2 };
  const GAMEPLAY_REEL_TIMING = { firstReelDuration: 1.8, reelStagger: 0.45 };
  // Fixed once on mount so the idle display doesn't re-randomize on every re-render. One
  // independent triplet per reel -- sharing a single triplet across all 3 columns would show
  // the exact same symbol in the exact same row on every column, reading like a pre-matched
  // win before the player has even spun once.
  const [idleSymbolsPerReel] = useState<[SlotSymbol, SlotSymbol, SlotSymbol][]>(() =>
    buildIdleTriplets()
  );

  // Truly-free daily spin (no ad, no gems), resetting once a day at 1am Paris time - gated
  // server-side. spinsTowardBonus also rides on this response: every 5 ad/gem spins (the free
  // spin itself doesn't count) earns canSpin back early regardless of the daily timer.
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean; secondsUntilReset: number; spinsTowardBonus: number }>({
    queryKey: ["/api/daily-spin/free/can-spin"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/daily-spin/free/can-spin");
      return await response.json();
    },
    refetchInterval: 60_000,
  });
  const canSpinFree = freeSpinStatus?.canSpin ?? false;
  const spinsTowardBonus = freeSpinStatus?.spinsTowardBonus ?? 0;
  const SPINS_FOR_BONUS_FREE_SPIN = 5;
  const spinsRemainingForBonus = Math.max(0, SPINS_FOR_BONUS_FREE_SPIN - spinsTowardBonus);

  // Keep the small "reset in Xh Ym" caption ticking down between server refetches
  useEffect(() => {
    setSecondsUntilReset(freeSpinStatus?.secondsUntilReset ?? 0);
  }, [freeSpinStatus]);

  useEffect(() => {
    if (canSpinFree) return;
    const timer = setInterval(() => {
      setSecondsUntilReset((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [canSpinFree]);

  const resetCountdownLabel = (() => {
    const hours = Math.floor(secondsUntilReset / 3600);
    const minutes = Math.floor((secondsUntilReset % 3600) / 60);
    return `Reset in ${hours}h ${minutes}m`;
  })();

  // A reward whose type isn't one of the 3 slot symbols (e.g. 'xp', never actually returned by
  // generateWheelOfFortuneReward today but still part of the type) has nothing sensible to
  // land the reels on -- falls back to 'coins' rather than crashing.
  const startReelSpin = (serverReward: WheelReward) => {
    const targetSymbol: SlotSymbol = SLOT_SYMBOLS.includes(serverReward.type as SlotSymbol)
      ? (serverReward.type as SlotSymbol)
      : 'coins';

    setReelStrips(buildReelStripsForTarget(targetSymbol));
    setSpinId((id) => id + 1);
  };

  // Purely decorative -- no reward, nothing listens for it settling (onSpinSettledRef is null
  // at this point) -- just so the reels are already spinning the instant this page's own fade-in
  // starts, same as the Shop header's mini preview of this same machine. This page now only
  // ever mounts fresh per visit (see App.tsx's AnimatePresence wrapper around it), so a plain
  // mount effect is reliable here unlike Shop's always-mounted tab.
  useEffect(() => {
    setReelTiming(DECORATIVE_REEL_TIMING);
    startReelSpin({ type: randomSlotSymbol(), amount: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdSpin = async () => {
    if (isSpinning || isWatchingAd) return;

    setIsWatchingAd(true);
    try {
      const earnedReward = await showRewardedAd();
      if (earnedReward) {
        await performSpin("/api/daily-spin");
      }
    } finally {
      setIsWatchingAd(false);
    }
  };

  const handleFreeSpin = () => {
    if (isSpinning || isWatchingAd || !canSpinFree) return;
    performSpin("/api/daily-spin/free");
  };

  const performSpin = async (endpoint: string) => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowReward(false);

    try {
      // The server owns the reward - ask first, then animate to match
      const response = await apiRequest("POST", endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to spin");
      }

      const serverReward: WheelReward = data.reward;

      onSpinSettledRef.current = () => {
        setReward(serverReward);

        if (serverReward.type === 'coins') {
          updateUser({ coins: (user?.coins || 0) + serverReward.amount });
        } else if (serverReward.type === 'gems') {
          updateUser({ gems: (user?.gems || 0) + serverReward.amount });
        } else if (serverReward.type === 'swapTokens') {
          updateUser({ swapTokens: (user?.swapTokens || 0) + serverReward.amount });
        }

        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
        // Not invalidated here -- this spin also counts toward the bonus free spin, but
        // refreshing it now would animate the progress bar while the reward popup is still up.
        // Deferred to the popup's onExitComplete instead (see the AnimatePresence below).

        setIsSpinning(false);
        setShowReward(true);
      };

      setReelTiming(GAMEPLAY_REEL_TIMING);
      startReelSpin(serverReward);

    } catch (error: any) {
      setIsSpinning(false);
      console.error("Spin error:", error.message || "Unable to spin the wheel");
    }
  };

  const handlePremiumSpin = async () => {
    if (isSpinning || isWatchingAd) return;

    // Check if user has enough gems
    if ((user?.gems || 0) < 10) {
      console.log("Not enough gems for premium spin");
      return;
    }

    setIsSpinning(true);
    setShowReward(false);

    try {
      // Call API first to get the result
      const response = await apiRequest("POST", "/api/wheel-of-fortune/premium-spin");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to spin");
      }

      const serverReward = data.reward;

      onSpinSettledRef.current = async () => {
        setReward(serverReward);

        // Update local user state with the new values
        // The server has already processed the transaction
        const currentGems = user?.gems || 0;
        const currentCoins = user?.coins || 0;
        const currentSwapTokens = user?.swapTokens || 0;

        // Deduct 10 gems (cost)
        let newGems = currentGems - 10;
        let newCoins = currentCoins;
        let newSwapTokens = currentSwapTokens;

        // Add reward
        if (serverReward.type === 'coins') {
          newCoins += serverReward.amount;
        } else if (serverReward.type === 'gems') {
          newGems += serverReward.amount;
        } else if (serverReward.type === 'swapTokens') {
          newSwapTokens += serverReward.amount;
        }

        updateUser({
          gems: newGems,
          coins: newCoins,
          swapTokens: newSwapTokens,
        });

        // Refetch to be sure
        await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
        // Not invalidated here -- see the matching comment in performSpin above.

        setIsSpinning(false);
        setShowReward(true);
      };

      setReelTiming(GAMEPLAY_REEL_TIMING);
      startReelSpin(serverReward);

    } catch (error: any) {
      setIsSpinning(false);
      console.error("Spin error:", error.message || "Unable to spin the wheel");
    }
  };

  // Odds for this randomized, gems-purchasable reward are disclosed in the Privacy Policy
  // (Apple Guideline 3.1.1(b)) rather than here — see client/src/pages/legal/privacy-policy.tsx.
  // Must stay in sync with the weights in EconomyManager.generateWheelOfFortuneReward() on the
  // server, and with that page, if either ever changes.

  return (
    <div className="fixed-safe-screen" style={{ background: '#000000' }}>
      <div className="max-w-md mx-auto relative h-full">
      <div className="h-full text-white flex flex-col">
      {/* Header — same back-button pattern as Battle Pass */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={() => navigate("/shop")}
          className="-m-4 p-4 rounded-full text-white/80 transition-colors"
          style={{ touchAction: "manipulation" }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-white">Lucky Reels</h1>
        <div className="w-6 h-6"></div>
      </div>

      {/* Slot machine -- shared with the Shop header's small preview of it, see
          LuckyReelsMachine's own comment. */}
      <div className="flex-1 flex items-center justify-center px-6">
        <LuckyReelsMachine
          spinId={spinId}
          reelStrips={reelStrips}
          idleSymbolsPerReel={idleSymbolsPerReel}
          firstReelDuration={reelTiming.firstReelDuration}
          reelStagger={reelTiming.reelStagger}
          onSettled={() => {
            onSpinSettledRef.current?.();
            onSpinSettledRef.current = null;
          }}
        />
      </div>

      {/* Bottom section -- extra top padding so this whole block sits lower, with more air
          between it and the slot machine above (Anatole: buttons were sitting too high). */}
      <div className="px-6 pt-20 pb-6 space-y-4">
        {/* Progress text */}
        <div className="text-center text-gray-400 text-sm">
          {isWatchingAd ? (
            <div className="space-y-2">
              <p className="text-yellow-400 font-semibold">Loading ad...</p>
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Action buttons -- the Free Spin button always stays in normal flow (so it alone
            defines this block's height, i.e. the machine's flex-1 area above always sizes
            itself as if the Free Spin button were showing) while the taller bonus-progress +
            two-buttons block overlays it absolutely, positioned at the exact same spot the
            Free Spin button occupies. Both stay mounted (toggled invisible, not unmounted) so
            neither pops in/out. This keeps the slot machine's position fixed at the same spot
            it has for the plain daily Free Spin button, instead of the bonus block's own
            (taller) height pushing it up. */}
        {/* top-4 -- a relative-positioned offset only shifts what's painted, not the space this
            box reserves in the flow above, so nudging the whole thing down doesn't move the
            slot machine (whose position is driven by this box's un-shifted layout height). */}
        <div className="relative top-4">
          <motion.button
            onClick={handleFreeSpin}
            disabled={isSpinning || !canSpinFree}
            className={`w-full font-bold text-lg py-4 rounded-xl bg-white text-black flex items-center justify-center gap-2 disabled:opacity-50 ${canSpinFree ? "" : "invisible pointer-events-none"}`}
            style={{ touchAction: "manipulation" }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-daily-free-spin"
          >
            Free Spin
            <BiSolidZap className="w-5 h-5" />
          </motion.button>

          {/* bottom-0, not top-0 -- anchoring from the top let this taller block's own bottom
              (the Free/10 gems buttons, the reset countdown) run past the short button's
              bottom edge and off the fixed-safe-screen's clipped bottom, cutting them off
              entirely. Anchored from the bottom instead, its bottom edge lines up with the
              button's own (already on-screen) bottom edge, and the extra height grows upward
              into the machine area's slack space above instead of downward off-screen. */}
          <div className={`absolute inset-x-0 bottom-0 space-y-5 ${canSpinFree ? "invisible pointer-events-none" : ""}`}>
            <p className="text-center text-gray-500 text-xs">{resetCountdownLabel}</p>

            {/* Progress toward the "free spin every 5 spins" bonus -- independent of, and
                usually faster than, the daily reset countdown below. Same bg-white/10 block
                as the two buttons underneath; the track inside needs its own darker shade
                (bg-black/20) since it'd otherwise be invisible against that same white/10. */}
            {/* rounded-3xl -- same corner radius as home.tsx's game mode cards (ModeCard.tsx). */}
            <div className="bg-white/10 rounded-3xl px-5 py-4 space-y-3">
              <div className="h-3 rounded-full bg-black/20 overflow-hidden">
                <div
                  // Same blue gradient as XPRing.tsx's own XP progress indicator, and the same
                  // transition-[width] treatment it uses for its own progress -- animates in
                  // smoothly instead of snapping to the new width.
                  className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] transition-[width] duration-700 ease-out"
                  style={{ width: `${(Math.min(spinsTowardBonus, SPINS_FOR_BONUS_FREE_SPIN) / SPINS_FOR_BONUS_FREE_SPIN) * 100}%` }}
                />
              </div>
              <p className="text-center text-gray-400 text-sm">
                Spin {spinsRemainingForBonus} more {spinsRemainingForBonus === 1 ? "time" : "times"} to get a free wheel spin!
              </p>
            </div>

            {/* grid, not flex — flex-1 doesn't split evenly here since the two buttons
                carry different padding/border (Button's default px-4/py-2 vs. none on
                the plain motion.button), which skews flex-grow's distribution even with
                min-w-0. Grid columns stay equal-width regardless of each item's own box. */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleAdSpin}
                disabled={isSpinning || isWatchingAd}
                // Same bg-white/10 pill as home.tsx's "See full leaderboard" button, no border.
                // Explicit hover:bg-* matching the resting color, not just an omitted one --
                // Button's own "default" variant bakes in hover:bg-primary/90, which would
                // otherwise still show through since nothing here conflicts with it directly.
                className={`h-14 rounded-xl disabled:opacity-50 ${isWatchingAd
                    ? 'bg-yellow-600 hover:bg-yellow-600 text-white'
                    : 'bg-white/10 hover:bg-white/10 text-white'
                  }`}
                data-testid="button-ad-spin"
              >
                {isWatchingAd ? (
                  <div className="flex items-center space-x-2">
                    <WatchAdIcon className="w-5 h-5" />
                    <span className="font-semibold text-lg">Loading ad...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {/* Same "watch a rewarded ad" glyph as ActionBar's Swap button (once out of
                        Swap tokens) and GameResultOverlay's "Watch to 2X" -- one shared icon for
                        this affordance everywhere it appears, instead of a one-off TV drawing. */}
                    <WatchAdIcon className="w-5 h-5" />
                    <span className="font-semibold text-lg">Free</span>
                  </div>
                )}
              </Button>

              <motion.button
                onClick={handlePremiumSpin}
                disabled={isSpinning || isWatchingAd}
                className="h-14 rounded-xl bg-white/10 text-white flex items-center justify-center gap-1 disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
                data-testid="button-premium-spin"
              >
                <Gem className="w-5 h-5" />
                <span className="font-semibold text-lg">10</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Display */}
      <AnimatePresence
        // Refreshing the bonus progress here (once the popup has fully faded out) rather than
        // as soon as the reward is known keeps the progress bar from animating underneath/at
        // the same time as the reward popup -- it only moves once the popup is gone.
        onExitComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/free/can-spin"] });
        }}
      >
        {showReward && reward && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReward(false)}
          >
            <motion.div
              className="flex items-center space-x-4"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <motion.div
                className="text-6xl font-light tracking-tight text-white"
                animate={{
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity
                }}
              >
                +{reward.amount}
              </motion.div>

              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                {reward.type === 'coins' ? (
                  <Coin size={64} glow />
                ) : reward.type === 'gems' ? (
                  <Gem className="w-16 h-16" />
                ) : reward.type === 'swapTokens' ? (
                  <SwapCoin size={64} />
                ) : null}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
