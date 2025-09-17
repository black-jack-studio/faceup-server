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
  const nextMultiplier = Math.min(currentStreak + 2, 10); // Multiplicateur commençant à 2x
  
  // Vérification du statut premium
  const isPremium = user?.membershipType === "premium";
  

  // Modern flat premium casino chips
  const bettingOptions = [
    { 
      amount: 1, 
      centerColor: "#E5E7EB", // Light gray/silver center
      ringColor: "#9CA3AF", // Silver ring
      glowColor: "#D1D5DB", // Subtle silver glow
      label: "1", 
      textColor: "text-gray-800"
    },
    { 
      amount: 5, 
      centerColor: "#DC2626", // Deep red center
      ringColor: "#B91C1C", // Darker red ring
      glowColor: "#EF4444", // Red glow
      label: "5", 
      textColor: "text-white"
    },
    { 
      amount: 10, 
      centerColor: "#1D4ED8", // Royal blue center
      ringColor: "#1E3A8A", // Darker blue ring
      glowColor: "#3B82F6", // Blue glow
      label: "10", 
      textColor: "text-white"
    },
    { 
      amount: 25, 
      centerColor: "#15803D", // Dark green center
      ringColor: "#14532D", // Darker green ring
      glowColor: "#22C55E", // Green glow
      label: "25", 
      textColor: "text-white"
    },
    { 
      amount: 100, 
      centerColor: "#000000", // Black center
      ringColor: "#6B7280", // Silver ring
      glowColor: "#9CA3AF", // Silver glow
      label: "100", 
      textColor: "text-gray-200",
      silverAccent: true
    },
    { 
      amount: 500, 
      centerColor: "#7C3AED", // Purple center
      ringColor: "#5B21B6", // Darker purple ring
      glowColor: "#8B5CF6", // Purple glow
      goldenAccent: "#F59E0B", // Golden accents
      label: "500", 
      textColor: "text-white",
      premium: true
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

        {/* Page de mise - Layout optimisé pour tenir sur l'écran */}
        <div className="flex flex-col min-h-screen pt-24 pb-2 px-6">
          {/* Section du haut : Solde et Mise */}
          <div className="flex-shrink-0 mb-3">
            <motion.div
              className="bg-[#13151A] rounded-2xl p-3 ring-1 ring-white/10 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-4 mb-3">
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
              
              {/* Affichage détaillé des jetons sélectionnés */}
              {totalBet > 0 && (
                <div className="flex justify-center gap-2 flex-wrap mb-3">
                  {Object.entries(chipCounts).map(([value, count]) => 
                    count > 0 && (
                      <span key={value} className="text-xs text-white bg-black rounded-full px-2 py-1 font-medium">
                        {count} × {value}
                      </span>
                    )
                  )}
                </div>
              )}
              
              {/* Boutons d'action - compacts */}
              {totalBet > 0 && (
                <div className="flex gap-2">
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
          <div className="flex-shrink-0 mb-2 space-y-2">
            {/* Streak Display */}
            <motion.div
              className="bg-[#13151A] rounded-2xl p-3 ring-1 ring-white/10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center invisible">
                    {/* Invisible spacer to match the icon space above */}
                  </div>
                  <div className="text-left">
                    <p className="text-white/60 text-xs font-medium">Current Streak</p>
                    <p className="text-white font-bold text-lg" data-testid="text-streak-current">{currentStreak}</p>
                  </div>
                </div>
                
                <div>
                  {/* Barre de séparation verticale */}
                  <div className="w-px h-12 bg-white/20"></div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-white/60 text-xs font-medium">Multiplier</p>
                    <p className="text-white font-bold text-lg" data-testid="text-multiplier">
                      {`${Math.min(currentStreak + 2, 10)}x`}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            
          </div>
          
          {/* Section du bas : Jetons */}
          <div className="flex-1 flex flex-col justify-start pt-1">
            {/* Grille de jetons compacte 3x2 */}
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-4 pt-4">
              {bettingOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleChipClick(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`group relative w-20 h-20 mx-auto rounded-full transition-all duration-300 ${
                    canAfford(option.amount)
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40"
                  }`}
                  style={{
                    background: canAfford(option.amount) 
                      ? option.centerColor
                      : '#374151',
                    border: canAfford(option.amount) 
                      ? `4px solid ${option.ringColor}`
                      : '3px solid #6B7280',
                    boxShadow: canAfford(option.amount) 
                      ? `0 0 16px ${option.glowColor}50, 0 0 8px ${option.glowColor}30`
                      : 'none'
                  }}
                  whileHover={canAfford(option.amount) ? { 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  } : {}}
                  whileTap={canAfford(option.amount) ? { 
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  } : {}}
                  data-testid={`chip-${option.amount}`}
                >
                  {/* Golden accents for premium chips */}
                  {option.premium && option.goldenAccent && canAfford(option.amount) && (
                    <div className="absolute inset-1 rounded-full">
                      {/* Subtle tick marks around the ring */}
                      <div className="absolute inset-0 rounded-full">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-3"
                            style={{
                              background: option.goldenAccent,
                              transform: `rotate(${i * 60}deg) translateY(-28px)`,
                              transformOrigin: '50% 28px',
                              borderRadius: '1px'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Silver accents for 100 chip */}
                  {option.silverAccent && canAfford(option.amount) && (
                    <div className="absolute inset-1 rounded-full">
                      {/* Subtle tick marks around the ring */}
                      <div className="absolute inset-0 rounded-full">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-2"
                            style={{
                              background: '#D1D5DB',
                              transform: `rotate(${i * 90}deg) translateY(-26px)`,
                              transformOrigin: '50% 26px',
                              borderRadius: '1px'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Number */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center">
                    <span className={`font-black text-2xl tracking-tight ${
                      canAfford(option.amount) 
                        ? option.textColor 
                        : 'text-gray-500'
                    }`} style={{
                      fontFamily: 'ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: '900',
                      letterSpacing: '-0.03em',
                      textShadow: canAfford(option.amount)
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