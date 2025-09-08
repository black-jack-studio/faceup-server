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

  // Betting options with colors matching Offsuit theme - 1, 5, 10, 25, 100, 500
  const bettingOptions = [
    { amount: 1, gradient: "bg-gradient-to-br from-slate-500 via-slate-400 to-slate-600", accent: "from-slate-300 to-slate-500", shadow: "shadow-slate-500/30", label: "1" },
    { amount: 5, gradient: "bg-gradient-to-br from-red-500 via-red-400 to-red-700", accent: "from-red-300 to-red-500", shadow: "shadow-red-500/30", label: "5" },
    { amount: 10, gradient: "bg-gradient-to-br from-blue-500 via-blue-400 to-blue-700", accent: "from-blue-300 to-blue-500", shadow: "shadow-blue-500/30", label: "10" },
    { amount: 25, gradient: "bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600", accent: "from-amber-200 to-amber-400", shadow: "shadow-amber-500/30", label: "25" },
    { amount: 100, gradient: "bg-gradient-to-br from-purple-500 via-purple-400 to-purple-700", accent: "from-purple-300 to-purple-500", shadow: "shadow-purple-500/30", label: "100" },
    { amount: 500, gradient: "bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-700", accent: "from-emerald-300 to-emerald-500", shadow: "shadow-emerald-500/30", label: "500" },
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <img src={coinImage} alt="Coin" className="w-8 h-8" />
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
                  className={`relative w-20 h-20 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? `${option.gradient} ${option.shadow} shadow-[0_10px_35px_rgba(0,0,0,0.4),0_4px_15px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.15)] border-[3px] border-white/30 backdrop-blur-sm hover:shadow-[0_15px_45px_rgba(0,0,0,0.5),0_6px_20px_rgba(0,0,0,0.3)] hover:border-white/50`
                      : "bg-gradient-to-br from-gray-600/20 to-gray-800/20 cursor-not-allowed opacity-40 border-[3px] border-white/10 shadow-inner"
                  }`}
                  style={{
                    transform: 'perspective(1200px) rotateX(6deg)',
                  }}
                  whileHover={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 1.08,
                    rotateX: 0,
                    transition: { duration: 0.2 }
                  } : {}}
                  whileTap={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 0.92,
                    rotateX: 10,
                    transition: { duration: 0.1 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Bords cannelés du jeton - effet authentique */}
                  <div className="absolute inset-0 rounded-full">
                    {[...Array(24)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-full h-[1px] ${
                          canAfford(option.amount) && (totalBet + option.amount) <= balance 
                            ? 'bg-black/20' 
                            : 'bg-black/10'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
                          width: '90%',
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Anneau externe avec texture */}
                  <div className={`absolute inset-1 rounded-full ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `border-[1.5px] border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]`
                      : 'border-[1.5px] border-black/20'
                  }`} />
                  
                  {/* Zone centrale du jeton */}
                  <div className={`absolute inset-3 rounded-full backdrop-blur-xl flex flex-col items-center justify-center ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `bg-gradient-to-br ${option.accent} bg-opacity-20 border border-black/25`
                      : 'bg-white/10 border border-black/15'
                  }`}>
                    {/* Ligne décorative supérieure */}
                    <div className={`w-8 h-[1px] mb-1 ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? 'bg-white/40' 
                        : 'bg-white/20'
                    }`} />
                    
                    {/* Valeur du jeton */}
                    <span className={`font-bold text-sm leading-none ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? 'text-white' 
                        : 'text-white/50'
                    }`}>
                      {option.label}
                    </span>
                    
                    {/* Ligne décorative inférieure */}
                    <div className={`w-8 h-[1px] mt-1 ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? 'bg-white/40' 
                        : 'bg-white/20'
                    }`} />
                  </div>
                  
                  {/* Motifs décoratifs sur le pourtour */}
                  <div className="absolute inset-0 rounded-full">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-1 h-2 ${
                          canAfford(option.amount) && (totalBet + option.amount) <= balance 
                            ? 'bg-black/25' 
                            : 'bg-black/15'
                        }`}
                        style={{
                          top: '20%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-32px)`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Compteur de jetons avec style glassmorphism */}
                  {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                    <motion.div 
                      className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-gray-800 to-black text-white rounded-full flex items-center justify-center text-xs font-bold shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/20 backdrop-blur-sm"
                      initial={{ scale: 0, rotateZ: -180 }}
                      animate={{ scale: 1, rotateZ: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
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