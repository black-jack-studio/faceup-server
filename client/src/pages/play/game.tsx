import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import BlackjackTable from "@/components/game/blackjack-table";

export default function GameMode() {
  const [, navigate] = useLocation();
  const [bet, setBet] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win" | "loss" | "tie" | "blackjack" | null>(null);
  const { setMode, startGame, dealInitialCards, gameState, resetGame, playerHand, dealerHand, result } = useGameStore();
  const { addWinnings } = useChipsStore();

  // Extraire le montant de la mise depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    if (betAmount) {
      setBet(parseInt(betAmount));
    } else {
      // Si pas de mise, retourner à la page de mise
      navigate("/play/classic");
    }
  }, [navigate]);

  useEffect(() => {
    if (bet > 0) {
      setMode("classic");
      startGame("cash");
      dealInitialCards(bet);
    }
  }, [setMode, startGame, dealInitialCards, bet]);

  // Calculer les gains et afficher l'animation de résultat
  useEffect(() => {
    if (gameState === "gameOver" && result && !showResult) {
      let winnings = 0;
      let type: "win" | "loss" | "tie" | "blackjack" = "loss";
      
      // Vérifier si c'est un blackjack naturel
      const isPlayerBlackjack = playerHand.length === 2 && playerHand.reduce((sum, card) => sum + (card.value === 'A' ? 11 : (card.value === 'K' || card.value === 'Q' || card.value === 'J' ? 10 : parseInt(card.value))), 0) === 21;
      
      if (result === "win" && isPlayerBlackjack) {
        // Blackjack naturel = mise × 2.5
        winnings = bet * 2.5;
        type = "blackjack";
      } else if (result === "win") {
        // Victoire normale = mise × 2
        winnings = bet * 2;
        type = "win";
      } else if (result === "push") {
        // Égalité = récupérer la mise
        winnings = bet;
        type = "tie";
      } else {
        // Perte = rien (mise déjà déduite)
        winnings = 0;
        type = "loss";
      }
      
      // Ajouter les gains au solde
      if (winnings > 0) {
        addWinnings(winnings);
      }
      
      // Afficher l'animation
      setResultType(type);
      setShowResult(true);
      
      // Retourner à la page de mise après l'animation
      const timer = setTimeout(() => {
        setShowResult(false);
        setResultType(null);
        resetGame();
        navigate("/play/classic");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, result, showResult, bet, addWinnings, resetGame, navigate]);

  if (bet === 0) {
    return null; // Attendre que la mise soit définie
  }

  const getResultAnimation = () => {
    if (!resultType) return {};
    
    switch (resultType) {
      case "win":
        return {
          text: "VICTOIRE !",
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
          text: "ÉGALITÉ",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          scale: [1, 1.05, 1],
        };
      case "loss":
        return {
          text: "PERDU !",
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
      <BlackjackTable gameMode="cash" />
      
      {/* Animation de résultat plein écran */}
      <AnimatePresence>
        {showResult && resultAnimation.text && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ 
                scale: resultAnimation.scale,
                rotate: 0,
                transition: { 
                  scale: { 
                    times: [0, 0.5, 1],
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse"
                  },
                  rotate: { duration: 0.3 }
                }
              }}
              className={`${resultAnimation.bgColor} px-12 py-8 rounded-3xl border-2 border-white/20 shadow-2xl`}
            >
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { delay: 0.2 }
                }}
                className={`text-6xl font-bold ${resultAnimation.color} text-center tracking-wider`}
              >
                {resultAnimation.text}
              </motion.h1>
              {resultType !== "loss" && (
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.5 }
                  }}
                  className="text-white text-xl text-center mt-4"
                >
                  {resultType === "blackjack" ? `+${(bet * 2.5).toLocaleString()}` :
                   resultType === "win" ? `+${(bet * 2).toLocaleString()}` :
                   `+${bet.toLocaleString()}`} jetons
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}