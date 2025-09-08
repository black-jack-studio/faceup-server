import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [totalBet, setTotalBet] = useState(0);
  const [chipCounts, setChipCounts] = useState({ 1: 0, 5: 0, 10: 0, 25: 0, 100: 0, 500: 0 });

  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();

  // Betting options with colors matching Offsuit theme - 1, 5, 10, 25, 100, 500
  const bettingOptions = [
    { amount: 1, color: "bg-gradient-to-br from-gray-400 to-gray-600", label: "1" },
    { amount: 5, color: "bg-gradient-to-br from-red-500 to-red-700", label: "5" },
    { amount: 10, color: "bg-gradient-to-br from-blue-500 to-blue-700", label: "10" },
    { amount: 25, color: "bg-gradient-to-br from-[#F8CA5A] to-yellow-400", label: "25" },
    { amount: 100, color: "bg-gradient-to-br from-[#B79CFF] to-purple-700", label: "100" },
    { amount: 500, color: "bg-gradient-to-br from-[#8CCBFF] to-blue-700", label: "500" },
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
      // Déduire la mise du solde
      deductBet(totalBet);
      // Naviguer vers la page de jeu avec le montant misé
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
            
            <h1 className="text-lg font-medium text-white">Page de mise</h1>
            <div className="w-8"></div>
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
                  <div className="w-10 h-10 bg-[#F8CA5A]/20 rounded-xl flex items-center justify-center">
                    <Coins className="w-5 h-5 text-[#F8CA5A]" />
                  </div>
                  <div className="text-left">
                    <p className="text-white/60 text-xs">Solde en Jetons</p>
                    <p className="text-[#F8CA5A] font-bold text-lg">
                      {balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Séparateur */}
                <div className="w-px h-12 bg-white/10"></div>
                
                <div className="text-left">
                  <p className="text-white/60 text-xs">Mise Totale</p>
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
                    Effacer
                  </motion.button>
                  
                  <motion.button
                    onClick={handleValidateBet}
                    className="flex-1 bg-[#232227] hover:bg-[#1a1a1e] text-white font-bold py-2 rounded-xl text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-validate"
                  >
                    Valider la mise
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Section du milieu : Instructions */}
          <div className="flex-shrink-0 text-center mb-2">
            <p className="text-white/70 text-sm font-medium">Choisissez vos jetons</p>
          </div>
          
          {/* Section du bas : Jetons - remontés */}
          <div className="flex-1 flex items-start justify-center pt-8">
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount) || (totalBet + option.amount) > balance}
                  className={`relative w-20 h-20 mx-auto rounded-full border-4 transition-all shadow-lg ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? `${option.color} border-white/30 hover:scale-105 hover:border-white/50 active:scale-95 hover:shadow-xl`
                      : "bg-gray-400/20 cursor-not-allowed opacity-50 border-white/10"
                  }`}
                  whileHover={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(255,255,255,0.3)"
                  } : {}}
                  whileTap={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { scale: 0.95 } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  <div className="absolute inset-3 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold text-base">{option.label}</span>
                  </div>
                  
                  {/* Compteur de jetons */}
                  {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                    <motion.div 
                      className="absolute -top-2 -right-2 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
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