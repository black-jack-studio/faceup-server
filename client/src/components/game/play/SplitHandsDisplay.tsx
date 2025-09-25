import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/lib/blackjack/engine";
import PlayingCard from "@/components/PlayingCard";

interface SplitHand {
  hand: Card[];
  total: number;
  result: 'win' | 'lose' | 'push' | null;
  isActive: boolean;
  isComplete: boolean;
}

interface SplitHandsDisplayProps {
  splitHands: SplitHand[];
  currentSplitHand: number;
  showSplitAnimation: boolean;
  originalCards: Card[];
  cardBackUrl?: string | null;
}

export default function SplitHandsDisplay({
  splitHands,
  currentSplitHand,
  showSplitAnimation,
  originalCards,
  cardBackUrl
}: SplitHandsDisplayProps) {

  if (showSplitAnimation && originalCards.length === 2) {
    // Show split animation
    return (
      <div className="relative flex items-center justify-center h-32 w-full">
        <AnimatePresence>
          {/* Left card animation */}
          <motion.div
            key="left-card"
            initial={{ x: 0, y: 0 }}
            animate={{ x: -120, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute z-10"
          >
            <PlayingCard 
              rank={originalCards[0].value} 
              suit={originalCards[0].suit}
              size="sm"
            />
          </motion.div>
          
          {/* Right card animation */}
          <motion.div
            key="right-card"
            initial={{ x: 0, y: 0 }}
            animate={{ x: 120, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute z-10"
          >
            <PlayingCard 
              rank={originalCards[1].value} 
              suit={originalCards[1].suit}
              size="sm"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Show split hands side by side
  return (
    <div className="flex items-start justify-center gap-8 w-full">
      {splitHands.map((hand, index) => (
        <motion.div
          key={`split-hand-${index}`}
          className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
            hand.isActive 
              ? 'border-accent-purple bg-accent-purple/10 shadow-lg' 
              : hand.isComplete
                ? hand.result === 'win' 
                  ? 'border-green-500 bg-green-500/10'
                  : hand.result === 'lose'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-yellow-500 bg-yellow-500/10'
                : 'border-white/20 bg-white/5'
          }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.2 }}
        >
          {/* Hand label */}
          <div className="text-white text-sm font-medium mb-2">
            Hand {index + 1}
            {hand.isActive && (
              <motion.span 
                className="ml-2 text-accent-purple"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ▲
              </motion.span>
            )}
          </div>
          
          {/* Cards */}
          <div className="flex space-x-2 mb-2">
            <AnimatePresence>
              {hand.hand.map((card, cardIndex) => (
                <motion.div
                  key={`hand-${index}-card-${cardIndex}`}
                  initial={{ 
                    y: 100, 
                    opacity: 0, 
                    rotateY: 180 
                  }}
                  animate={{ 
                    y: 0, 
                    opacity: 1, 
                    rotateY: 0 
                  }}
                  transition={{ 
                    delay: cardIndex * 0.1, 
                    duration: 0.6,
                    type: "spring",
                    stiffness: 120
                  }}
                  className="transition-transform duration-150 ease-out will-change-transform"
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.15 }
                  }}
                >
                  <PlayingCard 
                    rank={card.value} 
                    suit={card.suit}
                    size="xs"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Hand total */}
          <div className="text-white text-lg font-bold">
            {hand.total}
          </div>
          
          {/* Result indicator */}
          {hand.isComplete && hand.result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-medium mt-1 ${
                hand.result === 'win' 
                  ? 'text-green-400' 
                  : hand.result === 'lose'
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}
            >
              {hand.result === 'win' ? 'WIN' : hand.result === 'lose' ? 'LOSE' : 'PUSH'}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}