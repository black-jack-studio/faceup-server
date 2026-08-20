import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AnimatedModal from "@/components/AnimatedModal";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { Gem, Coin } from "@/icons";
import Pointer3D from "@/components/Pointer3D";
import { Key } from "@/components/ui/Key";
import { showRewardedAd } from "@/lib/admob";
import { BiSolidZap } from "react-icons/bi";

interface WheelOfFortuneProps {
  children: React.ReactNode;
}

interface WheelReward {
  type: 'coins' | 'gems' | 'xp' | 'keys';
  amount: number;
}

export default function WheelOfFortune({ children }: WheelOfFortuneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<WheelReward | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const { user, updateUser } = useUserStore();
  // Runs once the wheel's spring animation actually settles, instead of a
  // hardcoded setTimeout that has to guess the animation's duration.
  const onSpinSettledRef = useRef<(() => void) | null>(null);
  const [secondsUntilReset, setSecondsUntilReset] = useState(0);

  // Truly-free daily spin (no ad, no gems), resetting once a day at 1am Paris time - gated server-side.
  // Polled even while closed so the shop icon can show a badge when a free spin is waiting.
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

  // Wheel segments with balanced layout - 2 coins, 2 gems, 2 keys (opposites), synchronized with backend
  const segments = [
    { angle: 0, type: "coins", amount: 150, icon: "🪙", color: "#1F2937" }, // Dark gray
    { angle: 60, type: "gems", amount: 10, icon: "💎", color: "#000000" }, // Black
    { angle: 120, type: "keys", amount: 1, icon: "🔑", color: "#1F2937" }, // Dark gray
    { angle: 180, type: "coins", amount: 500, icon: "🪙", color: "#000000" }, // Black - opposite to first coins
    { angle: 240, type: "gems", amount: 5, icon: "💎", color: "#1F2937" }, // Dark gray - opposite to first gems
    { angle: 300, type: "keys", amount: 3, icon: "🔑", color: "#000000" }, // Black - opposite to first keys
  ];

  // The server can grant reward amounts that don't have a matching segment on this 6-slot
  // wheel (e.g. it awards 8/20/25 gems while the wheel only shows a "5" and a "10" gems slot).
  // Landing on a same-type segment — instead of a fully random one — keeps the arrow pointing
  // at the right reward category even when the exact amount isn't on the wheel.
  const getLandingSegmentIndex = (reward: WheelReward) => {
    const exactIndex = segments.findIndex((s) => s.type === reward.type && s.amount === reward.amount);
    if (exactIndex !== -1) return exactIndex;

    const sameTypeIndexes = segments
      .map((s, i) => (s.type === reward.type ? i : -1))
      .filter((i) => i !== -1);
    return sameTypeIndexes[Math.floor(Math.random() * sameTypeIndexes.length)];
  };

  // Segment i's icon sits at clock-angle (i * sectorSize) once the wheel has been rotated by
  // `rotation` degrees (0deg = 12 o'clock, under the fixed pointer). We need the wheel's new
  // absolute rotation, mod 360, to equal (360 - i*sectorSize) so that segment lands under the
  // pointer — computed *relative to the wheel's current angle*, since `rotation` keeps
  // accumulating across spins in the same session and isn't reset to a multiple of 360.
  const computeTargetRotation = (currentRotation: number, landingIndex: number) => {
    const sectorSize = 360 / segments.length;
    const desiredAngle = (360 - landingIndex * sectorSize) % 360;
    const currentAngleMod = ((currentRotation % 360) + 360) % 360;
    const forwardDelta = (desiredAngle - currentAngleMod + 360) % 360;

    const spins = 5 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * (sectorSize * 0.8);

    return currentRotation + spins * 360 + forwardDelta + jitter;
  };

  useEffect(() => {
    if (isOpen) {
      // Reset rotation when opening to prevent unwanted animation
      setRotation(0);
      setIsSpinning(false);
      setShowReward(false);
    }
  }, [isOpen]);

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
    setShouldAnimate(true);

    try {
      // The server owns the reward - ask first, then animate to match
      const response = await apiRequest("POST", endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to spin");
      }

      const serverReward: WheelReward = data.reward;
      const landingSegmentIndex = getLandingSegmentIndex(serverReward);
      const finalRotation = computeTargetRotation(rotation, landingSegmentIndex);

      onSpinSettledRef.current = () => {
        setReward(serverReward);

        if (serverReward.type === 'coins') {
          updateUser({ coins: (user?.coins || 0) + serverReward.amount });
        } else if (serverReward.type === 'gems') {
          updateUser({ gems: (user?.gems || 0) + serverReward.amount });
        } else if (serverReward.type === 'keys') {
          updateUser({ keys: (user?.keys || 0) + serverReward.amount });
        }

        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
        queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/free/can-spin"] });

        setIsSpinning(false);
        setShowReward(true);
        setShouldAnimate(false);
      };

      setRotation(finalRotation);

    } catch (error: any) {
      setIsSpinning(false);
      setShouldAnimate(false);
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
    setShouldAnimate(true);

    try {
      // Call API first to get the result
      const response = await apiRequest("POST", "/api/wheel-of-fortune/premium-spin");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to spin");
      }

      const serverReward = data.reward;

      // Same-type fallback as the free spin: the server's reward pool includes amounts that
      // don't have their own wheel segment, so land on a segment of the right category instead
      // of erroring out (which used to leave the wheel stuck spinning after gems were spent).
      const landingSegmentIndex = getLandingSegmentIndex(serverReward);
      const finalRotation = computeTargetRotation(rotation, landingSegmentIndex);

      onSpinSettledRef.current = async () => {
        setReward(serverReward);

        // Update local user state with the new values
        // The server has already processed the transaction
        const currentGems = user?.gems || 0;
        const currentCoins = user?.coins || 0;
        const currentKeys = user?.keys || 0;
        const currentXp = user?.xp || 0;

        // Deduct 10 gems (cost)
        let newGems = currentGems - 10;
        let newCoins = currentCoins;
        let newKeys = currentKeys;
        let newXp = currentXp;

        // Add reward
        if (serverReward.type === 'coins') {
          newCoins += serverReward.amount;
        } else if (serverReward.type === 'gems') {
          newGems += serverReward.amount;
        } else if (serverReward.type === 'keys') {
          newKeys += serverReward.amount;
        } else if (serverReward.type === 'xp') {
          newXp += serverReward.amount;
        }

        updateUser({
          gems: newGems,
          coins: newCoins,
          keys: newKeys,
          xp: newXp
        });

        // Refetch to be sure
        await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });

        setIsSpinning(false);
        setShowReward(true);
        setShouldAnimate(false);
      };

      setRotation(finalRotation);

    } catch (error: any) {
      setIsSpinning(false);
      setShouldAnimate(false);
      console.error("Spin error:", error.message || "Unable to spin the wheel");
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
  };

  // Odds for this randomized, gems-purchasable reward are disclosed in the Privacy Policy
  // (Apple Guideline 3.1.1(b)) rather than here — see client/src/pages/legal/privacy-policy.tsx.
  // Must stay in sync with the weights in EconomyManager.generateWheelOfFortuneReward() on the
  // server, and with that page, if either ever changes.

  return (
    <>
      <div className="relative inline-block" onClick={() => setIsOpen(true)}>
        {children}
        {canSpinFree && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
          </span>
        )}
      </div>
      <AnimatedModal
        open={isOpen}
        onClose={() => handleDialogChange(false)}
        className="max-w-sm w-full bg-black border-none p-0 overflow-hidden rounded-lg"
      >
        <h2 className="sr-only">Fortune Wheel</h2>
        <p className="sr-only">
          Spin the wheel to win rewards. Free spin available once per day or use gems for premium spins.
        </p>

        <div className="bg-black text-white min-h-[600px] flex flex-col">
          {/* Wheel Container */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="relative w-80 h-80 shrink-0">
              {/* Arrow pointing at the wheel */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 z-30">
                <div className="flex flex-col items-center">
                  {/* 3D Arrow pointer */}
                  <Pointer3D width={60} shadow={true} />
                </div>
              </div>

              {/* Wheel */}
              <motion.div
                className="wheel relative w-full h-full rounded-full overflow-hidden bg-transparent"
                animate={{ rotate: rotation }}
                transition={
                  isSpinning
                    ? { type: "spring", bounce: 0.15, duration: 3 }
                    : { duration: 0 }
                }
                onAnimationComplete={() => {
                  onSpinSettledRef.current?.();
                  onSpinSettledRef.current = null;
                }}
                style={{
                  border: '12px solid #1F2937'
                }}
              >
                {/* Separator lines only */}
                {segments.map((segment, index) => (
                  <div
                    key={`separator-${index}`}
                    className="absolute w-full h-full"
                    style={{
                      transform: `rotate(${index * 60}deg)`,
                      transformOrigin: "center center"
                    }}
                  >
                    {/* Straight separator line */}
                    <div
                      className="absolute bg-white/10"
                      style={{
                        top: "50%",
                        left: "50%",
                        width: "50%",
                        height: "2px",
                        transformOrigin: "left center"
                      }}
                    />
                  </div>
                ))}

                {/* Content icons and amounts */}
                {segments.map((segment, index) => (
                  <div
                    key={`content-${index}`}
                    className="absolute w-full h-full flex items-center justify-center"
                    style={{
                      transform: `rotate(${index * 60}deg)`,
                      transformOrigin: "center center"
                    }}
                  >
                    <div
                      className="flex flex-col items-center justify-center text-white drop-shadow-lg"
                      style={{
                        transform: `translateY(-100px)`,
                      }}
                    >
                      <div className="icon text-3xl drop-shadow-md">
                        {segment.type === 'coins' && <Coin size={40} />}
                        {segment.type === 'gems' && <Gem className="w-10 h-10" />}
                        {segment.type === 'keys' && <Key size={40} />}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>


              {/* Center circle with loading indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-black rounded-full flex items-center justify-center z-10 border-[6px] border-gray-600">
                {isSpinning ? (
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                )}
              </div>
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
                className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  touchAction: "manipulation",
                  backgroundImage: "linear-gradient(90deg, #38bdf8, #7dd3fc, #38bdf8)",
                  backgroundSize: "200% auto",
                }}
                animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
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
                    className={`h-12 text-white rounded-xl border border-white/10 disabled:opacity-50 ${isWatchingAd
                        ? 'bg-yellow-600 hover:bg-yellow-600'
                        : 'bg-white/5 hover:bg-white/10'
                      }`}
                    data-testid="button-ad-spin"
                  >
                    {isWatchingAd ? (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                          <rect x="5" y="8" width="14" height="8" rx="1" fill="currentColor" />
                          <circle cx="19" cy="7" r="1" fill="currentColor" />
                          <circle cx="19" cy="17" r="1" fill="currentColor" />
                          <path d="M8 21l2-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="font-semibold">Loading ad...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                          <rect x="5" y="8" width="14" height="8" rx="1" fill="currentColor" />
                          <circle cx="19" cy="7" r="1" fill="currentColor" />
                          <circle cx="19" cy="17" r="1" fill="currentColor" />
                          <path d="M8 21l2-2h4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="font-semibold">Free</span>
                      </div>
                    )}
                  </Button>

                  <motion.button
                    onClick={handlePremiumSpin}
                    disabled={isSpinning || isWatchingAd}
                    className="h-12 text-white rounded-xl flex items-center justify-center gap-1 disabled:opacity-50"
                    style={{
                      backgroundImage: "linear-gradient(90deg, #38bdf8, #7dd3fc, #38bdf8)",
                      backgroundSize: "200% auto",
                    }}
                    animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-premium-spin"
                  >
                    <span className="font-semibold">10</span>
                    <Gem className="w-4 h-4" />
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
                    className="text-6xl font-black text-white"
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
                    ) : reward.type === 'keys' ? (
                      <Key size={64} glow />
                    ) : null}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedModal>
    </>
  );
}