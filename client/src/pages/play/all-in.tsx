import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, Zap } from "lucide-react";
import { useBetting } from "@/hooks/use-betting";


export default function AllInMode() {
  const [, navigate] = useLocation();

  const { user } = useUserStore();
  const { balance, loadBalance } = useChipsStore();
  
  const tickets = user?.tickets || 0;
  const hasTicket = tickets >= 1;
  const hasCoins = balance > 0;
  const canPlay = hasTicket && hasCoins;
  
  const { placeBet, navigateToGame, isLoading } = useBetting({
    mode: "all-in",
    onSuccess: (result) => {
      // Navigate to all-in game after successful bet
      navigate(`/play/all-in-game?bet=${result.committedAmount}`);
    },
  });

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleAllInGame = async () => {
    if (!canPlay) return;

    try {
      // Use the betting system with all coins as bet amount
      await placeBet(balance);
    } catch (error) {
      // Error handling is done in the useBetting hook
      console.error("All-in bet confirmation failed:", error);
    }
  };

  const handleGetTickets = () => {
    navigate("/shop");
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
                
                <h1 className="text-lg font-medium text-white">All-in Mode</h1>
              </motion.div>

              {/* Balance and Bet section */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-white/60" />
                  <p className="text-xs text-white/60 font-medium">HIGH RISK - ALL COINS</p>
                </div>
                
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
                  YOUR BET (MAX ONLY)
                </p>
                
                <motion.p 
                  className="text-4xl font-bold text-white"
                  key={balance}
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    duration: 0.15 
                  }}
                  data-testid="text-all-in-bet"
                >
                  {balance.toLocaleString()}
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Ticket Status */}
          <motion.div 
            className="flex-shrink-0 px-6"
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
                    Tickets Available
                  </p>
                  <p className={`text-2xl font-bold ${tickets > 0 ? 'text-white' : 'text-red-400'}`} data-testid="text-tickets">
                    {tickets}
                  </p>
                </div>
                
                <div className="w-px h-12 bg-white/20"></div>
                
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Required
                  </p>
                  <p className="text-2xl font-bold text-white" data-testid="text-ticket-requirement">
                    1
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rewards Info */}
          <motion.div 
            className="flex-shrink-0 px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div 
              className="px-6 py-4"
              style={{
                background: '#1C1D21',
                borderRadius: '20px',
                border: '1px solid #2A2B30',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
              }}
            >
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-white/70" />
                  <p className="text-sm font-medium text-white/70">All-in Rewards</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-center">
                <div>
                  <p className="text-xs text-white/50 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Win Multiplier
                  </p>
                  <p className="text-xl font-bold text-white" data-testid="text-win-multiplier">
                    3x
                  </p>
                </div>
                
                <div className="w-px h-10 bg-white/20"></div>
                
                <div>
                  <p className="text-xs text-white/50 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Loss Rebate
                  </p>
                  <p className="text-xl font-bold text-white" data-testid="text-loss-rebate">
                    5%
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom CTA or Error State */}
          <motion.div 
            className="flex-shrink-0 px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {balance === 0 || !hasTicket ? (
              <motion.button
                onClick={!hasTicket ? handleGetTickets : handleGetCoins}
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
                data-testid="button-shop"
              >
                {!hasTicket ? "GET TICKETS" : "GET COINS"}
              </motion.button>
            ) : (
              <motion.button
                onClick={handleAllInGame}
                disabled={!canPlay}
                className="w-full py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={canPlay ? { 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                } : {}}
                whileTap={canPlay ? { scale: 0.98 } : {}}
                data-testid="button-all-in"
              >
{isLoading ? "PLACING BET..." : "GO ALL-IN"}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}