import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PlayingCard from "../card";
import { Card } from "@/lib/blackjack/engine";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

interface HandCardsProps {
  cards: Card[];
  faceDownIndices?: number[];
  variant: "dealer" | "player";
  highlightTotal?: boolean;
  total?: number;
  className?: string;
  cardBackUrl?: string | null;
  showPositionedTotal?: boolean;
}

export default function HandCards({
  cards,
  faceDownIndices = [],
  variant,
  highlightTotal = false,
  total,
  className,
  cardBackUrl,
  showPositionedTotal = false
}: HandCardsProps) {
  const isDealer = variant === "dealer";
  const shouldStack = cards.length > 3;
  const user = useUserStore((state) => state.user);
  
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();
  
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
      isSecondRow && "absolute top-16 left-1/2 transform -translate-x-1/2 z-10"
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
        {/* Total positionné pour le joueur (au-dessus et au milieu des cartes) */}
        {showPositionedTotal && variant === "player" && total !== undefined && total > 0 && (
          <motion.div
            className="absolute -top-16 left-16 bg-[#232227] rounded-2xl px-4 py-2 z-30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <span className="font-semibold text-lg text-white">
              {total}
            </span>
          </motion.div>
        )}
        
        {/* Total positionné pour le dealer (entre les deux cartes) */}
        {showPositionedTotal && variant === "dealer" && total !== undefined && total > 0 && (
          <motion.div
            className="absolute -bottom-16 left-[45%] transform -translate-x-1/2 bg-[#232227] rounded-2xl px-4 py-2 z-30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <span className="font-semibold text-lg text-white">
              {total}
            </span>
          </motion.div>
        )}
        
        
        
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