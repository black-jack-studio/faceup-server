import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import coinImage from "@assets/coins_1757366059535.png";

export default function HighStakesMode() {
  const [, navigate] = useLocation();

  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();

  // Betting options with colors matching High Stakes theme - 5000, 10000
  const bettingOptions = [
    { amount: 5000, gradient: "bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600", accent: "from-amber-200 to-amber-400", shadow: "shadow-amber-500/40", label: "5K" },
    { amount: 10000, gradient: "bg-gradient-to-br from-red-500 via-red-400 to-red-700", accent: "from-red-300 to-red-500", shadow: "shadow-red-500/40", label: "10K" },
  ];

  useEffect(() => {
    setMode("high-stakes");
    startGame("cash");
    loadBalance();
  }, [setMode, startGame, loadBalance]);

  const handleChipClick = (chipValue: number) => {
    if (canAfford(chipValue)) {
      // Pour le mode High Stakes, aller directement au jeu avec la mise sélectionnée
      deductBet(chipValue);
      navigate(`/play/game?bet=${chipValue}&mode=high-stakes`);
    }
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
            
            <h1 className="text-lg font-medium text-white">High Stakes</h1>
            <div className="w-8"></div>
          </motion.div>
        </div>

        {/* Page de mise - Layout ajusté pour tenir sur l'écran */}
        <div className="flex flex-col h-screen pt-28 pb-4 px-6">
          {/* Section du haut : Solde seulement */}
          <div className="flex-shrink-0 mb-6">
            <motion.div
              className="bg-[#13151A] rounded-2xl p-4 ring-1 ring-white/10 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2">
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
            </motion.div>
          </div>
          
          {/* Section du milieu : Instructions */}
          <div className="flex-shrink-0 text-center mb-4">
            <p className="text-white/70 text-sm font-medium">Choisissez votre mise High Stakes</p>
          </div>
          
          {/* Section du bas : Jetons - remontés */}
          <div className="flex-1 flex items-start justify-center pt-8">
            <div className="flex gap-8 max-w-sm mx-auto">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`relative w-28 h-28 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount)
                      ? `${option.gradient} ${option.shadow} shadow-[0_15px_55px_rgba(0,0,0,0.5),0_6px_25px_rgba(0,0,0,0.3),inset_0_3px_0_rgba(255,255,255,0.3),inset_0_-3px_0_rgba(0,0,0,0.2)] border-[4px] border-white/35 backdrop-blur-sm hover:shadow-[0_20px_70px_rgba(0,0,0,0.6),0_8px_30px_rgba(0,0,0,0.4)] hover:border-white/55`
                      : "bg-gradient-to-br from-gray-600/20 to-gray-800/20 cursor-not-allowed opacity-40 border-[4px] border-white/10 shadow-inner"
                  }`}
                  style={{
                    transform: 'perspective(1200px) rotateX(6deg)',
                  }}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.08,
                    rotateX: 0,
                    transition: { duration: 0.2 }
                  } : {}}
                  whileTap={canAfford(option.amount) ? { 
                    scale: 0.92,
                    rotateX: 10,
                    transition: { duration: 0.1 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Bords striés du jeton premium */}
                  <div className={`absolute inset-0 rounded-full ${
                    canAfford(option.amount) 
                      ? "bg-[radial-gradient(circle_at_50%_50%,transparent_58%,rgba(255,255,255,0.15)_59%,transparent_60%,rgba(255,255,255,0.15)_61%,transparent_62%,rgba(255,255,255,0.1)_63%,transparent_64%)] opacity-90"
                      : ""
                  }`} />
                  
                  {/* Double anneau externe pour style premium */}
                  <div className={`absolute inset-2 rounded-full ${
                    canAfford(option.amount) 
                      ? `border-[3px] border-white/25 shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]`
                      : 'border-[3px] border-white/10'
                  }`} />
                  
                  <div className={`absolute inset-4 rounded-full ${
                    canAfford(option.amount) 
                      ? `border-2 border-white/20`
                      : 'border-2 border-white/10'
                  }`} />
                  
                  {/* Cercle central avec motif premium */}
                  <div className={`absolute inset-6 rounded-full backdrop-blur-xl flex items-center justify-center ${
                    canAfford(option.amount) 
                      ? `bg-gradient-to-br ${option.accent} bg-opacity-30 shadow-[inset_0_3px_6px_rgba(255,255,255,0.5),inset_0_-3px_6px_rgba(0,0,0,0.3)] border-2 border-white/30`
                      : 'bg-white/10 border-2 border-white/10'
                  }`}>
                    {/* Motif de losanges décoratifs pour style premium */}
                    <div className="absolute inset-0 rounded-full">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className={`absolute w-1.5 h-1.5 rounded-sm rotate-45 ${
                            canAfford(option.amount) 
                              ? 'bg-white/35' 
                              : 'bg-white/15'
                          }`}
                          style={{
                            top: '20%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-16px)`,
                          }}
                        />
                      ))}
                    </div>
                    
                    <span className={`font-bold text-xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] relative z-10 ${
                      canAfford(option.amount) 
                        ? 'text-white' 
                        : 'text-white/50'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Reflet lumineux principal premium */}
                  {canAfford(option.amount) && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-7 bg-gradient-to-b from-white/45 to-transparent rounded-full blur-sm" />
                  )}
                  
                  {/* Reflets secondaires multiples */}
                  {canAfford(option.amount) && (
                    <>
                      <div className="absolute top-4 left-4 w-4 h-4 bg-white/30 rounded-full blur-[1px]" />
                      <div className="absolute top-6 right-6 w-2 h-2 bg-white/20 rounded-full blur-[0.5px]" />
                    </>
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