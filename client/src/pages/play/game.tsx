import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
    // Redirect to respective betting page based on game mode
    if (gameMode === "all-in") {
      navigate("/play/all-in");
    } else if (gameMode === "high-stakes") {
      navigate("/play/high-stakes");
    } else {
      navigate("/play/classic");
    }
  };
  const { setMode, startGame, dealInitialCards, gameState, resetGame, playerHand, dealerHand, result, playerTotal, dealerTotal } = useGameStore();
  const currentBet = useGameStore((state) => state.bet); // ✅ Reactive selector for bet

  const [gameId, setGameId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  // Extract bet amount, mode, and gameId from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    const modeParam = urlParams.get('mode');
    const gameIdParam = urlParams.get('gameId');
    const streakParam = urlParams.get('streak');

    // Validate mode parameter to prevent invalid states
    const validModes = ["classic", "high-stakes", "all-in"];
    const mode = validModes.includes(modeParam || "") ? modeParam : "classic";

    setGameMode(mode as "classic" | "high-stakes" | "all-in");
    if (gameIdParam) setGameId(gameIdParam);
    if (streakParam) setStreak(parseInt(streakParam));

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
      // All modes now use the same client-side dealing flow
      if (gameMode === "all-in") {
        console.log("🎯 All-in mode: Using standard Classic 21 flow with special payouts");
        setMode("classic"); // Use classic mode for All-in
        startGame("cash"); // Use cash mode for coin handling
        dealInitialCards(bet);
      } else {
        // Classic and high-stakes modes
        setMode(gameMode === "high-stakes" ? "high-stakes" : "classic");
        startGame("cash"); // Use cash mode for all coin-based games
        dealInitialCards(bet);
      }
    }
  }, [setMode, startGame, dealInitialCards, bet, gameMode]);

  // Calculate winnings and display result animation with delay
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult && gameId) {
      // Wait 4 seconds to see dealer reveal cards before animation
      const delayTimer = setTimeout(async () => {
        console.log("🔍 DEBUG Game Result - Resolving on Server:");
        console.log("🔍 gameId:", gameId);
        console.log("🔍 result:", result);

        try {
          // Determine Result Type for UI
          const playerHandValue = playerHand.reduce((sum, card) => {
            if (card.value === 'A') return sum + 11;
            if (['K', 'Q', 'J'].includes(card.value)) return sum + 10;
            return sum + parseInt(card.value);
          }, 0);
          const isPlayerBlackjack = playerHand.length === 2 && playerHandValue === 21;

          let resultForServer: string = result;
          if (result === "win" && isPlayerBlackjack) {
            resultForServer = "blackjack";
          }

          // Call Server to Resolve Game
          // For Streak mode, we pass the multiplier (current streak + 2)
          const multiplier = gameMode === "high-stakes" ? streak + 2 : undefined;

          import("@/services/gameService").then(async ({ gameService }) => {
            const resolveResult = await gameService.resolveGame(gameId, resultForServer, multiplier);

            const payout = resolveResult.payout;
            const type = resultForServer === "blackjack" ? "blackjack" : result === "win" ? "win" : result === "push" ? "tie" : "loss";

            console.log(`💰 Server Payout: ${payout} (Net: ${resolveResult.netResult})`);

            // Update UI coins (optimistic or fetch)
            // The server already updated the user coins. We should invalidate cache or update store.
            queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });

            // Manually update store for immediate feedback if needed
            // We don't need addWinnings because server did it. 
            // But we MUST refresh the store to show the correct balance (even if 0 payout)
            const { loadUserCoins } = useUserStore.getState();
            loadUserCoins();

            // Display animation
            setResultType(type);
            setFinalWinnings(payout);
            setShowResult(true);
          });

        } catch (error) {
          console.error("Failed to resolve game:", error);
          // Handle error (maybe show toast)
        }
      }, 2000); // 2 second delay to see dealer reveal cards

      return () => clearTimeout(delayTimer);
    }
  }, [gameState, result, showResult, gameId, streak, gameMode, playerHand, queryClient]);

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
          bgColor: "bg-transparent",
          borderColor: "border-green-400",
          scale: [1, 1.1, 1],
        };
      case "blackjack":
        return {
          text: "BLACKJACK !",
          color: "text-yellow-400",
          bgColor: "bg-transparent",
          borderColor: "border-yellow-400",
          scale: [1, 1.2, 1],
        };
      case "tie":
        return {
          text: "Push",
          color: "text-yellow-400",
          bgColor: "bg-transparent",
          borderColor: "border-yellow-400",
          scale: [1, 1.05, 1],
        };
      case "loss":
        return {
          text: "LOSE",
          color: "text-red-400",
          bgColor: "bg-transparent",
          borderColor: "border-red-400",
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
                className={`${resultAnimation.bgColor} ${resultAnimation.borderColor} px-8 py-6 rounded-2xl border shadow-xl max-w-sm mx-4`}
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
                    <p className="font-bold text-2xl text-[#ffffff]">{playerTotal}</p>
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