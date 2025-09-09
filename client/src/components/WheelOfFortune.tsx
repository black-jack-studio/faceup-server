import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
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
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  // Wheel segments with their angles and rewards
  const segments = [
    { label: "50 Coins", angle: 0, type: "coins", amount: 50, color: "#FFD700" },
    { label: "100 XP", angle: 45, type: "xp", amount: 100, color: "#4CAF50" },
    { label: "3 Gems", angle: 90, type: "gems", amount: 3, color: "#9C27B0" },
    { label: "150 Coins", angle: 135, type: "coins", amount: 150, color: "#FFD700" },
    { label: "100 XP", angle: 180, type: "xp", amount: 100, color: "#4CAF50" },
    { label: "75 Coins", angle: 225, type: "coins", amount: 75, color: "#FFD700" },
    { label: "100 XP", angle: 270, type: "xp", amount: 100, color: "#4CAF50" },
    { label: "1000 Coins", angle: 315, type: "coins", amount: 1000, color: "#FF5722" },
  ];

  useEffect(() => {
    if (isOpen) {
      checkCanSpin();
    }
  }, [isOpen]);

  const checkCanSpin = async () => {
    try {
      const response = await apiRequest("GET", "/api/wheel-of-fortune/can-spin");
      const data = await response.json();
      setCanSpin(data.canSpin);
    } catch (error) {
      console.error("Error checking spin status:", error);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || isSpinning) return;

    setIsSpinning(true);
    setShowReward(false);
    
    try {
      const response = await apiRequest("POST", "/api/wheel-of-fortune/spin");
      const data = await response.json();
      
      // Calculate rotation based on reward
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalRotation = rotation + (spins * 360);
      
      setRotation(finalRotation);
      setReward(data.reward);
      
      // Update user data
      if (user) {
        const updates: any = {};
        switch (data.reward.type) {
          case 'coins':
            updates.coins = (user.coins || 0) + data.reward.amount;
            break;
          case 'gems':
            updates.gems = (user.gems || 0) + data.reward.amount;
            break;
          case 'xp':
            updates.xp = (user.xp || 0) + data.reward.amount;
            break;
        }
        updateUser(updates);
      }
      
      // Show reward after animation
      setTimeout(() => {
        setIsSpinning(false);
        setShowReward(true);
        setCanSpin(false);
        
        toast({
          title: "Congratulations!",
          description: `You won ${data.reward.amount} ${data.reward.type}!`,
        });
      }, 3000);
      
    } catch (error: any) {
      setIsSpinning(false);
      toast({
        title: "Error",
        description: error.message || "Unable to spin the wheel",
        variant: "destructive",
      });
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins':
        return <Coin className="w-8 h-8" />;
      case 'gems':
        return <Gem className="w-8 h-8" />;
      case 'xp':
        return <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">XP</div>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card-dark border-white/10 shadow-2xl">
        <DialogTitle className="sr-only">Wheel of Fortune</DialogTitle>
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple/30 to-accent-blue/30 flex items-center justify-center mr-3">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Wheel of Fortune</h2>
          </div>

          {/* Wheel Container */}
          <div className="relative w-80 h-80 mx-auto mb-6">
            {/* Wheel */}
            <motion.div
              className="relative w-full h-full rounded-full border-8 border-white/20 overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: "easeOut" }}
              style={{
                background: `conic-gradient(
                  from 0deg,
                  #FFD700 0deg 45deg,
                  #4CAF50 45deg 90deg,
                  #9C27B0 90deg 135deg,
                  #FFD700 135deg 180deg,
                  #4CAF50 180deg 225deg,
                  #FFD700 225deg 270deg,
                  #4CAF50 270deg 315deg,
                  #FF5722 315deg 360deg
                )`
              }}
            >
              {/* Wheel segments with text */}
              {segments.map((segment, index) => (
                <div
                  key={index}
                  className="absolute w-full h-full flex items-center justify-center"
                  style={{
                    transform: `rotate(${segment.angle + 22.5}deg)`,
                    transformOrigin: "center center"
                  }}
                >
                  <div 
                    className="text-white font-bold text-sm bg-black/30 px-2 py-1 rounded"
                    style={{ transform: `translateY(-120px) rotate(${-(segment.angle + 22.5)}deg)` }}
                  >
                    {segment.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
            </div>

            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center z-10">
              <RotateCcw className="w-6 h-6 text-gray-600" />
            </div>
          </div>

          {/* Reward Display */}
          <AnimatePresence>
            {showReward && reward && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center mb-6"
              >
                <div className="bg-gradient-to-r from-accent-purple/20 to-accent-blue/20 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-center mb-2">
                    {getRewardIcon(reward.type)}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Congratulations!</h3>
                  <p className="text-white/80">
                    You won <span className="font-bold text-accent-blue">{reward.amount} {reward.type}</span>!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin Button */}
          <div className="text-center">
            <Button
              onClick={handleSpin}
              disabled={!canSpin || isSpinning}
              className="w-full h-12 bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/90 hover:to-accent-blue/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              data-testid="button-spin-wheel"
            >
              {isSpinning ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Spinning...</span>
                </div>
              ) : !canSpin ? (
                "Come back tomorrow!"
              ) : (
                "Spin the Wheel!"
              )}
            </Button>
            
            {!canSpin && !isSpinning && (
              <p className="text-white/60 text-sm mt-2">
                Resets at midnight (French time)
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}