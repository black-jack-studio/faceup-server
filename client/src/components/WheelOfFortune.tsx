import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AnimatedModal from "@/components/AnimatedModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { Gem, Coin } from "@/icons";
import Pointer3D from "@/components/Pointer3D";
import { Ticket } from "@/components/ui/Ticket";
import { showRewardedAd } from "@/lib/admob";

interface WheelOfFortuneProps {
  children: React.ReactNode;
}

interface WheelReward {
  type: 'coins' | 'gems' | 'xp' | 'tickets';
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

  // Wheel segments with balanced layout - 2 coins, 2 gems, 2 tickets (opposites), synchronized with backend
  const segments = [
    { angle: 0, type: "coins", amount: 150, icon: "🪙", color: "#1F2937" }, // Dark gray
    { angle: 60, type: "gems", amount: 10, icon: "💎", color: "#000000" }, // Black
    { angle: 120, type: "tickets", amount: 1, icon: "🎫", color: "#1F2937" }, // Dark gray
    { angle: 180, type: "coins", amount: 500, icon: "🪙", color: "#000000" }, // Black - opposite to first coins
    { angle: 240, type: "gems", amount: 5, icon: "💎", color: "#1F2937" }, // Dark gray - opposite to first gems
    { angle: 300, type: "tickets", amount: 3, icon: "🎫", color: "#000000" }, // Black - opposite to first tickets
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

  const handleSpin = async () => {
    if (isSpinning || isWatchingAd) return;

    setIsWatchingAd(true);
    try {
      const earnedReward = await showRewardedAd();
      if (earnedReward) {
        await performActualSpin();
      }
    } finally {
      setIsWatchingAd(false);
    }
  };

  const performActualSpin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowReward(false);
    setShouldAnimate(true);

    try {
      // The server owns the reward for the real daily free spin - ask first, then animate to match
      const response = await apiRequest("POST", "/api/daily-spin");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to spin");
      }

      const serverReward: WheelReward = data.reward;
      const landingSegmentIndex = getLandingSegmentIndex(serverReward);
      const finalRotation = computeTargetRotation(rotation, landingSegmentIndex);
      setRotation(finalRotation);

      setTimeout(async () => {
        setReward(serverReward);

        if (serverReward.type === 'coins') {
          updateUser({ coins: (user?.coins || 0) + serverReward.amount });
        } else if (serverReward.type === 'gems') {
          updateUser({ gems: (user?.gems || 0) + serverReward.amount });
        } else if (serverReward.type === 'tickets') {
          updateUser({ tickets: (user?.tickets || 0) + serverReward.amount });
        }

        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });

        setIsSpinning(false);
        setShowReward(true);
        setShouldAnimate(false);
      }, 3000);

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

      setRotation(finalRotation);

      // Wait for animation to finish
      setTimeout(async () => {
        setReward(serverReward);

        // Update local user state with the new values
        // The server has already processed the transaction
        const currentGems = user?.gems || 0;
        const currentCoins = user?.coins || 0;
        const currentTickets = user?.tickets || 0;
        const currentXp = user?.xp || 0;

        // Deduct 10 gems (cost)
        let newGems = currentGems - 10;
        let newCoins = currentCoins;
        let newTickets = currentTickets;
        let newXp = currentXp;

        // Add reward
        if (serverReward.type === 'coins') {
          newCoins += serverReward.amount;
        } else if (serverReward.type === 'gems') {
          newGems += serverReward.amount;
        } else if (serverReward.type === 'tickets') {
          newTickets += serverReward.amount;
        } else if (serverReward.type === 'xp') {
          newXp += serverReward.amount;
        }

        updateUser({
          gems: newGems,
          coins: newCoins,
          tickets: newTickets,
          xp: newXp
        });

        // Refetch to be sure
        await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });

        setIsSpinning(false);
        setShowReward(true);
        setShouldAnimate(false);
      }, 3000);

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
      <div onClick={() => setIsOpen(true)}>
        {children}
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
            <div className="relative w-80 h-80">
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
                transition={isSpinning ? { duration: 3, ease: "easeOut" } : { duration: 0 }}
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
                        {segment.type === 'tickets' && <Ticket size={40} />}
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
              ) : (
                <div className="flex items-center justify-center">
                  <p>Watch an ad to spin the wheel!</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleSpin}
                disabled={isSpinning || isWatchingAd}
                className={`flex-1 text-white rounded-xl py-3 disabled:opacity-50 ${isWatchingAd
                    ? 'bg-yellow-600 hover:bg-yellow-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                data-testid="button-free-spin"
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

              <Button
                onClick={handlePremiumSpin}
                className="flex-1 bg-[#60A5FA] hover:bg-[#3b82f6] text-white rounded-xl py-3 flex items-center justify-center"
                data-testid="button-premium-spin"
              >
                <span className="font-semibold">10</span>
                <Gem className="w-4 h-4" />
              </Button>
            </div>
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
                    ) : reward.type === 'tickets' ? (
                      <Ticket size={64} glow />
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