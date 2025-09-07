import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlackjackTable from "@/components/game/blackjack-table";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedBet, setSelectedBet] = useState(25);
  const [customBet, setCustomBet] = useState("");

  const { setMode, startGame, dealInitialCards } = useGameStore();
  const user = useUserStore((state) => state.user);

  // Betting options with colors matching Offsuit theme
  const bettingOptions = [
    { amount: 10, color: "bg-gradient-to-br from-gray-400 to-gray-600", label: "10" },
    { amount: 25, color: "bg-gradient-to-br from-[#F8CA5A] to-yellow-400", label: "25" },
    { amount: 50, color: "bg-gradient-to-br from-red-500 to-red-700", label: "50" },
    { amount: 100, color: "bg-gradient-to-br from-[#B79CFF] to-purple-700", label: "100" },
    { amount: 250, color: "bg-gradient-to-br from-[#B5F3C7] to-emerald-700", label: "250" },
    { amount: 500, color: "bg-gradient-to-br from-[#8CCBFF] to-blue-700", label: "500" },
  ];

  useEffect(() => {
    setMode("classic");
    startGame("cash");
  }, [setMode, startGame]);

  const handleBetSelection = (amount: number) => {
    setSelectedBet(amount);
    dealInitialCards(amount);
    setGameStarted(true);
  };

  const handleCustomBetSubmit = () => {
    const amount = parseInt(customBet);
    if (amount && amount > 0 && user?.coins && user.coins >= amount) {
      handleBetSelection(amount);
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount you can afford.",
        variant: "destructive",
      });
    }
  };

  const canAfford = (amount: number) => {
    return user && user.coins !== null && user.coins !== undefined && user.coins >= amount;
  };

  if (gameStarted) {
    return <BlackjackTable gameMode="cash" />;
  }

  return (
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-10 px-6 pt-12 pb-6">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.button
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">Classic 21</h1>
            <div className="w-8"></div> {/* Spacer for centering */}
          </motion.div>
        </div>

        {/* Bet Selection Screen */}
        <div className="flex items-center justify-center min-h-screen px-6">
          <motion.div
            className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 bg-[#F8CA5A]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-[#F8CA5A]" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Choose Your Bet</h3>
            <p className="text-white/60 mb-6">Select your chips to start playing</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleBetSelection(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`relative w-20 h-20 mx-auto rounded-full border-4 border-white/20 shadow-xl transition-all ${
                    canAfford(option.amount)
                      ? `${option.color} hover:scale-110 active:scale-95`
                      : "bg-gray-400/20 cursor-not-allowed opacity-50"
                  }`}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.1, 
                    boxShadow: "0 0 20px rgba(255,255,255,0.3)" 
                  } : {}}
                  whileTap={canAfford(option.amount) ? { scale: 0.95 } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{option.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-white/60 text-sm mb-3">Or enter a custom amount</p>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={customBet}
                  onChange={(e) => setCustomBet(e.target.value)}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  min="1"
                  max={user?.coins || 1000}
                  data-testid="input-custom-bet"
                />
                <Button 
                  onClick={handleCustomBetSubmit}
                  disabled={!customBet || !user?.coins || parseInt(customBet) > user.coins || parseInt(customBet) <= 0}
                  className="bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold px-6"
                  data-testid="button-validate-bet"
                >
                  Play
                </Button>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Your Balance</p>
              <p className="text-[#F8CA5A] font-bold text-xl">
                {user?.coins?.toLocaleString() || "0"}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}