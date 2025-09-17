import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import coinImage from "@assets/coins_1757366059535.png";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [totalBet, setTotalBet] = useState(0);
  const [chipCounts, setChipCounts] = useState({ 1: 0, 5: 0, 10: 0, 25: 0, 100: 0, 500: 0 });

  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();
  

  // Jetons casino modernes et minimalistes
  const bettingOptions = [
    { 
      amount: 1, 
      primaryColor: "#E5E7EB", // Light gray
      secondaryColor: "#F3F4F6",
      borderColor: "#FFFFFF",
      borderWidth: "1px", 
      label: "1", 
      textColor: "text-white", 
      premium: false
    },
    { 
      amount: 5, 
      primaryColor: "#DC2626", // Deep red
      secondaryColor: "#EF4444",
      borderColor: "#000000",
      borderWidth: "1px", 
      label: "5", 
      textColor: "text-white", 
      premium: false
    },
    { 
      amount: 10, 
      primaryColor: "#1D4ED8", // Royal blue
      secondaryColor: "#3B82F6",
      borderColor: "#1E40AF",
      borderWidth: "1px", 
      label: "10", 
      textColor: "text-white", 
      premium: false
    },
    { 
      amount: 25, 
      primaryColor: "#059669", // Dark green
      secondaryColor: "#10B981",
      borderColor: "#065F46",
      borderWidth: "2px", 
      label: "25", 
      textColor: "text-white", 
      premium: false
    },
    { 
      amount: 100, 
      primaryColor: "#111827", // Black
      secondaryColor: "#1F2937",
      borderColor: "#9CA3AF",
      borderWidth: "2px", 
      label: "100", 
      textColor: "text-gray-300", 
      premium: true
    },
    { 
      amount: 500, 
      primaryColor: "#7C3AED", // Rich purple
      secondaryColor: "#8B5CF6",
      borderColor: "#F59E0B",
      borderWidth: "3px", 
      label: "500", 
      textColor: "text-white", 
      premium: true,
      hasGolden: true
    },
  ];

  useEffect(() => {
    setMode("classic");
    startGame("cash");
    loadBalance();
  }, [setMode, startGame, loadBalance]);

  const handleChipClick = (chipValue: number) => {
    if (canAfford(chipValue) && (totalBet + chipValue) <= balance) {
      setChipCounts(prev => ({
        ...prev,
        [chipValue]: prev[chipValue as keyof typeof prev] + 1
      }));
      setTotalBet(prev => prev + chipValue);
    }
  };

  const handleValidateBet = () => {
    if (totalBet > 0 && balance >= totalBet) {
      // Deduct bet from balance
      deductBet(totalBet);
      // Navigate to game page with the bet amount
      navigate(`/play/game?bet=${totalBet}`);
    }
  };

  const resetBet = () => {
    setTotalBet(0);
    setChipCounts({ 1: 0, 5: 0, 10: 0, 25: 0, 100: 0, 500: 0 });
  };

  const canAfford = (amount: number) => {
    return balance >= amount;
  };

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
          </motion.div>
        </div>

        {/* Page de mise - Layout ajusté pour tenir sur l'écran */}
        <div className="flex flex-col h-screen pt-28 pb-4 px-6">
          {/* Section du haut : Solde et Mise */}
          <div className="flex-shrink-0 mb-4">
            <motion.div
              className="bg-[#13151A] rounded-2xl p-4 ring-1 ring-white/10 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <img src={coinImage} alt="Coin" className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <p className="text-white/60 text-xs">Token Balance</p>
                    <p className="text-[#F8CA5A] font-bold text-lg">
                      {balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Séparateur */}
                <div className="w-px h-12 bg-white/10"></div>
                
                <div className="text-left">
                  <p className="text-white/60 text-xs">Total Bet</p>
                  <p className="text-white font-bold text-2xl">{totalBet || 0}</p>
                </div>
              </div>
              
              {/* Affichage détaillé des jetons sélectionnés */}
              {totalBet > 0 && (
                <div className="flex justify-center gap-2 flex-wrap mb-4">
                  {Object.entries(chipCounts).map(([value, count]) => 
                    count > 0 && (
                      <span key={value} className="text-xs text-white bg-black rounded-full px-2 py-1 font-medium">
                        {count} × {value}
                      </span>
                    )
                  )}
                </div>
              )}
              
              {/* Boutons d'action */}
              {totalBet > 0 && (
                <div className="flex gap-3">
                  <motion.button
                    onClick={resetBet}
                    className="flex-1 bg-[#232227] hover:bg-[#232227]/80 text-white font-bold py-2 rounded-xl text-sm border border-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-reset-bet"
                  >
                    Clear
                  </motion.button>
                  
                  <motion.button
                    onClick={handleValidateBet}
                    className="flex-1 bg-[#232227] hover:bg-[#1a1a1e] text-white font-bold py-2 rounded-xl text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-validate"
                  >
                    Confirm Bet
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Section du milieu : Instructions */}
          <div className="flex-shrink-0 text-center mb-2">
            <p className="text-white/70 text-sm font-medium">Choose your chips</p>
          </div>
          
          {/* Section du bas : Jetons - remontés */}
          <div className="flex-1 flex items-start justify-center pt-8">
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount) || (totalBet + option.amount) > balance}
                  className={`group relative w-20 h-20 mx-auto rounded-full transition-all duration-200 ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40"
                  }`}
                  style={{
                    background: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `linear-gradient(135deg, ${option.primaryColor} 0%, ${option.secondaryColor} 100%)`
                      : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
                    border: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `${option.borderWidth} solid ${option.borderColor}`
                      : '1px solid #6B7280'
                  }}
                  whileHover={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  } : {}}
                  whileTap={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Golden accent for premium chips */}
                  {option.hasGolden && canAfford(option.amount) && (totalBet + option.amount) <= balance && (
                    <div className="absolute inset-1 rounded-full" 
                         style={{
                           background: `conic-gradient(from 0deg, ${option.borderColor}20 0%, transparent 25%, transparent 75%, ${option.borderColor}20 100%)`
                         }} />
                  )}
                  
                  {/* Number */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center">
                    <span className={`font-black text-xl tracking-tight ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? option.textColor 
                        : 'text-gray-400'
                    }`} style={{
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: '900'
                    }}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Chip counter */}
                  {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                    <motion.div 
                      className="absolute -top-1 -right-1 w-6 h-6 bg-white text-gray-900 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      {chipCounts[option.amount as keyof typeof chipCounts]}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}