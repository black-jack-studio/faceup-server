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
  cardBackUrl?: string | null;
}

export default function HandCards({
  cards,
  faceDownIndices = [],
  variant,
  highlightTotal = false,
  total,
  className,
  cardBackUrl
}: HandCardsProps) {
  const isDealer = variant === "dealer";
  const shouldStack = cards.length > 3;
  
  // Séparer les cartes en deux groupes : les 3 premières et les suivantes
  const firstRowCards = cards.slice(0, 3);
  const secondRowCards = cards.slice(3);
  
  // Fonction pour calculer la taille des cartes
  const getCardSize = () => {
    return "w-16 h-24"; // Taille uniforme pour toutes les cartes
  };
  
  const renderCardRow = (rowCards: Card[], startIndex: number, isSecondRow = false) => (
    <div className={cn(
      "flex justify-center space-x-3",
      isSecondRow && "absolute top-8 left-1/2 transform -translate-x-1/2 z-10"
    )}>
      <AnimatePresence>
        {rowCards.map((card, index) => {
          const cardIndex = startIndex + index;
          return (
            <motion.div
              key={`${variant}-${cardIndex}`}
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
                delay: cardIndex * 0.2, 
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
                isHidden={faceDownIndices.includes(cardIndex)}
                className={getCardSize()}
                cardBackUrl={cardBackUrl}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
  
  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-4 px-6", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Cards Container */}
      <div className="relative">
        {/* Première rangée (les 3 premières cartes) */}
        {renderCardRow(firstRowCards, 0)}
        
        {/* Deuxième rangée (cartes 4 et plus, empilées au-dessus) */}
        {shouldStack && secondRowCards.length > 0 && 
          renderCardRow(secondRowCards, 3, true)
        }
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