import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PlayingCard from "../card";
import { Card } from "@/lib/blackjack/engine";

interface HandCardsProps {
  cards: Card[];
  faceDownIndices?: number[];
  variant: "dealer" | "player";
  highlightTotal?: boolean;
  total?: number;
  className?: string;
}

export default function HandCards({
  cards,
  faceDownIndices = [],
  variant,
  highlightTotal = false,
  total,
  className
}: HandCardsProps) {
  const isDealer = variant === "dealer";
  const hasMultipleCards = cards.length >= 5;
  
  // Fonction pour calculer la taille et l'espacement des cartes
  const getCardSize = (index: number) => {
    if (!hasMultipleCards) {
      return "w-16 h-24"; // Taille normale
    }
    
    // Si c'est la dernière carte (la plus récente), garder la taille normale
    if (index === cards.length - 1) {
      return "w-16 h-24";
    }
    
    // Pour les anciennes cartes, réduire la taille
    return "w-12 h-18";
  };
  
  const getSpacing = () => {
    if (!hasMultipleCards) {
      return "space-x-3"; // Espacement normal
    }
    return "space-x-1"; // Espacement réduit pour faire de la place
  };
  
  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-4 px-6", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Cards */}
      <div className={cn("flex justify-center", getSpacing())}>
        <AnimatePresence>
          {cards.map((card, index) => (
            <motion.div
              key={`${variant}-${index}`}
              initial={{ 
                y: isDealer ? -100 : 100, 
                opacity: 0, 
                rotateY: 180 
              }}
              animate={{ 
                y: 0, 
                opacity: 1, 
                rotateY: 0 
              }}
              transition={{ 
                delay: index * 0.2, 
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
                suit={card.suit}
                value={card.value}
                isHidden={faceDownIndices.includes(index)}
                className={getCardSize(index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Total Badge */}
      {highlightTotal && total !== undefined && (
        <motion.div
          className="rounded-2xl px-4 py-2"
          style={{ backgroundColor: '#232227' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>
            {total}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}