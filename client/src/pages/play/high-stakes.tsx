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
  

  // Jetons premium 3D avec couleurs luxueuses
  const bettingOptions = [
    { 
      amount: 5000, 
      primaryColor: "#FFD700", // Or
      secondaryColor: "#FFC107", 
      accentColor: "#FF8F00",
      shadow: "shadow-xl", 
      label: "5K", 
      textColor: "text-yellow-900", 
      border: "border-yellow-400/60",
      glowColor: "rgba(255, 215, 0, 0.4)"
    },
    { 
      amount: 10000, 
      primaryColor: "#1A1A1A", // Noir premium avec reflets
      secondaryColor: "#2D2D2D",
      accentColor: "#0D0D0D",
      shadow: "shadow-xl", 
      label: "10K", 
      textColor: "text-white", 
      border: "border-gray-600/60",
      glowColor: "rgba(26, 26, 26, 0.4)"
    },
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
            
            
            <h1 className="text-lg font-medium text-white">Millionnaire's Table</h1>
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
                  className={`group relative w-32 h-32 mx-auto rounded-full transition-all duration-400 ${
                    canAfford(option.amount)
                      ? `${option.shadow} border-3 ${option.border}`
                      : "cursor-not-allowed opacity-20 border-3 border-slate-500/20"
                  }`}
                  style={{
                    transform: 'perspective(1200px) rotateX(10deg) rotateY(-3deg) translateZ(0px)',
                    background: canAfford(option.amount) 
                      ? `radial-gradient(circle at 30% 30%, ${option.primaryColor} 0%, ${option.secondaryColor} 70%, ${option.accentColor} 100%)`
                      : 'radial-gradient(circle at 30% 30%, #374151 0%, #1F2937 70%, #111827 100%)',
                    boxShadow: canAfford(option.amount) 
                      ? `0 16px 64px -12px ${option.glowColor}, inset 0 4px 12px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset`
                      : 'inset 0 3px 12px rgba(0,0,0,0.3)'
                  }}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.12,
                    rotateX: 6,
                    rotateY: 0,
                    translateZ: 12,
                    transition: { duration: 0.4, ease: "easeOut" }
                  } : {}}
                  whileTap={canAfford(option.amount) ? { 
                    scale: 0.92,
                    rotateX: 15,
                    rotateY: -2,
                    translateZ: -4,
                    transition: { duration: 0.2 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Bord extérieur premium avec effet 3D */}
                  <div className="absolute inset-0 rounded-full" 
                       style={{
                         background: `conic-gradient(from 0deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 25%, rgba(0,0,0,0.25) 50%, rgba(255,255,255,0.15) 75%, rgba(255,255,255,0.5) 100%)`,
                         padding: '3px'
                       }}>
                    <div className="w-full h-full rounded-full" 
                         style={{
                           background: canAfford(option.amount) 
                             ? `radial-gradient(circle at 30% 30%, ${option.primaryColor} 0%, ${option.secondaryColor} 100%)`
                             : 'radial-gradient(circle at 30% 30%, #374151 0%, #1F2937 100%)'
                         }} />
                  </div>
                  
                  {/* Cercle intérieur premium pour la valeur */}
                  <div className={`absolute inset-4 rounded-full flex items-center justify-center ${
                    canAfford(option.amount) 
                      ? 'bg-white/20 shadow-[inset_0_3px_10px_rgba(0,0,0,0.4),inset_0_-2px_6px_rgba(255,255,255,0.4)] border-2 border-white/30'
                      : 'bg-white/10 shadow-inner border-2 border-white/15'
                  }`}>
                    <span className={`font-black text-2xl tracking-tight ${
                      canAfford(option.amount) 
                        ? option.textColor 
                        : 'text-slate-400'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Points décoratifs premium sur le bord */}
                  {canAfford(option.amount) && (
                    <>
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-white/70 rounded-full"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-52px)`,
                            boxShadow: '0 0 6px rgba(255,255,255,0.6), inset 0 1px 3px rgba(255,255,255,0.9)'
                          }}
                        />
                      ))}
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