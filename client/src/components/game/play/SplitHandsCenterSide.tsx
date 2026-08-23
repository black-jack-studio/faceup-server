import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/lib/blackjack/engine";
import PlayingCard from "../card";
import { CardSize } from "@/components/PlayingCard";

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

// sm/xs widths (see PlayingCard's sizeMap) — same overlap ratio HandCards uses, so a split
// hand fans the same way the rest of the table does. Shrinks to xs past 6 cards, same
// threshold as HandCards, so a long hand still fits comfortably inside its own half.
const OVERLAP_RATIO = 0.65;
const CARD_WIDTH = { sm: 80, xs: 40 } as const;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const ROW_HEIGHT = 190;
const ACTIVE_SCALE = 1;
const WAITING_SCALE = 0.55;

function HandCardRow({ cards, cardBackUrl }: { cards: Card[]; cardBackUrl?: string | null }) {
  const size: CardSize = cards.length >= 6 ? "xs" : "sm";
  const cardWidth = CARD_WIDTH[size];
  const step = cardWidth * OVERLAP_RATIO - cardWidth;
  return (
    // layout on the row, not per card: a hit widens this row — layout on each card
    // separately made them drift there independently instead of moving together as one hand
    // (same fix as HandCards.tsx).
    <motion.div layout="position" transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex items-center">
      {cards.map((card, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? step : 0, position: "relative", zIndex: i }}>
          <PlayingCard suit={card.suit} value={card.value} size={size} cardBackUrl={cardBackUrl} />
        </div>
      ))}
    </motion.div>
  );
}

function TotalBadge({ total }: { total: number }) {
  return (
    <motion.div layout="position" className="rounded-2xl px-4 py-2" style={{ backgroundColor: "#232227" }}>
      <span className="font-semibold text-lg text-white">{total}</span>
    </motion.div>
  );
}

// Classic 21's own split view: hand 1 always lives in the left half, hand 2 always lives in
// the right half — neither one ever crosses over or changes which half it's in, for the whole
// rest of the round. What changes when the active hand switches is purely its *scale*: whoever
// is being played renders at full size, the other shrinks — same two fixed slots throughout.
//
// This is a real 2-column CSS grid (grid-cols-2), not a flex row that happens to look similar:
// a flex row centered as one group would visibly recenter the *whole pair* — nudging the
// inactive hand sideways — the instant the active hand's card count changed the pair's total
// width. Grid tracks don't do that: each column's width is a fixed 50% of this component's own
// (already fixed, see table-test.tsx) width regardless of either hand's content, so the
// boundary between the two hands — and therefore each hand's own anchor point — never moves for
// a reason that has nothing to do with that specific hand. min-w-0 on each column is load-
// bearing: without it, a wide hand can force its own grid track to grow past its fair 50% share,
// which would still move the boundary.
//
// Each hand is anchored toward that boundary — hand 1 anchored to its own column's *right* edge,
// hand 2 to its column's *left* edge — and grows away from it (hand 1 extending further left as
// it's hit, hand 2 further right), so the gap between them can only ever widen, never close,
// regardless of how many cards either one ends up with.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div className="w-full grid grid-cols-2 gap-6 items-end" style={{ height: ROW_HEIGHT }}>
      {[0, 1].map((handIndex) => {
        const hand = splitHands[handIndex];
        if (!hand) return <div key={handIndex} />;
        const isActive = handIndex === currentSplitHand;
        const isLeft = handIndex === 0;
        return (
          <div key={handIndex} className={cn("min-w-0 flex items-end", isLeft ? "justify-end" : "justify-start")}>
            <motion.div
              layout="position"
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              animate={{ scale: isActive ? ACTIVE_SCALE : WAITING_SCALE }}
              className="flex flex-col items-center gap-2"
              style={{ transformOrigin: isLeft ? "bottom right" : "bottom left" }}
            >
              <TotalBadge total={hand.total} />
              <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
