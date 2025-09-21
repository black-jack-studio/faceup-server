import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Ticket } from "@/components/ui/Ticket";
import coinImage from "@assets/coins_1757366059535.png";
import gemImage from "@assets/image_1757366539717.png";
import Pointer3D from "@/components/Pointer3D";

interface Reward {
  type: "coins" | "gems" | "xp" | "item" | "tickets";
  amount?: number;
  itemName?: string;
  icon: string;
  color: string;
}

// Updated rewards to match backend wheel with ticket integration
const rewards: Reward[] = [
  { type: "coins", amount: 150, icon: "coin", color: "#FFD700" },
  { type: "gems", amount: 8, icon: "gem", color: "#9C27B0" },
  { type: "tickets", amount: 1, icon: "ticket", color: "#4CAF50" },
  { type: "coins", amount: 250, icon: "coin", color: "#FFD700" },
  { type: "gems", amount: 20, icon: "gem", color: "#9C27B0" },
  { type: "tickets", amount: 3, icon: "ticket", color: "#2196F3" },
  { type: "coins", amount: 500, icon: "coin", color: "#FFD700" },
  { type: "tickets", amount: 5, icon: "ticket", color: "#9C27B0" },
  { type: "gems", amount: 25, icon: "gem", color: "#9C27B0" },
];

interface DailySpinProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailySpin({ isOpen, onClose }: DailySpinProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const spinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/daily-spin"),
    onSuccess: (response: any) => {
      // Use backend response as single source of truth
      const backendReward = response.reward;
      
      // Find matching reward in our display rewards array
      const rewardIndex = rewards.findIndex(r => 
        r.type === backendReward.type && r.amount === backendReward.amount
      );
      
      if (rewardIndex !== -1) {
        // Calculate rotation to land on the server-selected reward segment
        const segmentAngle = 360 / rewards.length;
        const targetRotation = 1440 + (360 - (rewardIndex * segmentAngle + segmentAngle / 2));
        setRotation(targetRotation);
        
        setTimeout(() => {
          setSelectedReward(rewards[rewardIndex]);
          
          // Show reward toast
          const rewardText = backendReward.type === "item" 
            ? backendReward.itemName 
            : backendReward.type === "tickets"
            ? `${backendReward.amount} Ticket${backendReward.amount > 1 ? 's' : ''}`
            : `${backendReward.amount} ${backendReward.type.toUpperCase()}`;
          
          toast({
            title: "Reward Earned!",
            description: `You won ${rewardText}!`,
          });
        }, 3000);
      }
      
      // Correct query invalidation keys to match actual API endpoints
      queryClient.invalidateQueries({ queryKey: ["/api/spin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/can-spin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Spin Failed",
        description: error.message || "Unable to spin today",
        variant: "destructive",
      });
    },
  });

  const handleSpin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    
    try {
      // Backend response determines reward, frontend displays it
      await spinMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSpinning(false);
    }
  };

  const handleClose = () => {
    setSelectedReward(null);
    setRotation(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-white">Daily Spin</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Wheel */}
          <div className="relative w-64 h-64">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10">
              <Pointer3D width={80} shadow={true} />
            </div>
            
            {/* Wheel */}
            <motion.div
              className="w-full h-full rounded-full border-4 border-primary relative overflow-hidden"
              style={{ rotate: rotation }}
              transition={{ duration: 3, ease: "easeOut" }}
            >
              {rewards.map((reward, index) => {
                const segmentAngle = 360 / rewards.length;
                const startAngle = index * segmentAngle;
                
                return (
                  <div
                    key={index}
                    className="absolute w-full h-full"
                    style={{
                      transform: `rotate(${startAngle}deg)`,
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((segmentAngle * Math.PI) / 180)}% ${50 - 50 * Math.cos((segmentAngle * Math.PI) / 180)}%)`,
                      backgroundColor: `${reward.color}20`,
                      borderRight: `2px solid ${reward.color}40`,
                    }}
                  >
                    <div 
                      className="absolute"
                      style={{
                        top: "20%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {reward.icon === "coin" ? (
                        <img src={coinImage} alt="Coin" className="w-4 h-4" />
                      ) : reward.icon === "gem" ? (
                        <img src={gemImage} alt="Gem" className="w-4 h-4" />
                      ) : reward.icon === "ticket" ? (
                        <Ticket className="w-4 h-4 text-white" />
                      ) : (
                        <i className={`${reward.icon} text-white text-sm`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning || spinMutation.isPending}
            className="bg-primary hover:bg-primary/80 text-white px-8 py-2"
            data-testid="button-spin"
          >
            {isSpinning ? "Spinning..." : "Spin!"}
          </Button>

          {/* Reward Display */}
          <AnimatePresence>
            {selectedReward && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <div className="text-4xl mb-2">
                  {selectedReward.icon === "coin" ? (
                    <img src={coinImage} alt="Coin" className="w-10 h-10 mx-auto" />
                  ) : selectedReward.icon === "gem" ? (
                    <img src={gemImage} alt="Gem" className="w-10 h-10 mx-auto" />
                  ) : selectedReward.icon === "ticket" ? (
                    <Ticket className="w-10 h-10 text-white mx-auto" />
                  ) : (
                    <i className={`${selectedReward.icon} text-white`} />
                  )}
                </div>
                <p className="text-white font-semibold">
                  {selectedReward.type === "item" 
                    ? selectedReward.itemName
                    : selectedReward.type === "tickets"
                    ? `${selectedReward.amount || 0} Ticket${(selectedReward.amount || 0) > 1 ? 's' : ''}`
                    : `${selectedReward.amount || 0} ${selectedReward.type.toUpperCase()}`}
                </p>
                <p className="text-muted-foreground text-sm">Come back tomorrow!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
