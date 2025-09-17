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
  

  // Jetons casino neon glow minimalistes
  const bettingOptions = [
    { 
      amount: 1, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#9CA3AF", // Light gray glow
      ringColor: "#9CA3AF",
      label: "1", 
      textColor: "text-white"
    },
    { 
      amount: 5, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#EF4444", // Red glow
      ringColor: "#EF4444",
      label: "5", 
      textColor: "text-white"
    },
    { 
      amount: 10, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#3B82F6", // Blue glow
      ringColor: "#3B82F6",
      label: "10", 
      textColor: "text-white"
    },
    { 
      amount: 25, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#10B981", // Green glow
      ringColor: "#10B981",
      label: "25", 
      textColor: "text-white"
    },
    { 
      amount: 100, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#9CA3AF", // Silver glow
      ringColor: "#9CA3AF",
      label: "100", 
      textColor: "text-gray-300"
    },
    { 
      amount: 500, 
      baseColor: "#1F2937", // Dark matte base
      glowColor: "#8B5CF6", // Purple glow
      ringColor: "#8B5CF6",
      goldenAccent: "#F59E0B", // Golden neon accent
      label: "500", 
      textColor: "text-white",
      premium: true
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
                  className={`group relative w-20 h-20 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40"
                  }`}
                  style={{
                    background: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? option.baseColor
                      : '#374151',
                    border: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `3px solid ${option.ringColor}`
                      : '2px solid #6B7280',
                    boxShadow: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `0 0 20px ${option.glowColor}40, 0 0 40px ${option.glowColor}20, inset 0 0 0 1px ${option.glowColor}30`
                      : 'none'
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
                  {/* Golden neon accent for 500 chip */}
                  {option.premium && option.goldenAccent && canAfford(option.amount) && (totalBet + option.amount) <= balance && (
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        boxShadow: `inset 0 0 15px ${option.goldenAccent}60, inset 0 0 25px ${option.goldenAccent}30`
                      }}
                    />
                  )}
                  
                  {/* Number */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center">
                    <span className={`font-black text-2xl tracking-tight ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? option.textColor 
                        : 'text-gray-500'
                    }`} style={{
                      fontFamily: 'ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: '900',
                      letterSpacing: '-0.03em',
                      textShadow: canAfford(option.amount) && (totalBet + option.amount) <= balance
                        ? `0 0 10px ${option.glowColor}60`
                        : 'none'
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