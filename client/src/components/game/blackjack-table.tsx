import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';
import DealerHeader from "./play/DealerHeader";
import PlayerHeader from "./play/PlayerHeader";
import HandCards from "./play/HandCards";
import ActionBar from "./play/ActionBar";
import BetBadge from "./play/BetBadge";
import WinProbPanel from "./play/WinProbPanel";

interface BlackjackTableProps {
  gameMode: "practice" | "cash";
  playMode?: "classic" | "high-stakes";
}

export default function BlackjackTable({ gameMode, playMode = "classic" }: BlackjackTableProps) {
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
  const { balance, loadBalance } = useChipsStore();
  const [showOptimalMove, setShowOptimalMove] = useState(false);
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showBetSelector, setShowBetSelector] = useState(false);
  const [selectedBet, setSelectedBet] = useState(25);
  const [customBet, setCustomBet] = useState("");
  const [showGameOverActions, setShowGameOverActions] = useState(false);

  const optimalMove = getOptimalMove();

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

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
    if (gameMode === "cash") {
      navigate("/play/classic");
    } else {
      setShowBetSelector(true);
    }
  };

  const canAfford = (amount: number) => {
    return gameMode === "practice" || (user && user.coins !== null && user.coins !== undefined && user.coins >= amount);
  };

  // Retarder l'affichage des actions Game Over pour laisser voir les cartes du dealer
  useEffect(() => {
    if (gameState === "gameOver") {
      setShowGameOverActions(false);
      // Attendre 3 secondes pour voir les cartes du dealer se retourner
      const timer = setTimeout(() => {
        setShowGameOverActions(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowGameOverActions(false);
    }
  }, [gameState]);

  return (
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header with navigation */}
        <div className="absolute top-0 inset-x-0 z-10 px-6 pt-6 pb-4">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.button
              onClick={() => navigate(gameMode === "cash" ? (playMode === "high-stakes" ? "/play/high-stakes" : "/play/classic") : "/")}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-leave-table"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white flex items-center gap-2">
              <img src={topHatImage} alt="Dealer hat" className="w-6 h-6 object-contain" />
              Dealer
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
            
            {gameMode === "cash" && (
              <div className="text-right">
                <p className="text-white/60 text-xs">Solde</p>
                <p className="text-[#F8CA5A] font-bold text-sm">
                  {balance.toLocaleString()}
                </p>
              </div>
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
          <div className="flex flex-col h-screen pt-16 pb-4 overflow-hidden">
            {/* TOP: Dealer Section */}
            <div className="flex-1 flex flex-col justify-start min-h-0 px-4">
              {/* Dealer total */}
              {dealerTotal > 0 && (
                <div className="flex justify-center mb-3 mt-2">
                  <motion.div
                    className="bg-[#232227] rounded-2xl px-4 py-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <span className="font-semibold text-lg text-white">
                      {dealerTotal}
                    </span>
                  </motion.div>
                </div>
              )}
              
              <div className="flex justify-center flex-1 items-start pt-2 pb-1">
                <HandCards
                  cards={dealerHand}
                  faceDownIndices={gameState === "playing" ? [1] : []}
                  variant="dealer"
                />
              </div>
            </div>

            {/* MIDDLE: Player Avatar and Bet positioned horizontally */}
            <div className="absolute left-4 z-10 flex items-center px-2 py-4 mb-4" style={{ top: '44%', transform: 'translateY(-50%)' }}>
              {/* Player avatar + bet horizontal layout */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm flex items-center justify-between gap-4 min-w-[160px]">
                {/* Avatar à gauche */}
                <div className="w-12 h-12 bg-accent-purple/20 rounded-2xl flex items-center justify-center">
                  <PlayerHeader 
                    total={undefined}
                    className="p-0"
                    showAvatar={true}
                    centerLayout={true}
                  />
                </div>
                {/* Bet à droite */}
                <div>
                  <BetBadge amount={gameMode === "cash" ? bet : 0} />
                </div>
              </div>
            </div>

            {/* BOTTOM: Player Section */}
            <div className="flex-1 flex flex-col justify-end min-h-0 px-4 pb-4">
              {/* Player Cards */}
              <div className="flex justify-center mb-4 pt-2">
                <HandCards
                  cards={playerHand}
                  variant="player"
                  highlightTotal={false}
                  total={playerTotal}
                />
              </div>

              {/* Just points below cards, above actions */}
              {playerTotal > 0 && (
                <div className="flex justify-center mb-3">
                  <motion.div
                    className="bg-[#232227] rounded-2xl px-4 py-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <span className="font-semibold text-lg text-white">
                      {playerTotal}
                    </span>
                  </motion.div>
                </div>
              )}


              {/* Action Buttons */}
              {gameState === "playing" && (
                <ActionBar
                  canHit={true}
                  canStand={true}
                  canDouble={canDouble !== null ? canDouble && canAfford(bet) : undefined}
                  canSplit={canSplit !== null ? canSplit && canAfford(bet) : undefined}
                  canSurrender={canSurrender ? true : false}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                />
              )}


              {/* Keyboard Shortcuts - removed to save space */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
