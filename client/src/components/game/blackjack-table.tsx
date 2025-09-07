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

  const optimalMove = getOptimalMove();

  useEffect(() => {
    if (gameState === "betting") {
      dealInitialCards(gameMode === "cash" ? 25 : 0); // Default bet for cash games
    }
  }, [gameState, dealInitialCards, gameMode]);

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
    dealInitialCards(gameMode === "cash" ? 25 : 0);
  };

  const canAfford = (amount: number) => {
    return gameMode === "practice" || (user && user.coins >= amount);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mr-3 text-white hover:bg-muted"
              data-testid="button-leave-table"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">
              {gameMode === "practice" ? "Practice" : "Cash Game"}
            </h1>
          </div>
          
          {gameMode === "practice" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOptimalMove(!showOptimalMove)}
              className={`border-border ${showOptimalMove ? 'bg-primary text-white' : 'text-white'}`}
              data-testid="button-toggle-hints"
            >
              {showOptimalMove ? "Hide" : "Show"} Hints
            </Button>
          )}
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">Bet</p>
              <p className="text-white font-semibold" data-testid="current-bet">
                {gameMode === "cash" ? bet : "Practice"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">Balance</p>
              <p className="text-white font-semibold" data-testid="current-balance">
                {gameMode === "cash" ? user?.coins?.toLocaleString() : "∞"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">Deck</p>
              <p className="text-white font-semibold">6D S17</p>
            </CardContent>
          </Card>
        </div>

        {/* Dealer Hand */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Dealer</h3>
            <span className="text-muted-foreground text-sm" data-testid="dealer-total">
              {gameState === "playing" && dealerHand[1] ? "?" : dealerTotal}
            </span>
          </div>
          <div className="flex space-x-2 justify-center">
            <AnimatePresence>
              {dealerHand.map((card, index) => (
                <motion.div
                  key={`dealer-${index}`}
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.2 }}
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

        {/* Player Hand */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">You</h3>
            <span className="text-white font-semibold" data-testid="player-total">
              {playerTotal}
            </span>
          </div>
          <div className="flex space-x-2 justify-center">
            <AnimatePresence>
              {playerHand.map((card, index) => (
                <motion.div
                  key={`player-${index}`}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: (dealerHand.length + index) * 0.2 }}
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

        {/* Optimal Move Hint */}
        {showOptimalMove && gameState === "playing" && (
          <motion.div
            className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-blue-400 text-sm text-center">
              <i className="fas fa-lightbulb mr-2" />
              Optimal move: <span className="font-semibold">{optimalMove?.toUpperCase()}</span>
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        {gameState === "playing" && (
          <motion.div
            className="grid grid-cols-2 gap-3 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={() => handlePlayerAction("hit")}
              className="bg-primary hover:bg-primary/80 text-white"
              data-testid="button-hit"
            >
              Hit
            </Button>
            <Button
              onClick={() => handlePlayerAction("stand")}
              className="bg-secondary hover:bg-secondary/80 text-white"
              data-testid="button-stand"
            >
              Stand
            </Button>
            {canDouble && (
              <Button
                onClick={() => handlePlayerAction("double")}
                disabled={!canAfford(bet)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                data-testid="button-double"
              >
                Double
              </Button>
            )}
            {canSplit && (
              <Button
                onClick={() => handlePlayerAction("split")}
                disabled={!canAfford(bet)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-split"
              >
                Split
              </Button>
            )}
            {canSurrender && (
              <Button
                onClick={() => handlePlayerAction("surrender")}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-surrender"
              >
                Surrender
              </Button>
            )}
          </motion.div>
        )}

        {/* Game Over */}
        {gameState === "gameOver" && (
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-4 bg-card border-border rounded-lg">
              <p className="text-white text-lg font-semibold mb-2">
                Game Over
              </p>
              <p className="text-muted-foreground text-sm">
                Dealer: {dealerTotal} • You: {playerTotal}
              </p>
            </div>
            
            <Button
              onClick={handleNewGame}
              className="w-full bg-primary hover:bg-primary/80 text-white"
              data-testid="button-new-game"
            >
              New Hand
            </Button>
          </motion.div>
        )}

        {/* Keyboard Shortcuts */}
        <div className="mt-8 p-3 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground text-xs text-center">
            Shortcuts: H (Hit) • S (Stand) • D (Double) • P (Split) • R (Surrender)
          </p>
        </div>
      </div>
    </div>
  );
}
