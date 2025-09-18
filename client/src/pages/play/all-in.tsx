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

      // Navigate to All-in result screen with ORIGINAL bet amount
      const params = new URLSearchParams({
        result: result.result,
        multiplier: result.multiplier.toString(),
        payout: result.payout.toString(),
        rebate: result.rebate.toString(),
        coins: result.coins.toString(),
        bonusCoins: result.bonusCoins.toString(),
        tickets: result.tickets.toString(),
        bet: betAmount.toString(), // Use captured bet amount
      });
      navigate(`/play/all-in-result?${params.toString()}`);

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
                {isLoading ? "STARTING GAME..." : "GO ALL-IN"}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}