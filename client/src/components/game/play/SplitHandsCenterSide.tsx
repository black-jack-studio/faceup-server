import { motion } from "framer-motion";
import { Card } from "@/lib/blackjack/engine";
import PlayingCard from "../card";

interface SplitHand {
  hand: Card[];
  total: number;
  result: "win" | "lose" | "push" | null;
  isActive: boolean;
  isComplete: boolean;
}

interface SplitHandsCenterSideProps {
  splitHands: SplitHand[];
  currentSplitHand: number;
  cardBackUrl?: string | null;
}

// sm card width is 80px (see PlayingCard's sizeMap) — same overlap ratio HandCards uses, so a
// split hand that grows past one card (a hit) fans the same way the rest of the table does.
const CARD_WIDTH = 80;
const OVERLAP = CARD_WIDTH * 0.65 - CARD_WIDTH;

function HandCardRow({ cards, cardBackUrl }: { cards: Card[]; cardBackUrl?: string | null }) {
  return (
    <div className="flex items-center">
      {cards.map((card, i) => (
        // layout: a hit after a split widens this row, recentering it under its "flex
        // justify-center" ancestor — without `layout`, every card already down jumped straight
        // to its new spot instead of sliding there (same fix as HandCards.tsx).
        <motion.div layout key={i} style={{ marginLeft: i > 0 ? OVERLAP : 0, position: "relative", zIndex: i }}>
          <PlayingCard suit={card.suit} value={card.value} size="sm" cardBackUrl={cardBackUrl} />
        </motion.div>
      ))}
    </div>
  );
}

// Classic 21's own split view: the hand currently being played sits big in the "center" slot
// with its own total above it, exactly like a regular (non-split) hand; the other hand sits
// small off to the side with no total shown at all — nothing to read yet, it's not this hand's
// turn. When the active hand finishes, they swap: `layout` (keyed per underlying hand, not per
// slot) picks up the resulting DOM reorder and animates the move + resize on its own — no
// manual position math needed for either the swap or the very first "split apart" moment.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  const slots = [currentSplitHand, currentSplitHand === 0 ? 1 : 0];

  return (
    <div className="w-full flex items-end justify-center gap-8">
      {slots.map((handIndex) => {
        const hand = splitHands[handIndex];
        if (!hand) return null;
        const isCenter = handIndex === currentSplitHand;

        return (
          <motion.div
            key={`split-hand-${handIndex}`}
            layout
            layoutId={`split-hand-${handIndex}`}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            initial={{ opacity: 0, scale: isCenter ? 0.9 : 0.4 }}
            animate={{ opacity: 1, scale: isCenter ? 1 : 0.55 }}
            className="flex flex-col items-center gap-2"
            style={{ transformOrigin: "center" }}
          >
            {isCenter && (
              <motion.div
                layout="position"
                className="rounded-2xl px-4 py-2"
                style={{ backgroundColor: "#232227" }}
              >
                <span className="font-semibold text-lg text-white">{hand.total}</span>
              </motion.div>
            )}
            <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
          </motion.div>
        );
      })}
    </div>
  );
}
