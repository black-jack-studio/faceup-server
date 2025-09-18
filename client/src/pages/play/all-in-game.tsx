import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface AllInStatus {
  coins: number;
  bonusCoins: number;
  tickets: number;
  winProb: number;
  lossRebatePct: number;
}

export default function AllInGameMode() {
  const { setMode, startGame, dealInitialCards } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch all-in status from backend for validation
  const { data: allInStatus, isLoading, error } = useQuery<AllInStatus>({
    queryKey: ['/api/allin/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/allin/status');
      return response.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (allInStatus && !isLoading) {
      // Validate requirements for all-in mode
      if (allInStatus.tickets <= 0) {
        setValidationError("No tickets remaining");
        toast({
          title: "No Tickets Remaining",
          description: "You need at least 1 ticket to play All-in mode. Purchase tickets from the store.",
          variant: "destructive",
        });
        return;
      }
      
      if (allInStatus.coins <= 0) {
        setValidationError("Insufficient coins");
        toast({
          title: "Insufficient Coins",
          description: "You need coins to play All-in mode. Earn coins from other game modes or purchase them.",
          variant: "destructive",
        });
        return;
      }
      
      // If validation passed, set up all-in mode and start game
      setMode("all-in");
      startGame("all-in");
      
      // Automatically deal cards with all user's coins after a brief delay
      setTimeout(() => {
        dealInitialCards(allInStatus.coins);
      }, 100);
      
      setIsValidated(true);
    }
  }, [allInStatus, isLoading, setMode, startGame, dealInitialCards, toast]);

  useEffect(() => {
    if (error) {
      setValidationError("Failed to validate all-in status");
      toast({
        title: "Connection Error",
        description: "Failed to validate your all-in status. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
        <div className="max-w-md mx-auto relative h-full">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8CCBFF] mx-auto mb-4"></div>
              <p className="text-white/60">Validating All-in status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with option to go back
  if (validationError) {
    return (
      <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
        <div className="max-w-md mx-auto relative h-full">
          <div className="absolute top-0 inset-x-0 z-10 px-6 pt-6 pb-4">
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.button
                onClick={() => navigate("/play/all-in")}
                className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-back-to-all-in"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </motion.button>
              
              <h1 className="text-lg font-medium text-white">All-in Mode</h1>
              <div className="w-16"></div>
            </motion.div>
          </div>
          
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-xl font-medium mb-2 text-white">Cannot Start All-in Game</h2>
              <p className="text-white/60 mb-6">{validationError}</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/play/all-in")}
                  className="w-full bg-[#8CCBFF] hover:bg-[#8CCBFF]/90 text-black font-medium"
                  data-testid="button-back-to-mode-select"
                >
                  Back to All-in Mode
                </Button>
                
                {allInStatus?.tickets === 0 && (
                  <Button 
                    onClick={() => navigate("/shop")}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    data-testid="button-go-to-shop"
                  >
                    Get Tickets
                  </Button>
                )}
                
                {allInStatus?.coins === 0 && (
                  <Button 
                    onClick={() => navigate("/play")}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    data-testid="button-earn-coins"
                  >
                    Earn Coins
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show game only after successful validation
  if (isValidated) {
    return <BlackjackTable gameMode="all-in" />;
  }

  // Fallback loading state
  return (
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8CCBFF] mx-auto mb-4"></div>
            <p className="text-white/60">Setting up All-in game...</p>
          </div>
        </div>
      </div>
    </div>
  );
}