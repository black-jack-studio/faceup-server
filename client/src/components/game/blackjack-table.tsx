import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import DealerHeader from "./play/DealerHeader";
import HandCards from "./play/HandCards";
import ActionBar from "./play/ActionBar";
import BetBadge from "./play/BetBadge";
import WinProbPanel from "./play/WinProbPanel";

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
  const [customBet, setCustomBet] = useState("");

  const optimalMove = getOptimalMove();

  // Betting amounts with coin designs
  const bettingOptions = [
    { amount: 10, color: "bg-gradient-to-br from-gray-400 to-gray-600", label: "10" },
    { amount: 25, color: "bg-gradient-to-br from-accent-gold to-yellow-400", label: "25" },
    { amount: 50, color: "bg-gradient-to-br from-red-500 to-red-700", label: "50" },
    { amount: 100, color: "bg-gradient-to-br from-purple-500 to-purple-700", label: "100" },
    { amount: 250, color: "bg-gradient-to-br from-emerald-500 to-emerald-700", label: "250" },
    { amount: 500, color: "bg-gradient-to-br from-blue-500 to-blue-700", label: "500" },
  ];

  const handleBetSelection = (amount: number) => {
    setSelectedBet(amount);
    setShowBetSelector(false);
    dealInitialCards(amount);
  };

  const handleCustomBetSubmit = () => {
    const amount = parseInt(customBet);
    if (amount && amount > 0 && user?.coins && user.coins >= amount) {
      handleBetSelection(amount);
    } else {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide et suffisant.",
        variant: "destructive",
      });
    }
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
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header with navigation */}
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
              data-testid="button-leave-table"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">
              {gameMode === "practice" ? "Practice" : "Cash Game"}
            </h1>
            
            {gameMode === "practice" && (
              <motion.button
                onClick={() => setShowOptimalMove(!showOptimalMove)}
                className={`px-3 py-1 rounded-xl text-sm transition-all ${
                  showOptimalMove 
                    ? 'bg-[#8CCBFF]/20 text-[#8CCBFF]' 
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-toggle-hints"
              >
                {showOptimalMove ? "Hide" : "Show"} Hints
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Bet Selector Modal */}
        {showBetSelector && gameMode === "cash" && (
          <div className="absolute inset-0 bg-[#0B0B0F]/95 backdrop-blur-sm z-20 flex items-center justify-center px-6">
            <motion.div
              className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
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
                  </motion.button>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-white/60 text-sm mb-3">Ou saisissez un montant personnalisé</p>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Montant"
                    value={customBet}
                    onChange={(e) => setCustomBet(e.target.value)}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    min="1"
                    max={user?.coins || 1000}
                    data-testid="input-custom-bet"
                  />
                  <Button 
                    onClick={handleCustomBetSubmit}
                    disabled={!customBet || !user?.coins || parseInt(customBet) > user.coins || parseInt(customBet) <= 0}
                    className="bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold px-6"
                    data-testid="button-validate-bet"
                  >
                    Valider
                  </Button>
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-1">Votre Solde</p>
                <p className="text-[#F8CA5A] font-bold text-xl">
                  {user?.coins?.toLocaleString() || "0"}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Main Game Layout - Only when not in bet selection */}
        {!showBetSelector && (
          <>
            {/* TOP: Dealer Section */}
            <DealerHeader
              name="Dealer"
              total={gameState === "playing" && dealerHand[1] ? undefined : dealerTotal}
            />
            
            <HandCards
              cards={dealerHand}
              faceDownIndices={gameState === "playing" ? [1] : []}
              variant="dealer"
            />

            {/* BOTTOM: Player Section */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4">
              {/* Player Info (total + bet) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/6 ring-1 ring-white/10 flex items-center justify-center">
                    <span className="text-xl">🙂</span>
                  </div>
                  <div className="text-white/90 text-sm">
                    <div className="font-medium">You</div>
                    <div className="text-white/60 text-xs" data-testid="player-total">
                      Total: {playerTotal}
                    </div>
                  </div>
                </div>

                <BetBadge amount={gameMode === "cash" ? bet : 0} />
              </div>

              {/* Player Cards */}
              <HandCards
                cards={playerHand}
                variant="player"
                highlightTotal={true}
                total={playerTotal}
              />

              {/* Win Probability Panel */}
              {gameState === "playing" && (
                <WinProbPanel
                  advice={optimalMove}
                  className="self-end"
                />
              )}

              {/* Action Buttons */}
              {gameState === "playing" && (
                <ActionBar
                  canHit={true}
                  canStand={true}
                  canDouble={(canDouble || false) && canAfford(bet)}
                  canSplit={(canSplit || false) && canAfford(bet)}
                  canSurrender={canSurrender || false}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                />
              )}

              {/* Game Over Actions */}
              {gameState === "gameOver" && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="bg-[#13151A] rounded-2xl ring-1 ring-white/10 p-4 text-center">
                    <h3 className="text-white text-xl font-bold mb-4">Game Over</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-500/20 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">Dealer</p>
                        <p className="text-white font-bold text-lg" data-testid="dealer-total">{dealerTotal}</p>
                      </div>
                      <div className="bg-[#B5F3C7]/20 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">You</p>
                        <p className="text-[#B5F3C7] font-bold text-lg">{playerTotal}</p>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={handleNewGame}
                    className="w-full bg-[#B5F3C7] text-[#0B0B0F] font-bold py-4 rounded-[20px] text-lg transition-transform duration-150 ease-out will-change-transform"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-new-game"
                  >
                    New Hand
                  </motion.button>
                </motion.div>
              )}

              {/* Keyboard Shortcuts */}
              <motion.div 
                className="bg-white/5 rounded-2xl p-3 ring-1 ring-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <p className="text-white/60 text-xs text-center">
                  Shortcuts: H (Hit) • S (Stand) • D (Double) • P (Split) • R (Surrender)
                </p>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
