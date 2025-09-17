import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { BetSlider } from "@/components/BetSlider";

export default function HighStakesMode() {
  const [, navigate] = useLocation();
  const [currentBet, setCurrentBet] = useState(1);

  const { setMode } = useGameStore();
  const { user, isLoading, isPremium } = useUserStore((state) => ({ 
    user: state.user, 
    isLoading: state.isLoading,
    isPremium: state.isPremium()
  }));
  const { balance, deductBet, loadBalance } = useChipsStore();
  
  // Données de streak - récupérées depuis les données utilisateur
  const currentStreak = user?.currentStreak21 || 0;
  const nextMultiplier = Math.min(currentStreak + 2, 10); // Multiplicateur commençant à 2x

  const dynamicMax = Math.max(1, balance);

  useEffect(() => {
    // Wait for user to load before checking premium status
    if (isLoading) {
      return;
    }
    
    // Redirect to premium if user is loaded and not premium
    if (user && !isPremium) {
      navigate("/premium");
      return;
    }
    
    setMode("high-stakes");
    loadBalance();
  }, [setMode, loadBalance, isPremium, navigate, user, isLoading]);

  const handleSliderChange = (value: number) => {
    setCurrentBet(value);
  };

  const handleQuickAction = (percentage: number) => {
    const targetBet = Math.max(1, Math.round(dynamicMax * percentage));
    setCurrentBet(targetBet);
  };

  const handleConfirmBet = () => {
    if (currentBet > 0 && balance >= currentBet) {
      deductBet(currentBet);
      navigate(`/play/game?bet=${currentBet}&mode=high-stakes&streak=${currentStreak}`);
    }
  };

  const handleGetCoins = () => {
    navigate("/shop");
  };

  return (
    <div 
      className="relative h-full w-full min-h-screen overflow-hidden"
      style={{ background: '#0F1012' }}
    >
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

        {/* Main Content */}
        <div className="flex flex-col h-screen pt-28 pb-6 px-6 gap-6">
          
          {/* Top Card */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div 
              className="px-6 py-8 text-center"
              style={{
                background: 'linear-gradient(180deg, #1C1D21 0%, #24262B 100%)',
                borderRadius: '0 0 40px 40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.12)'
              }}
            >
              <p className="text-sm text-white/50 mb-1">
                Balance {balance.toLocaleString()}
              </p>
              
              <p 
                className="text-xs font-medium mb-3"
                style={{ 
                  color: '#9CA3AF', 
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' 
                }}
              >
                YOUR BET
              </p>
              
              <motion.p 
                className="text-4xl font-bold text-white"
                key={currentBet}
                initial={{ scale: 0.9, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25,
                  duration: 0.15 
                }}
                data-testid="text-current-bet"
              >
                {currentBet.toLocaleString()}
              </motion.p>
            </div>
          </motion.div>

          {/* Streak Display */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div 
              className="px-6 py-4 text-center"
              style={{
                background: '#1C1D21',
                borderRadius: '20px',
                border: '1px solid #2A2B30',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
              }}
            >
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Current Streak
                  </p>
                  <p className="text-2xl font-bold text-white" data-testid="text-streak-current">
                    {currentStreak}
                  </p>
                </div>
                
                <div className="w-px h-12 bg-white/20"></div>
                
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Multiplier
                  </p>
                  <p className="text-2xl font-bold text-white" data-testid="text-multiplier">
                    {nextMultiplier}x
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bet Slider */}
          {balance >= 1 ? (
            <motion.div 
              className="flex-shrink-0 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <BetSlider
                min={1}
                max={dynamicMax}
                value={currentBet}
                onChange={handleSliderChange}
                dataTestId="bet-slider-high-stakes"
              />
            </motion.div>
          ) : null}

          {/* Quick Action Pills */}
          {balance >= 1 ? (
            <motion.div 
              className="flex-shrink-0 flex justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {[
                { label: "25%", percentage: 0.25 },
                { label: "50%", percentage: 0.5 },
                { label: "MAX", percentage: 1.0 }
              ].map((action) => (
                <motion.button
                  key={action.label}
                  onClick={() => handleQuickAction(action.percentage)}
                  className="px-6 py-3 text-sm font-medium text-white rounded-full transition-colors"
                  style={{
                    background: '#2A2B30',
                    border: '1px solid #5A5C63',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    backgroundColor: '#34353C'
                  }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`pill-${action.label.toLowerCase()}`}
                >
                  {action.label}
                </motion.button>
              ))}
            </motion.div>
          ) : null}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom CTA or Error State */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            {balance === 0 ? (
              <motion.button
                onClick={handleGetCoins}
                className="w-full py-4 text-base font-bold rounded-xl transition-all"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-get-coins"
              >
                GET COINS
              </motion.button>
            ) : (
              <motion.button
                onClick={handleConfirmBet}
                disabled={currentBet === 0 || balance < currentBet}
                className="w-full py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={currentBet > 0 && balance >= currentBet ? { 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                } : {}}
                whileTap={currentBet > 0 && balance >= currentBet ? { scale: 0.98 } : {}}
                data-testid="button-confirm-bet"
              >
                CONFIRM BET
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}