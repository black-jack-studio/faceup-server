import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";
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
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  // Wheel segments with their angles and rewards
  const segments = [
    { label: "50 Coins", angle: 0, type: "coins", amount: 50, color: "#4A5568", textColor: "#E2E8F0" },
    { label: "100 XP", angle: 45, type: "xp", amount: 100, color: "#2D3748", textColor: "#E2E8F0" },
    { label: "3 Gems", angle: 90, type: "gems", amount: 3, color: "#1A202C", textColor: "#E2E8F0" },
    { label: "150 Coins", angle: 135, type: "coins", amount: 150, color: "#4A5568", textColor: "#E2E8F0" },
    { label: "100 XP", angle: 180, type: "xp", amount: 100, color: "#2D3748", textColor: "#E2E8F0" },
    { label: "75 Coins", angle: 225, type: "coins", amount: 75, color: "#4A5568", textColor: "#E2E8F0" },
    { label: "100 XP", angle: 270, type: "xp", amount: 100, color: "#2D3748", textColor: "#E2E8F0" },
    { label: "Big Prize", angle: 315, type: "coins", amount: 1000, color: "#1A202C", textColor: "#F7FAFC" },
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
        <DialogDescription className="sr-only">
          Spin the wheel once every 24 hours to win coins, gems, or XP. Click the spin button to try your luck!
        </DialogDescription>
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 z-20"
          data-testid="button-close-wheel"
        >
          <X className="w-5 h-5" />
        </Button>
        
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
            {/* Wheel Shadow */}
            <div className="absolute inset-2 rounded-full bg-black/20 blur-lg"></div>
            
            {/* Wheel */}
            <motion.div
              className="relative w-full h-full rounded-full border-8 border-gray-300 shadow-2xl overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: "easeOut" }}
              style={{
                background: `conic-gradient(
                  from 0deg,
                  #4A5568 0deg 45deg,
                  #2D3748 45deg 90deg,
                  #1A202C 90deg 135deg,
                  #4A5568 135deg 180deg,
                  #2D3748 180deg 225deg,
                  #4A5568 225deg 270deg,
                  #2D3748 270deg 315deg,
                  #1A202C 315deg 360deg
                )`,
                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)'
              }}
            >
              {/* Inner border for 3D effect */}
              <div className="absolute inset-4 rounded-full border-2 border-white/10"></div>
              
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
                    className="font-bold text-sm px-2 py-1 rounded shadow-lg"
                    style={{ 
                      transform: `translateY(-110px) rotate(${-(segment.angle + 22.5)}deg)`,
                      color: segment.textColor,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {segment.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
              <div 
                className="w-0 h-0 border-l-6 border-r-6 border-b-10 border-l-transparent border-r-transparent border-b-white shadow-lg"
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              ></div>
            </div>

            {/* Center circle with 3D effect */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full border-4 border-gray-300 flex items-center justify-center z-10 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center shadow-inner">
                <RotateCcw className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>

          {/* Reward Display */}
          <AnimatePresence>
            {showReward && reward && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="text-center mb-6"
              >
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-6 border border-white/20 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center shadow-lg">
                      {getRewardIcon(reward.type)}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Félicitations!</h3>
                  <p className="text-white/90 text-lg">
                    Vous avez gagné <span className="font-bold text-accent-blue">{reward.amount} {reward.type === 'coins' ? 'pièces' : reward.type === 'gems' ? 'gemmes' : 'XP'}</span>!
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