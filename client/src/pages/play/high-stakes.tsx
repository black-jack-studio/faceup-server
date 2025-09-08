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

  // Jetons de casino haut de gamme avec couleurs premium
  const bettingOptions = [
    { amount: 5000, gradient: "bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-600", accent: "from-yellow-300 to-amber-500", shadow: "shadow-amber-600/70", label: "5K", textColor: "text-gray-900", border: "border-amber-600/80" },
    { amount: 10000, gradient: "bg-gradient-to-br from-red-800 via-red-700 to-red-900", accent: "from-red-600 to-red-800", shadow: "shadow-red-800/70", label: "10K", textColor: "text-white", border: "border-red-900/80" },
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
                  className={`relative w-28 h-28 mx-auto rounded-full transition-all duration-200 ${
                    canAfford(option.amount)
                      ? `${option.gradient} shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_3px_0_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.5)] border-[4px] ${option.border}`
                      : "bg-gradient-to-br from-gray-600/20 to-gray-800/20 cursor-not-allowed opacity-40 border-[4px] border-white/10"
                  }`}
                  style={{
                    transform: 'perspective(800px) rotateX(12deg) rotateY(-4deg) translateZ(3px)',
                  }}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.03,
                    rotateX: 3,
                    rotateY: 0,
                    translateZ: 5,
                    transition: { duration: 0.2 }
                  } : {}}
                  whileTap={canAfford(option.amount) ? { 
                    scale: 0.97,
                    rotateX: 18,
                    rotateY: -3,
                    translateZ: 0,
                    transition: { duration: 0.1 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Centre du jeton premium casino */}
                  <div className={`absolute inset-4 rounded-full flex items-center justify-center ${
                    canAfford(option.amount) 
                      ? 'bg-white/30 shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_3px_rgba(255,255,255,0.3)] border-2 border-white/50'
                      : 'bg-white/20 shadow-inner border-2 border-white/30'
                  }`}>
                    <span className={`font-black text-xl tracking-wider ${
                      canAfford(option.amount) 
                        ? option.textColor 
                        : 'text-gray-600'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Motifs premium de casino sur le pourtour */}
                  <div className="absolute inset-0 rounded-full">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-3 h-5 rounded-full ${
                          canAfford(option.amount) 
                            ? 'bg-white/50 shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-white/30' 
                            : 'bg-white/30 border border-white/20'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-40px)`,
                        }}
                      />
                    ))}
                    {/* Double anneau décoratif premium */}
                    <div className={`absolute inset-2 rounded-full border-2 ${
                      canAfford(option.amount)
                        ? 'border-white/30 shadow-inner'
                        : 'border-white/20'
                    }`} />
                    <div className={`absolute inset-3 rounded-full border ${
                      canAfford(option.amount)
                        ? 'border-white/20'
                        : 'border-white/15'
                    }`} />
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