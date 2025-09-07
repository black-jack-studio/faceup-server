import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import DealerHeader from "@/components/game/play/DealerHeader";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
import BetBadge from "@/components/game/play/BetBadge";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const [gameStarted, setGameStarted] = useState(false);
  const [totalBet, setTotalBet] = useState(0);
  const [chipCounts, setChipCounts] = useState({ 25: 0, 50: 0, 100: 0, 500: 0 });

  const { 
    setMode, 
    startGame, 
    dealInitialCards,
    gameState, 
    playerHand, 
    dealerHand, 
    playerTotal, 
    dealerTotal,
    bet,
    canDouble,
    canSplit,
    canSurrender,
    hit,
    stand,
    double,
    split,
    surrender,
    resetGame
  } = useGameStore();
  
  const user = useUserStore((state) => state.user);

  // Betting options with colors matching Offsuit theme - only 25, 50, 100, 500
  const bettingOptions = [
    { amount: 25, color: "bg-gradient-to-br from-[#F8CA5A] to-yellow-400", label: "25" },
    { amount: 50, color: "bg-gradient-to-br from-red-500 to-red-700", label: "50" },
    { amount: 100, color: "bg-gradient-to-br from-[#B79CFF] to-purple-700", label: "100" },
    { amount: 500, color: "bg-gradient-to-br from-[#8CCBFF] to-blue-700", label: "500" },
  ];

  useEffect(() => {
    setMode("classic");
    startGame("cash");
  }, [setMode, startGame]);

  // Reset game and return to betting when game is over
  useEffect(() => {
    if (gameState === "gameOver") {
      setTimeout(() => {
        setGameStarted(false);
        setTotalBet(0);
        setChipCounts({ 25: 0, 50: 0, 100: 0, 500: 0 });
        resetGame();
      }, 3000); // Show result for 3 seconds then return to betting
    }
  }, [gameState, resetGame]);

  const handleChipClick = (chipValue: number) => {
    if (canAfford(chipValue) && (totalBet + chipValue) <= (user?.coins || 0)) {
      setChipCounts(prev => ({
        ...prev,
        [chipValue]: prev[chipValue as keyof typeof prev] + 1
      }));
      setTotalBet(prev => prev + chipValue);
    }
  };

  const handleValidateBet = () => {
    if (totalBet > 0) {
      dealInitialCards(totalBet);
      setGameStarted(true);
    }
  };

  const resetBet = () => {
    setTotalBet(0);
    setChipCounts({ 25: 0, 50: 0, 100: 0, 500: 0 });
  };

  const handlePlayerAction = (action: string) => {
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

  const canAfford = (amount: number) => {
    return user && user.coins !== null && user.coins !== undefined && user.coins >= amount;
  };

  const canAffordAction = (amount: number) => {
    return user && user.coins !== null && user.coins !== undefined && user.coins >= amount;
  };

  return (
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header */}
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
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">Classic 21</h1>
            <div className="w-8"></div>
          </motion.div>
        </div>

        {/* Betting Phase */}
        {!gameStarted && (
          <div className="flex flex-col h-full min-h-screen pt-20">
            {/* Balance and Current Bet Display */}
            <div className="flex-1 flex flex-col justify-center items-center px-6">
              <motion.div
                className="bg-[#13151A] rounded-3xl p-8 ring-1 ring-white/10 text-center w-full max-w-sm mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-16 h-16 bg-[#F8CA5A]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-8 h-8 text-[#F8CA5A]" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Votre Solde</h3>
                <p className="text-[#F8CA5A] font-bold text-3xl mb-4">
                  {user?.coins?.toLocaleString() || "0"}
                </p>
                
                {totalBet > 0 && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-1">Mise Totale</p>
                    <p className="text-[#B5F3C7] font-bold text-2xl">{totalBet}</p>
                    {/* Affichage détaillé des jetons */}
                    <div className="flex justify-center gap-1 mt-2">
                      {Object.entries(chipCounts).map(([value, count]) => 
                        count > 0 && (
                          <span key={value} className="text-xs text-white/60 bg-white/10 rounded-full px-2 py-1">
                            {count}x{value}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
              
              <div className="flex gap-3 w-full max-w-sm mb-8">
                {totalBet > 0 && (
                  <motion.button
                    onClick={resetBet}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-4 rounded-2xl text-lg border border-red-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-reset-bet"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    Effacer
                  </motion.button>
                )}
                
                {totalBet > 0 && (
                  <motion.button
                    onClick={handleValidateBet}
                    className={`${totalBet > 0 ? 'flex-2' : 'flex-1'} bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold py-4 rounded-2xl text-lg`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-validate"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    Valider
                  </motion.button>
                )}
              </div>
            </div>
            
            {/* Chip Selection at Bottom */}
            <div className="bg-[#13151A]/80 backdrop-blur-sm p-6 rounded-t-3xl">
              <p className="text-white/60 text-center text-sm mb-4">Choisissez votre mise</p>
              <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto">
                {bettingOptions.map((option) => (
                  <motion.button
                    key={option.amount}
                    onClick={() => handleChipClick(option.amount)}
                    disabled={!canAfford(option.amount) || (totalBet + option.amount) > (user?.coins || 0)}
                    className={`relative w-16 h-16 mx-auto rounded-full border-4 transition-all ${
                      canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0)
                        ? `${option.color} border-white/20 hover:scale-105 hover:border-white/40 active:scale-95`
                        : "bg-gray-400/20 cursor-not-allowed opacity-50 border-white/10"
                    }`}
                    whileHover={canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0) ? { scale: 1.05 } : {}}
                    whileTap={canAfford(option.amount) && (totalBet + option.amount) <= (user?.coins || 0) ? { scale: 0.95 } : {}}
                    data-testid={`chip-${option.amount}`}
                  >
                    <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{option.label}</span>
                    </div>
                    {chipCounts[option.amount as keyof typeof chipCounts] > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#B5F3C7] text-[#0B0B0F] rounded-full flex items-center justify-center text-xs font-bold">
                        {chipCounts[option.amount as keyof typeof chipCounts]}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Game Phase */}
        {gameStarted && (
          <div className="flex flex-col h-full min-h-screen pt-20">
            {/* TOP: Dealer Section */}
            <div className="flex-1 flex flex-col justify-start min-h-0">
              <DealerHeader
                name="Dealer"
                total={gameState === "playing" && dealerHand[1] ? undefined : dealerTotal}
                className="mb-4"
              />
              
              <div className="flex justify-center">
                <HandCards
                  cards={dealerHand}
                  faceDownIndices={gameState === "playing" ? [1] : []}
                  variant="dealer"
                />
              </div>
            </div>

            {/* BOTTOM: Player Section */}
            <div className="flex flex-col gap-3 p-4 pb-8 bg-gradient-to-t from-[#0B0B0F]/80 to-transparent">
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

                <BetBadge amount={bet} />
              </div>

              {/* Player Cards */}
              <HandCards
                cards={playerHand}
                variant="player"
                highlightTotal={true}
                total={playerTotal}
              />

              {/* Action Buttons */}
              {gameState === "playing" && (
                <ActionBar
                  canHit={true}
                  canStand={true}
                  canDouble={(canDouble ?? false) && canAffordAction(bet)}
                  canSplit={(canSplit ?? false) && canAffordAction(bet)}
                  canSurrender={canSurrender ?? false}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                />
              )}

              {/* Game Over Display */}
              {gameState === "gameOver" && (
                <motion.div
                  className="bg-[#13151A] rounded-2xl ring-1 ring-white/10 p-6 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-white text-xl font-bold mb-4">Game Over</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-500/20 rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">Dealer</p>
                      <p className="text-white font-bold text-lg" data-testid="dealer-total">{dealerTotal}</p>
                    </div>
                    <div className="bg-[#B5F3C7]/20 rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">You</p>
                      <p className="text-[#B5F3C7] font-bold text-lg">{playerTotal}</p>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm">Nouvelle partie dans quelques secondes...</p>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}