import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import coinImage from "@assets/coins_1757366059535.png";
import chipImage from "@assets/Jeton 3D_1757527796732.jpg";

export default function HighStakesMode() {
  const [, navigate] = useLocation();

  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();
  

  // Jetons premium 3D avec couleurs distinctives
  const bettingOptions = [
    { 
      amount: 5000, 
      colorFilter: "brightness(1.1) contrast(1.3) sepia(1) hue-rotate(40deg) saturate(2)", // Or/Jaune
      shadow: "shadow-xl", 
      label: "5K", 
      textColor: "text-yellow-900", 
      border: "border-yellow-400/60",
      glowColor: "rgba(245, 158, 11, 0.2)"
    },
    { 
      amount: 10000, 
      colorFilter: "brightness(0.7) contrast(1.3) sepia(0.2) hue-rotate(0deg) saturate(0.8)", // Noir premium
      shadow: "shadow-xl", 
      label: "10K", 
      textColor: "text-white", 
      border: "border-gray-600/60",
      glowColor: "rgba(100, 116, 139, 0.2)"
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
                  className={`group relative w-32 h-32 mx-auto rounded-full transition-all duration-400 overflow-hidden ${
                    canAfford(option.amount)
                      ? `${option.shadow} border-3 ${option.border} backdrop-blur-md`
                      : "cursor-not-allowed opacity-20 border-3 border-slate-500/20"
                  }`}
                  style={{
                    transform: 'perspective(1200px) rotateX(10deg) rotateY(-3deg) translateZ(0px)',
                    boxShadow: canAfford(option.amount) 
                      ? `0 16px 64px -12px ${option.glowColor}, inset 0 3px 12px rgba(255,255,255,0.2), inset 0 -3px 12px rgba(0,0,0,0.3)`
                      : 'inset 0 3px 12px rgba(0,0,0,0.3)',
                    backgroundImage: `url(${chipImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: canAfford(option.amount) 
                      ? option.colorFilter 
                      : 'brightness(0.3) contrast(0.8) grayscale(1)'
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
                  {/* Effet de lumière premium */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/15 to-white/30 opacity-70" />
                  
                  {/* Centre premium avec valeur */}
                  <div className={`absolute inset-3 rounded-full flex items-center justify-center backdrop-blur-lg ${
                    canAfford(option.amount) 
                      ? 'bg-white/25 shadow-[inset_0_2px_8px_rgba(255,255,255,0.4),inset_0_-2px_8px_rgba(0,0,0,0.25)] border-2 border-white/40'
                      : 'bg-white/10 shadow-inner border-2 border-white/20'
                  }`}>
                    <span className={`font-black text-2xl tracking-tight ${
                      canAfford(option.amount) 
                        ? option.textColor 
                        : 'text-slate-400'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {/* Anneau extérieur premium */}
                  <div className={`absolute inset-1.5 rounded-full border-2 ${
                    canAfford(option.amount)
                      ? 'border-white/30 shadow-inner'
                      : 'border-white/10'
                  }`} />
                  
                  {/* Points lumineux premium - style Apple luxueux */}
                  {canAfford(option.amount) && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-lg"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-45px)`,
                          }}
                        />
                      ))}
                      {/* Points secondaires */}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={`inner-${i}`}
                          className="absolute w-1 h-1 bg-white/30 rounded-full"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 45 + 22.5}deg) translateY(-35px)`,
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