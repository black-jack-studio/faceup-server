import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

      const matchingSegmentIndex = segments.findIndex(
        (s) => s.type === serverReward.type && s.amount === serverReward.amount
      );

      const sectorSize = 360 / segments.length;
      const spins = 5 + Math.floor(Math.random() * 3);
      const baseRotation = spins * 360;

      const targetRotationBase =
        matchingSegmentIndex === -1
          ? Math.random() * 360
          : 360 + sectorSize / 2 - matchingSegmentIndex * sectorSize;
      const jitter = matchingSegmentIndex === -1 ? 0 : (Math.random() - 0.5) * (sectorSize * 0.8);

      const finalRotation = rotation + baseRotation + targetRotationBase + jitter;
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

      // Find the segment that matches the reward
      // We need to find a segment with the same type and amount
      const matchingSegmentIndex = segments.findIndex(s =>
        s.type === serverReward.type && s.amount === serverReward.amount
      );

      if (matchingSegmentIndex === -1) {
        console.error("No matching segment found for reward:", serverReward);
        // Fallback to a random spin if something goes wrong, but this shouldn't happen
        return;
      }

      // Calculate rotation to land on the winning segment
      // The winning segment needs to be at the top (270 degrees or -90 degrees visually, but our logic might differ)
      // Based on winningIndexByRotation: 
      // adjusted = (360 - t + sector / 2) % 360
      // index = floor(adjusted / sector)

      // We need to reverse this to find the target rotation 't' for a given index
      // This is a bit complex due to the modulo arithmetic, so we'll add extra rotations
      // and target the center of the segment

      const sectorSize = 360 / segments.length;

      // Target angle for the segment center
      // We want the pointer (top) to point to this segment
      // The logic in winningIndexByRotation seems to assume 0 is at 3 o'clock or similar standard math
      // Let's rely on the visual logic:
      // If index 0 is at 0 degrees, and we rotate, we need to know where 0 ends up.

      // Let's use a simplified approach:
      // 1. Calculate the angle of the target segment center relative to the start
      const segmentAngle = matchingSegmentIndex * sectorSize;

      // 2. To land on this segment under the pointer (assumed at top/12 o'clock or right/3 o'clock),
      // we need to rotate the wheel such that this segment aligns with the pointer.
      // If pointer is at 0 (right), and segment is at 60, we rotate -60 (or 300).
      // Let's assume standard behavior and add some randomness within the segment.

      // Add 5-8 full spins
      const spins = 5 + Math.floor(Math.random() * 3);
      const baseRotation = spins * 360;

      // Calculate target rotation to land on the specific segment
      // We need to invert the winningIndexByRotation logic
      // adjusted = (360 - t + sector / 2) % 360
      // index * sector = 360 - t + sector / 2
      // t = 360 + sector / 2 - index * sector

      const targetRotationBase = 360 + (sectorSize / 2) - (matchingSegmentIndex * sectorSize);

      // Add some random jitter within the segment (keep it safe, +/- 40% of sector)
      const jitter = (Math.random() - 0.5) * (sectorSize * 0.8);

      const finalRotation = rotation + baseRotation + targetRotationBase + jitter;

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

  // Matches EconomyManager.generateWheelOfFortuneReward() on the server — 9 equally-weighted
  // outcomes. Disclosed here because the premium spin is paid with gems (Apple Guideline 3.1.1(b)
  // requires odds disclosure for any randomized reward obtainable with purchasable currency).
  const premiumSpinOdds = [
    { type: "coins", amount: 150 },
    { type: "coins", amount: 250 },
    { type: "coins", amount: 500 },
    { type: "gems", amount: 8 },
    { type: "gems", amount: 20 },
    { type: "gems", amount: 25 },
    { type: "tickets", amount: 1 },
    { type: "tickets", amount: 3 },
    { type: "tickets", amount: 5 },
  ];
  const oddsPerOutcome = (100 / premiumSpinOdds.length).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-black border-none p-0 overflow-hidden">
        <DialogTitle className="sr-only">Fortune Wheel</DialogTitle>
        <DialogDescription className="sr-only">
          Spin the wheel to win rewards. Free spin available once per day or use gems for premium spins.
        </DialogDescription>

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

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                    data-testid="button-spin-odds"
                    aria-label="View spin odds"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs bg-gray-900 border-white/10 rounded-2xl">
                  <DialogTitle className="text-white text-center">Premium Spin Odds</DialogTitle>
                  <DialogDescription className="text-gray-400 text-center text-sm">
                    Each spin costs 10 gems. Every outcome below has an equal {oddsPerOutcome}% chance.
                  </DialogDescription>
                  <div className="space-y-2 mt-2">
                    {premiumSpinOdds.map((outcome, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 text-sm"
                      >
                        <div className="flex items-center space-x-2 text-white">
                          {outcome.type === "coins" && <Coin size={18} />}
                          {outcome.type === "gems" && <Gem className="w-[18px] h-[18px]" />}
                          {outcome.type === "tickets" && <Ticket size={18} />}
                          <span>{outcome.amount} {outcome.type}</span>
                        </div>
                        <span className="text-gray-400 font-semibold">{oddsPerOutcome}%</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
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
      </DialogContent>
    </Dialog>
  );
}