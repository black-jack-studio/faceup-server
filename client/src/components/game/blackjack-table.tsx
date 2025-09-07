import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PlayingCard from "./card";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BlackjackTableProps {
  gameMode: "practice" | "cash";
}

export default function BlackjackTable({ gameMode }: BlackjackTableProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    playerHand,
    dealerHand,
    gameState,
    playerTotal,
    dealerTotal,
    bet,
    dealInitialCards,
    hit,
    stand,
    double,
    split,
    surrender,
    resetGame,
    canDouble,
    canSplit,
    canSurrender,
    getOptimalMove,
  } = useGameStore();
  
  const user = useUserStore((state) => state.user);
  const [showOptimalMove, setShowOptimalMove] = useState(false);
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showBetSelector, setShowBetSelector] = useState(true);
  const [selectedBet, setSelectedBet] = useState(25);

  const optimalMove = getOptimalMove();

  // Betting amounts with coin designs
  const bettingOptions = [
    { amount: 10, color: "bg-gradient-to-br from-gray-400 to-gray-600", label: "10" },
    { amount: 25, color: "bg-gradient-to-br from-accent-gold to-yellow-400", label: "25" },
    { amount: 50, color: "bg-gradient-to-br from-red-500 to-red-700", label: "50" },
    { amount: 100, color: "bg-gradient-to-br from-purple-500 to-purple-700", label: "100" },
    { amount: 250, color: "bg-gradient-to-br from-emerald-500 to-emerald-700", label: "250" },
  ];

  const handleBetSelection = (amount: number) => {
    setSelectedBet(amount);
    setShowBetSelector(false);
    dealInitialCards(amount);
  };

  const handlePlayerAction = (action: string) => {
    setLastDecision(action);
    setIsCorrect(action === optimalMove);
    
    if (gameMode === "practice") {
      if (action === optimalMove) {
        toast({
          title: "Correct!",
          description: `${action} was the optimal play`,
        });
      } else {
        toast({
          title: "Suboptimal",
          description: `${optimalMove} would have been better`,
          variant: "destructive",
        });
      }
    }

    switch (action) {
      case "hit":
        hit();
        break;
      case "stand":
        stand();
        break;
      case "double":
        double();
        break;
      case "split":
        split();
        break;
      case "surrender":
        surrender();
        break;
    }
  };

  const handleNewGame = () => {
    resetGame();
    setLastDecision(null);
    setIsCorrect(null);
    setShowOptimalMove(false);
    setShowBetSelector(true);
  };

  const canAfford = (amount: number) => {
    return gameMode === "practice" || (user && user.coins !== null && user.coins !== undefined && user.coins >= amount);
  };

  return (
    <div className="min-h-screen bg-ink text-white overflow-hidden">
      <div className="max-w-md mx-auto">
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
                data-testid="button-leave-table"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </motion.button>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {gameMode === "practice" ? "Practice" : "Cash Game"}
            </h1>
            
            {gameMode === "practice" && (
              <motion.button
                onClick={() => setShowOptimalMove(!showOptimalMove)}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  showOptimalMove 
                    ? 'bg-accent-blue/20 border-accent-blue text-accent-blue' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-toggle-hints"
              >
                {showOptimalMove ? "Hide" : "Show"} Hints
              </motion.button>
            )}
          </motion.div>
        </header>

        {/* Bet Selector */}
        {showBetSelector && gameMode === "cash" && (
          <section className="px-6 mb-8">
            <motion.div
              className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-white mb-2">Choose Your Bet</h3>
              <p className="text-white/60 mb-6">Select your chips to start playing</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                {bettingOptions.map((option) => (
                  <motion.button
                    key={option.amount}
                    onClick={() => handleBetSelection(option.amount)}
                    disabled={!user?.coins || user.coins < option.amount}
                    className={`relative w-20 h-20 mx-auto rounded-full border-4 border-white/20 shadow-xl transition-all ${
                      user?.coins && user.coins >= option.amount
                        ? `${option.color} hover:scale-110 active:scale-95`
                        : "bg-gray-400/20 cursor-not-allowed opacity-50"
                    }`}
                    whileHover={user?.coins && user.coins >= option.amount ? { 
                      scale: 1.1, 
                      boxShadow: "0 0 20px rgba(255,255,255,0.3)" 
                    } : {}}
                    whileTap={user?.coins && user.coins >= option.amount ? { scale: 0.95 } : {}}
                    data-testid={`chip-${option.amount}`}
                  >
                    <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{option.label}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                      💰
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="bg-black/20 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-1">Your Balance</p>
                <p className="text-accent-gold font-bold text-xl">
                  {user?.coins?.toLocaleString() || "0"}
                </p>
              </div>
            </motion.div>
          </section>
        )}

        {/* Game Info */}
        {!showBetSelector && (
          <section className="px-6 mb-8">
            <motion.div 
              className="grid grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
                <p className="text-white/60 text-xs mb-2">Bet</p>
                <p className="text-white font-bold text-lg" data-testid="current-bet">
                  {gameMode === "cash" ? bet : "Practice"}
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
                <p className="text-white/60 text-xs mb-2">Balance</p>
                <p className="text-white font-bold text-lg" data-testid="current-balance">
                  {gameMode === "cash" ? user?.coins?.toLocaleString() : "∞"}
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
                <p className="text-white/60 text-xs mb-2">Deck</p>
                <p className="text-white font-bold text-lg">6D S17</p>
              </div>
            </motion.div>
          </section>
        )}

        {/* Dealer Hand */}
        {!showBetSelector && (
          <section className="px-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-3xl p-6 border border-red-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-xl">Dealer</h3>
                <div className="bg-black/20 rounded-xl px-4 py-2">
                  <span className="text-white font-bold text-lg" data-testid="dealer-total">
                    {gameState === "playing" && dealerHand[1] ? "?" : dealerTotal}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3 justify-center">
                <AnimatePresence>
                  {dealerHand.map((card, index) => (
                    <motion.div
                      key={`dealer-${index}`}
                      initial={{ y: -100, opacity: 0, rotateY: 180 }}
                      animate={{ y: 0, opacity: 1, rotateY: 0 }}
                      transition={{ delay: index * 0.3, duration: 0.6 }}
                    >
                      <PlayingCard
                        suit={card.suit}
                        value={card.value}
                        isHidden={gameState === "playing" && index === 1}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </section>
        )}

        {/* Player Hand */}
        {!showBetSelector && (
          <section className="px-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="bg-gradient-to-br from-accent-green/20 to-emerald-400/20 rounded-3xl p-6 border border-accent-green/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-xl">You</h3>
                <div className="bg-accent-green/20 rounded-xl px-4 py-2">
                  <span className="text-accent-green font-bold text-lg" data-testid="player-total">
                    {playerTotal}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3 justify-center">
                <AnimatePresence>
                  {playerHand.map((card, index) => (
                    <motion.div
                      key={`player-${index}`}
                      initial={{ y: 100, opacity: 0, rotateY: 180 }}
                      animate={{ y: 0, opacity: 1, rotateY: 0 }}
                      transition={{ delay: (dealerHand.length + index) * 0.3, duration: 0.6 }}
                    >
                      <PlayingCard
                        suit={card.suit}
                        value={card.value}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </section>
        )}

        {/* Optimal Move Hint */}
        {!showBetSelector && showOptimalMove && gameState === "playing" && (
          <section className="px-6 mb-8">
            <motion.div
              className="bg-gradient-to-br from-accent-blue/20 to-blue-400/20 rounded-3xl p-4 border border-accent-blue/20 backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-accent-blue text-sm text-center font-medium">
                💡 Optimal move: <span className="font-bold">{optimalMove?.toUpperCase()}</span>
              </p>
            </motion.div>
          </section>
        )}

        {/* Action Buttons */}
        {!showBetSelector && gameState === "playing" && (
          <section className="px-6 mb-8">
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => handlePlayerAction("hit")}
                  className="bg-gradient-to-r from-accent-green to-emerald-400 text-ink font-bold py-4 rounded-2xl text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-hit"
                >
                  Hit
                </motion.button>
                <motion.button
                  onClick={() => handlePlayerAction("stand")}
                  className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-4 rounded-2xl text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-stand"
                >
                  Stand
                </motion.button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-3 gap-2">
                {canDouble && (
                  <motion.button
                    onClick={() => handlePlayerAction("double")}
                    disabled={!canAfford(bet)}
                    className={`font-bold py-3 rounded-xl text-sm ${
                      canAfford(bet)
                        ? "bg-gradient-to-r from-accent-gold to-yellow-400 text-ink"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                    whileHover={canAfford(bet) ? { scale: 1.02 } : {}}
                    whileTap={canAfford(bet) ? { scale: 0.98 } : {}}
                    data-testid="button-double"
                  >
                    Double
                  </motion.button>
                )}
                {canSplit && (
                  <motion.button
                    onClick={() => handlePlayerAction("split")}
                    disabled={!canAfford(bet)}
                    className={`font-bold py-3 rounded-xl text-sm ${
                      canAfford(bet)
                        ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                    whileHover={canAfford(bet) ? { scale: 1.02 } : {}}
                    whileTap={canAfford(bet) ? { scale: 0.98 } : {}}
                    data-testid="button-split"
                  >
                    Split
                  </motion.button>
                )}
                {canSurrender && (
                  <motion.button
                    onClick={() => handlePlayerAction("surrender")}
                    className="bg-gradient-to-r from-gray-600 to-gray-500 text-white font-bold py-3 rounded-xl text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-surrender"
                  >
                    Surrender
                  </motion.button>
                )}
              </div>
            </motion.div>
          </section>
        )}

        {/* Game Over */}
        {!showBetSelector && gameState === "gameOver" && (
          <section className="px-6 mb-8">
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
                <h3 className="text-white text-2xl font-bold mb-4">
                  Game Over
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-500/20 rounded-2xl p-3">
                    <p className="text-white/60 text-xs mb-1">Dealer</p>
                    <p className="text-white font-bold text-xl">{dealerTotal}</p>
                  </div>
                  <div className="bg-accent-green/20 rounded-2xl p-3">
                    <p className="text-white/60 text-xs mb-1">You</p>
                    <p className="text-accent-green font-bold text-xl">{playerTotal}</p>
                  </div>
                </div>
              </div>
              
              <motion.button
                onClick={handleNewGame}
                className="w-full bg-gradient-to-r from-accent-green to-emerald-400 text-ink font-bold py-4 rounded-2xl text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-new-game"
              >
                New Hand
              </motion.button>
            </motion.div>
          </section>
        )}

        {/* Keyboard Shortcuts */}
        {!showBetSelector && (
          <section className="px-6 mb-8">
          <motion.div 
            className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <p className="text-white/60 text-xs text-center">
              Shortcuts: H (Hit) • S (Stand) • D (Double) • P (Split) • R (Surrender)
            </p>
          </motion.div>
        </section>
        )}
      </div>
    </div>
  );
}
