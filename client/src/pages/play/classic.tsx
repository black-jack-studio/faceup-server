import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [totalBet, setTotalBet] = useState(0);
  const [chipCounts, setChipCounts] = useState({ 25: 0, 50: 0, 100: 0, 500: 0 });

  const { setMode, startGame } = useGameStore();
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

  const handleChipClick = (chipValue: number) => {
    if (canAfford(chipValue) && (totalBet + chipValue) <= (user?.coins || 0)) {
      setChipCounts(prev => ({
        ...prev,
        [chipValue]: prev[chipValue as keyof typeof prev] + 1
      }));
      setTotalBet(prev => prev + chipValue);
    }
  };

  const handleValidateBet = () => {
    if (totalBet > 0) {
      // Naviguer vers la page de jeu avec le montant misé
      navigate(`/play/game?bet=${totalBet}`);
    }
  };

  const resetBet = () => {
    setTotalBet(0);
    setChipCounts({ 25: 0, 50: 0, 100: 0, 500: 0 });
  };

  const canAfford = (amount: number) => {
    return user && user.coins !== null && user.coins !== undefined && user.coins >= amount;
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
            
            <h1 className="text-lg font-medium text-white">Page de mise</h1>
            <div className="w-8"></div>
          </motion.div>
        </div>

        {/* Page de mise */}
        <div className="flex flex-col h-full min-h-screen pt-20">
          {/* Balance et Mise au centre */}
          <div className="flex-1 flex flex-col justify-center items-center px-6">
            <motion.div
              className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-16 h-16 bg-[#F8CA5A]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Coins className="w-8 h-8 text-[#F8CA5A]" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Votre Solde</h3>
              <p className="text-[#F8CA5A] font-bold text-3xl mb-6">
                {user?.coins?.toLocaleString() || "0"}
              </p>
              
              {/* Affichage de la mise totale */}
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <p className="text-white/60 text-sm mb-2">Mise Totale</p>
                <p className="text-[#B5F3C7] font-bold text-4xl mb-4">{totalBet || 0}</p>
                
                {/* Affichage détaillé des jetons sélectionnés */}
                {totalBet > 0 && (
                  <div className="flex justify-center gap-2 flex-wrap">
                    {Object.entries(chipCounts).map(([value, count]) => 
                      count > 0 && (
                        <span key={value} className="text-xs text-white/70 bg-white/10 rounded-full px-3 py-1 font-medium">
                          {count} × {value}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
              
              {/* Boutons d'action */}
              <div className="flex gap-3">
                {totalBet > 0 && (
                  <motion.button
                    onClick={resetBet}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 rounded-2xl text-lg border border-red-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-reset-bet"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    Effacer
                  </motion.button>
                )}
                
                {totalBet > 0 && (
                  <motion.button
                    onClick={handleValidateBet}
                    className="flex-2 bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold py-3 rounded-2xl text-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-validate"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    Valider la mise
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Jetons en bas de la page */}
          <div className="bg-[#13151A]/90 backdrop-blur-sm p-8 rounded-t-3xl">
            <p className="text-white/70 text-center text-lg font-medium mb-6">Choisissez vos jetons</p>
            <div className="grid grid-cols-4 gap-6 max-w-sm mx-auto">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount) || (totalBet + option.amount) > (user?.coins || 0)}
                  className={`relative w-20 h-20 mx-auto rounded-full border-4 transition-all shadow-lg ${
                    canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0)
                      ? `${option.color} border-white/30 hover:scale-110 hover:border-white/50 active:scale-95 hover:shadow-xl`
                      : "bg-gray-400/20 cursor-not-allowed opacity-50 border-white/10"
                  }`}
                  whileHover={canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0) ? { 
                    scale: 1.1,
                    boxShadow: "0 0 25px rgba(255,255,255,0.3)"
                  } : {}}
                  whileTap={canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0) ? { scale: 0.95 } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  <div className="absolute inset-3 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold text-sm">{option.label}</span>
                  </div>
                  
                  {/* Compteur de jetons */}
                  {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                    <motion.div 
                      className="absolute -top-2 -right-2 w-7 h-7 bg-[#B5F3C7] text-[#0B0B0F] rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
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