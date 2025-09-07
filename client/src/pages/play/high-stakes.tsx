import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function HighStakesMode() {
  const [, navigate] = useLocation();
  const setMode = useGameStore((state) => state.setMode);
  const getModeConfig = useGameStore((state) => state.getModeConfig);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    setMode("high-stakes");
  }, [setMode]);

  const config = getModeConfig();
  const minimumCoins = 5000; // Minimum requis pour High Stakes
  const hasEnoughCoins = (user?.coins || 0) >= minimumCoins;

  const handlePlay = () => {
    if (hasEnoughCoins) {
      navigate("/cash-games");
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="px-6 py-12">
        <motion.button
          onClick={handleBack}
          className="flex items-center space-x-2 text-white/60 hover:text-white mb-8 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </motion.button>

        <motion.div
          className="max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-accent-gold/30 to-yellow-400/20 rounded-3xl p-8 border border-accent-gold/20 backdrop-blur-sm text-center">
            <div className="w-20 h-20 bg-accent-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="text-3xl">🎰</div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4" data-testid="title-high-stakes">High Stakes</h1>
            <p className="text-white/80 mb-6">
              {config.notes} All bets and winnings are multiplied by {config.stakesMultiplier}x.
            </p>
            
            <div className="bg-black/20 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60">Your Coins:</span>
                <span className="font-bold text-accent-gold" data-testid="text-current-coins">
                  {user?.coins?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Required:</span>
                <span className="font-bold text-white">{minimumCoins.toLocaleString()}</span>
              </div>
            </div>

            {!hasEnoughCoins && (
              <motion.div
                className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                data-testid="warning-insufficient-coins"
              >
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div className="text-left">
                    <p className="font-bold text-red-400">Insufficient Coins</p>
                    <p className="text-red-300 text-sm">
                      You need at least {minimumCoins.toLocaleString()} coins to play High Stakes.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.button
              onClick={handlePlay}
              disabled={!hasEnoughCoins}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                hasEnoughCoins
                  ? "bg-accent-gold hover:bg-accent-gold/80 text-ink"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
              whileHover={hasEnoughCoins ? { scale: 1.02 } : {}}
              whileTap={hasEnoughCoins ? { scale: 0.98 } : {}}
              data-testid="button-play-high-stakes"
            >
              {hasEnoughCoins ? "Enter High Stakes" : "Not Enough Coins"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}