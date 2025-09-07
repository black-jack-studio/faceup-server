import { useState } from "react";
import { motion } from "framer-motion";
import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { ArrowLeft, Users, Clock, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { Coin } from "@/icons";

export default function CashGames() {
  const [, navigate] = useLocation();
  const [gameStarted, setGameStarted] = useState(false);
  const startGame = useGameStore((state) => state.startGame);
  const user = useUserStore((state) => state.user);

  const handleStartGame = () => {
    startGame("cash");
    setGameStarted(true);
  };

  if (gameStarted) {
    return <BlackjackTable gameMode="cash" />;
  }

  return (
    <div className="min-h-screen bg-ink text-white overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4">
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
          </div>
          <h1 className="text-2xl font-bold text-white">Cash Games</h1>
        </motion.div>
      </header>

      {/* Balance Display */}
      <section className="px-6 mb-8">
        <motion.div
          className="bg-gradient-to-br from-accent-gold/20 to-yellow-400/20 rounded-3xl p-8 border border-accent-gold/20 backdrop-blur-sm text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Coin className="w-8 h-8 text-accent-gold" />
          </div>
          <p className="text-white/60 mb-2">Your Balance</p>
          <h2 className="text-4xl font-bold text-accent-gold mb-4" data-testid="balance-display">
            {user?.coins?.toLocaleString() || "0"}
          </h2>
          <p className="text-accent-gold/80 text-sm">Ready to play</p>
        </motion.div>
      </section>

      {/* Game Tables */}
      <section className="px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-gradient-to-br from-accent-green/20 to-emerald-400/20 rounded-3xl p-6 border border-accent-green/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent-green" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Beginner Table</h3>
                  <p className="text-accent-green text-sm">Perfect for new players</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/60 text-xs mb-1">Min Bet</p>
                <p className="font-bold text-accent-green">10</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/60 text-xs mb-1">Max Bet</p>
                <p className="font-bold text-accent-green">100</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="w-3 h-3 text-white/60 mr-1" />
                  <p className="text-white/60 text-xs">Duration</p>
                </div>
                <p className="font-bold text-white">2 min/hand</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-3 h-3 text-white/60 mr-1" />
                  <p className="text-white/60 text-xs">RTP</p>
                </div>
                <p className="font-bold text-white">95%</p>
              </div>
            </div>

            <motion.button
              onClick={handleStartGame}
              disabled={!user?.coins || user.coins < 10}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                user?.coins && user.coins >= 10
                  ? "bg-accent-green hover:bg-accent-green/80 text-ink"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
              whileHover={user?.coins && user.coins >= 10 ? { scale: 1.02 } : {}}
              whileTap={user?.coins && user.coins >= 10 ? { scale: 0.98 } : {}}
              data-testid="button-join-beginner"
            >
              {user?.coins && user.coins >= 10 ? "Join Table" : "Insufficient Balance"}
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm opacity-60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white/60" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white/60">Intermediate Table</h3>
                  <p className="text-white/40 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Min</p>
                <p className="font-bold text-white/60">50</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Max</p>
                <p className="font-bold text-white/60">500</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Time</p>
                <p className="font-bold text-white/60">3min</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">RTP</p>
                <p className="font-bold text-white/60">96%</p>
              </div>
            </div>
            <div className="w-full py-4 bg-white/5 text-white/40 font-bold rounded-2xl text-center cursor-not-allowed">
              Coming Soon
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm opacity-60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white/60" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white/60">High Stakes Table</h3>
                  <p className="text-white/40 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Min</p>
                <p className="font-bold text-white/60">250</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Max</p>
                <p className="font-bold text-white/60">2.5K</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">Time</p>
                <p className="font-bold text-white/60">4min</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-white/40 text-xs mb-1">RTP</p>
                <p className="font-bold text-white/60">97%</p>
              </div>
            </div>
            <div className="w-full py-4 bg-white/5 text-white/40 font-bold rounded-2xl text-center cursor-not-allowed">
              Coming Soon
            </div>
          </div>
        </motion.div>
      </section>

      {/* Warning */}
      <section className="px-6 mb-8">
        <motion.div
          className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <p className="text-amber-400 text-sm text-center">
            ⚠️ This is play money only. No real money gambling.
          </p>
        </motion.div>
      </section>
    </div>
  );
}