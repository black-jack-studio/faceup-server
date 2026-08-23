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
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const CENTER_ROW_HEIGHT = 190;
// Tall enough for the *scaled* (0.55x) badge+card, ~90px, with a little breathing room. Fixed,
// not measured — the row above never has to compete for space with the row below.
const SIDE_ROW_HEIGHT = 96;
const SIDE_SCALE = 0.55;

function HandCardRow({ cards, cardBackUrl }: { cards: Card[]; cardBackUrl?: string | null }) {
  return (
    // layout on the row, not per card: a hit widens this row, recentering it under its "flex
    // justify-center"/"justify-end" ancestor — layout on each card separately made them drift
    // there independently instead of moving together as one hand (same fix as HandCards.tsx).
    <motion.div layout="position" transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex items-center">
      {cards.map((card, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? OVERLAP : 0, position: "relative", zIndex: i }}>
          <PlayingCard suit={card.suit} value={card.value} size="sm" cardBackUrl={cardBackUrl} />
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

// Classic 21's own split view. Two fixed-height rows, stacked in plain document flow — not a
// single row with the other hand positioned/measured against the viewport, which kept landing
// in the wrong place, drifting on its own, or overlapping the active hand depending on how
// many cards either one had:
//
//   ┌─────────────────────────────────────┐
//   │              [side hand] →  (small, right-aligned, SIDE_ROW_HEIGHT tall, fixed)
//   ├─────────────────────────────────────┤
//   │            [active hand]             (big, centered, CENTER_ROW_HEIGHT tall, fixed)
//   └─────────────────────────────────────┘
//
// Because each row's height is a constant, not derived from either hand's own content, neither
// row can ever grow into the other — the boundary between them (and therefore "the bottom of
// the side hand's cards is above the top of the active hand's cards") is guaranteed by the
// layout itself, not by careful positioning. Hitting the active hand only ever changes content
// *inside* the bottom row; it has no way to touch the top row's box at all. The side hand is
// right-aligned (justify-end) rather than centered or left-aligned, so drawing more cards grows
// it toward the left, away from the screen edge, instead of toward a wall.
//
// Each hand can render in either row depending on whose turn it is, never both — when the
// active hand changes, one hand's element unmounts from one row while the other mounts into
// the other row, in the same commit. `layoutId` (keyed by hand index) bridges that swap into
// one continuous slide+resize instead of two unrelated mounts; `layout="position"` on each
// piece keeps the slide to a pure position change, never a resize glitch (the explicit
// `animate` scale handles the size change as a plain transform).
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex items-end justify-end" style={{ height: SIDE_ROW_HEIGHT }}>
        {splitHands.map((hand, handIndex) => {
          if (handIndex === currentSplitHand) return null;
          return (
            <motion.div
              key={`split-hand-${handIndex}`}
              layoutId={`split-hand-${handIndex}`}
              layout="position"
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              // Starts at full size/opacity, not faded in from nothing — right when a split
              // happens, these are the exact same cards the player was just looking at as one
              // hand a moment ago, so fading them in from opacity:0 read as the cards vanishing
              // and respawning. This one visibly shrinks and slides into its row instead,
              // starting from how it actually looked a moment before.
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: SIDE_SCALE }}
              className="flex flex-col items-center gap-1"
              style={{ transformOrigin: "bottom right" }}
            >
              <TotalBadge total={hand.total} />
              <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
            </motion.div>
          );
        })}
      </div>

      <div className="relative w-full" style={{ height: CENTER_ROW_HEIGHT }}>
        {splitHands.map((hand, handIndex) => {
          if (handIndex !== currentSplitHand) return null;
          return (
            <div key={`split-hand-${handIndex}-wrap`} className="absolute inset-0 flex items-end justify-center">
              <motion.div
                layoutId={`split-hand-${handIndex}`}
                layout="position"
                transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
                style={{ transformOrigin: "bottom" }}
              >
                <TotalBadge total={hand.total} />
                <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
