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

interface WheelReward {
  type: 'coins' | 'gems' | 'swapTokens' | 'xp';
  amount: number;
}

// The 3 possible slot symbols, matching the 3 real currencies EconomyManager.
// generateWheelOfFortuneReward() can award (server, kept in sync -- see that function's own
// comment). Anatole's reference screenshot used generic slot-machine icons; these are FaceUp's
// own Coin/Gem/SwapCoin in their place.
type SlotSymbol = 'coins' | 'gems' | 'swapTokens';
const SLOT_SYMBOLS: SlotSymbol[] = ['coins', 'gems', 'swapTokens'];

const REEL_ITEM_SIZE = 104; // px -- height of one symbol's row in a reel strip
const REEL_LIST_LENGTH = 24; // how many symbols long each spin's strip is
const REEL_TARGET_INDEX = 20; // where the real result sits in that strip once it settles
// Window shows the landing symbol fully, centered, with only slivers of its neighbors peeking
// in above/below (faded to black) instead of 3 complete rows -- 2 item-heights tall, not 3.
const REEL_WINDOW_HEIGHT = REEL_ITEM_SIZE * 2;

function randomSlotSymbol(): SlotSymbol {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
}

// One reel's full symbol strip for a single spin: random filler everywhere except
// REEL_TARGET_INDEX, which is forced to `target` -- since this is one shared reward animated
// across 3 reels (not 3 independent slots), every reel's strip is forced to the same target so
// all three always land on the same symbol together.
function buildReelStrip(target: SlotSymbol): SlotSymbol[] {
  return Array.from({ length: REEL_LIST_LENGTH }, (_, i) => (i === REEL_TARGET_INDEX ? target : randomSlotSymbol()));
}

function SlotIcon({ type, size }: { type: SlotSymbol; size: number }) {
  if (type === 'coins') return <Coin size={size} />;
  if (type === 'gems') return <Gem style={{ width: size, height: size }} />;
  return <SwapCoin size={size} />;
}

// One column of the slot machine. Idle (spinId 0) just shows a static row of 3 symbols with no
// animation. Every spin after that remounts (key={spinId}) with a fresh REEL_LIST_LENGTH-long
// strip and animates from the top down to REEL_TARGET_INDEX's resting position -- the remount
// is what lets each spin restart from y=0 instead of animating backwards from wherever the
// previous spin settled.
function SlotReel({
  spinId,
  strip,
  idleSymbols,
  duration,
  onSettled,
}: {
  spinId: number;
  strip: SlotSymbol[];
  idleSymbols: [SlotSymbol, SlotSymbol, SlotSymbol];
  duration: number;
  onSettled?: () => void;
}) {
  // Vertical offset that puts the item at `targetIndex` in a strip fully visible and centered
  // in the window, with its neighbors only half-showing above/below (cropped by the window's
  // own edges, then faded further by the gradients below).
  const centerOffset = (targetIndex: number) => (REEL_WINDOW_HEIGHT - REEL_ITEM_SIZE) / 2 - targetIndex * REEL_ITEM_SIZE;
  const restY = centerOffset(REEL_TARGET_INDEX);
  const idleY = centerOffset(1); // idleSymbols is always a 3-item [above, shown, below] triplet

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: REEL_WINDOW_HEIGHT }}>
      {spinId === 0 ? (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center" style={{ transform: `translateY(${idleY}px)` }}>
          {idleSymbols.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center shrink-0"
              style={{ height: REEL_ITEM_SIZE, width: "100%" }}
            >
              <SlotIcon type={s} size={68} />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          key={spinId}
          className="absolute inset-x-0 top-0 flex flex-col items-center"
          initial={{ y: 0 }}
          animate={{ y: restY }}
          transition={{ duration, ease: [0.12, 0.72, 0.32, 1] }}
          onAnimationComplete={onSettled}
        >
          {strip.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center shrink-0"
              style={{ height: REEL_ITEM_SIZE, width: "100%" }}
            >
              <SlotIcon type={s} size={68} />
            </div>
          ))}
        </motion.div>
      )}

      {/* Fades the strip to black at the top/bottom edges instead of hard-cutting mid-symbol,
          same idea as a real slot machine's window -- sized to cover most of the half-symbol
          sliver the shorter window now leaves peeking in on each side. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-11 z-10"
        style={{ background: "linear-gradient(180deg, #2a2d34 0%, transparent 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-11 z-10"
        style={{ background: "linear-gradient(0deg, #2a2d34 0%, transparent 100%)" }}
      />
    </div>
  );
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
  // Fixed once on mount so the idle display doesn't re-randomize on every re-render. One
  // independent triplet per reel -- sharing a single triplet across all 3 columns would show
  // the exact same symbol in the exact same row on every column, reading like a pre-matched
  // win before the player has even spun once.
  const [idleSymbolsPerReel] = useState<[SlotSymbol, SlotSymbol, SlotSymbol][]>(() =>
    [0, 1, 2].map(() => [randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol()])
  );

  // Truly-free daily spin (no ad, no gems), resetting once a day at 1am Paris time - gated server-side.
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean; secondsUntilReset: number }>({
    queryKey: ["/api/daily-spin/free/can-spin"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/daily-spin/free/can-spin");
      return await response.json();
    },
    refetchInterval: 60_000,
  });
  const canSpinFree = freeSpinStatus?.canSpin ?? false;

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

    setReelStrips([buildReelStrip(targetSymbol), buildReelStrip(targetSymbol), buildReelStrip(targetSymbol)]);
    setSpinId((id) => id + 1);
  };

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
        queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/free/can-spin"] });

        setIsSpinning(false);
        setShowReward(true);
      };

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

        setIsSpinning(false);
        setShowReward(true);
      };

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
        <h1 className="text-2xl font-bold text-white">Fortune Wheel</h1>
        <div className="w-6 h-6"></div>
      </div>

      {/* Slot machine */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="relative w-full rounded-[28px] p-3.5 overflow-hidden"
          style={{
            // Inverse shape from the reels below: dark in the middle of the frame (nearest
            // the recessed window, where it'd naturally fall into shadow) and lighter toward
            // both the top and bottom edges (catching more light), same grey palette.
            background: "linear-gradient(180deg, #6b7280 0%, #2a2d34 50%, #6b7280 100%)",
            boxShadow: "0 20px 40px -16px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="relative rounded-[20px] overflow-hidden flex"
            style={{
              // Same grey palette as the outer bezel above, just reshaped: light in the
              // middle (where the landing symbol sits), darkening toward both the top and
              // bottom edges -- reads as a lit, curved reel drum rather than a flat black slot.
              background: "linear-gradient(180deg, #2a2d34 0%, #6b7280 50%, #2a2d34 100%)",
              boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            {[0, 1, 2].map((reelIndex) => (
              <div key={reelIndex} className="relative flex-1 flex">
                <SlotReel
                  spinId={spinId}
                  strip={reelStrips[reelIndex]}
                  idleSymbols={idleSymbolsPerReel[reelIndex]}
                  duration={1.8 + reelIndex * 0.45}
                  onSettled={reelIndex === 2 ? () => {
                    onSpinSettledRef.current?.();
                    onSpinSettledRef.current = null;
                  } : undefined}
                />
              </div>
            ))}
          </div>

          {/* Column dividers, at the bezel level rather than inside the (overflow-hidden)
              window so they can have flat top/bottom ends instead of the rounded pill-shaped
              caps a rounded-full div gets -- but only spanning the window's own height
              (top/bottom inset by the frame's 14px padding), not the frame's full height:
              they should end flush at the window's edge, not run further up/down into the
              grey padding above/below it. */}
          {[1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-3.5 bottom-3.5 z-20"
              style={{
                left: `calc(14px + (100% - 28px) * ${i} / 3)`,
                width: 16,
                transform: "translateX(-50%)",
                background: "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.85) 70%, rgba(255,255,255,0.08) 100%)",
                boxShadow: "inset 3px 0 5px rgba(0,0,0,0.7), inset -3px 0 5px rgba(0,0,0,0.7)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="p-6 space-y-4">
        {/* Progress text */}
        <div className="text-center text-gray-400 text-sm">
          {isWatchingAd ? (
            <div className="space-y-2">
              <p className="text-yellow-400 font-semibold">Loading ad...</p>
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              </div>
            </div>
          ) : canSpinFree ? null : (
            <div className="flex items-center justify-center">
              <p>Watch an ad or spend gems to spin the wheel!</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canSpinFree ? (
          <motion.button
            onClick={handleFreeSpin}
            disabled={isSpinning}
            className="w-full font-bold text-lg py-4 rounded-xl bg-white hover:bg-white text-black flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-daily-free-spin"
          >
            Free Spin
            <BiSolidZap className="w-5 h-5" />
          </motion.button>
        ) : (
          <div className="space-y-2">
            {/* grid, not flex — flex-1 doesn't split evenly here since the two buttons
                carry different padding/border (Button's default px-4/py-2 vs. none on
                the plain motion.button), which skews flex-grow's distribution even with
                min-w-0. Grid columns stay equal-width regardless of each item's own box. */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleAdSpin}
                disabled={isSpinning || isWatchingAd}
                // Same bg-white/10 pill as home.tsx's "See full leaderboard" button, no border.
                className={`h-14 rounded-xl disabled:opacity-50 ${isWatchingAd
                    ? 'bg-yellow-600 hover:bg-yellow-600 text-white'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                data-testid="button-ad-spin"
              >
                {isWatchingAd ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                      <rect x="5" y="8" width="14" height="8" rx="1" fill="currentColor" />
                      <circle cx="19" cy="7" r="1" fill="currentColor" />
                      <circle cx="19" cy="17" r="1" fill="currentColor" />
                      <path d="M8 21l2-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="font-semibold text-lg">Loading ad...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                      <rect x="5" y="8" width="14" height="8" rx="1" fill="currentColor" />
                      <circle cx="19" cy="7" r="1" fill="currentColor" />
                      <circle cx="19" cy="17" r="1" fill="currentColor" />
                      <path d="M8 21l2-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="font-semibold text-lg">Free</span>
                  </div>
                )}
              </Button>

              <motion.button
                onClick={handlePremiumSpin}
                disabled={isSpinning || isWatchingAd}
                className="h-14 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-1 disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
                data-testid="button-premium-spin"
              >
                <Gem className="w-5 h-5" />
                <span className="font-semibold text-lg">10</span>
              </motion.button>
            </div>
            <p className="text-center text-gray-500 text-xs">{resetCountdownLabel}</p>
          </div>
        )}
      </div>

      {/* Reward Display */}
      <AnimatePresence>
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
