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

  // Wheel segments with their angles and rewards - Design amélioré
  const segments = [
    { label: "50 Coins", angle: 0, type: "coins", amount: 50, color: "#F59E0B", textColor: "#1F2937", gradient: "from-yellow-400 to-amber-500" },
    { label: "200 XP", angle: 45, type: "xp", amount: 200, color: "#3B82F6", textColor: "#FFFFFF", gradient: "from-blue-400 to-blue-600" },
    { label: "5 Gems", angle: 90, type: "gems", amount: 5, color: "#8B5CF6", textColor: "#FFFFFF", gradient: "from-purple-400 to-purple-600" },
    { label: "300 Coins", angle: 135, type: "coins", amount: 300, color: "#F59E0B", textColor: "#1F2937", gradient: "from-yellow-400 to-amber-500" },
    { label: "150 XP", angle: 180, type: "xp", amount: 150, color: "#3B82F6", textColor: "#FFFFFF", gradient: "from-blue-400 to-blue-600" },
    { label: "100 Coins", angle: 225, type: "coins", amount: 100, color: "#F59E0B", textColor: "#1F2937", gradient: "from-yellow-400 to-amber-500" },
    { label: "250 XP", angle: 270, type: "xp", amount: 250, color: "#3B82F6", textColor: "#FFFFFF", gradient: "from-blue-400 to-blue-600" },
    { label: "🎉 JACKPOT!", angle: 315, type: "coins", amount: 2000, color: "#EF4444", textColor: "#FFFFFF", gradient: "from-red-400 to-red-600" },
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
        return <Coin size={48} glow={true} />;
      case 'gems':
        return <Gem className="w-12 h-12" />;
      case 'xp':
        return <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'}}>XP</div>;
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
                  #F59E0B 0deg 45deg,
                  #3B82F6 45deg 90deg,
                  #8B5CF6 90deg 135deg,
                  #F59E0B 135deg 180deg,
                  #3B82F6 180deg 225deg,
                  #F59E0B 225deg 270deg,
                  #3B82F6 270deg 315deg,
                  #EF4444 315deg 360deg
                )`,
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2), 0 12px 32px rgba(0,0,0,0.3), 0 0 40px rgba(139, 92, 246, 0.3)'
              }}
            >
              {/* Inner border for 3D effect */}
              <div className="absolute inset-4 rounded-full border-2 border-white/30 shadow-inner"></div>
              
              {/* Séparateurs entre les segments */}
              {segments.map((_, index) => (
                <div
                  key={`separator-${index}`}
                  className="absolute w-full h-0.5 bg-white/20 origin-left"
                  style={{
                    transform: `rotate(${index * 45}deg)`,
                    transformOrigin: "center center",
                    top: "50%",
                    left: "50%",
                    width: "50%",
                    marginLeft: "0",
                    marginTop: "-1px"
                  }}
                />
              ))}
              
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
                    className="font-bold text-xs px-3 py-2 rounded-xl shadow-lg border"
                    style={{ 
                      transform: `translateY(-110px) rotate(${-(segment.angle + 22.5)}deg)`,
                      color: segment.textColor,
                      background: `linear-gradient(135deg, ${segment.color}E6, ${segment.color}CC)`,
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    {segment.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Pointer amélioré */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-10">
              <div className="relative">
                {/* Ombre du pointer */}
                <div 
                  className="absolute w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-black/30 blur-sm"
                  style={{ 
                    transform: 'translate(2px, 2px)'
                  }}
                ></div>
                {/* Pointer principal */}
                <div 
                  className="relative w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-white"
                  style={{ 
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))',
                    background: 'linear-gradient(135deg, #ffffff, #f3f4f6)'
                  }}
                ></div>
                {/* Lueur autour du pointer */}
                <div 
                  className="absolute w-0 h-0 border-l-6 border-r-6 border-b-9 border-l-transparent border-r-transparent border-b-blue-400/50 blur-md"
                  style={{ 
                    transform: 'translate(-2px, -1px)'
                  }}
                ></div>
              </div>
            </div>

            {/* Center circle with enhanced 3D effect */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-gray-100 via-white to-gray-200 rounded-full border-4 border-white/50 flex items-center justify-center z-10 shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-full flex items-center justify-center shadow-inner border-2 border-gray-200/50">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                  <RotateCcw className="w-8 h-8 text-gray-600" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'}} />
                </div>
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
                <div className="p-6">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 flex items-center justify-center">
                      {getRewardIcon(reward.type)}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Félicitations!</h3>
                  <div className="flex items-center justify-center gap-2 text-white/90 text-lg">
                    <span>Vous avez gagné</span>
                    <span className="font-bold text-accent-blue">{reward.amount}</span>
                    {reward.type === 'coins' && <Coin size={20} glow={true} />}
                    {reward.type === 'gems' && <Gem className="w-5 h-5" />}
                    {reward.type === 'xp' && <span className="font-bold text-accent-blue">XP</span>}
                    <span>!</span>
                  </div>
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