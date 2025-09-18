import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AllInResponse {
  result: "WIN" | "LOSE";
  multiplier: number;
  payout: number;
  rebate: number;
  coins: number;
  bonusCoins: number;
  tickets: number;
}

export default function AllInMode() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { user } = useUserStore();
  const { balance, loadBalance } = useChipsStore();
  
  const tickets = user?.tickets || 0;
  const hasTicket = tickets >= 1;
  const hasCoins = balance > 0;
  const canPlay = hasTicket && hasCoins && !isLoading;

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleAllInGame = async () => {
    if (!canPlay) return;

    // CRITICAL FIX 1: Capture bet amount BEFORE API call
    const betAmount = balance;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/allin/start");
      const result: AllInResponse = await response.json();

      // CRITICAL FIX 3: Trust the API response as single source of truth
      // No redundant updateUser() call - let query invalidation refresh from server
      
      // Update balance in chips store with API response value (no redundant loadBalance call)
      const { setBalance } = useChipsStore.getState();
      setBalance(result.coins);

      // Invalidate relevant queries without redundant loadBalance call
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] }),
      ]);

      // Navigate to result or game screen with ORIGINAL bet amount
      const params = new URLSearchParams({
        mode: "all-in",
        result: result.result,
        multiplier: result.multiplier.toString(),
        payout: result.payout.toString(),
        rebate: result.rebate.toString(),
        coins: result.coins.toString(),
        bonusCoins: result.bonusCoins.toString(),
        tickets: result.tickets.toString(),
        bet: betAmount.toString(), // Use captured bet amount
      });
      navigate(`/play/game?${params.toString()}`);

    } catch (error: any) {
      console.error("All-in game failed:", error);
      
      // CRITICAL FIX 2: Parse error response properly and use HTTP status codes
      let errorStatus = 500;
      let errorMessage = "";
      
      // Extract status code and message from apiRequest error format: "${status}: ${responseText}"
      const errorMatch = error.message?.match(/^(\d+):\s*(.*)$/);
      if (errorMatch) {
        errorStatus = parseInt(errorMatch[1], 10);
        const responseText = errorMatch[2];
        
        try {
          // Try to parse JSON response
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || responseText;
        } catch {
          // Fallback to raw response text
          errorMessage = responseText;
        }
      }
      
      // Handle specific errors based on HTTP status codes
      if (errorStatus === 400) {
        if (errorMessage === "No tickets remaining") {
          toast({
            title: "No Tickets",
            description: "You need at least 1 ticket to play All-in mode.",
            variant: "destructive",
          });
          navigate("/shop");
        } else if (errorMessage === "Insufficient coins") {
          toast({
            title: "No Coins",
            description: "You need coins to play All-in mode.",
            variant: "destructive",
          });
          navigate("/shop");
        } else {
          toast({
            title: "Invalid Request",
            description: errorMessage || "Unable to start game. Please check your account.",
            variant: "destructive",
          });
        }
      } else if (errorStatus === 404) {
        toast({
          title: "Account Error",
          description: "Your account was not found. Please log in again.",
          variant: "destructive",
        });
        navigate("/auth/login");
      } else {
        toast({
          title: "Game Failed",
          description: errorMessage || "Unable to start All-in game. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
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
      style={{ 
        background: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 25%, #FFA726 50%, #FFB347 75%, #FFC107 100%)'
      }}
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
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">All-in Mode</h1>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col h-screen pt-28 pb-6 px-6 gap-6">
          
          {/* Balance and Risk Display */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div 
              className="px-6 py-8 text-center backdrop-blur-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-white/80" />
                <p className="text-sm text-white/80 font-medium">HIGH RISK - ALL COINS</p>
              </div>
              
              <p className="text-sm text-white/70 mb-1">
                Balance {balance.toLocaleString()}
              </p>
              
              <p 
                className="text-xs font-medium mb-3 text-white/80"
                style={{ 
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
          </motion.div>

          {/* Ticket Status */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-white/70 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Tickets Available
                  </p>
                  <p className={`text-2xl font-bold ${tickets > 0 ? 'text-white' : 'text-red-200'}`} data-testid="text-tickets">
                    {tickets}
                  </p>
                </div>
                
                <div className="w-px h-12 bg-white/30"></div>
                
                <div className="text-center">
                  <p className="text-xs text-white/70 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Required
                  </p>
                  <p className="text-2xl font-bold text-white" data-testid="text-ticket-requirement">
                    1
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Info */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div 
              className="px-6 py-4 backdrop-blur-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-white" />
                  <p className="text-sm font-medium text-white">All-in Rewards</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-center">
                <div>
                  <p className="text-xs text-white/70 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Win Multiplier
                  </p>
                  <p className="text-xl font-bold text-white" data-testid="text-win-multiplier">
                    3x
                  </p>
                </div>
                
                <div className="w-px h-10 bg-white/30"></div>
                
                <div>
                  <p className="text-xs text-white/70 mb-1" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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

          {/* Error States and CTA */}
          <motion.div 
            className="flex-shrink-0 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* No Tickets Warning */}
            {!hasTicket && (
              <motion.div 
                className="p-4 backdrop-blur-sm text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-sm text-white/90 mb-3">
                  You need at least 1 ticket to play All-in mode.
                </p>
                <motion.button
                  onClick={handleGetTickets}
                  className="text-sm font-medium text-white underline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-get-tickets"
                >
                  Get Tickets in Shop
                </motion.button>
              </motion.div>
            )}

            {/* No Coins Warning */}
            {hasTicket && !hasCoins && (
              <motion.div 
                className="p-4 backdrop-blur-sm text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-sm text-white/90 mb-3">
                  You need coins to play All-in mode.
                </p>
                <motion.button
                  onClick={handleGetCoins}
                  className="text-sm font-medium text-white underline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-get-coins"
                >
                  Get Coins in Shop
                </motion.button>
              </motion.div>
            )}

            {/* Main CTA */}
            {hasTicket && hasCoins ? (
              <motion.button
                onClick={handleAllInGame}
                disabled={!canPlay}
                className="w-full py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#FF6B35',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={canPlay ? { 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(0, 0, 0, 0.1)'
                } : {}}
                whileTap={canPlay ? { scale: 0.98 } : {}}
                data-testid="button-all-in"
              >
                {isLoading ? "STARTING GAME..." : "GO ALL-IN"}
              </motion.button>
            ) : (
              <motion.button
                onClick={!hasTicket ? handleGetTickets : handleGetCoins}
                className="w-full py-4 text-base font-bold rounded-xl transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#FF6B35',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(0, 0, 0, 0.1)'
                }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-shop"
              >
                {!hasTicket ? "GET TICKETS" : "GET COINS"}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}