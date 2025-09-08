import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BlackjackTable from "@/components/game/blackjack-table";

export default function GameMode() {
  const [, navigate] = useLocation();
  const [bet, setBet] = useState(0);
  const [gameMode, setGameMode] = useState<"classic" | "high-stakes">("classic");
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win" | "loss" | "tie" | "blackjack" | null>(null);
  const queryClient = useQueryClient();
  
  const closeAnimation = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    // Rediriger vers la bonne page selon le mode
    if (gameMode === "high-stakes") {
      navigate("/play/high-stakes");
    } else {
      navigate("/play/classic");
    }
  };
  const { setMode, startGame, dealInitialCards, gameState, resetGame, playerHand, dealerHand, result, playerTotal, dealerTotal } = useGameStore();
  const { addWinnings } = useChipsStore();

  // Mutation pour poster les statistiques de jeu
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
      // Invalider le cache des défis pour les mettre à jour immédiatement
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/user'] });
      
      // Si des défis ont été complétés, les stocker pour l'animation à l'accueil
      if (data.completedChallenges) {
        console.log('Défis complétés:', data.completedChallenges);
        
        // Les défis terminés sont maintenant gérés automatiquement par l'animation des coins
      }
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour des statistiques:', error);
    },
  });

  // Extraire le montant de la mise et le mode depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    const mode = urlParams.get('mode') || "classic";
    
    setGameMode(mode as "classic" | "high-stakes");
    
    if (betAmount) {
      setBet(parseInt(betAmount));
    } else {
      // Si pas de mise, retourner à la bonne page selon le mode
      if (mode === "high-stakes") {
        navigate("/play/high-stakes");
      } else {
        navigate("/play/classic");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (bet > 0) {
      // Configurer le mode de jeu selon le gameMode détecté
      setMode(gameMode === "high-stakes" ? "high-stakes" : "classic");
      startGame("cash");
      dealInitialCards(bet);
    }
  }, [setMode, startGame, dealInitialCards, bet, gameMode]);

  // Calculer les gains et afficher l'animation de résultat avec délai
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult) {
      // Attendre 4 secondes pour voir le dealer révéler ses cartes avant l'animation
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
        // Blackjack naturel = mise × 4 en High Stakes (mise + triple), × 2.5 en Classic
        winnings = gameMode === "high-stakes" ? bet * 4 : bet * 2.5;
        type = "blackjack";
      } else if (result === "win") {
        // Victoire normale = mise × 4 en High Stakes (mise + triple), × 2 en Classic
        winnings = gameMode === "high-stakes" ? bet * 4 : bet * 2;
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

        // Poster les statistiques pour mettre à jour les défis
        postStatsMutation.mutate({
          gameType: gameMode === "high-stakes" ? "high-stakes" : "classic",
          handsPlayed: 1,
          handsWon: result === "win" ? 1 : 0,
          blackjacks: type === "blackjack" ? 1 : 0,
          totalWinnings: winnings,
          totalLosses: winnings === 0 ? bet : 0,
        });
        
        // Afficher l'animation
        setResultType(type);
        setShowResult(true);
        
        // Retourner à la page de mise après l'animation
        const timer = setTimeout(() => {
          closeAnimation();
        }, 2000);
        
        return () => clearTimeout(timer);
      }, 4000); // Délai de 4 secondes pour voir le dealer révéler ses cartes
      
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
      <BlackjackTable gameMode="cash" playMode={gameMode} />
      
      {/* Animation de résultat plein écran */}
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
                
                {/* Scores du dealer et joueur */}
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
                
                {resultType !== "loss" && (
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ 
                      y: 0, 
                      opacity: 1,
                      transition: { delay: 0.3 }
                    }}
                    className="text-white text-lg text-center"
                  >
                    {resultType === "blackjack" ? 
                      `+${(gameMode === "high-stakes" ? bet * 3 : bet * 1.5).toLocaleString()}` :
                     resultType === "win" ? 
                      `+${(gameMode === "high-stakes" ? bet * 3 : bet * 1).toLocaleString()}` :
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