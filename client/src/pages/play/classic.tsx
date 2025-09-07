import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import BlackjackTable from "@/components/game/blackjack-table";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedBet, setSelectedBet] = useState(0);

  const { setMode, startGame, dealInitialCards } = useGameStore();
  const user = useUserStore((state) => state.user);

  // Betting options with colors matching Offsuit theme - only 25, 50, 100, 500
  const bettingOptions = [
    { amount: 25, color: "bg-gradient-to-br from-[#F8CA5A] to-yellow-400", label: "25" },
    { amount: 50, color: "bg-gradient-to-br from-red-500 to-red-700", label: "50" },
    { amount: 100, color: "bg-gradient-to-br from-[#B79CFF] to-purple-700", label: "100" },
    { amount: 500, color: "bg-gradient-to-br from-[#8CCBFF] to-blue-700", label: "500" },
  ];

  useEffect(() => {
    setMode("classic");
    startGame("cash");
  }, [setMode, startGame]);

  const handlePlayClick = () => {
    if (selectedBet > 0) {
      dealInitialCards(selectedBet);
      setGameStarted(true);
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

        {/* Main Layout */}
        <div className="flex flex-col h-full min-h-screen pt-20">
          {/* Balance and Current Bet Display */}
          <div className="flex-1 flex flex-col justify-center items-center px-6">
            <motion.div
              className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-16 h-16 bg-[#F8CA5A]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-[#F8CA5A]" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Votre Solde</h3>
              <p className="text-[#F8CA5A] font-bold text-3xl mb-4">
                {user?.coins?.toLocaleString() || "0"}
              </p>
              
              {selectedBet > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Mise Actuelle</p>
                  <p className="text-[#B5F3C7] font-bold text-2xl">{selectedBet}</p>
                </div>
              )}
            </motion.div>
            
            {selectedBet > 0 && (
              <motion.button
                onClick={handlePlayClick}
                className="w-full max-w-sm bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold py-4 rounded-2xl text-lg mb-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-play"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                Jouer
              </motion.button>
            )}
          </div>
          
          {/* Chip Selection at Bottom */}
          <div className="bg-[#13151A]/80 backdrop-blur-sm p-6 rounded-t-3xl">
            <p className="text-white/60 text-center text-sm mb-4">Choisissez votre mise</p>
            <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => setSelectedBet(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`relative w-16 h-16 mx-auto rounded-full border-4 transition-all ${
                    selectedBet === option.amount 
                      ? `${option.color} border-white/60 shadow-lg scale-110`
                      : canAfford(option.amount)
                        ? `${option.color} border-white/20 hover:scale-105 hover:border-white/40`
                        : "bg-gray-400/20 cursor-not-allowed opacity-50 border-white/10"
                  }`}
                  whileHover={canAfford(option.amount) ? { scale: selectedBet === option.amount ? 1.1 : 1.05 } : {}}
                  whileTap={canAfford(option.amount) ? { scale: 0.95 } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{option.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}