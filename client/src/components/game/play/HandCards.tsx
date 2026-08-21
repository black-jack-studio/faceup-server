import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PlayingCard from "../card";
import { CardSize } from "@/components/PlayingCard";
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

// Actual rendered width (px) of each CardSize this component ever picks — kept in sync
// with PlayingCard's own sizeMap (client/src/components/PlayingCard.tsx).
const CARD_WIDTH: Record<CardSize, number> = { xs: 40, sm: 80, friend: 96, md: 96, lg: 120 };

// Cards always fan with the same constant overlap, from the 2nd card on — not just once a
// hand gets too wide to fit. The step (distance between each card's left edge) is a fixed
// fraction of the card's own width. At "sm" the suit icon alone runs from a 12px inset out to
// 44px (see PlayingCard's CardFace), so anything tighter than ~0.55 clips it — 0.65 leaves
// clear headroom for that plus two-digit ranks ("10").
const OVERLAP_RATIO = 0.65;
function computeCardStep(cardWidth: number) {
  return cardWidth * OVERLAP_RATIO;
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
  const user = useUserStore((state) => state.user);

  const currentAvatar = user?.selectedAvatarId ?
    getAvatarById(user.selectedAvatarId) :
    getDefaultAvatar();

  // PlayingCard sizes width/height via an inline style keyed off `size`, which always wins
  // over any width/height className passed alongside it — so the card shrinks as the hand
  // grows only if we pick a smaller `size`, not by tweaking classNames here.
  const cardSize: CardSize = cards.length >= 6 ? "xs" : "sm";
  const cardWidth = CARD_WIDTH[cardSize];
  const step = computeCardStep(cardWidth);

  const renderCardRow = (rowCards: Card[]) => (
    <div className="flex items-center">
      <AnimatePresence>
        {rowCards.map((card, cardIndex) => (
          <motion.div
            key={`${variant}-${cardIndex}`}
            style={{ marginLeft: cardIndex > 0 ? step - cardWidth : 0, position: "relative", zIndex: cardIndex }}
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
              size={cardSize}
              cardBackUrl={cardBackUrl}
            />
          </motion.div>
        ))}
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
      <div className="relative flex flex-col items-center">
        {/* Total positionné pour le joueur (au-dessus et au milieu des cartes) */}
        {showPositionedTotal && variant === "player" && total !== undefined && total > 0 && (
          <div className="absolute inset-x-0 -top-16 flex justify-center pointer-events-none z-30">
            <motion.div
              className="bg-[#232227] rounded-2xl px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              layout="position"
            >
              <span className="font-semibold text-lg text-white">
                {total}
              </span>
            </motion.div>
          </div>
        )}
        
        {/* Total positionné pour le dealer (en bas et au milieu des cartes) */}
        {showPositionedTotal && variant === "dealer" && total !== undefined && total > 0 && (
          <div className="absolute inset-x-0 -bottom-16 flex justify-center pointer-events-none z-30">
            <motion.div
              className="bg-[#232227] rounded-2xl px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              layout="position"
            >
              <span className="font-semibold text-lg text-white">
                {total}
              </span>
            </motion.div>
          </div>
        )}
        
        
        
        {renderCardRow(cards)}
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