import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useChipsStore } from "@/store/chips-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BlackjackTable from "@/components/game/blackjack-table";

export default function GameMode() {
  const [, navigate] = useLocation();
  const [bet, setBet] = useState(0);
  const [gameMode, setGameMode] = useState<"classic" | "high-stakes" | "all-in">("classic");
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win" | "loss" | "tie" | "blackjack" | null>(null);
  const [finalWinnings, setFinalWinnings] = useState(0);
  const queryClient = useQueryClient();
  
  const closeAnimation = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    // Redirect to home page so users can access all navigation options
    navigate("/");
  };
  const { setMode, startGame, dealInitialCards, gameState, resetGame, playerHand, dealerHand, result, playerTotal, dealerTotal, bet: currentBet } = useGameStore();
  const { addWinnings } = useChipsStore();
  const user = useUserStore((state) => state.user);

  // Mutation to post game statistics
  const postStatsMutation = useMutation({
    mutationFn: async (stats: {
      gameType: string;
      handsPlayed: number;
      handsWon: number;
      blackjacks: number;
      totalWinnings: number;
      totalLosses: number;
    }) => {
      const response = await apiRequest('POST', '/api/stats', stats);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate challenges and statistics cache to update them immediately
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] }); // To update XP
      
      // Display gained XP if present
      if (data.xpGained > 0) {
        console.log(`+${data.xpGained} XP gained!`);
      }
      
      // If level up, display rewards
      if (data.levelUp) {
        console.log(`🎉 Level ${data.levelUp.newLevel} reached!`);
        if (data.levelUp.rewards) {
          if (data.levelUp.rewards.coins) {
            console.log(`💰 +${data.levelUp.rewards.coins} coins received!`);
          }
          if (data.levelUp.rewards.gems) {
            console.log(`💎 +${data.levelUp.rewards.gems} gems received!`);
          }
        }
      }
      
      // Reload user data after game to sync XP
      const { loadUser } = useUserStore.getState();
      loadUser().catch(() => console.warn('Failed to reload user data'));
      
      // If challenges have been completed, store them for animation on home screen
      if (data.completedChallenges) {
        console.log('Completed challenges:', data.completedChallenges);
        
        // Completed challenges are now handled automatically by coin animation
      }
    },
    onError: (error) => {
      console.error('Error updating statistics:', error);
    },
  });

  // Extract bet amount and mode from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    const mode = urlParams.get('mode') || "classic";
    
    setGameMode(mode as "classic" | "high-stakes" | "all-in");
    
    if (betAmount) {
      setBet(parseInt(betAmount));
    } else {
      // If no bet, return to the right page according to mode  
      if (mode === "all-in") {
        navigate("/play/all-in");
      } else if (mode === "high-stakes") {
        navigate("/play/high-stakes");
      } else {
        navigate("/play/classic");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (bet > 0) {
      // 🔒 SECURITY: All-in mode uses DIFFERENT flow - NO dealInitialCards
      if (gameMode === "all-in") {
        console.log("🔒 All-in mode detected: Using secure server-authoritative system");
        // Configure mode and start game, but let BlackjackTable handle secure card dealing
        setMode("all-in");
        startGame("all-in");
        // CRITICAL: Do NOT call dealInitialCards in All-in mode
      } else {
        // Normal modes (classic/high-stakes) use client-side dealing
        setMode(gameMode === "high-stakes" ? "high-stakes" : "classic");
        startGame("cash");
        dealInitialCards(bet);
      }
    }
  }, [setMode, startGame, dealInitialCards, bet, gameMode]);

  // Calculate winnings and display result animation with delay
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult) {
      // Wait 4 seconds to see dealer reveal cards before animation
      const delayTimer = setTimeout(() => {
        let winnings = 0;
        let type: "win" | "loss" | "tie" | "blackjack" = "loss";
      
      // Check if it's a natural blackjack (2 cards that make 21)
      const playerHandValue = playerHand.reduce((sum, card) => {
        if (card.value === 'A') return sum + 11;
        if (['K', 'Q', 'J'].includes(card.value)) return sum + 10;
        return sum + parseInt(card.value);
      }, 0);
      const isPlayerBlackjack = playerHand.length === 2 && playerHandValue === 21;
      
      if (result === "win" && isPlayerBlackjack) {
        // Natural blackjack = currentBet × 2.5 in High Stakes, × 2.5 in Classic
        winnings = gameMode === "high-stakes" ? currentBet * 2.5 : currentBet * 2.5;
        type = "blackjack";
      } else if (result === "win") {
        // Normal win = currentBet × 2 in High Stakes, × 2 in Classic  
        winnings = gameMode === "high-stakes" ? currentBet * 2 : currentBet * 2;
        type = "win";
      } else if (result === "push") {
        // Tie = recover currentBet
        winnings = currentBet;
        type = "tie";
      } else if (result === "lose") {
        // Loss = nothing (currentBet already deducted)
        winnings = 0;
        type = "loss";
      }

      // Apply streak multiplier for 21 Streak mode (high-stakes) - only for streaks >= 2
      if (gameMode === "high-stakes" && (type === "win" || type === "blackjack") && winnings > 0) {
        const currentStreak = user?.currentStreak21 || 0;
        // Only apply streak bonus for streaks of 2 or more
        if (currentStreak >= 2) {
          const streakMultiplier = Math.min(currentStreak, 10); // 2x to 10x cap
          winnings = Math.floor(winnings * streakMultiplier);
          
          // Log streak bonus for debugging
          console.log(`21 Streak bonus applied: ${streakMultiplier}x multiplier (streak: ${currentStreak})`);
        }
      }
      
        // Add winnings to balance
        if (winnings > 0) {
          addWinnings(winnings);
        }

        // Post statistics to update challenges
        postStatsMutation.mutate({
          gameType: gameMode === "high-stakes" ? "high-stakes" : "classic",
          handsPlayed: 1,
          handsWon: result === "win" ? 1 : 0,
          blackjacks: type === "blackjack" ? 1 : 0,
          totalWinnings: winnings,
          totalLosses: winnings === 0 ? currentBet : 0,
        });
        
        // Display animation
        setResultType(type);
        setFinalWinnings(winnings);
        setShowResult(true);
      }, 2000); // 2 second delay to see dealer reveal cards
      
      return () => clearTimeout(delayTimer);
    }
  }, [gameState, result, showResult, currentBet, playerHand, addWinnings, resetGame, navigate]);

  if (bet === 0) {
    return null; // Wait for bet to be set
  }

  const getResultAnimation = () => {
    if (!resultType) return {};
    
    switch (resultType) {
      case "win":
        return {
          text: "WIN",
          color: "text-green-400",
          bgColor: "bg-green-500/20",
          scale: [1, 1.1, 1],
        };
      case "blackjack":
        return {
          text: "BLACKJACK !",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          scale: [1, 1.2, 1],
        };
      case "tie":
        return {
          text: "Push",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          scale: [1, 1.05, 1],
        };
      case "loss":
        return {
          text: "LOSE",
          color: "text-red-400",
          bgColor: "bg-red-500/20",
          scale: [1, 0.9, 1],
        };
      default:
        return {};
    }
  };

  const resultAnimation = getResultAnimation();

  return (
    <div className="relative">
      <BlackjackTable 
        gameMode={gameMode === "all-in" ? "all-in" : "cash"} 
        playMode={gameMode === "all-in" ? "classic" : gameMode} 
      />
      
      {/* Full screen result animation */}
      <AnimatePresence>
        {showResult && resultAnimation.text && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAnimation}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <div className="relative">
              
              <motion.div
                initial={{ scale: 0, rotate: -5 }}
                animate={{ 
                  scale: 1,
                  rotate: 0,
                  transition: { 
                    duration: 0.4,
                    type: "spring",
                    bounce: 0.3
                  }
                }}
                className={`${resultAnimation.bgColor} px-8 py-6 rounded-2xl border border-white/20 shadow-xl max-w-sm mx-4`}
              >
                <motion.h1
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.1 }
                  }}
                  className={`text-4xl font-bold ${resultAnimation.color} text-center mb-4`}
                >
                  {resultAnimation.text}
                </motion.h1>
                
                {/* Dealer and player scores */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.2 }
                  }}
                  className="grid grid-cols-2 gap-4 mb-4"
                >
                  <div className="bg-red-500/20 rounded-xl p-3 text-center">
                    <p className="text-white/60 text-sm">Dealer</p>
                    <p className="text-white font-bold text-2xl">{dealerTotal}</p>
                  </div>
                  <div className="bg-green-500/20 rounded-xl p-3 text-center">
                    <p className="text-white/60 text-sm">You</p>
                    <p className="text-green-400 font-bold text-2xl">{playerTotal}</p>
                  </div>
                </motion.div>
                
                {/* Display winnings or losses */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.3 }
                  }}
                  className="text-white text-lg text-center mb-3"
                >
                  {resultType === "win" || resultType === "blackjack" ? 
                    `+${finalWinnings.toLocaleString()}` :
                   resultType === "tie" ?
                    `+${currentBet.toLocaleString()}` :
                   `-${currentBet.toLocaleString()}`} chips
                </motion.p>
                
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}