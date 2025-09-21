import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { BetSlider } from "@/components/BetSlider";
import { useBetting } from "@/hooks/use-betting";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [currentBet, setCurrentBet] = useState(1);

  const { setMode } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, loadBalance } = useChipsStore();
  
  const { placeBet, navigateToGame, isLoading } = useBetting({
    mode: "classic",
    onSuccess: (result) => {
      // Navigate to game after successful bet using the committed amount
      navigateToGame(result.committedAmount);
    },
  });

  const dynamicMax = Math.max(1, balance);

  useEffect(() => {
    setMode("classic");
    loadBalance();
  }, [setMode, loadBalance]);


  const handleSliderChange = (value: number) => {
    setCurrentBet(value);
  };

  const handleQuickAction = (percentage: number) => {
    const targetBet = Math.max(1, Math.round(dynamicMax * percentage));
    setCurrentBet(targetBet);
  };

  const handleConfirmBet = async () => {
    if (currentBet > 0 && balance >= currentBet && !isLoading) {
      try {
        await placeBet(currentBet);
      } catch (error) {
        // Error handling is done in the useBetting hook
        console.error("Bet confirmation failed:", error);
      }
    }
  };

  const handleGetCoins = () => {
    navigate("/shop");
  };

  return (
    <div 
      className="relative h-full w-full min-h-screen overflow-hidden"
      style={{ background: '#000000' }}
    >
      <div className="max-w-md mx-auto relative h-full">
        {/* Main Content */}
        <div className="flex flex-col h-screen pb-6 gap-8">
          
          {/* Extended Top Section */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div 
              className="px-6 pt-12 pb-8"
              style={{
                background: 'linear-gradient(180deg, #1C1D21 0%, #24262B 100%)',
                borderRadius: '0 0 40px 40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.12)'
              }}
            >
              {/* Header inside the gray section */}
              <motion.div 
                className="flex items-center justify-between mb-8"
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

              {/* Balance and Bet section */}
              <div className="text-center">
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
            </div>
          </motion.div>

          {/* Bet Slider */}
          {balance >= 1 ? (
            <motion.div 
              className="flex-shrink-0 px-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <BetSlider
                min={1}
                max={dynamicMax}
                value={currentBet}
                onChange={handleSliderChange}
                dataTestId="bet-slider"
                disabled={isLoading}
              />
            </motion.div>
          ) : null}

          {/* Quick Action Pills */}
          {balance >= 1 ? (
            <motion.div 
              className="flex-shrink-0 flex justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {[
                { label: "25%", percentage: 0.25 },
                { label: "50%", percentage: 0.5 },
                { label: "MAX", percentage: 1.0 }
              ].map((action) => (
                <motion.button
                  key={action.label}
                  onClick={() => handleQuickAction(action.percentage)}
                  disabled={isLoading}
                  className="px-6 py-3 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: '#2A2B30',
                    border: '1px solid #5A5C63',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                  }}
                  whileHover={!isLoading ? { 
                    scale: 1.02,
                    backgroundColor: '#34353C'
                  } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
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
            className="flex-shrink-0 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
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
                disabled={currentBet === 0 || balance < currentBet || isLoading}
                className="w-full py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={currentBet > 0 && balance >= currentBet && !isLoading ? { 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                } : {}}
                whileTap={currentBet > 0 && balance >= currentBet && !isLoading ? { scale: 0.98 } : {}}
                data-testid="button-confirm-bet"
              >
                {isLoading ? "CONFIRMING..." : "CONFIRM BET"}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}