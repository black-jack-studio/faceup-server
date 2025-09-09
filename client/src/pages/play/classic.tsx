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
  

  // Jetons minimalistes Apple avec design 3D moderne
  const bettingOptions = [
    { 
      amount: 1, 
      gradient: "bg-gradient-to-br from-slate-100 via-white to-slate-200", 
      innerGradient: "from-white/90 to-slate-100/80",
      shadow: "shadow-[0_8px_32px_rgba(15,23,42,0.3)]", 
      label: "1", 
      textColor: "text-slate-800", 
      border: "border-slate-300/60",
      glowColor: "rgba(148, 163, 184, 0.4)"
    },
    { 
      amount: 5, 
      gradient: "bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600", 
      innerGradient: "from-rose-300/80 to-pink-400/70",
      shadow: "shadow-[0_8px_32px_rgba(244,63,94,0.4)]", 
      label: "5", 
      textColor: "text-white", 
      border: "border-rose-500/60",
      glowColor: "rgba(244, 63, 94, 0.5)"
    },
    { 
      amount: 10, 
      gradient: "bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600", 
      innerGradient: "from-blue-300/80 to-indigo-400/70",
      shadow: "shadow-[0_8px_32px_rgba(59,130,246,0.4)]", 
      label: "10", 
      textColor: "text-white", 
      border: "border-blue-500/60",
      glowColor: "rgba(59, 130, 246, 0.5)"
    },
    { 
      amount: 25, 
      gradient: "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600", 
      innerGradient: "from-emerald-300/80 to-green-400/70",
      shadow: "shadow-[0_8px_32px_rgba(34,197,94,0.4)]", 
      label: "25", 
      textColor: "text-white", 
      border: "border-emerald-500/60",
      glowColor: "rgba(34, 197, 94, 0.5)"
    },
    { 
      amount: 100, 
      gradient: "bg-gradient-to-br from-gray-700 via-slate-800 to-gray-900", 
      innerGradient: "from-gray-600/80 to-slate-700/70",
      shadow: "shadow-[0_8px_32px_rgba(30,41,59,0.6)]", 
      label: "100", 
      textColor: "text-white", 
      border: "border-gray-600/60",
      glowColor: "rgba(100, 116, 139, 0.6)"
    },
    { 
      amount: 500, 
      gradient: "bg-gradient-to-br from-violet-400 via-purple-500 to-violet-600", 
      innerGradient: "from-violet-300/80 to-purple-400/70",
      shadow: "shadow-[0_8px_32px_rgba(139,92,246,0.4)]", 
      label: "500", 
      textColor: "text-white", 
      border: "border-violet-500/60",
      glowColor: "rgba(139, 92, 246, 0.5)"
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
                  className={`group relative w-20 h-20 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? `${option.gradient} ${option.shadow} border-2 ${option.border} backdrop-blur-sm`
                      : "bg-gradient-to-br from-slate-500/20 to-slate-700/20 cursor-not-allowed opacity-30 border-2 border-slate-500/20"
                  }`}
                  style={{
                    transform: 'perspective(1000px) rotateX(8deg) rotateY(-2deg) translateZ(0px)',
                    boxShadow: canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `0 12px 40px -8px ${option.glowColor}, inset 0 2px 8px rgba(255,255,255,0.15), inset 0 -2px 8px rgba(0,0,0,0.25)`
                      : 'inset 0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  whileHover={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 1.08,
                    rotateX: 5,
                    rotateY: 0,
                    translateZ: 8,
                    transition: { duration: 0.3, ease: "easeOut" }
                  } : {}}
                  whileTap={canAfford(option.amount) && (totalBet + option.amount) <= balance ? { 
                    scale: 0.95,
                    rotateX: 12,
                    rotateY: -1,
                    translateZ: -2,
                    transition: { duration: 0.15 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Effet de lumière principale */}
                  <div className={`absolute inset-0 rounded-full ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? `bg-gradient-to-t ${option.innerGradient} opacity-80`
                      : 'bg-gradient-to-t from-slate-600/40 to-slate-500/40'
                  }`} />
                  
                  {/* Centre minimaliste avec valeur */}
                  <div className={`absolute inset-2 rounded-full flex items-center justify-center backdrop-blur-sm ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance 
                      ? 'bg-white/20 shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),inset_0_-1px_4px_rgba(0,0,0,0.2)] border border-white/30'
                      : 'bg-white/10 shadow-inner border border-white/20'
                  }`}>
                    <span className={`font-black text-lg tracking-tight ${
                      canAfford(option.amount) && (totalBet + option.amount) <= balance 
                        ? option.textColor 
                        : 'text-slate-400'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Anneau extérieur minimaliste */}
                  <div className={`absolute inset-1 rounded-full border ${
                    canAfford(option.amount) && (totalBet + option.amount) <= balance
                      ? 'border-white/20'
                      : 'border-white/10'
                  }`} />
                  
                  {/* Points lumineux subtils - style Apple */}
                  {canAfford(option.amount) && (totalBet + option.amount) <= balance && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-white/40 rounded-full shadow-sm"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-30px)`,
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Compteur de jetons Apple style */}
                  {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                    <motion.div 
                      className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-white/95 to-gray-100/90 text-gray-900 rounded-full flex items-center justify-center text-xs font-black shadow-[0_6px_20px_rgba(0,0,0,0.25)] border border-white/40 backdrop-blur-xl"
                      style={{
                        boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.1)'
                      }}
                      initial={{ scale: 0, rotateZ: -180 }}
                      animate={{ scale: 1, rotateZ: 0 }}
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