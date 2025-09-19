import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useToast } from "@/hooks/use-toast";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';
import DealerHeader from "./play/DealerHeader";
import PlayerHeader from "./play/PlayerHeader";
import HandCards from "./play/HandCards";
import ActionBar from "./play/ActionBar";
import BetBadge from "./play/BetBadge";
import WinProbPanel from "./play/WinProbPanel";
import StreakCounter from "./play/StreakCounter";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import CompactResultModal from "./CompactResultModal";

interface BlackjackTableProps {
  gameMode: "practice" | "cash" | "all-in";
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
  } = useGameStore();
  
  const user = useUserStore((state) => state.user);
  const { balance, loadBalance, deductBet } = useChipsStore();
  const queryClient = useQueryClient();
  const [showOptimalMove, setShowOptimalMove] = useState(false);
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showBetSelector, setShowBetSelector] = useState(false);
  const [selectedBet, setSelectedBet] = useState(25);
  const [customBet, setCustomBet] = useState("");
  const [showGameOverActions, setShowGameOverActions] = useState(false);
  
  // 🔒 SECURE All-in game state variables
  const [allInGameId, setAllInGameId] = useState<string | null>(null);
  const [allInGameResult, setAllInGameResult] = useState<any | null>(null);
  const [isAllInGameActive, setIsAllInGameActive] = useState(false);
  
  // Compact result modal state for All-in mode
  const [showCompactResult, setShowCompactResult] = useState(false);
  
  // Données de streak pour le mode 21 Streak
  const currentWinStreak = user?.currentStreak21 || 0;
  const maxWinStreak = user?.maxStreak21 || 0;
  const currentMultiplier = Math.min(currentWinStreak > 0 ? currentWinStreak : 1, 10);
  const is21StreakMode = playMode === "high-stakes";
  
  // Get user avatar
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();

  // 🔒 SECURE All-in mutations for authoritative server-side game management
  const createAllInGameMutation = useMutation({
    mutationFn: async () => {
      console.log("🎯 Creating secure All-in game...");
      const response = await apiRequest('POST', '/api/allin/create-game', {});
      return response.json();
    },
    onSuccess: (gameData) => {
      console.log("✅ Secure All-in game created:", gameData);
      setAllInGameId(gameData.gameId);
      setIsAllInGameActive(true);
      
      // 🔒 SECURITY: Use ONLY server-provided cards - NO client generation
      console.log("🔒 Setting server-authoritative game state:", {
        playerHand: gameData.playerHand,
        dealerHand: gameData.dealerHand
      });
      
      // 🎯 FIX: Capture the All-in bet amount (user's balance before the game)
      const allInBetAmount = gameData.betAmount || balance || user?.coins || 0;
      console.log("💰 All-in bet amount set to:", allInBetAmount);
      
      // Reset and set server state directly
      resetGame();
      
      // Use setTimeout to ensure resetGame completes first
      setTimeout(() => {
        // 🔒 SECURITY FIX: Use proper store action instead of direct mutations
        const { syncServerState } = useGameStore.getState();
        syncServerState({
          playerHand: gameData.playerHand || [],
          dealerHand: gameData.dealerHand || [], // Only upcard from server
          gameState: "playing" as const,
          bet: allInBetAmount, // 🎯 FIX: Set the correct All-in bet amount
        });
      }, 50);
    },
    onError: (error: any) => {
      console.error("❌ Failed to create All-in game:", error);
      toast({
        title: "Game Creation Failed",
        description: error?.message || "Unable to start All-in game",
        variant: "destructive",
      });
    }
  });
  
  const processAllInActionMutation = useMutation({
    mutationFn: async ({ action }: { action: "hit" | "stand" | "surrender" }) => {
      if (!allInGameId) throw new Error("No active game");
      
      console.log(`🎮 Processing All-in action: ${action}`);
      const response = await apiRequest('POST', '/api/allin/action', {
        gameId: allInGameId,
        action
      });
      return response.json();
    },
    onSuccess: (actionResult) => {
      console.log("📥 All-in action result:", actionResult);
      
      if (actionResult.status === "finished") {
        // Game completed - store authoritative result
        setAllInGameResult(actionResult);
        setIsAllInGameActive(false);
        setAllInGameId(null);
        
        // 🔒 SECURITY: Sync final game state with server
        const { syncServerState } = useGameStore.getState();
        syncServerState({
          playerHand: actionResult.playerHand,
          dealerHand: actionResult.dealerHand,
          gameState: "gameOver" as const,
          bet: actionResult.betAmount || bet // 🎯 FIX: Preserve bet amount for result display
        });
        
        // 💰 IMPORTANT: Reload balance to reflect payout
        loadBalance();
        
        // Invalidate balance queries to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        // Show result notification
        const resultText = actionResult.result === "win" ? "Victoire !" : 
                          actionResult.result === "lose" ? "Défaite" : "Égalité";
        
        toast({
          title: `🎮 All-in ${resultText}`,
          description: actionResult.payout > 0 ? 
            `Payout: ${actionResult.payout} coins (+${actionResult.rebate} rebate)` :
            `Rebate: ${actionResult.rebate} coins`,
          variant: actionResult.result === "win" ? "default" : "destructive",
        });
        
        console.log("🏁 All-in game completed with secure result!", {
          result: actionResult.result,
          payout: actionResult.payout,
          newBalance: actionResult.coins
        });
      } else if (actionResult.status === "continue") {
        // Game continues - update UI with server state
        console.log("⏳ All-in game continues...");
        
        // 🔒 SECURITY: Sync client state with authoritative server state
        const { syncServerState } = useGameStore.getState();
        syncServerState({
          playerHand: actionResult.playerHand,
          dealerHand: actionResult.dealerHand,
          gameState: actionResult.phase || "playing" as const
        });
        
        console.log("✅ UI updated with server state after action");
      }
    },
    onError: (error: any) => {
      console.error("❌ Failed to process All-in action:", error);
      toast({
        title: "Action Failed",
        description: error?.message || "Unable to process game action",
        variant: "destructive",
      });
    }
  });

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
    loadBalance();
  }, [loadBalance]);
  
  // 🔒 SECURE All-in game initialization - intercept normal flow
  useEffect(() => {
    if (gameMode === "all-in" && gameState === "betting" && !isAllInGameActive && !allInGameId) {
      console.log("🎯 Initializing SECURE All-in game instead of client-side cards...");
      // Don't use dealInitialCards for All-in - use secure server-side system
      createAllInGameMutation.mutate();
    }
  }, [gameMode, gameState, isAllInGameActive, allInGameId]);

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
    
    // 🔒 SECURITY: For All-in mode, NEVER call dealInitialCards - use server
    if (gameMode === "all-in") {
      console.log("🔒 All-in mode: Bet set, waiting for secure game creation");
      return;
    }
    
    // Only for non-All-in modes (practice/cash)
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
    
    // 🔒 SECURE ALL-IN MODE - Send actions to authoritative server
    if (gameMode === "all-in") {
      console.log(`🎮 ALL-IN SECURITY: Intercepting ${action} action for server processing`);
      
      // Check if we have an active secure game
      if (!isAllInGameActive || !allInGameId) {
        console.error("❌ NO ACTIVE SECURE GAME: Creating new game...");
        createAllInGameMutation.mutate();
        return;
      }
      
      // Only allow secure actions in All-in mode
      if (action === "hit" || action === "stand" || action === "surrender") {
        console.log(`✅ Sending SECURE ${action} action to server`);
        processAllInActionMutation.mutate({ 
          action: action as "hit" | "stand" | "surrender" 
        });
      } else {
        // Block all other actions for security
        toast({
          title: "🛡️ Security Block",
          description: `${action.toUpperCase()} is not allowed in secure All-in mode.`,
          variant: "destructive",
        });
        console.warn(`🚨 SECURITY: Blocked unauthorized ${action} action in All-in mode`);
      }
      return; // Exit early - no local processing for All-in
    }
    
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

    // Process actions locally for non-All-in modes
    switch (action) {
      case "hit":
        hit();
        break;
      case "stand":
        stand();
        break;
      case "double":
        if (gameMode === "practice" || canAfford(bet)) {
          deductBet(bet);
          double();
        }
        break;
      case "split":
        if (gameMode === "practice" || canAfford(bet)) {
          deductBet(bet);
          split();
        }
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
    } else if (gameMode === "all-in") {
      navigate("/play/all-in");
    } else {
      setShowBetSelector(true);
    }
  };

  const canAfford = (amount: number) => {
    return gameMode === "practice" || (user && user.coins !== null && user.coins !== undefined && user.coins >= amount);
  };

  // Handle compact result modal close for All-in mode
  const handleCompactResultClose = () => {
    setShowCompactResult(false);
    setAllInGameResult(null);
    resetGame();
    
    // Check if user can play again based on tickets/coins
    if (user && allInGameResult) {
      const hasTickets = allInGameResult.tickets > 0;
      const hasCoins = (user?.coins || 0) > 0;
      
      if (hasTickets && hasCoins) {
        // User can play again - stay on the table and allow new game
        console.log("✅ User can play again - staying on table");
        // Reset all-in game state for new game
        setAllInGameId(null);
        setIsAllInGameActive(false);
      } else {
        // No tickets/coins left - navigate to shop
        console.log("❌ No tickets/coins left - redirecting to shop");
        navigate("/shop");
      }
    } else {
      // No result data, go back to all-in page
      navigate("/play/all-in");
    }
  };

  // All-in mode now uses same result system as other modes

  // Delay displaying Game Over actions to let the dealer cards be seen  
  useEffect(() => {
    if (gameState === "gameOver") {
      setShowGameOverActions(false);
      
      // 🔒 SECURE All-in mode - show compact result modal instead of navigating
      if (gameMode === "all-in" && allInGameResult && user) {
        const timer = setTimeout(async () => {
          try {
            console.log("🎯 All-in game completed with authoritative result:", allInGameResult);
            
            // Invalidate relevant queries to refresh user data
            await queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/allin/status'] });
            
            // Show compact result modal instead of navigating to result page
            setShowCompactResult(true);
          } catch (error) {
            console.error("❌ Error processing secure All-in result:", error);
            toast({
              title: "Error", 
              description: "Failed to process game result. Please try again.",
              variant: "destructive",
            });
            navigate("/play/all-in");
          }
        }, 2000); // Reduced delay to 2 seconds to match spec
        
        return () => clearTimeout(timer);
      } else {
        // For other modes, show game over actions after delay
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
              onClick={() => {
                if (gameMode === "all-in") {
                  navigate("/play/all-in");
                } else if (gameMode === "cash") {
                  navigate(playMode === "high-stakes" ? "/play/high-stakes" : "/play/classic");
                } else {
                  navigate("/");
                }
              }}
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
            
            {(gameMode === "cash" || gameMode === "all-in") && (
              <div className="text-right">
                <p className="text-white/60 text-xs">{
                  gameMode === "all-in" ? "All-in Bet" : "Bet"
                }</p>
                <p className="text-[#F8CA5A] font-bold text-sm">
                  {gameMode === "all-in" && user?.coins ? 
                    user.coins.toLocaleString() : 
                    bet.toLocaleString()
                  }
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bet Selector Modal */}
        {showBetSelector && (gameMode === "cash" || gameMode === "all-in") && (
          <div className="absolute inset-0 bg-[#0B0B0F]/95 backdrop-blur-sm z-20 flex items-center justify-center px-6">
            <motion.div
              className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{
                gameMode === "all-in" ? "All-in Game" : "Choose Your Bet"
              }</h3>
              <p className="text-white/60 mb-6">{
                gameMode === "all-in" ? 
                  "You're betting everything! This uses a ticket and all your coins." :
                  "Select your chips to start playing"
              }</p>
              
              {gameMode === "all-in" ? (
                <div className="mb-6">
                  <Button
                    onClick={() => handleBetSelection(user?.coins || 0)}
                    disabled={!user?.coins || user.coins <= 0 || !user?.tickets || user.tickets <= 0}
                    className="w-full bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold py-4 px-8 rounded-xl text-lg"
                    data-testid="button-all-in"
                  >
                    All-in ({user?.coins?.toLocaleString() || 0} coins)
                  </Button>
                  {(!user?.tickets || user.tickets <= 0) && (
                    <p className="text-red-400 text-sm mt-2">You need at least 1 ticket to play All-in mode</p>
                  )}
                  {(!user?.coins || user.coins <= 0) && (
                    <p className="text-red-400 text-sm mt-2">You need coins to play All-in mode</p>
                  )}
                </div>
              ) : (
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
              )}

              {gameMode !== "all-in" && (
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
              )}

              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white/60 text-sm">Votre Solde</p>
                  {gameMode === "all-in" && (
                    <p className="text-white/60 text-sm">Tickets: {user?.tickets || 0}</p>
                  )}
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
                  cardBackUrl={cardBackUrl}
                />
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
                  cardBackUrl={cardBackUrl}
                />
              </div>

              {/* Player score centered */}
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
                  canDouble={!!(gameMode !== "all-in" && canDouble && canAfford(bet))}
                  canSplit={!!(gameMode !== "all-in" && canSplit && canAfford(bet))}
                  canSurrender={gameMode !== "all-in" && canSurrender}
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
      
      {/* Compact Result Modal for All-in mode */}
      {gameMode === "all-in" && allInGameResult && (
        <CompactResultModal
          showResult={showCompactResult}
          result={allInGameResult.result}
          dealerTotal={dealerTotal}
          playerTotal={playerTotal}
          bet={bet}
          payout={allInGameResult.payout}
          rebate={allInGameResult.rebate}
          onClose={handleCompactResultClose}
        />
      )}
    </div>
  );
}
