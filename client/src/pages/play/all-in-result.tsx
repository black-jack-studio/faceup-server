import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Zap, Gift, Coins, Ticket } from "lucide-react";
import { useChipsStore } from "@/store/chips-store";
import { useUserStore } from "@/store/user-store";

interface AllInResultData {
  result: "WIN" | "LOSE" | "PUSH";
  multiplier: string;
  payout: string;
  rebate: string;
  coins: string;
  bonusCoins: string;
  tickets: string;
  bet: string;
}

export default function AllInResult() {
  const [, navigate] = useLocation();
  const [resultData, setResultData] = useState<AllInResultData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  // Note: No store mutations from URL params for security - display only

  useEffect(() => {
    // Extract result data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const data: AllInResultData = {
      result: urlParams.get('result') as "WIN" | "LOSE" | "PUSH",
      multiplier: urlParams.get('multiplier') || '0',
      payout: urlParams.get('payout') || '0',
      rebate: urlParams.get('rebate') || '0',
      coins: urlParams.get('coins') || '0',
      bonusCoins: urlParams.get('bonusCoins') || '0',
      tickets: urlParams.get('tickets') || '0',
      bet: urlParams.get('bet') || '0',
    };

    if (!data.result) {
      // No result data, redirect to home page to avoid 404
      navigate('/');
      return;
    }

    setResultData(data);
    
    // SECURITY FIX: No store mutations from URL params - display only
    // Server state is updated via React Query invalidations in all-in.tsx

    // Show details after initial animation
    const detailTimer = setTimeout(() => {
      setShowDetails(true);
    }, 1500);

    return () => clearTimeout(detailTimer);
  }, [navigate]);

  if (!resultData) {
    return null;
  }

  const isWin = resultData.result === "WIN";
  const isPush = resultData.result === "PUSH";
  const betAmount = parseInt(resultData.bet) || 0;
  const payoutAmount = parseInt(resultData.payout) || 0;
  const rebateAmount = parseInt(resultData.rebate) || 0;
  const newBalance = parseInt(resultData.coins) || 0;
  const newBonusCoins = parseInt(resultData.bonusCoins) || 0;
  const ticketsLeft = parseInt(resultData.tickets) || 0;
  const multiplier = parseFloat(resultData.multiplier) || 3;

  const handleContinue = () => {
    if (ticketsLeft > 0 && newBalance > 0) {
      navigate('/play/all-in');
    } else {
      navigate('/shop');
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        background: isWin 
          ? 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 25%, #FFA726 50%, #FFB347 75%, #FFC107 100%)'
          : isPush 
          ? 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 25%, #D1D5DB 50%, #E5E7EB 75%, #F3F4F6 100%)'
          : 'linear-gradient(135deg, #EF4444 0%, #DC2626 25%, #B91C1C 50%, #991B1B 75%, #7F1D1D 100%)',
        minHeight: '100vh'
      }}
    >
      <div className="max-w-md mx-auto relative h-full w-full">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-10 px-6 pt-12 pb-6">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2 }}
          >
            <motion.button
              onClick={handleHome}
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-home"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">All-in Result</h1>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col h-screen pt-28 pb-6 px-6 justify-center gap-8">
          
          {/* Main Result Animation */}
          <motion.div 
            className="text-center"
            initial={{ scale: 0, rotate: isWin ? -10 : isPush ? 0 : 10 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              transition: { 
                duration: 0.6,
                type: "spring",
                bounce: 0.4
              }
            }}
          >
            <motion.h1 
              className={`text-6xl font-black mb-4 ${isWin ? 'text-white drop-shadow-[0_0_20px_rgba(255,193,7,0.5)]' : isPush ? 'text-gray-800' : 'text-white'}`}
              data-testid="text-result"
            >
              {isWin ? "WIN!" : isPush ? "PUSH!" : "ALL LOST"}
            </motion.h1>
            
            {isWin && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: { delay: 0.3, duration: 0.4 }
                }}
                className="flex items-center justify-center gap-2 mb-6"
              >
                <Zap className="w-8 h-8 text-yellow-300" />
                <span className="text-2xl font-bold text-yellow-300" data-testid="text-multiplier">
                  {multiplier}x MULTIPLIER!
                </span>
                <Zap className="w-8 h-8 text-yellow-300" />
              </motion.div>
            )}
            
            {isPush && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: { delay: 0.3, duration: 0.4 }
                }}
                className="mb-6"
              >
                <span className="text-xl font-bold text-gray-800" data-testid="text-push-message">
                  It's a tie! Your bet is returned.
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Amount Display */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              transition: { delay: 0.6, duration: 0.5 }
            }}
            className="text-center"
          >
            <motion.p 
              className={`text-4xl font-bold mb-2 ${isPush ? 'text-gray-800' : 'text-white'}`}
              data-testid={isWin ? "text-payout" : isPush ? "text-push" : "text-bet-lost"}
            >
              {isWin ? `+${payoutAmount.toLocaleString()}` : isPush ? "±0" : `-${betAmount.toLocaleString()}`}
            </motion.p>
            <p className={`text-sm ${isPush ? 'text-gray-600' : 'text-white/70'}`} data-testid="text-amount-type">
              {isWin ? 'Total Payout' : isPush ? 'No Change' : 'Coins Lost'}
            </p>
          </motion.div>

          {/* Bonus Coins Display (Loss Only) */}
          {!isWin && !isPush && rebateAmount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { delay: 0.9, duration: 0.4 }
              }}
              className="mx-auto"
            >
              <div 
                className="px-6 py-4 text-center backdrop-blur-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium text-white">BONUS COINS</span>
                </div>
                <p className="text-2xl font-bold text-yellow-300" data-testid="text-bonus-coins">
                  +{rebateAmount} coins
                </p>
                <p className="text-xs text-white/70 mt-1">5% Loss Rebate</p>
              </div>
            </motion.div>
          )}

          {/* Details Panel */}
          {showDetails && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ 
                y: 0, 
                opacity: 1,
                transition: { duration: 0.4 }
              }}
              className="space-y-4"
            >
              {/* Balance and Tickets Info */}
              <div 
                className="px-6 py-4 backdrop-blur-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Coins className="w-4 h-4 text-white/70" />
                    </div>
                    <p className="text-xs text-white/70 mb-1">New Balance</p>
                    <p className="text-lg font-bold text-white" data-testid="text-new-balance">
                      {newBalance.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Gift className="w-4 h-4 text-white/70" />
                    </div>
                    <p className="text-xs text-white/70 mb-1">Bonus Coins</p>
                    <p className="text-lg font-bold text-white" data-testid="text-bonus-balance">
                      {newBonusCoins.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Ticket className="w-4 h-4 text-white/70" />
                    </div>
                    <p className="text-xs text-white/70 mb-1">Tickets Left</p>
                    <p className="text-lg font-bold text-white" data-testid="text-tickets-remaining">
                      {ticketsLeft}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {ticketsLeft > 0 && newBalance > 0 ? (
                  <motion.button
                    onClick={handleContinue}
                    className="w-full py-4 text-base font-bold rounded-xl transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: isWin ? '#FF6B35' : isPush ? '#374151' : '#DC2626',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(0, 0, 0, 0.1)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-play-again"
                  >
                    PLAY AGAIN
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => navigate('/shop')}
                    className="w-full py-4 text-base font-bold rounded-xl transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: isWin ? '#FF6B35' : isPush ? '#374151' : '#DC2626',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(0, 0, 0, 0.1)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-get-more"
                  >
                    {ticketsLeft <= 0 ? 'GET MORE TICKETS' : 'GET MORE COINS'}
                  </motion.button>
                )}
                
                <motion.button
                  onClick={handleHome}
                  className="w-full py-3 text-base font-medium rounded-xl transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                  whileHover={{ 
                    background: 'rgba(255, 255, 255, 0.25)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-home-secondary"
                >
                  GO HOME
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}