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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { Gem, Coin } from "@/icons";

interface WheelOfFortuneProps {
  children: React.ReactNode;
}

interface WheelReward {
  type: 'coins' | 'gems' | 'xp';
  amount: number;
}

export default function WheelOfFortune({ children }: WheelOfFortuneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [reward, setReward] = useState<WheelReward | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [timeUntilFree, setTimeUntilFree] = useState<{hours: number, minutes: number, seconds: number} | null>(null);
  const [pendingRewards, setPendingRewards] = useState<{coins: number, gems: number, xp: number}>({coins: 0, gems: 0, xp: 0});
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  // Wheel segments with triangle layout - only gems and coins, all even numbers, max 50 gems
  const segments = [
    { angle: 0, type: "gems", amount: 8, icon: "💎", color: "#1F2937" }, // Dark gray
    { angle: 45, type: "coins", amount: 150, icon: "🪙", color: "#000000" }, // Black
    { angle: 90, type: "gems", amount: 20, icon: "💎", color: "#1F2937" }, // Dark gray
    { angle: 135, type: "coins", amount: 250, icon: "🪙", color: "#000000" }, // Black
    { angle: 180, type: "coins", amount: 100, icon: "🪙", color: "#1F2937" }, // Dark gray
    { angle: 225, type: "gems", amount: 50, icon: "💎", color: "#000000" }, // Black - MAX GEMS
    { angle: 270, type: "coins", amount: 500, icon: "🪙", color: "#1F2937" }, // Dark gray
    { angle: 315, type: "gems", amount: 12, icon: "💎", color: "#000000" }, // Black
  ];

  useEffect(() => {
    if (isOpen) {
      checkCanSpin();
      checkTimeUntilFree();
      // Reset rotation when opening to prevent unwanted animation
      setRotation(0);
      setIsSpinning(false);
      setShowReward(false);
    }
  }, [isOpen]);

  // Appliquer les récompenses quand la roue se ferme
  const applyPendingRewards = () => {
    if (pendingRewards.coins > 0 || pendingRewards.gems > 0 || pendingRewards.xp > 0) {
      const updates: any = {};
      if (pendingRewards.coins > 0) {
        updates.coins = (user?.coins || 0) + pendingRewards.coins;
      }
      if (pendingRewards.gems > 0) {
        updates.gems = (user?.gems || 0) + pendingRewards.gems;
      }
      if (pendingRewards.xp > 0) {
        updates.xp = (user?.xp || 0) + pendingRewards.xp;
      }
      
      updateUser(updates);
      setPendingRewards({coins: 0, gems: 0, xp: 0});
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && timeUntilFree && !canSpin) {
      timer = setInterval(() => {
        checkTimeUntilFree();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, timeUntilFree, canSpin]);

  const checkCanSpin = async () => {
    try {
      const response = await apiRequest("GET", "/api/wheel-of-fortune/can-spin");
      const data = await response.json();
      setCanSpin(data.canSpin);
    } catch (error) {
      console.error("Error checking spin status:", error);
    }
  };

  const checkTimeUntilFree = async () => {
    try {
      const response = await apiRequest("GET", "/api/wheel-of-fortune/time-until-free-spin");
      const data = await response.json();
      if (data.canSpinNow) {
        setTimeUntilFree(null);
        setCanSpin(true);
      } else {
        setTimeUntilFree({
          hours: data.hours,
          minutes: data.minutes,
          seconds: data.seconds
        });
      }
    } catch (error) {
      console.error("Error checking time until free spin:", error);
    }
  };

  // Animation function for reward addition
  const animateRewardAddition = (rewardType: string, rewardAmount: number, finalUpdates: any) => {
    if (!user) return;
    
    const currentValue = rewardType === 'coins' ? (user.coins || 0) : 
                        rewardType === 'gems' ? (user.gems || 0) : 
                        (user.xp || 0);
    
    const steps = 20; // Number of animation steps
    const increment = rewardAmount / steps;
    let currentStep = 0;
    
    const animationInterval = setInterval(() => {
      currentStep++;
      const newValue = Math.floor(currentValue + (increment * currentStep));
      
      if (currentStep >= steps) {
        // Final update with exact values
        clearInterval(animationInterval);
        updateUser(finalUpdates);
      } else {
        // Intermediate animation steps
        const tempUpdates: any = {};
        tempUpdates[rewardType] = newValue;
        updateUser(tempUpdates);
      }
    }, 50); // Update every 50ms for smooth animation
  };

  const handleSpin = async () => {
    if (!canSpin || isSpinning) return;

    setIsSpinning(true);
    setShowReward(false);
    setShouldAnimate(true);
    
    try {
      const response = await apiRequest("POST", "/api/wheel-of-fortune/spin");
      const data = await response.json();
      
      // Calculate rotation based on reward
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalRotation = rotation + (spins * 360);
      
      setRotation(finalRotation);
      setReward(data.reward);
      
      // Show reward after animation and update user data
      setTimeout(() => {
        setIsSpinning(false);
        setShowReward(true);
        setCanSpin(false);
        setShouldAnimate(false);
        
        // Stocker les récompenses en attente au lieu de les appliquer immédiatement
        if (user) {
          const newPendingRewards = { ...pendingRewards };
          switch (data.reward.type) {
            case 'coins':
              newPendingRewards.coins += data.reward.amount;
              break;
            case 'gems':
              newPendingRewards.gems += data.reward.amount;
              break;
            case 'xp':
              newPendingRewards.xp += data.reward.amount;
              break;
          }
          setPendingRewards(newPendingRewards);
        }
        
        // Refresh the countdown timer after free spin
        checkTimeUntilFree();
      }, 3000);
      
    } catch (error: any) {
      setIsSpinning(false);
      setShouldAnimate(false);
      toast({
        title: "Error",
        description: error.message || "Unable to spin the wheel",
        variant: "destructive",
      });
    }
  };

  const handlePremiumSpin = async () => {
    if (isSpinning) return;

    // Check if user has enough gems
    if ((user?.gems || 0) < 10) {
      toast({
        title: "Not enough gems",
        description: "You need 10 gems to spin. Visit the shop to buy more.",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setShowReward(false);
    setShouldAnimate(true);
    
    try {
      const response = await apiRequest("POST", "/api/wheel-of-fortune/premium-spin");
      const data = await response.json();
      
      // Calculate rotation based on reward
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalRotation = rotation + (spins * 360);
      
      setRotation(finalRotation);
      setReward(data.reward);
      
      // First deduct gems immediately (for premium spin cost)
      if (user) {
        updateUser({ gems: (user.gems || 0) - 10 });
      }
      
      // Show reward after animation
      setTimeout(() => {
        setIsSpinning(false);
        setShowReward(true);
        setShouldAnimate(false);
        
        // Stocker les récompenses en attente au lieu de les appliquer immédiatement
        if (user) {
          const newPendingRewards = { ...pendingRewards };
          switch (data.reward.type) {
            case 'coins':
              newPendingRewards.coins += data.reward.amount;
              break;
            case 'gems':
              newPendingRewards.gems += data.reward.amount; // Les gems déjà déduites plus haut
              break;
            case 'xp':
              newPendingRewards.xp += data.reward.amount;
              break;
          }
          setPendingRewards(newPendingRewards);
        }
      }, 3000);
      
    } catch (error: any) {
      setIsSpinning(false);
      setShouldAnimate(false);
      toast({
        title: "Error",
        description: error.message || "Unable to spin the wheel",
        variant: "destructive",
      });
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && isOpen) {
      // La roue se ferme, appliquer les récompenses
      applyPendingRewards();
    }
    setIsOpen(open);
  };

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
          {/* Header */}
          <div className="flex items-center justify-center p-4">
            <h1 className="text-lg font-semibold text-white">Fortune Wheel</h1>
          </div>

          {/* Wheel Container */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="relative w-80 h-80">
              {/* White pointer triangle at top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-white"></div>
              </div>

              {/* Wheel */}
              <motion.div
                className="relative w-full h-full rounded-full overflow-hidden"
                animate={{ rotate: rotation }}
                transition={isSpinning ? { duration: 3, ease: "easeOut" } : { duration: 0 }}
                style={{
                  border: '8px solid #1F2937'
                }}
              >
                {/* Segment background */}
                <div className="absolute w-full h-full bg-gradient-to-r from-black via-gray-800 to-gray-700 rounded-full"></div>
                
                {/* Separator lines only */}
                {segments.map((segment, index) => (
                  <div
                    key={`separator-${index}`}
                    className="absolute w-full h-full"
                    style={{
                      transform: `rotate(${index * 45}deg)`,
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
                        height: "1px",
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
                      transform: `rotate(${index * 45 + 22.5}deg)`,
                      transformOrigin: "center center"
                    }}
                  >
                    <div
                      className="flex flex-col items-center justify-center text-white drop-shadow-lg"
                      style={{
                        transform: `translateY(-110px) rotate(${180 - (index * 45 + 22.5)}deg)`,
                      }}
                    >
                      <div className="text-3xl drop-shadow-md">
                        {segment.type === 'coins' && <Coin size={40} />}
                        {segment.type === 'gems' && <Gem className="w-10 h-10" />}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Center circle with loading indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-black rounded-full flex items-center justify-center z-10 border-4 border-gray-600">
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
            {/* Time until free spin or progress text */}
            <div className="text-center text-gray-400 text-sm">
              {!canSpin && timeUntilFree ? (
                <p>
                  Next free spin in {String(timeUntilFree.hours).padStart(2, '0')}:
                  {String(timeUntilFree.minutes).padStart(2, '0')}:
                  {String(timeUntilFree.seconds).padStart(2, '0')}
                </p>
              ) : (
                <p>Free spin available!</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleSpin}
                disabled={!canSpin || isSpinning}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-3 disabled:opacity-50"
                data-testid="button-free-spin"
              >
                <span className="font-semibold">Free</span>
              </Button>
              
              <Button
                onClick={handlePremiumSpin}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 flex items-center justify-center space-x-2"
                data-testid="button-premium-spin"
              >
                <Gem className="w-4 h-4" />
                <span className="font-semibold">10</span>
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
                    ) : (
                      <Gem className="w-16 h-16" />
                    )}
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