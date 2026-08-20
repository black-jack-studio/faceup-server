import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import { ArrowLeft, AlertTriangle, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AnimatedModal from "@/components/AnimatedModal";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';
import DealerHeader from "./play/DealerHeader";
import PlayerHeader from "./play/PlayerHeader";
import HandCards from "./play/HandCards";
import ActionBar from "./play/ActionBar";
import BetBadge from "./play/BetBadge";
import WinProbPanel from "./play/WinProbPanel";
import SplitHandsDisplay from "./play/SplitHandsDisplay";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";

interface BlackjackTableProps {
  gameMode: "practice" | "cash";
  // "friends" only changes the visuals (two empty seats beside the player) — the game
  // itself is still solo against the dealer under the hood until real multiplayer exists.
  layout?: "solo" | "friends";
}

export default function BlackjackTable({ gameMode, layout = "solo" }: BlackjackTableProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    playerHand,
    dealerHand,
    gameState,
    playerTotal,
    dealerTotal,
    bet,
    result,
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
    handsPlayed,
    handsWon,
    // Split functionality
    isSplit,
    splitHands,
    currentSplitHand,
    // Server-authoritative action state (cash)
    isProcessingAction,
    actionError,
  } = useGameStore();

  const user = useUserStore((state) => state.user);
  const { loadUserCoins } = useUserStore();
  const balance = user?.coins || 0;
  const queryClient = useQueryClient();
  const [showOptimalMove, setShowOptimalMove] = useState(false);
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showBetSelector, setShowBetSelector] = useState(false);
  const [selectedBet, setSelectedBet] = useState(25);
  const [customBet, setCustomBet] = useState("");
  const [showGameOverActions, setShowGameOverActions] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Leaving mid-hand (real money on the table) forfeits the bet instead of the game just
  // sitting resumable — see server/routes.ts's /api/game/forfeit for why that's different
  // from the orphaned-game refund that still covers an app crash/connection drop.
  const forfeitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/game/forfeit");
    },
    onSuccess: () => {
      // The bet was already debited when the hand started — this doesn't take anything new,
      // it just confirms it's lost for good. Visible confirmation here since nothing about
      // the balance number itself changes at this exact moment.
      toast({
        title: "Table left",
        description: `Your ${bet.toLocaleString()} coin bet was forfeited.`,
      });
    },
    onError: () => {
      // Still safe to leave either way — an active game that somehow didn't get forfeited
      // falls back to the orphaned-game refund the next time a bet is placed, so nothing is
      // ever silently lost or stuck. This toast is just so a real failure doesn't go unnoticed.
      toast({
        title: "Couldn't confirm the forfeit",
        description: "Leaving anyway. Your balance will be checked next time you place a bet.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setShowLeaveConfirm(false);
      resetGame();
      navigate(layout === "friends" ? "/play/friends" : "/play/classic");
    },
  });

  const leaveTablePath = gameMode === "cash" ? (layout === "friends" ? "/play/friends" : "/play/classic") : "/";

  const handleLeaveTable = () => {
    if (gameMode === "cash" && gameState === "playing") {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(leaveTablePath);
  };


  // Get user avatar
  const currentAvatar = user?.selectedAvatarId ?
    getAvatarById(user.selectedAvatarId) :
    getDefaultAvatar();



  // Get user's selected card back using the reusable hook
  const { cardBackUrl } = useSelectedCardBack();

  const optimalMove = getOptimalMove();

  // Function to calculate win probability based on current hand
  const getWinProbability = (): string => {
    if (gameState !== "playing" || playerHand.length === 0 || dealerHand.length === 0) {
      return "50.0";
    }

    // Basic probability calculation based on player total and dealer upcard
    const dealerUpcard = dealerHand[0]?.numericValue || 10;
    let winChance = 50; // Base 50%

    // Adjust based on player total
    if (playerTotal === 21) {
      winChance = 95; // Very high chance with 21
    } else if (playerTotal === 20) {
      winChance = 85; // Excellent hand
    } else if (playerTotal >= 17 && playerTotal <= 19) {
      winChance = 65 + (playerTotal - 17) * 5; // Good hands
    } else if (playerTotal >= 12 && playerTotal <= 16) {
      // Tricky range - depends heavily on dealer upcard
      if (dealerUpcard >= 7) {
        winChance = 25 - (playerTotal - 12) * 2; // Dealer shows strong
      } else {
        winChance = 60 - (16 - playerTotal) * 3; // Dealer shows weak
      }
    } else if (playerTotal === 11) {
      winChance = 75; // Great doubling hand
    } else if (playerTotal >= 9 && playerTotal <= 10) {
      winChance = 55 + (playerTotal - 9) * 5; // Decent hitting hands
    } else if (playerTotal <= 8) {
      winChance = 80; // Can't bust
    } else {
      winChance = 0; // Busted
    }

    // Adjust based on dealer upcard
    if (dealerUpcard === 1 || dealerUpcard === 11) { // Ace
      winChance *= 0.7; // Ace is strong
    } else if (dealerUpcard >= 7 && dealerUpcard <= 10) {
      winChance *= 0.8; // Strong upcards
    } else if (dealerUpcard >= 4 && dealerUpcard <= 6) {
      winChance *= 1.2; // Weak upcards (dealer likely to bust)
    } else {
      winChance *= 0.9; // 2,3 are neutral-weak
    }

    // Ensure probability stays within bounds
    winChance = Math.max(5, Math.min(95, winChance));

    return winChance.toFixed(1);
  };

  useEffect(() => {
    loadUserCoins();
  }, [loadUserCoins]);


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

    // Normal modes (practice/cash)
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
    // A server round-trip is already in flight for cash — ignore taps until it resolves
    // so we never send a second action against a hand the server hasn't finished mutating yet.
    if (gameMode !== "practice" && isProcessingAction) return;

    setLastDecision(action);
    setIsCorrect(action === optimalMove);


    // Regular modes feedback
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
        if (gameMode === "practice" || canAfford(bet)) {
          double();
        }
        break;
      case "split":
        if (gameMode === "practice" || canAfford(bet)) {
          split();
        }
        break;
      case "surrender":
        surrender();
        break;
    }
  };

  // Surface server-side rejections (illegal action, insufficient funds mid-hand, etc.) —
  // the store just records the message, this is the one place that turns it into a toast.
  useEffect(() => {
    if (actionError) {
      toast({
        title: "Action Failed",
        description: actionError,
        variant: "destructive",
      });
    }
  }, [actionError, toast]);

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



  // Delay displaying Game Over actions to let the dealer cards be seen  
  useEffect(() => {
    if (gameState === "gameOver") {
      setShowGameOverActions(false);

      {
        // For all modes, show game over actions after delay
        const timer = setTimeout(() => {
          setShowGameOverActions(true);
        }, 3000);

        return () => clearTimeout(timer);
      }
    } else {
      setShowGameOverActions(false);
    }
  }, [gameState, gameMode, result, bet, user, navigate]);

  return (
    <div className="fixed-safe-screen bg-[#000000] text-white">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header with navigation */}
        <div className="absolute top-0 inset-x-0 z-10 px-6 pt-6 pb-8">
          <motion.div
            className="relative flex items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Left side - Back button */}
            <motion.button
              onClick={handleLeaveTable}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-leave-table"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            {/* Center - Dealer title with hat icon */}
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-medium text-white flex items-center gap-2">
              <img src={topHatImage} alt="Dealer hat" className="w-6 h-6 object-contain" />
              Dealer
            </h1>

            {/* Right side - spacer to balance layout */}
            <div className="ml-auto">
              {gameMode === "practice" && (
                <motion.button
                  onClick={() => setShowOptimalMove(!showOptimalMove)}
                  className={`px-3 py-1 rounded-xl text-sm transition-all ${showOptimalMove
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
                  <p className="text-white/60 text-xs">Bet</p>
                  <p className="text-[#F8CA5A] font-bold text-sm">
                    {bet.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
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
                    className={`relative w-20 h-20 mx-auto rounded-full border-4 border-white/20 shadow-xl transition-all ${user?.coins && user.coins >= option.amount
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
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white/60 text-sm">Votre Solde</p>
                </div>
                <p className="text-[#F8CA5A] font-bold text-xl">
                  {user?.coins?.toLocaleString() || "0"}
                </p>
              </div>
            </motion.div>
          </div>
        )}


        {/* Main Game Layout - Only when not in bet selection */}
        {!showBetSelector && (
          <div className="relative flex flex-col h-full pt-16 pb-4 overflow-hidden gap-16">
            {/* TOP: Dealer Section */}
            <div className="flex-1 flex flex-col justify-start min-h-0 px-4 relative">
              <div className="flex justify-center flex-1 items-start pt-8 pb-1">
                <HandCards
                  cards={dealerHand}
                  faceDownIndices={gameState === "playing" ? [1] : []}
                  variant="dealer"
                  cardBackUrl={cardBackUrl}
                  showPositionedTotal={true}
                  total={dealerTotal}
                />
              </div>
            </div>

            {/* MIDDLE: Friend Seats — empty until invites/matchmaking exist. Positioned
                absolutely and centered on this container's true vertical midpoint, rather
                than living in the flex flow between the dealer/player sections — their
                content heights aren't equal, so a flex sibling landed off-center. */}
            {layout === "friends" && (
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-10 pointer-events-none">
                {["Left", "Right"].map((side) => (
                  <div key={side} className="flex flex-col items-center gap-2" data-testid={`seat-empty-${side.toLowerCase()}`}>
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/[0.06] backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/20">
                      <UserPlus className="w-5 h-5 text-white/30" />
                    </div>
                    <span className="text-white/40 text-[11px] font-medium tracking-wide">Empty seat</span>
                  </div>
                ))}
              </div>
            )}

            {/* BOTTOM: Player Section */}
            <div className="flex-1 flex flex-col justify-end min-h-0 px-4">
              {/* Player Cards */}
              {isSplit ? (
                <SplitHandsDisplay
                  originalCards={playerHand}
                  splitHands={splitHands}
                  currentSplitHand={currentSplitHand}
                  showSplitAnimation={false}
                  cardBackUrl={cardBackUrl}
                />
              ) : (
                <>
                  <div className="relative flex justify-center mb-8 pt-2">
                    <HandCards
                      cards={playerHand}
                      variant="player"
                      highlightTotal={false}
                      total={playerTotal}
                      cardBackUrl={cardBackUrl}
                      showPositionedTotal={true}
                    />
                  </div>
                </>
              )}


              {/* Action Buttons - Always visible, disabled when game is not playing */}
              <div className="mt-10 min-h-[120px]" style={{ marginBottom: "-20px" }}>
                <ActionBar
                  canHit={gameState === "playing" && !isProcessingAction}
                  canStand={gameState === "playing" && !isProcessingAction}
                  canDouble={gameState === "playing" && !isProcessingAction && !!(canDouble && canAfford(bet))}
                  canSplit={gameState === "playing" && !isProcessingAction && !!(canSplit && canAfford(bet))}
                  canSurrender={gameState === "playing" && !isProcessingAction && canSurrender}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                  playerCardCount={playerHand.length}
                />
              </div>


              {/* Keyboard Shortcuts - removed to save space */}
            </div>
          </div>
        )}
      </div>

      <AnimatedModal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} className="w-full max-w-xs">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Leave the table?</h2>
          </div>

          <p className="text-white/70 text-sm text-center mb-6">
            You'll forfeit your {bet.toLocaleString()} coin bet. It won't be refunded.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              disabled={forfeitMutation.isPending}
              className="flex-1 h-11 rounded-2xl bg-white/10 text-white font-medium disabled:opacity-50"
              data-testid="button-cancel-leave-table"
            >
              Stay
            </button>
            <button
              onClick={() => forfeitMutation.mutate()}
              disabled={forfeitMutation.isPending}
              className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
              data-testid="button-confirm-leave-table"
            >
              {forfeitMutation.isPending ? "Leaving…" : "Leave"}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
