import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, Zap, Trophy, Coins } from "lucide-react";
import coinImage from "@assets/coins_1757366059535.png";

export default function HighStakesMode() {
  const [, navigate] = useLocation();
  const [totalBet, setTotalBet] = useState(0);
  const [chipCounts, setChipCounts] = useState({ 1: 0, 5: 0, 10: 0, 25: 0, 100: 0, 500: 0 });

  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();
  
  // Données de streak - récupérées depuis les données utilisateur
  const currentStreak = user?.currentStreak21 || 0;
  const maxStreak = user?.maxStreak21 || 0;
  const nextMultiplier = Math.min(currentStreak + 1, 10); // Multiplicateur limité à 10x
  
  // Vérification du statut premium
  const isPremium = user?.membershipType === "premium";
  

  // Jetons flexibles 3D réalistes avec couleurs authentiques
  const bettingOptions = [
    { 
      amount: 1, 
      primaryColor: "#F8F9FA", // Blanc
      secondaryColor: "#E9ECEF",
      accentColor: "#6C757D",
      shadow: "shadow-lg", 
      label: "1", 
      textColor: "text-gray-800", 
      border: "border-gray-300/50",
      glowColor: "rgba(248, 249, 250, 0.3)"
    },
    { 
      amount: 5, 
      primaryColor: "#DC3545", // Rouge
      secondaryColor: "#C82333",
      accentColor: "#721C24",
      shadow: "shadow-lg", 
      label: "5", 
      textColor: "text-white", 
      border: "border-red-500/50",
      glowColor: "rgba(220, 53, 69, 0.3)"
    },
    { 
      amount: 10, 
      primaryColor: "#007BFF", // Bleu
      secondaryColor: "#0056B3",
      accentColor: "#003D82",
      shadow: "shadow-lg", 
      label: "10", 
      textColor: "text-white", 
      border: "border-blue-500/50",
      glowColor: "rgba(0, 123, 255, 0.3)"
    },
    { 
      amount: 25, 
      primaryColor: "#28A745", // Vert
      secondaryColor: "#1E7E34",
      accentColor: "#155724",
      shadow: "shadow-lg", 
      label: "25", 
      textColor: "text-white", 
      border: "border-green-500/50",
      glowColor: "rgba(40, 167, 69, 0.3)"
    },
    { 
      amount: 100, 
      primaryColor: "#212529", // Noir
      secondaryColor: "#343A40",
      accentColor: "#495057",
      shadow: "shadow-lg", 
      label: "100", 
      textColor: "text-white", 
      border: "border-gray-600/50",
      glowColor: "rgba(33, 37, 41, 0.3)"
    },
    { 
      amount: 500, 
      primaryColor: "#6F42C1", // Violet
      secondaryColor: "#5A2D91",
      accentColor: "#432874",
      shadow: "shadow-lg", 
      label: "500", 
      textColor: "text-white", 
      border: "border-purple-500/50",
      glowColor: "rgba(111, 66, 193, 0.3)"
    },
  ];

  useEffect(() => {
    setMode("high-stakes");
    startGame("cash");
    loadBalance();
  }, [setMode, startGame, loadBalance]);

  const handleChipClick = (chipValue: number) => {
    if (!isPremium) {
      // Rediriger vers la page premium si l'utilisateur n'est pas premium
      navigate("/premium");
      return;
    }
    
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
      navigate(`/play/game?bet=${totalBet}&mode=high-stakes&streak=${currentStreak}`);
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
            
            
            <h1 className="text-lg font-medium text-white">21 Streak</h1>
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
                    <p className="text-white/60 text-xs">Balance</p>
                    <p className="text-[#F8CA5A] font-bold text-lg" data-testid="text-balance">
                      {balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="w-px h-12 bg-white/20"></div>
                
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-white/60 text-xs">Total Bet</p>
                    <p className="text-white font-bold text-lg" data-testid="text-current-bet">
                      {totalBet.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Chip Counts Display */}
              {totalBet > 0 && (
                <div className="border-t border-white/10 pt-3 mb-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(chipCounts)
                      .filter(([_, count]) => count > 0)
                      .map(([amount, count]) => {
                        const option = bettingOptions.find(opt => opt.amount === parseInt(amount));
                        return (
                          <div key={amount} className="flex items-center gap-1 text-xs">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{
                                backgroundColor: option?.primaryColor,
                                borderColor: option?.primaryColor
                              }}
                            />
                            <span className="text-white/70">{count}×{amount}</span>
                          </div>
                        );
                      })}
                  </div>
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
          
          {/* Section du milieu : Stats Streak et Instructions */}
          <div className="flex-shrink-0 mb-4 space-y-4">
            {/* Streak Display */}
            <motion.div
              className="bg-gradient-to-r from-purple-600/20 to-amber-600/20 rounded-2xl p-4 ring-1 ring-purple-400/30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-purple-300 text-xs font-medium">Current Streak</p>
                    <p className="text-white font-bold text-xl" data-testid="text-streak-current">{currentStreak}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 text-sm font-medium" data-testid="text-streak-best">Best: {maxStreak}</span>
                  </div>
                  <p className="text-white/60 text-xs mt-1" data-testid="text-multiplier">
                    {currentStreak > 0 ? `Current: ${Math.min(currentStreak, 10)}x multiplier` : `Next: ${nextMultiplier}x multiplier`}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Instructions */}
            <div className="text-center">
              <p className="text-white/70 text-sm font-medium">Chain wins to increase multipliers</p>
              {!isPremium ? (
                <p className="text-red-400/80 text-xs mt-1 font-medium" data-testid="status-premium-required">⚠️ Premium subscription required</p>
              ) : (
                <p className="text-green-400/60 text-xs mt-1" data-testid="status-premium-granted">✓ Premium access granted</p>
              )}
            </div>
          </div>
          
          {/* Section du bas : Jetons et Validation */}
          <div className="flex-1 flex flex-col justify-center pt-2">
            {/* Grille de jetons flexibles 3x2 */}
            <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto mb-6">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`group relative w-20 h-20 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount)
                      ? `${option.shadow} border-3 ${option.border}`
                      : "cursor-not-allowed opacity-20 border-3 border-slate-500/20"
                  }`}
                  style={{
                    transform: 'perspective(800px) rotateX(8deg) rotateY(-2deg) translateZ(0px)',
                    background: canAfford(option.amount) 
                      ? `radial-gradient(circle at 30% 30%, ${option.primaryColor} 0%, ${option.secondaryColor} 70%, ${option.accentColor} 100%)`
                      : 'radial-gradient(circle at 30% 30%, #374151 0%, #1F2937 70%, #111827 100%)',
                    boxShadow: canAfford(option.amount) 
                      ? `0 12px 48px -8px ${option.glowColor}, inset 0 3px 8px rgba(255,255,255,0.3), inset 0 -3px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset`
                      : 'inset 0 2px 8px rgba(0,0,0,0.3)'
                  }}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.08,
                    rotateX: 4,
                    rotateY: 0,
                    translateZ: 8,
                    transition: { duration: 0.3, ease: "easeOut" }
                  } : {}}
                  whileTap={canAfford(option.amount) ? { 
                    scale: 0.94,
                    rotateX: 12,
                    rotateY: -1,
                    translateZ: -2,
                    transition: { duration: 0.15 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Bord extérieur avec effet 3D */}
                  <div className="absolute inset-0 rounded-full" 
                       style={{
                         background: `conic-gradient(from 0deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 25%, rgba(0,0,0,0.2) 50%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.4) 100%)`,
                         padding: '2px'
                       }}>
                    <div className="w-full h-full rounded-full" 
                         style={{
                           background: canAfford(option.amount) 
                             ? `radial-gradient(circle at 30% 30%, ${option.primaryColor} 0%, ${option.secondaryColor} 100%)`
                             : 'radial-gradient(circle at 30% 30%, #374151 0%, #1F2937 100%)'
                         }} />
                  </div>
                  
                  {/* Valeur du jeton */}
                  <div className={`absolute inset-3 rounded-full flex items-center justify-center ${
                    canAfford(option.amount) 
                      ? 'bg-white/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4),inset_0_-1px_4px_rgba(255,255,255,0.4)] border border-white/25'
                      : 'bg-white/8 shadow-inner border border-white/10'
                  }`}>
                    <span className={`font-black text-sm tracking-tight ${
                      canAfford(option.amount) 
                        ? option.textColor 
                        : 'text-slate-400'
                    }`}>
                      {option.label}
                    </span>
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