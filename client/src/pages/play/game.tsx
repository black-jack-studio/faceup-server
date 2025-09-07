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
  
  const closeAnimation = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    navigate("/play/classic");
  };
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

  // Calculer les gains et afficher l'animation de résultat avec délai
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult) {
      // Attendre 2 secondes pour voir les scores avant l'animation
      const delayTimer = setTimeout(() => {
        let winnings = 0;
        let type: "win" | "loss" | "tie" | "blackjack" = "loss";
      
      // Vérifier si c'est un blackjack naturel (2 cartes qui font 21)
      const playerHandValue = playerHand.reduce((sum, card) => {
        if (card.value === 'A') return sum + 11;
        if (['K', 'Q', 'J'].includes(card.value)) return sum + 10;
        return sum + parseInt(card.value);
      }, 0);
      const isPlayerBlackjack = playerHand.length === 2 && playerHandValue === 21;
      
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
      } else if (result === "lose") {
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
          closeAnimation();
        }, 2000);
        
        return () => clearTimeout(timer);
      }, 2000); // Délai de 2 secondes pour voir les scores
      
      return () => clearTimeout(delayTimer);
    }
  }, [gameState, result, showResult, bet, playerHand, addWinnings, resetGame, navigate]);

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
            <div className="relative">
              {/* Bouton de fermeture à l'extérieur */}
              <button
                onClick={closeAnimation}
                className="absolute -top-12 right-0 text-white/80 hover:text-white text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                ×
              </button>
              
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
                  className={`text-4xl font-bold ${resultAnimation.color} text-center`}
                >
                  {resultAnimation.text}
                </motion.h1>
                {resultType !== "loss" && (
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ 
                      y: 0, 
                      opacity: 1,
                      transition: { delay: 0.2 }
                    }}
                    className="text-white text-lg text-center mt-2"
                  >
                    {resultType === "blackjack" ? `+${(bet * 2.5).toLocaleString()}` :
                     resultType === "win" ? `+${(bet * 2).toLocaleString()}` :
                     `+${bet.toLocaleString()}`} jetons
                  </motion.p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}